-- 0002_extensibility_and_cache_hardening.sql
-- Hardens multi-provider extensibility, sync performance, and public inquiry bounds.

-- 1. Expand suppliers.api_type to support future jewelry providers (SFTP, GraphQL, SOAP, manual, etc.)
alter table public.suppliers
  drop constraint if exists suppliers_api_type_check;

alter table public.suppliers
  add constraint suppliers_api_type_check
  check (api_type in ('rest_api', 'data_feed', 'sftp_feed', 'graphql', 'soap', 'manual'));

-- 2. Add non-secret provider metadata (e.g., feed format, CDN base, default sync cadence)
alter table public.suppliers
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 3. Composite index for fast per-supplier deactivation checks during full syncs
create index if not exists catalog_items_supplier_active_idx
  on public.catalog_items(supplier_id, is_active)
  where is_active = true;

-- 4. Tighten public inquiry insert policy with reasonable payload length bounds
drop policy if exists "Public can submit inquiries" on public.inquiries;

create policy "Public can submit inquiries"
  on public.inquiries
  for insert
  to anon, authenticated
  with check (
    length(trim(supplier_sku)) between 1 and 120
    and length(trim(customer_name)) between 1 and 200
    and length(trim(customer_contact)) between 1 and 200
    and coalesce(length(message), 0) <= 2000
  );

