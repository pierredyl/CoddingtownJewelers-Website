# Supabase Database & Supplier Sync Setup

This catalog stores **only jewelry metadata and exact manufacturer Item #s (`supplier_sku`)**—no pricing is stored in Postgres, keeping Stuller & Quality Gold syncs infrequent and API costs near zero.

## 1. Link & Apply Migrations to Your Supabase Project

### Option A: Supabase CLI (Recommended)

```bash
# 1. Authenticate and link to your hosted Supabase project
npx supabase login
npx supabase link --project-ref <your-project-ref>

# 2. Push the schema migration (tables, indexes, generated tsvector, RLS policies)
npx supabase db push

# 3. Seed suppliers, storefront categories, and sample Stuller / Quality Gold items
npx supabase db execute --file supabase/seed.sql
```

### Option B: Local Development with Supabase CLI

```bash
npx supabase start
npx supabase db reset   # runs migrations/0001_initial_catalog_schema.sql + seed.sql
```

### Option C: Supabase Dashboard SQL Editor

1. Open **SQL Editor** in your Supabase dashboard.
2. Run [`supabase/migrations/0001_initial_catalog_schema.sql`](migrations/0001_initial_catalog_schema.sql).
3. Run [`supabase/seed.sql`](seed.sql).

## 2. Environment Variables

Add these to `.env.local` (never commit `.env.local` or your service-role key):

```env
# Public storefront access (safe for Next.js client & server components)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Server/CLI sync scripts ONLY (bypasses RLS to upsert catalog & log sync_runs)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Stuller API v2 (Basic Auth over SSL using your Stuller Developer Login)
STULLER_USERNAME=<your-stuller-username>
STULLER_PASSWORD=<your-stuller-password>
STULLER_API_BASE_URL=https://api.stuller.com/v2/products

# Optional default path to a local Quality Gold CSV or XML data feed
QUALITY_GOLD_FEED_PATH=./feeds/quality-gold.csv
```

> **Graceful fallback:** If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are omitted, `src/lib/supabase/queries.ts` returns `null` so the storefront automatically falls back to local mock catalog data.

## 3. Running Supplier Catalog Syncs

All sync runs strip any price/cost fields before writing to Postgres and record audit history in `public.sync_runs`.

```bash
# Dry-run Quality Gold CSV or XML feed (validates & prints sample without DB writes)
npx tsx scripts/sync-catalog.ts --supplier=quality_gold --file=./feeds/qgold.csv --dry-run

# Sync a Quality Gold feed into Supabase
npx tsx scripts/sync-catalog.ts --supplier=quality_gold --file=./feeds/qgold.csv

# Sync specific Stuller SKUs via Stuller API v2
npx tsx scripts/sync-catalog.ts --supplier=stuller --skus=309:77802:S,309:77802:W

# Full sync for both suppliers (optionally deactivate SKUs no longer in the feed)
npx tsx scripts/sync-catalog.ts --supplier=all --file=./feeds/qgold.xml --deactivate-missing
```

## 4. Row-Level Security (RLS) Summary

| Table | `anon` / `authenticated` | `service_role` (CLI / Server) |
| :--- | :--- | :--- |
| `suppliers` | `SELECT` only | Full access |
| `categories` | `SELECT` only | Full access |
| `catalog_items` | `SELECT` where `is_active = true` | Full access |
| `catalog_images` | `SELECT` for active items only | Full access |
| `inquiries` | `INSERT` only (no public reads) | Full access |
| `sync_runs` | No public access | Full access |
