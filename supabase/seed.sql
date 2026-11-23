-- seed.sql
-- Idempotent seed data for local development and demo storefronts.
-- Contains realistic Stuller & Quality Gold catalog items with grouped variants
-- and zero pricing information.

-- 1. Suppliers
insert into public.suppliers (code, name, api_type)
values
  ('stuller', 'Stuller', 'rest_api'),
  ('quality_gold', 'Quality Gold', 'data_feed')
on conflict (code) do update
set name = excluded.name,
    api_type = excluded.api_type;

-- 2. Storefront Categories
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

-- 3. Catalog Items (multi-variant groups + standalone pieces, no prices)
with
  sup as (select id, code from public.suppliers),
  cat as (select id, slug from public.categories)
insert into public.catalog_items (
  supplier_id,
  category_id,
  supplier_sku,
  supplier_item_id,
  group_code,
  title,
  short_description,
  description,
  metal_type,
  primary_stone,
  merchandising_area,
  attributes,
  raw_payload,
  is_active,
  is_featured
)
values
  -- Group 1 (Stuller): Classic Six-Prong Solitaire Engagement Ring (3 metal variants)
  (
    (select id from sup where code = 'stuller'),
    (select id from cat where slug = 'engagement-rings'),
    '309:77802:S',
    'ST-77802-YG',
    'ST-309-77802',
    'Classic Six-Prong Solitaire Engagement Ring',
    '14K Yellow Gold cathedral solitaire mounting for 1.00 ct round center stone',
    'Timeless six-prong cathedral solitaire engagement mounting crafted in solid 14K yellow gold with a tapered shank and high-polish finish. Designed to showcase a round brilliant center diamond or gemstone.',
    '14K Yellow Gold',
    'Diamond',
    'Bridal',
    '{"shankWidth": "2.1 mm", "prongStyle": "Six-Prong", "centerStoneShape": "Round", "centerStoneSize": "6.5 mm (1.00 ct)", "finish": "Polished", "ringSize": "7 (Sizable)"}'::jsonb,
    '{"SKU": "309:77802:S", "GroupDescription": "Classic Six-Prong Solitaire", "MerchandisingArea": "Bridal"}'::jsonb,
    true,
    true
  ),
  (
    (select id from sup where code = 'stuller'),
    (select id from cat where slug = 'engagement-rings'),
    '309:77802:W',
    'ST-77802-WG',
    'ST-309-77802',
    'Classic Six-Prong Solitaire Engagement Ring',
    '14K White Gold cathedral solitaire mounting for 1.00 ct round center stone',
    'Timeless six-prong cathedral solitaire engagement mounting crafted in solid 14K rhodium-plated white gold with a tapered shank and mirror polish.',
    '14K White Gold',
    'Diamond',
    'Bridal',
    '{"shankWidth": "2.1 mm", "prongStyle": "Six-Prong", "centerStoneShape": "Round", "centerStoneSize": "6.5 mm (1.00 ct)", "finish": "Rhodium Polished", "ringSize": "7 (Sizable)"}'::jsonb,
    '{"SKU": "309:77802:W", "GroupDescription": "Classic Six-Prong Solitaire", "MerchandisingArea": "Bridal"}'::jsonb,
    true,
    true
  ),
  (
    (select id from sup where code = 'stuller'),
    (select id from cat where slug = 'engagement-rings'),
    '309:77802:P',
    'ST-77802-PT',
    'ST-309-77802',
    'Classic Six-Prong Solitaire Engagement Ring',
    'Platinum 950 cathedral solitaire mounting for 1.00 ct round center stone',
    'Heirloom-grade six-prong cathedral solitaire engagement mounting crafted in Platinum 950 for exceptional durability and natural white luster.',
    'Platinum',
    'Diamond',
    'Bridal',
    '{"shankWidth": "2.1 mm", "prongStyle": "Six-Prong", "centerStoneShape": "Round", "centerStoneSize": "6.5 mm (1.00 ct)", "finish": "Polished", "ringSize": "7 (Sizable)"}'::jsonb,
    '{"SKU": "309:77802:P", "GroupDescription": "Classic Six-Prong Solitaire", "MerchandisingArea": "Bridal"}'::jsonb,
    true,
    true
  ),

  -- Group 2 (Stuller): French-Set Pavé Eternity Band (2 metal variants)
  (
    (select id from sup where code = 'stuller'),
    (select id from cat where slug = 'wedding-bands'),
    '124056:101:S',
    'ST-124056-WG',
    'ST-124056',
    'French-Set Diamond Pavé Anniversary Band',
    '14K White Gold scalloped pavé band with 0.50 ctw natural diamonds',
    'Delicate French-cut pavé anniversary and wedding band featuring low-profile scalloped edges for effortless stacking beside an engagement ring.',
    '14K White Gold',
    'Diamond',
    'Bridal',
    '{"bandWidth": "2.0 mm", "totalDiamondWeight": "0.50 ctw", "settingType": "French Pavé", "finish": "Polished"}'::jsonb,
    '{"SKU": "124056:101:S", "GroupDescription": "French-Set Pave Band", "MerchandisingArea": "Bridal"}'::jsonb,
    true,
    true
  ),
  (
    (select id from sup where code = 'stuller'),
    (select id from cat where slug = 'wedding-bands'),
    '124056:101:R',
    'ST-124056-RG',
    'ST-124056',
    'French-Set Diamond Pavé Anniversary Band',
    '14K Rose Gold scalloped pavé band with 0.50 ctw natural diamonds',
    'Warm 14K rose gold French-cut pavé band set with matched round brilliant diamonds along a slender, stackable silhouette.',
    '14K Rose Gold',
    'Diamond',
    'Bridal',
    '{"bandWidth": "2.0 mm", "totalDiamondWeight": "0.50 ctw", "settingType": "French Pavé", "finish": "Polished"}'::jsonb,
    '{"SKU": "124056:101:R", "GroupDescription": "French-Set Pave Band", "MerchandisingArea": "Bridal"}'::jsonb,
    true,
    false
  ),

  -- Group 3 (Quality Gold): Diamond Bezel Solitaire Pendant (2 metal variants)
  (
    (select id from sup where code = 'quality_gold'),
    (select id from cat where slug = 'necklaces-pendants'),
    'Q12345Y',
    'QG-Q12345Y',
    'QG-Q12345',
    'Floating Bezel Diamond Solitaire Necklace',
    '14K Yellow Gold 18-inch cable chain with bezel-set 0.33 ct diamond',
    'Everyday luxury solitaire necklace featuring a round brilliant diamond nestled in a sleek hand-polished bezel on an adjustable 16 to 18 inch cable chain.',
    '14K Yellow Gold',
    'Diamond',
    'Fine Jewelry',
    '{"chainLength": "18 in (Adjustable 16 in)", "chainType": "Cable", "clasp": "Lobster", "caratWeight": "0.33 ctw", "settingType": "Full Bezel"}'::jsonb,
    '{"ItemNumber": "Q12345Y", "StyleNumber": "QG-Q12345", "Category": "Necklaces"}'::jsonb,
    true,
    true
  ),
  (
    (select id from sup where code = 'quality_gold'),
    (select id from cat where slug = 'necklaces-pendants'),
    'Q12345W',
    'QG-Q12345W',
    'QG-Q12345',
    'Floating Bezel Diamond Solitaire Necklace',
    '14K White Gold 18-inch cable chain with bezel-set 0.33 ct diamond',
    'Modern floating bezel solitaire necklace crafted in luminous 14K white gold on an adjustable 16 to 18 inch diamond-cut cable chain.',
    '14K White Gold',
    'Diamond',
    'Fine Jewelry',
    '{"chainLength": "18 in (Adjustable 16 in)", "chainType": "Cable", "clasp": "Lobster", "caratWeight": "0.33 ctw", "settingType": "Full Bezel"}'::jsonb,
    '{"ItemNumber": "Q12345W", "StyleNumber": "QG-Q12345", "Category": "Necklaces"}'::jsonb,
    true,
    false
  ),

  -- Group 4 (Quality Gold): Classic 4-Prong Diamond Stud Earrings (2 metal variants)
  (
    (select id from sup where code = 'quality_gold'),
    (select id from cat where slug = 'earrings'),
    'QE88410W',
    'QG-QE88410W',
    'QG-QE88410',
    'Martini-Set Round Diamond Stud Earrings',
    '14K White Gold 1.00 ctw diamond studs with screw-back posts',
    'Low-profile three-prong martini-set diamond studs designed to sit flush against the ear with secure threaded screw-back closures.',
    '14K White Gold',
    'Diamond',
    'Fine Jewelry',
    '{"totalCaratWeight": "1.00 ctw", "backingType": "Screw-Back", "settingType": "3-Prong Martini", "finish": "Polished"}'::jsonb,
    '{"ItemNumber": "QE88410W", "StyleNumber": "QG-QE88410", "Category": "Earrings"}'::jsonb,
    true,
    true
  ),
  (
    (select id from sup where code = 'quality_gold'),
    (select id from cat where slug = 'earrings'),
    'QE88410Y',
    'QG-QE88410Y',
    'QG-QE88410',
    'Martini-Set Round Diamond Stud Earrings',
    '14K Yellow Gold 1.00 ctw diamond studs with screw-back posts',
    'Warm 14K yellow gold martini-set diamond studs sitting close to the earlobe with secure threaded screw-back posts.',
    '14K Yellow Gold',
    'Diamond',
    'Fine Jewelry',
    '{"totalCaratWeight": "1.00 ctw", "backingType": "Screw-Back", "settingType": "3-Prong Martini", "finish": "Polished"}'::jsonb,
    '{"ItemNumber": "QE88410Y", "StyleNumber": "QG-QE88410", "Category": "Earrings"}'::jsonb,
    true,
    false
  ),

  -- Standalone 5 (Stuller): Ceylon Blue Sapphire Halo Ring
  (
    (select id from sup where code = 'stuller'),
    (select id from cat where slug = 'gemstone-jewelry'),
    '65422:100:P',
    'ST-65422-PT',
    'ST-65422',
    'Oval Blue Sapphire & Diamond Halo Ring',
    'Platinum 950 oval sapphire cocktail ring framed by round brilliant diamonds',
    'Velvety royal-blue oval sapphire encircled by a delicate micro-pavé diamond halo in hand-finished Platinum 950.',
    'Platinum',
    'Sapphire',
    'Gemstone',
    '{"centerStoneShape": "Oval", "centerStoneDimensions": "8 x 6 mm", "accentStones": "0.38 ctw Natural Diamonds", "finish": "Polished"}'::jsonb,
    '{"SKU": "65422:100:P", "GroupDescription": "Oval Sapphire Halo Ring", "MerchandisingArea": "Gemstone"}'::jsonb,
    true,
    true
  ),

  -- Standalone 6 (Quality Gold): Herringbone Chain Bracelet
  (
    (select id from sup where code = 'quality_gold'),
    (select id from cat where slug = 'bracelets'),
    'QB44120Y',
    'QG-QB44120Y',
    'QG-QB44120',
    'Italian Silk Herringbone Bracelet',
    '14K Yellow Gold 4.5 mm fluid herringbone chain bracelet, 7.5 inches',
    'Supple Italian-crafted herringbone chain bracelet in solid 14K yellow gold that drapes like liquid gold along the wrist.',
    '14K Yellow Gold',
    'None',
    'Fine Jewelry',
    '{"length": "7.5 in", "width": "4.5 mm", "clasp": "Lobster", "origin": "Italy", "finish": "High Polish"}'::jsonb,
    '{"ItemNumber": "QB44120Y", "StyleNumber": "QG-QB44120", "Category": "Bracelets"}'::jsonb,
    true,
    false
  )
