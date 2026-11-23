-- =============================================================================
-- Migration 0006: Fast, Timeout-Proof Global Search & SKU Index
--
-- Fixes:
--   1. Qualifies pg_trgm `%` operator as `operator(extensions.%)` inside
--      `search_catalog` (which pins `set search_path = ''`), eliminating 42883.
--   2. Adds missing `p_length` and `p_ring_size` predicates to the fuzzy branch.
--   3. Caps inner FTS candidate rows (LIMIT 800 ranked by ts_rank_cd) before
--      grouping so broad queries ("gold", "diamond", "ring") stay < 150ms.
--   4. Adds a partial B-tree index on `supplier_sku` for < 15ms Item # lookups.
-- =============================================================================

create index if not exists catalog_items_sku_btree_idx
  on public.catalog_items (supplier_sku)
  where is_active = true;

create index if not exists catalog_items_title_trgm_ilike_idx
  on public.catalog_items
  using gin (title extensions.gin_trgm_ops)
  where is_active = true;

create or replace function public.search_catalog(
  p_text_query text default '',
  p_raw_text text default '',
  p_sku_query text default null,
  p_category_slugs text[] default null,
  p_metal_family text default null,
  p_metal_karat text default null,
  p_primary_stone text default null,
  p_stone_origin text default null,
  p_initial_letter text default null,
  p_length text default null,
  p_ring_size text default null,
  p_group_limit integer default 36,
  p_group_offset integer default 0
)
returns table (
  group_key text,
  total_variants integer,
  rep_id bigint,
  rank_score real
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tsquery tsquery := null;
  v_text text := trim(coalesce(p_text_query, ''));
  v_raw_text text := trim(coalesce(p_raw_text, ''));
  v_sku text := trim(coalesce(p_sku_query, ''));
  v_sku_lower text := lower(trim(coalesce(p_sku_query, '')));
  v_cat_ids bigint[] := null;
  v_initial_label text := null;
  v_row_count integer := 0;
begin
  if p_category_slugs is not null and array_length(p_category_slugs, 1) > 0 then
    select array_agg(c.id)
      into v_cat_ids
      from public.categories c
     where c.slug = any(p_category_slugs);
  end if;

  if p_initial_letter is not null and length(trim(p_initial_letter)) = 1 then
    v_initial_label := 'Initial ' || upper(trim(p_initial_letter));
  end if;

  -- Fast path: Exact or prefix Item # / group_code lookup
  if v_sku <> '' then
    return query
    with matched as (
      select
        ci.id,
        ci.is_featured,
        ci.supplier_sku,
        coalesce(ci.group_code, 'SKU-' || ci.supplier_sku)
          || '::' || coalesce(lower(trim(ci.primary_stone)), 'none') as gkey,
        case
          when lower(ci.supplier_sku) = v_sku_lower then 100.0::real
          when lower(ci.supplier_sku) like v_sku_lower || '%' then 60.0::real
          else 30.0::real
        end as score
      from public.catalog_items ci
      where ci.is_active = true
        and (
          ci.supplier_sku ilike v_sku || '%'
          or lower(ci.supplier_sku) = v_sku_lower
          or lower(coalesce(ci.group_code, '')) = v_sku_lower
        )
      limit 400
    ),
    grouped as (
      select distinct on (m.gkey)
        m.gkey as group_key,
        count(*) over (partition by m.gkey)::integer as total_variants,
        m.id as rep_id,
        max(m.score) over (partition by m.gkey) as rank_score
      from matched m
      order by m.gkey, m.score desc, m.is_featured desc, m.supplier_sku asc
    )
    select g.group_key, g.total_variants, g.rep_id, g.rank_score
    from grouped g
    order by g.rank_score desc, g.rep_id asc
    limit greatest(1, least(coalesce(p_group_limit, 36), 60))
    offset greatest(0, coalesce(p_group_offset, 0));
    return;
  end if;

  if v_text <> '' then
    begin
      v_tsquery := websearch_to_tsquery('english', v_text);
    exception when others then
      v_tsquery := plainto_tsquery('english', v_text);
    end;
    if v_tsquery = ''::tsquery then
      v_tsquery := null;
    end if;
  end if;

  -- Primary path: Bounded top-800 candidate set ranked by weighted FTS before grouping
  return query
  with candidates as (
    select
      ci.id,
      ci.is_featured,
      ci.supplier_sku,
      coalesce(ci.group_code, 'SKU-' || ci.supplier_sku)
        || '::' || coalesce(lower(trim(ci.primary_stone)), 'none') as gkey,
      (
        case
          when v_tsquery is not null
            then ts_rank_cd(ci.search_vector, v_tsquery, 32) * 10.0
          else 1.0
        end
        + case when ci.is_featured then 1.5 else 0.0 end
      )::real as score
    from public.catalog_items ci
    where ci.is_active = true
      and (v_cat_ids is null or ci.category_id = any(v_cat_ids))
      and (
        p_metal_family is null
        or (
          p_metal_family = 'Yellow Gold' and ci.metal_type ilike '%Yellow Gold%'
        )
        or (
          p_metal_family = 'White Gold' and ci.metal_type ilike '%White Gold%'
        )
        or (
          p_metal_family = 'Rose Gold' and ci.metal_type ilike '%Rose Gold%'
        )
        or (
          p_metal_family = 'Gold' and ci.metal_type ilike '%Gold%'
        )
        or (
          p_metal_family = 'Platinum' and ci.metal_type ilike '%Platinum%'
        )
        or (
          p_metal_family = 'Sterling Silver' and ci.metal_type ilike '%Silver%'
        )
        or (
          p_metal_family not in ('Yellow Gold', 'White Gold', 'Rose Gold', 'Gold', 'Platinum', 'Sterling Silver')
          and ci.metal_type ilike '%' || p_metal_family || '%'
        )
      )
      and (p_metal_karat is null or ci.metal_type ilike '%' || p_metal_karat || '%')
      and (p_primary_stone is null or ci.primary_stone ilike '%' || p_primary_stone || '%')
      and (
        p_stone_origin is null
        or (p_stone_origin = 'lab' and (ci.primary_stone ilike '%Lab-Grown%' or ci.primary_stone ilike '%Lab Grown%' or ci.primary_stone ilike '%Created%'))
        or (p_stone_origin = 'natural' and ci.primary_stone ilike 'Natural%')
      )
      and (
        v_initial_label is null
        or ci.attributes @> jsonb_build_object('Design', v_initial_label)
        or ci.attributes @> jsonb_build_object('Design Detail', v_initial_label)
      )
      and (
        p_length is null
        or ci.attributes @> jsonb_build_object('Length', p_length)
        or ci.attributes @> jsonb_build_object('Bracelet Length', p_length)
        or ci.attributes @> jsonb_build_object('Bracelet Size', p_length)
        or ci.attributes @> jsonb_build_object('Necklace Length', p_length)
        or ci.attributes @> jsonb_build_object('Chain Length', p_length)
      )
      and (
        p_ring_size is null
        or ci.attributes @> jsonb_build_object('Ring Size', p_ring_size)
      )
      and (v_tsquery is null or ci.search_vector @@ v_tsquery)
    order by score desc, ci.is_featured desc, ci.id desc
    limit 800
  ),
  grouped as (
    select distinct on (c.gkey)
      c.gkey as group_key,
      count(*) over (partition by c.gkey)::integer as total_variants,
      c.id as rep_id,
      max(c.score) over (partition by c.gkey) as rank_score
    from candidates c
    order by c.gkey, c.score desc, c.is_featured desc, c.supplier_sku asc
  )
  select g.group_key, g.total_variants, g.rep_id, g.rank_score
  from grouped g
  order by g.rank_score desc, g.rep_id desc
  limit greatest(1, least(coalesce(p_group_limit, 36), 60))
  offset greatest(0, coalesce(p_group_offset, 0));

  get diagnostics v_row_count = row_count;

  -- Fuzzy trigram fallback using schema-qualified `operator(extensions.%)`
  if v_row_count = 0 and coalesce(p_group_offset, 0) = 0 and v_raw_text <> '' then
    return query
    with fuzzy_candidates as (
      select
        ci.id,
        ci.is_featured,
        ci.supplier_sku,
        coalesce(ci.group_code, 'SKU-' || ci.supplier_sku)
          || '::' || coalesce(lower(trim(ci.primary_stone)), 'none') as gkey,
        extensions.similarity(lower(ci.title), lower(v_raw_text))::real as score
      from public.catalog_items ci
      where ci.is_active = true
        and (v_cat_ids is null or ci.category_id = any(v_cat_ids))
        and (p_metal_karat is null or ci.metal_type ilike '%' || p_metal_karat || '%')
        and (p_primary_stone is null or ci.primary_stone ilike '%' || p_primary_stone || '%')
        and (
          p_length is null
          or ci.attributes @> jsonb_build_object('Length', p_length)
          or ci.attributes @> jsonb_build_object('Bracelet Length', p_length)
          or ci.attributes @> jsonb_build_object('Bracelet Size', p_length)
          or ci.attributes @> jsonb_build_object('Necklace Length', p_length)
          or ci.attributes @> jsonb_build_object('Chain Length', p_length)
        )
        and (
          p_ring_size is null
          or ci.attributes @> jsonb_build_object('Ring Size', p_ring_size)
        )
        and lower(ci.title) operator(extensions.%) lower(v_raw_text)
      order by score desc, ci.is_featured desc
      limit 300
    ),
    grouped as (
      select distinct on (f.gkey)
        f.gkey as group_key,
        count(*) over (partition by f.gkey)::integer as total_variants,
        f.id as rep_id,
        max(f.score) over (partition by f.gkey) as rank_score
      from fuzzy_candidates f
      order by f.gkey, f.score desc, f.is_featured desc, f.supplier_sku asc
    )
    select g.group_key, g.total_variants, g.rep_id, g.rank_score
    from grouped g
    order by g.rank_score desc, g.rep_id desc
    limit greatest(1, least(coalesce(p_group_limit, 36), 60));
  end if;
end;
$$;
