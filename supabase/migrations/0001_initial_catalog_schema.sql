-- 0001_initial_catalog_schema.sql
-- Local Jewelry Business Catalog Schema
-- No pricing columns stored; manufacturer Item #s (supplier_sku) are first-class.
-- Follows Supabase Postgres best practices: bigint identity PKs, text, timestamptz,
-- partial & GIN indexes, generated tsvector, and strict Row-Level Security.

-- 1. Suppliers (Stuller, Quality Gold, future manufacturers)
create table public.suppliers (
  id bigint generated always as identity primary key,
  code text not null unique,          -- 'stuller' | 'quality_gold'
  name text not null,                 -- 'Stuller' | 'Quality Gold'
  api_type text not null check (api_type in ('rest_api', 'data_feed')),
  created_at timestamptz not null default now()
);

-- 2. Normalized Storefront Categories
create table public.categories (
  id bigint generated always as identity primary key,
  parent_id bigint references public.categories(id) on delete set null,
  slug text not null unique,          -- e.g. 'engagement-rings', 'necklaces-pendants'
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index categories_parent_id_idx on public.categories(parent_id);
create index categories_sort_order_idx on public.categories(sort_order, id);

-- 3. Unified Catalog Items (No pricing stored; manufacturer SKU is first-class)
create table public.catalog_items (
  id bigint generated always as identity primary key,
  supplier_id bigint not null references public.suppliers(id) on delete restrict,
  category_id bigint references public.categories(id) on delete set null,

  -- Manufacturer identifiers (displayed to customers for phone/in-store inquiries)
  supplier_sku text not null,         -- Stuller: SKU (e.g. '309:77802:S') | QGold: Item Number
  supplier_item_id text,              -- Optional internal manufacturer ID
  group_code text,                    -- Series/style code to group metal/size variants in place

  -- Display fields
  title text not null,
  short_description text,
  description text,

  -- Common jewelry facets for fast SQL filtering
  metal_type text,                    -- e.g. '14K Yellow Gold', 'Platinum', 'Sterling Silver'
  primary_stone text,                 -- e.g. 'Diamond', 'Sapphire', 'None'
  merchandising_area text,            -- e.g. Stuller MerchandisingArea ('Bridal', 'Jewelry')

  -- Flexible manufacturer-specific attributes (e.g. Stuller DescriptiveElementGroup)
  attributes jsonb not null default '{}'::jsonb,
  -- Lossless raw snapshot from last sync so we can re-parse without extra API calls
  raw_payload jsonb,

  -- Lifecycle & curation
  is_active boolean not null default true,
  is_featured boolean not null default false,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Generated full-text search vector (exact SKU + title + metal + stone + description)
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(supplier_sku, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(metal_type, '') || ' ' || coalesce(primary_stone, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'C')
  ) stored,

  unique (supplier_id, supplier_sku)
);

-- Maintain updated_at automatically
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger catalog_items_set_updated_at
  before update on public.catalog_items
  for each row
  execute function public.set_updated_at();

-- Indexes for fast catalogue browsing, filtering, and SKU lookup
create index catalog_items_active_category_idx
  on public.catalog_items(category_id, is_featured desc, id desc)
  where is_active = true;

create index catalog_items_supplier_id_idx on public.catalog_items(supplier_id);
create index catalog_items_sku_lookup_idx on public.catalog_items(lower(supplier_sku));
create index catalog_items_group_code_idx on public.catalog_items(group_code) where group_code is not null;
create index catalog_items_metal_stone_idx on public.catalog_items(metal_type, primary_stone) where is_active = true;
create index catalog_items_attributes_gin_idx on public.catalog_items using gin(attributes);
create index catalog_items_search_gin_idx on public.catalog_items using gin(search_vector);

-- 4. Product Images (supports Stuller FullUrl / ThumbnailUrl / ZoomUrl + SortOrder + Angle)
create table public.catalog_images (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.catalog_items(id) on delete cascade,
  thumbnail_url text,
  full_url text not null,
  zoom_url text,
  angle text,
  sort_order int not null default 0,
  is_primary boolean not null default false
);

create index catalog_images_item_sort_idx on public.catalog_images(item_id, sort_order, id);

-- 5. Sync Audit Log (tracks API/feed runs & keeps API usage visible)
create table public.sync_runs (
  id bigint generated always as identity primary key,
  supplier_id bigint not null references public.suppliers(id) on delete restrict,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  items_upserted int not null default 0,
  items_deactivated int not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index sync_runs_supplier_started_idx on public.sync_runs(supplier_id, started_at desc);

-- 6. Lightweight Customer Inquiries ("Call or ask about Item #...")
create table public.inquiries (
  id bigint generated always as identity primary key,
  item_id bigint references public.catalog_items(id) on delete set null,
  supplier_sku text not null,
  customer_name text not null,
  customer_contact text not null,     -- Phone or email
  message text,
  created_at timestamptz not null default now()
);

create index inquiries_item_id_idx on public.inquiries(item_id);

-- 7. Row-Level Security (RLS)
alter table public.suppliers enable row level security;
alter table public.categories enable row level security;
alter table public.catalog_items enable row level security;
alter table public.catalog_images enable row level security;
alter table public.sync_runs enable row level security;
alter table public.inquiries enable row level security;

-- Public read-only access to active catalog data
create policy "Public can read suppliers"
  on public.suppliers
  for select
  to anon, authenticated
  using (true);

create policy "Public can read categories"
  on public.categories
  for select
  to anon, authenticated
  using (true);

create policy "Public can read active catalog items"
  on public.catalog_items
  for select
  to anon, authenticated
  using (is_active = true);

create policy "Public can read images of active items"
  on public.catalog_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.catalog_items ci
      where ci.id = catalog_images.item_id
        and ci.is_active = true
    )
  );

-- Public can submit an inquiry, but cannot read others' inquiries or sync_runs
create policy "Public can submit inquiries"
  on public.inquiries
  for insert
  to anon, authenticated
  with check (
    length(trim(supplier_sku)) > 0
    and length(trim(customer_name)) > 0
    and length(trim(customer_contact)) > 0
  );
