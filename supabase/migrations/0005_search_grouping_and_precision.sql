-- 0005_search_grouping_and_precision.sql
-- Upgrades `public.search_catalog` with:
--   1. SQL-level DISTINCT ON grouping by (group_code, primary_stone) BEFORE LIMIT/OFFSET
--   2. Exact GIN-indexed `p_initial_letter` matching (Design / Design Detail = 'Initial X')
--   3. FTS-first with indexable `%` trigram fallback ONLY when FTS yields 0 rows (fixes 57014 timeouts & false positives)
--   4. Proper `14K%Gold` wildcard metal matching + offset pagination

drop function if exists public.search_catalog(
  text, text, text, text[], text, text, boolean, boolean, text, text, int
);

create or replace function public.search_catalog(
  p_mode text default 'general',
  p_sku_query text default null,
  p_text_query text default null,
  p_category_slugs text[] default null,
  p_metal_pattern text default null,
  p_stone_pattern text default null,
  p_stone_none boolean default false,
  p_sizable boolean default false,
  p_length text default null,
  p_ring_size text default null,
  p_initial_letter text default null,
  p_offset int default 0,
  p_limit int default 36
)
returns table (
  id bigint,
  supplier_sku text,
  supplier_item_id text,
  group_code text,
  title text,
  metal_type text,
  primary_stone text,
  merchandising_area text,
  is_featured boolean,
  supplier_code text,
  supplier_name text,
  category_slug text,
  category_name text,
  score real
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 36), 100));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_sku_lower text := lower(trim(coalesce(p_sku_query, '')));
  v_raw_text text := trim(coalesce(p_text_query, ''));
  v_metal_fts text := trim(replace(coalesce(p_metal_pattern, ''), '%', ' '));
  v_stone_fts text := case when p_stone_none = false then trim(coalesce(p_stone_pattern, '')) else '' end;
  v_combined_fts text;
  v_tsq tsquery := null;
  v_initial_label text := case
    when p_initial_letter is not null and trim(p_initial_letter) <> ''
      then 'Initial ' || upper(left(trim(p_initial_letter), 1))
    else null
  end;
  v_row_count int := 0;