on conflict (supplier_id, supplier_sku) do update
set category_id = excluded.category_id,
    group_code = excluded.group_code,
    title = excluded.title,
    short_description = excluded.short_description,
    description = excluded.description,
    metal_type = excluded.metal_type,
    primary_stone = excluded.primary_stone,
    merchandising_area = excluded.merchandising_area,
    attributes = excluded.attributes,
    raw_payload = excluded.raw_payload,
    is_active = excluded.is_active,
    is_featured = excluded.is_featured,
    last_synced_at = now();

-- 4. Catalog Images (replace images for seeded items idempotently)
delete from public.catalog_images
where item_id in (
  select id from public.catalog_items
  where supplier_sku in (
    '309:77802:S', '309:77802:W', '309:77802:P',
    '124056:101:S', '124056:101:R',
    'Q12345Y', 'Q12345W',
    'QE88410W', 'QE88410Y',
    '65422:100:P', 'QB44120Y'
  )
);

insert into public.catalog_images (item_id, thumbnail_url, full_url, zoom_url, angle, sort_order, is_primary)
select
  ci.id,
  img.thumbnail_url,
  img.full_url,
  img.zoom_url,
  img.angle,
  img.sort_order,
  img.is_primary
from public.catalog_items ci
join (
  values
    ('309:77802:S', '/images/catalog/solitaire-yg.svg', '/images/catalog/solitaire-yg.svg', '/images/catalog/solitaire-yg.svg', 'front', 0, true),
    ('309:77802:W', '/images/catalog/solitaire-wg.svg', '/images/catalog/solitaire-wg.svg', '/images/catalog/solitaire-wg.svg', 'front', 0, true),
    ('309:77802:P', '/images/catalog/solitaire-pt.svg', '/images/catalog/solitaire-pt.svg', '/images/catalog/solitaire-pt.svg', 'front', 0, true),
    ('124056:101:S', '/images/catalog/pave-band-wg.svg', '/images/catalog/pave-band-wg.svg', '/images/catalog/pave-band-wg.svg', 'front', 0, true),
    ('124056:101:R', '/images/catalog/pave-band-rg.svg', '/images/catalog/pave-band-rg.svg', '/images/catalog/pave-band-rg.svg', 'front', 0, true),
    ('Q12345Y', '/images/catalog/pendant-yg.svg', '/images/catalog/pendant-yg.svg', '/images/catalog/pendant-yg.svg', 'front', 0, true),
    ('Q12345W', '/images/catalog/pendant-wg.svg', '/images/catalog/pendant-wg.svg', '/images/catalog/pendant-wg.svg', 'front', 0, true),
    ('QE88410W', '/images/catalog/studs-wg.svg', '/images/catalog/studs-wg.svg', '/images/catalog/studs-wg.svg', 'front', 0, true),
    ('QE88410Y', '/images/catalog/studs-yg.svg', '/images/catalog/studs-yg.svg', '/images/catalog/studs-yg.svg', 'front', 0, true),
    ('65422:100:P', '/images/catalog/sapphire-halo.svg', '/images/catalog/sapphire-halo.svg', '/images/catalog/sapphire-halo.svg', 'front', 0, true),
    ('QB44120Y', '/images/catalog/herringbone-yg.svg', '/images/catalog/herringbone-yg.svg', '/images/catalog/herringbone-yg.svg', 'front', 0, true)
) as img(sku, thumbnail_url, full_url, zoom_url, angle, sort_order, is_primary)
  on ci.supplier_sku = img.sku;
