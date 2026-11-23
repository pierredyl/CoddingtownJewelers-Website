import { unstable_cache } from "next/cache";
import { CATALOG_SHOWCASE_SECTIONS } from "@/config/catalogShowcase";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getCategories,
  getCategoryListingsPage,
  getCategoryShowcaseSummaries,
  getEverydayEssentialSamples,
  getGroupsBySkus,
  type CategoryListingsPageResult,
  type CategoryShowcaseSummary,
} from "@/lib/supabase/queries";
import type { CatalogItemGroup, CategorySummary } from "@/lib/supabase/types";

/**
 * Shared Next.js Data Cache tag for all catalogue queries.
 * Trigger `POST /api/revalidate` after a catalog sync to bust this tag immediately.
 */
export const CATALOG_CACHE_TAG = "catalog";

/**
 * Default TTL: 24 hours (86,400 seconds).
 */
export const CATALOG_CACHE_TTL_SECONDS = (() => {
  const raw = process.env.CATALOG_CACHE_TTL_SECONDS;
  if (!raw) return 86400;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86400;
})();

// Throw on transient null inside unstable_cache so Next.js NEVER caches a failed DB call for 24h!
const fetchCachedCategories = unstable_cache(
  async (): Promise<CategorySummary[]> => {
    const res = await getCategories();
    if (!res) throw new Error("Transient Supabase failure loading categories");
    return res;
  },
  ["catalog-categories-v2"],
  {
    revalidate: CATALOG_CACHE_TTL_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  }
);

const fetchCachedShowcaseSummaries = unstable_cache(
  async (): Promise<CategoryShowcaseSummary[]> => {
    const res = await getCategoryShowcaseSummaries();
    if (!res) throw new Error("Transient Supabase failure loading showcase");
    return res;
  },
  ["catalog-showcase-summaries-v2"],
  {
    revalidate: CATALOG_CACHE_TTL_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  }
);

/**
 * Deterministic daily rotation bucket (0..3) so the cached first page pulls
 * fresh pieces from deeper in the 62,000+ SKU catalogue each day at 0 DB cost.
 */
function getDailyRotationBucket(): number {
  return Math.floor(Date.now() / 86_400_000) % 4;
}

const fetchCachedCategoryFirstPage = unstable_cache(
  async (
    categorySlug: string,
    dailyBucket: number
  ): Promise<CategoryListingsPageResult> => {
    const rotatingOffset = dailyBucket * 400;
    const res = await getCategoryListingsPage({
      categorySlug,
      offset: rotatingOffset,
      batchSize: 400,
    });
    if (!res) {
      throw new Error(`Transient Supabase failure loading ${categorySlug}`);
    }
    // Safely fall back to offset 0 for smaller categories if the rotated window is sparse
    if (res.groups.length < 24 && rotatingOffset > 0) {
      const fallback = await getCategoryListingsPage({
        categorySlug,
        offset: 0,
        batchSize: 400,
      });
      if (fallback) return fallback;
    }
    return res;
  },
  ["catalog-category-page1-v4"],
  {
    revalidate: CATALOG_CACHE_TTL_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  }
);

export async function getCachedCategories(): Promise<CategorySummary[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await fetchCachedCategories();
  } catch {
    return null;
  }
}

export async function getCachedCategoryShowcaseSummaries(): Promise<
  CategoryShowcaseSummary[] | null
> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await fetchCachedShowcaseSummaries();
  } catch {
    return null;
  }
}

export async function getCachedCategoryFirstPage(
  categorySlug: string
): Promise<CategoryListingsPageResult | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await fetchCachedCategoryFirstPage(
      categorySlug.trim().toLowerCase(),
      getDailyRotationBucket()
    );
  } catch {
    return null;
  }
}

/**
 * Assembles up to 10 curated sample pieces per editorial section on `/catalogue`:
 * 1. Places any manually configured `section.featuredCarouselSkus` FIRST in exact order.
 * 2. Automatically backfills remaining slots (or any unavailable SKUs) from the
 *    smart-merchandised category pools with zero duplicates.
 */
export async function getCachedSectionSamples(): Promise<
  Record<string, CatalogItemGroup[]>
