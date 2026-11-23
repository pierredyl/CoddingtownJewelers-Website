-- 0004_search_architecture.sql
-- Hybrid global search: pg_trgm partial GIN indexes + ranked `public.search_catalog` RPC.
-- No table rewrite on `catalog_items`; estimated storage impact: ~12-20 MB on 52k SKUs.

-- 1. Enable trigram extension in the `extensions` schema (Supabase best practice)
create extension if not exists pg_trgm with schema extensions;

-- 2. Partial GIN trigram indexes on active items for fast partial SKU & fuzzy title lookup
create index if not exists catalog_items_sku_trgm_idx
  on public.catalog_items
  using gin (lower(supplier_sku) extensions.gin_trgm_ops)
  where is_active = true;

create index if not exists catalog_items_title_trgm_idx
  on public.catalog_items
  using gin (lower(title) extensions.gin_trgm_ops)
  where is_active = true;

-- 3. Unified ranked search RPC (SECURITY INVOKER respects existing RLS policies)
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
  p_limit int default 120
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
  v_limit int := greatest(1, least(coalesce(p_limit, 120), 200));
  v_sku_lower text := lower(trim(coalesce(p_sku_query, '')));
  v_text text := trim(coalesce(p_text_query, ''));
  v_tsq tsquery := null;
begin
  -- Fast-path: direct / prefix / partial SKU search (bypasses title fuzzy noise)
  if p_mode = 'sku' and v_sku_lower <> '' then
    return query
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
    order by score desc, ci.is_featured desc, ci.id desc
    limit v_limit;
    return;
  end if;

  -- Build GIN search_vector query combining text + metal + stone for fast index intersection
  v_text := trim(
    concat_ws(
      ' ',
      nullif(v_text, ''),
      nullif(trim(coalesce(p_metal_pattern, '')), ''),
      case when p_stone_none = false then nullif(trim(coalesce(p_stone_pattern, '')), '') else null end
    )
  );
  if v_text <> '' then
    v_tsq := websearch_to_tsquery('english', v_text);
  end if;

  -- General multi-facet + weighted FTS + pg_trgm fuzzy title path
  return query
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
      + (case when v_text <> ''
              then extensions.similarity(lower(ci.title), lower(v_text)) * 20.0
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
      v_text = ''
      or (v_tsq is not null and ci.search_vector @@ v_tsq)
      or extensions.similarity(lower(ci.title), lower(v_text)) >= 0.25
    )
  order by score desc, ci.is_featured desc, ci.id desc
  limit v_limit;
end;
$$;

grant execute on function public.search_catalog(
  text, text, text, text[], text, text, boolean, boolean, text, text, int
) to anon, authenticated;
