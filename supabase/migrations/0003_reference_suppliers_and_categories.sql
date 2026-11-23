-- 0003_reference_suppliers_and_categories.sql
-- Required reference rows (suppliers + storefront categories) with zero demo items.
-- Safe to run multiple times (idempotent).

insert into public.suppliers (code, name, api_type)
values
  ('stuller', 'Stuller', 'rest_api'),
  ('quality_gold', 'Quality Gold', 'data_feed')
on conflict (code) do update
set name = excluded.name,
    api_type = excluded.api_type;

insert into public.categories (slug, name, sort_order)
values
  ('engagement-rings', 'Engagement Rings', 10),
  ('wedding-bands', 'Wedding Bands', 20),
  ('fashion-rings', 'Fashion Rings', 25),
  ('necklaces-pendants', 'Necklaces & Pendants', 30),
  ('earrings', 'Earrings', 40),
  ('bracelets', 'Bracelets', 50),
  ('gemstone-jewelry', 'Gemstone Jewelry', 60)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;