begin
  -- 1. Fast-path: direct / prefix / partial SKU search (deduplicated by group)
  if p_mode = 'sku' and v_sku_lower <> '' then
    return query
    with matched as (
      select
        ci.id,
        ci.supplier_sku,
        ci.supplier_item_id,
        ci.group_code,
        ci.title,
        ci.metal_type,
        ci.primary_stone,
        ci.merchandising_area,
        ci.is_featured,
        s.code as supplier_code,
        s.name as supplier_name,
        c.slug as category_slug,
        c.name as category_name,
        (
          case
            when lower(ci.supplier_sku) = v_sku_lower then 1000.0
            when lower(ci.supplier_sku) like v_sku_lower || '%' then 800.0
            when lower(coalesce(ci.group_code, '')) = v_sku_lower then 750.0
            else 500.0 + (extensions.similarity(lower(ci.supplier_sku), v_sku_lower) * 100.0)
          end
        )::real as score
      from public.catalog_items ci
      join public.suppliers s on s.id = ci.supplier_id
      left join public.categories c on c.id = ci.category_id
      where ci.is_active = true
        and (
          lower(ci.supplier_sku) like '%' || v_sku_lower || '%'
          or lower(coalesce(ci.group_code, '')) = v_sku_lower
        )
    ),
    deduped as (
      select distinct on (
        coalesce(nullif(trim(m.group_code), ''), m.supplier_sku),
        lower(coalesce(m.primary_stone, ''))
      )
        m.*
      from matched m
      order by
        coalesce(nullif(trim(m.group_code), ''), m.supplier_sku),
        lower(coalesce(m.primary_stone, '')),
        m.score desc,
        m.is_featured desc,
        m.id desc
    )
    select d.*
    from deduped d
    order by d.score desc, d.is_featured desc, d.id desc
    offset v_offset
    limit v_limit;
    return;
  end if;

  -- Build GIN search_vector query combining free text + metal + stone for fast index intersection
  v_combined_fts := trim(
    concat_ws(
      ' ',
      nullif(v_raw_text, ''),
      nullif(v_metal_fts, ''),
      nullif(v_stone_fts, '')
    )
  );
  if v_combined_fts <> '' then
    v_tsq := websearch_to_tsquery('english', v_combined_fts);
  end if;

  -- 2. Primary path: structured facets + weighted GIN FTS, grouped by (group_code, primary_stone)
  return query
  with matched as (
    select
      ci.id,
      ci.supplier_sku,
      ci.supplier_item_id,
      ci.group_code,
      ci.title,
      ci.metal_type,
      ci.primary_stone,
      ci.merchandising_area,
      ci.is_featured,
      s.code as supplier_code,
      s.name as supplier_name,
      c.slug as category_slug,
      c.name as category_name,
      (
        (case when ci.is_featured then 10.0 else 0.0 end)
        + (case when v_tsq is not null and ci.search_vector @@ v_tsq
                then ts_rank_cd(ci.search_vector, v_tsq) * 50.0
                else 0.0 end)
      )::real as score
    from public.catalog_items ci
    join public.suppliers s on s.id = ci.supplier_id
    left join public.categories c on c.id = ci.category_id
    where ci.is_active = true
      and (
        p_category_slugs is null
        or array_length(p_category_slugs, 1) is null
        or c.slug = any(p_category_slugs)
      )
      and (
        p_metal_pattern is null
        or p_metal_pattern = ''
        or ci.metal_type ilike '%' || p_metal_pattern || '%'
      )
      and (
        (p_stone_none = true and ci.primary_stone is null)
        or (
          p_stone_none = false
          and (
            p_stone_pattern is null
            or p_stone_pattern = ''
            or ci.primary_stone ilike '%' || p_stone_pattern || '%'
          )
        )
      )
      and (
        p_sizable = false
        or ci.attributes @> '{"Sizable":"Yes"}'::jsonb
      )
      and (
        v_initial_label is null
        or ci.attributes @> jsonb_build_object('Design', v_initial_label)
        or ci.attributes @> jsonb_build_object('Design Detail', v_initial_label)
      )
      and (
        p_length is null
        or p_length = ''
        or ci.attributes @> jsonb_build_object('Length', p_length)
        or ci.attributes @> jsonb_build_object('Bracelet Length', p_length)
        or ci.attributes @> jsonb_build_object('Necklace Length', p_length)
        or ci.attributes @> jsonb_build_object('Chain Length', p_length)
      )
      and (
        p_ring_size is null
        or p_ring_size = ''
        or ci.attributes @> jsonb_build_object('Ring Size', p_ring_size)
      )
      and (
        v_tsq is null
        or ci.search_vector @@ v_tsq
      )
  ),
  deduped as (
    select distinct on (
      coalesce(nullif(trim(m.group_code), ''), m.supplier_sku),
      lower(coalesce(m.primary_stone, ''))
    )
      m.*
    from matched m
    order by
      coalesce(nullif(trim(m.group_code), ''), m.supplier_sku),
      lower(coalesce(m.primary_stone, '')),
      m.score desc,
      m.is_featured desc,
      m.id desc
  )
  select d.*
  from deduped d
  order by d.score desc, d.is_featured desc, d.id desc
  offset v_offset
  limit v_limit;

  get diagnostics v_row_count = row_count;

  -- 3. Fuzzy trigram fallback ONLY when primary FTS returned 0 rows and user typed free text
  -- Uses indexable `%` operator on `catalog_items_title_trgm_idx` (no 52k sequential scan!)
  if v_row_count = 0 and v_raw_text <> '' and v_offset = 0 then
    return query
    with fuzzy_matched as (
      select
        ci.id,
        ci.supplier_sku,
        ci.supplier_item_id,
        ci.group_code,
        ci.title,
        ci.metal_type,
        ci.primary_stone,
        ci.merchandising_area,
        ci.is_featured,
        s.code as supplier_code,
        s.name as supplier_name,
        c.slug as category_slug,
        c.name as category_name,
        (extensions.similarity(lower(ci.title), lower(v_raw_text)) * 100.0)::real as score
      from public.catalog_items ci
      join public.suppliers s on s.id = ci.supplier_id
      left join public.categories c on c.id = ci.category_id
      where ci.is_active = true
        and lower(ci.title) % lower(v_raw_text)
        and (
          p_category_slugs is null
          or array_length(p_category_slugs, 1) is null
          or c.slug = any(p_category_slugs)
        )
        and (
          p_metal_pattern is null
          or p_metal_pattern = ''
          or ci.metal_type ilike '%' || p_metal_pattern || '%'
        )
        and (
          (p_stone_none = true and ci.primary_stone is null)
          or (
            p_stone_none = false
            and (
              p_stone_pattern is null
              or p_stone_pattern = ''
              or ci.primary_stone ilike '%' || p_stone_pattern || '%'
            )
          )
        )
        and (
          p_sizable = false
          or ci.attributes @> '{"Sizable":"Yes"}'::jsonb
        )
        and (
          v_initial_label is null
          or ci.attributes @> jsonb_build_object('Design', v_initial_label)
          or ci.attributes @> jsonb_build_object('Design Detail', v_initial_label)
        )
    ),
    deduped as (
      select distinct on (
        coalesce(nullif(trim(m.group_code), ''), m.supplier_sku),
        lower(coalesce(m.primary_stone, ''))
      )
        m.*
      from fuzzy_matched m
      order by
        coalesce(nullif(trim(m.group_code), ''), m.supplier_sku),
        lower(coalesce(m.primary_stone, '')),
        m.score desc,
        m.is_featured desc,
        m.id desc
    )
    select d.*
    from deduped d
    order by d.score desc, d.is_featured desc, d.id desc
    limit v_limit;
  end if;
end;
$$;

grant execute on function public.search_catalog(
  text, text, text, text[], text, text, boolean, boolean, text, text, text, int, int
) to anon, authenticated;