> {
  const result: Record<string, CatalogItemGroup[]> = {};
  if (!isSupabaseConfigured()) return result;

  const uniqueSlugs = Array.from(
    new Set(CATALOG_SHOWCASE_SECTIONS.flatMap((s) => s.sampleSlugs))
  );
  const allManualSkus = Array.from(
    new Set(CATALOG_SHOWCASE_SECTIONS.flatMap((s) => s.featuredCarouselSkus ?? []))
  );

  const [pages, manualGroups] = await Promise.all([
    Promise.all(
      uniqueSlugs.map(async (slug) => ({
        slug,
        page: await getCachedCategoryFirstPage(slug),
      }))
    ),
    getGroupsBySkus(allManualSkus),
  ]);

  const bySlug = new Map(pages.map((p) => [p.slug, p.page?.groups ?? []]));
  const manualBySku = new Map<string, CatalogItemGroup>();
  for (const g of manualGroups) {
    for (const v of g.variants) {
      manualBySku.set(v.supplierSku, g);
    }
  }

  for (const section of CATALOG_SHOWCASE_SECTIONS) {
    const merged: CatalogItemGroup[] = [];
    const seen = new Set<string>();
    const maxPerSection = 10;

    // 1. Manual carousel picks first (exact user-defined order)
    for (const sku of section.featuredCarouselSkus ?? []) {
      const g = manualBySku.get(sku.trim());
      if (
        g &&
        !seen.has(g.groupKey) &&
        (g.defaultVariant.images[0]?.fullUrl ||
          g.defaultVariant.images[0]?.thumbnailUrl)
      ) {
        seen.add(g.groupKey);
        merged.push(g);
      }
    }

    // 2. Automatic fallback backfill from smart-merchandised category pools
    const pools = section.sampleSlugs.map((slug) =>
      (bySlug.get(slug) ?? []).filter((g) =>
        Boolean(
          g.defaultVariant.images[0]?.fullUrl ||
            g.defaultVariant.images[0]?.thumbnailUrl
        )
      )
    );

    for (
      let round = 0;
      round < maxPerSection && merged.length < maxPerSection;
      round++
    ) {
      for (const pool of pools) {
        const item = pool[round];
        if (item && !seen.has(item.groupKey) && merged.length < maxPerSection) {
          seen.add(item.groupKey);
          merged.push(item);
        }
      }
    }

    result[section.id] = merged;
  }

  return result;
}

const fetchCachedEverydaySamples = unstable_cache(
  async (): Promise<CatalogItemGroup[]> => {
    return getEverydayEssentialSamples();
  },
  ["catalog-home-everyday-samples-v1"],
  {
    revalidate: CATALOG_CACHE_TTL_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  }
);

/**
 * Picks a balanced 12-piece cross-category showcase for the Home Page (`/`),
 * interleaving high-luxury 14K/18K/Platinum diamond & gemstone centerpieces
 * with approachable everyday Sterling Silver & 10K Gold pieces.
 */
export async function getCachedHomeFeaturedSamples(): Promise<
  CatalogItemGroup[]
> {
  if (!isSupabaseConfigured()) return [];

  const [sectionMap, everydaySamples] = await Promise.all([
    getCachedSectionSamples(),
    fetchCachedEverydaySamples().catch(() => [] as CatalogItemGroup[]),
  ]);

  const sectionIds = CATALOG_SHOWCASE_SECTIONS.map((s) => s.id);
  const luxuryPool: CatalogItemGroup[] = [];
  const seenLuxury = new Set<string>();

  for (let round = 0; round < 3 && luxuryPool.length < 12; round++) {
    for (const id of sectionIds) {
      const item = sectionMap[id]?.[round];
      if (item && !seenLuxury.has(item.groupKey) && luxuryPool.length < 12) {
        seenLuxury.add(item.groupKey);
        luxuryPool.push(item);
      }
    }
  }

  // Interleave Luxury (rings, necklaces, bracelets, earrings, gemstones) and
  // Everyday (Sterling Silver & 10K Gold) so the carousel spans our full range.
  const picked: CatalogItemGroup[] = [];
  const seen = new Set<string>();
  const targetCount = 12;
  let luxIdx = 0;
  let evIdx = 0;

  // Pattern: Luxury, Everyday, Luxury, Luxury, Everyday, Luxury, Everyday, ...
  const pattern: Array<"luxury" | "everyday"> = [
    "luxury",
    "everyday",
    "luxury",
    "luxury",
    "everyday",
    "luxury",
    "everyday",
    "luxury",
    "everyday",
    "luxury",
    "everyday",
    "luxury",
  ];

  function takeNext(source: CatalogItemGroup[], kind: "luxury" | "everyday") {
    let idx = kind === "luxury" ? luxIdx : evIdx;
    while (idx < source.length) {
      const item = source[idx++];
      if (!seen.has(item.groupKey)) {
        if (kind === "luxury") luxIdx = idx;
        else evIdx = idx;
        seen.add(item.groupKey);
        return item;
      }
    }
    if (kind === "luxury") luxIdx = idx;
    else evIdx = idx;
    return null;
  }

  for (const slot of pattern) {
    if (picked.length >= targetCount) break;
    const primary =
      slot === "everyday"
        ? takeNext(everydaySamples, "everyday")
        : takeNext(luxuryPool, "luxury");
    const chosen =
      primary ??
      (slot === "everyday"
        ? takeNext(luxuryPool, "luxury")
        : takeNext(everydaySamples, "everyday"));
    if (chosen) {
      picked.push(chosen);
    }
  }

  return picked;
}
