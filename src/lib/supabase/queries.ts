import {
  CARAT_WEIGHT_TIER_OPTIONS,
  CHAIN_WIDTH_TIER_OPTIONS,
  EARRING_SIZE_TIER_OPTIONS,
  GEMSTONE_JEWELRY_TYPE_OPTIONS,
  PENDANT_CHAIN_OPTIONS,
  RING_WIDTH_TIER_OPTIONS,
  STONE_ORIGIN_OPTIONS,
  SURFACE_FINISH_OPTIONS,
  getMetalFilterSqlSpec,
  getStoneShapeOptionsForCategory,
  getStyleOptionsForCategory,
} from "@/config/catalogFilters";
import {
  compareSizeOrLength,
  isCleanLengthOption,
} from "../catalog/formatters";
import { merchandiseCatalogGroups } from "../catalog/merchandising";
import {
  parseCatalogSearchQuery,
  relaxParsedQuery,
  type ParsedSearchQuery,
} from "../search/queryParser";
import { getSupabaseClient } from "./client";
import type {
  CatalogFilterParams,
  CatalogImage,
  CatalogItemGroup,
  CatalogVariant,
  CategorySummary,
  InquiryInput,
  InquiryResult,
} from "./types";

interface RawJoinedCatalogRow {
  id: number;
  supplier_sku: string;
  supplier_item_id: string | null;
  group_code: string | null;
  title: string;
  short_description: string | null;
  description: string | null;
  metal_type: string | null;
  primary_stone: string | null;
  merchandising_area: string | null;
  attributes: Record<string, string | number | boolean | null> | null;
  is_featured: boolean;
  suppliers:
  | { code: string; name: string }
  | { code: string; name: string }[]
  | null;
  categories:
  | { slug: string; name: string }
  | { slug: string; name: string }[]
  | null;
  catalog_images?:
  | {
    id: number;
    thumbnail_url: string | null;
    full_url: string;
    zoom_url: string | null;
    angle: string | null;
    sort_order: number;
    is_primary: boolean;
  }[]
  | null;
}

export interface CategoryShowcaseSummary {
  category: CategorySummary;
  groupCount: number;
  variantCount: number;
  previewImageUrl: string;
  previewAlt: string;
}

export const STONE_NONE_VALUE = "__none__";
export const RING_SIZE_SIZABLE_VALUE = "__sizable__";

export interface CategoryListingsPageResult {
  groups: CatalogItemGroup[];
  totalSkus: number;
  hasMore: boolean;
  nextOffset: number;
  metalOptions: string[];
  stoneOptions: string[];
  hasNoStoneItems: boolean;
  hasSizableItems: boolean;
  lengthOptions: string[];
  closureOptions: string[];
  ringSizeOptions: string[];
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function pickAttr(
  attrs: Record<string, string | number | boolean | null> | null | undefined,
  keys: string[]
): string | null {
  if (!attrs) return null;
  for (const key of keys) {
    const val = attrs[key];
    if (val !== null && val !== undefined && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return null;
}

function mapRowToVariant(
  row: RawJoinedCatalogRow,
  imageMap?: Map<number, CatalogImage[]>
): CatalogVariant {
  const supplier = unwrapSingle(row.suppliers);
  const category = unwrapSingle(row.categories);

  const images: CatalogImage[] =
    imageMap?.get(row.id) ??
    (row.catalog_images ?? [])
      .slice()
      .sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.id - b.id;
      })
      .map((img) => ({
        id: img.id,
        thumbnailUrl: img.thumbnail_url,
        fullUrl: img.full_url,
        zoomUrl: img.zoom_url,
        angle: img.angle,
        sortOrder: img.sort_order,
        isPrimary: img.is_primary,
      }));

  return {
    id: row.id,
    supplierCode: supplier?.code ?? "unknown",
    supplierName: supplier?.name ?? "Unknown Supplier",
    supplierSku: row.supplier_sku,
    supplierItemId: row.supplier_item_id,
    groupCode: row.group_code,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    metalType: row.metal_type,
    primaryStone: row.primary_stone,
    merchandisingArea: row.merchandising_area,
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? null,
    attributes: row.attributes ?? {},
    isFeatured: row.is_featured,
    images,
  };
}

/**
 * Fetches primary images for a small set of item IDs in a single fast indexed query.
 */
async function fetchPrimaryImagesByItemIds(
  itemIds: number[]
): Promise<Map<number, CatalogImage[]>> {
  const map = new Map<number, CatalogImage[]>();
  const supabase = getSupabaseClient();
  if (!supabase || itemIds.length === 0) return map;

  for (let i = 0; i < itemIds.length; i += 150) {
    const chunk = itemIds.slice(i, i + 150);
    const { data, error } = await supabase
      .from("catalog_images")
      .select(
        "id, item_id, thumbnail_url, full_url, zoom_url, angle, sort_order, is_primary"
      )
      .in("item_id", chunk)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch catalog images: ${error.message}`);
    }

    for (const row of data ?? []) {
      const existing = map.get(row.item_id) ?? [];
      if (existing.length === 0) {
        existing.push({
          id: row.id,
          thumbnailUrl: row.thumbnail_url,
          fullUrl: row.full_url,
          zoomUrl: row.zoom_url,
          angle: row.angle,
          sortOrder: row.sort_order,
          isPrimary: row.is_primary,
        });
        map.set(row.item_id, existing);
      }
    }
  }

  return map;
}

/**
 * Groups flat catalog variants by `(groupCode, primaryStone)` so each distinct
 * gemstone is its own clean card (with only its metal/size/length options)
 * instead of lumping 120+ different gemstones into one giant card.
 */
export function groupCatalogVariants(
  variants: CatalogVariant[]
): CatalogItemGroup[] {
  const groups = new Map<string, CatalogVariant[]>();

  for (const variant of variants) {
    const baseKey = variant.groupCode?.trim()
      ? variant.groupCode.trim()
      : `${variant.supplierCode}:${variant.supplierSku}`;

    const stonePart = variant.primaryStone?.trim().toLowerCase() ?? "";
    const key = stonePart ? `${baseKey}::${stonePart}` : baseKey;

    const existing = groups.get(key);
    if (existing) {
      existing.push(variant);
    } else {
      groups.set(key, [variant]);
    }
  }

  const result: CatalogItemGroup[] = [];

  for (const [groupKey, groupVariants] of groups.entries()) {
    const sorted = groupVariants.slice().sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.supplierSku.localeCompare(b.supplierSku);
    });
    const defaultVariant = sorted[0];

    result.push({
      groupKey,
      groupCode: defaultVariant.groupCode,
      title: defaultVariant.title,
      shortDescription: defaultVariant.shortDescription,
      description: defaultVariant.description,
      categorySlug: defaultVariant.categorySlug,
      categoryName: defaultVariant.categoryName,
      supplierCode: defaultVariant.supplierCode,
      supplierName: defaultVariant.supplierName,
      isFeatured: sorted.some((v) => v.isFeatured),
      defaultVariant,
      variants: sorted,
    });
  }

  return result;
}

/**
 * Resolves primary studio image URLs for a list of preferred showcase SKUs
 * in one fast indexed lookup (used by `/catalogue` curated section cards).
 */
export async function getPrimaryImagesBySkus(
  skus: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const supabase = getSupabaseClient();
  const cleanSkus = Array.from(
    new Set(skus.map((s) => s.trim()).filter(Boolean))
  );
  if (!supabase || cleanSkus.length === 0) return result;

  const { data: itemRows } = await supabase
    .from("catalog_items")
    .select("id, supplier_sku")
    .in("supplier_sku", cleanSkus)
    .eq("is_active", true);

  if (!itemRows || itemRows.length === 0) return result;

  const imageMap = await fetchPrimaryImagesByItemIds(
    itemRows.map((r) => r.id)
  );
  for (const row of itemRows) {
    const img = imageMap.get(row.id)?.[0];
    const url = img?.fullUrl || img?.thumbnailUrl || "";
    if (url) {
      result[row.supplier_sku] = url;
    }
  }
  return result;
}

/**
 * Fetches full `CatalogItemGroup` entries for a curated list of Item #s (SKUs),
 * preserving the caller's exact manual order and skipping any unavailable SKUs.
 */
export async function getGroupsBySkus(
  skus: string[]
): Promise<CatalogItemGroup[]> {
  const supabase = getSupabaseClient();
  const cleanSkus = Array.from(
    new Set(skus.map((s) => s.trim()).filter(Boolean))
  );
  if (!supabase || cleanSkus.length === 0) return [];

  const { data, error } = await supabase
    .from("catalog_items")
    .select(
      `
      id,
      supplier_sku,
      supplier_item_id,
      group_code,
      title,
      metal_type,
      primary_stone,
      merchandising_area,
      attributes,
      is_featured,
      suppliers ( code, name ),
      categories ( slug, name )
    `
    )
    .in("supplier_sku", cleanSkus)
    .eq("is_active", true);

  if (error || !data || data.length === 0) return [];

  const rows = data as unknown as RawJoinedCatalogRow[];
  const imageMap = await fetchPrimaryImagesByItemIds(rows.map((r) => r.id));
  const variants = rows.map((r) =>
    mapRowToVariant(
      { ...r, short_description: null, description: null, attributes: null },
      imageMap
    )
  );
  const grouped = groupCatalogVariants(variants);

  // Order groups strictly by the caller's manual SKU sequence
  const bySku = new Map<string, CatalogItemGroup>();
  for (const g of grouped) {
    for (const v of g.variants) {
      bySku.set(v.supplierSku, g);
    }
  }

  const ordered: CatalogItemGroup[] = [];
  const seenKeys = new Set<string>();
  for (const sku of cleanSkus) {
    const g = bySku.get(sku);
    if (g && !seenKeys.has(g.groupKey)) {
      seenKeys.add(g.groupKey);
      ordered.push(g);
    }
  }
  return ordered;
}

/**
 * Fetches curated everyday Sterling Silver & 10K Gold samples across core
 * jewelry categories (necklaces/chains, earrings, fashion rings, bracelets)
 * so the Home Page showcases both approachable everyday pieces and high-luxury designs.
 */
export async function getEverydayEssentialSamples(): Promise<
  CatalogItemGroup[]
> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const targetSlugs = [
    "necklaces-pendants",
    "earrings",
    "fashion-rings",
    "bracelets",
  ];

  const { data: catRows, error: catErr } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", targetSlugs);

  if (catErr || !catRows || catRows.length === 0) return [];

  const perCatPools = await Promise.all(
    targetSlugs.map(async (slug) => {
      const cat = catRows.find((c) => c.slug === slug);
      if (!cat) return [];

      const { data, error } = await supabase
        .from("catalog_items")
        .select(
          `
          id,
          supplier_sku,
          supplier_item_id,
          group_code,
          title,
          metal_type,
          primary_stone,
          merchandising_area,
          attributes,
          is_featured,
          suppliers ( code, name ),
          categories ( slug, name )
        `
        )
        .eq("category_id", cat.id)
        .eq("is_active", true)
        .or("metal_type.ilike.%sterling silver%,metal_type.ilike.%10k%")
        .order("is_featured", { ascending: false })
        .order("id", { ascending: false })
        .limit(40);

      if (error || !data || data.length === 0) return [];

      const rows = data as unknown as RawJoinedCatalogRow[];
      const imageMap = await fetchPrimaryImagesByItemIds(rows.map((r) => r.id));
      const variants = rows.map((r) =>
        mapRowToVariant(
          { ...r, short_description: null, description: null },
          imageMap
        )
      );

      return groupCatalogVariants(variants).filter((g) =>
        Boolean(
          g.defaultVariant.images[0]?.fullUrl ||
          g.defaultVariant.images[0]?.thumbnailUrl
        )
      );
    })
  );

  const picked: CatalogItemGroup[] = [];
  const seen = new Set<string>();
  const maxItems = 8;

  for (let round = 0; round < 3 && picked.length < maxItems; round++) {
    for (const pool of perCatPools) {
      const candidate =
        round === 0
          ? (pool.find(
            (g) =>
              !seen.has(g.groupKey) &&
              (g.defaultVariant.metalType ?? "")
                .toLowerCase()
                .includes("sterling silver")
          ) ?? pool.find((g) => !seen.has(g.groupKey)))
          : pool.find((g) => !seen.has(g.groupKey));

      if (candidate && picked.length < maxItems) {
        seen.add(candidate.groupKey);
        picked.push(candidate);
      }
    }
  }

  return picked;
}

/**
 * Fetches storefront categories ordered by `sort_order`.
 */
export async function getCategories(): Promise<CategorySummary[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, slug, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error || !data) {
    return null;
  }

  return data.map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sort_order,
  }));
}

/**
 * Fast, indexed query for the `/catalogue` landing page.
 */
export async function getCategoryShowcaseSummaries(): Promise<
  CategoryShowcaseSummary[] | null
> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const categories = await getCategories();
  if (!categories) {
    return null;
  }

  const perCategoryStats = await Promise.all(
    categories.map(async (category) => {
      const [countRes, repRes] = await Promise.all([
        supabase
          .from("catalog_items")
          .select("id", { count: "exact", head: true })
          .eq("category_id", category.id)
          .eq("is_active", true),
        supabase
          .from("catalog_items")
          .select("id, title")
          .eq("category_id", category.id)
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        category,
        variantCount: countRes.count ?? 0,
        repItem: repRes.data ?? null,
        hadError: Boolean(countRes.error || repRes.error),
      };
    })
  );

  if (
    perCategoryStats.length > 0 &&
    perCategoryStats.every((entry) => entry.hadError)
  ) {
    return null;
  }

  const repIds = perCategoryStats
    .map((entry) => entry.repItem?.id)
    .filter((id): id is number => typeof id === "number");

  const imageMap = await fetchPrimaryImagesByItemIds(repIds);

  return perCategoryStats.map(({ category, variantCount, repItem }) => {
    const img = repItem ? imageMap.get(repItem.id)?.[0] : undefined;
    return {
      category,
      groupCount: variantCount,
      variantCount,
      previewImageUrl: img?.fullUrl || img?.thumbnailUrl || "",
      previewAlt: repItem ? `${category.name} — ${repItem.title}` : category.name,
    };
  });
}

function escapeJsonValue(value: string): string {
  // Strip PostgREST .or() grammar delimiters (`,`, `(`, `)`) and ilike wildcards (`%`, `*`)
  // in addition to escaping JSON backslashes and quotes to prevent filter injection / PGRST100 errors.
  return value
    .replace(/[,()*%]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .trim();
}

/**
 * Fast, server-paginated category listing query for `/catalogue/[slug]` and
 * `GET /api/catalog/category`, supporting category-specific filters (Length,
 * Closure, Ring Size) via Postgres's GIN `attributes` index.
 */
export type CatalogAudience = "men" | "women";

export async function getCategoryListingsPage(params: {
  categorySlug: string;
  categorySlugs?: string[];
  offset?: number;
  batchSize?: number;
  audience?: CatalogAudience;
  audiences?: CatalogAudience[];
  styles?: string[];
  chainStyles?: string[];
  widths?: string[];
  bandFits?: string[];
  bandProfiles?: string[];
  edgeDetails?: string[];
  stoneShapes?: string[];
  settingStates?: string[];
  stoneOrigins?: string[];
  caratTiers?: string[];
  jewelryTypes?: string[];
  finishes?: string[];
  earringSizes?: string[];
  pendantChains?: string[];
  adjustableOnly?: boolean;
  metalType?: string;
  metalTypes?: string[];
  primaryStone?: string;
  primaryStones?: string[];
  length?: string;
  lengths?: string[];
  closure?: string;
  closures?: string[];
  ringSize?: string;
  ringSizes?: string[];
  sizableOnly?: boolean;
  search?: string;
}): Promise<CategoryListingsPageResult | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const slug = params.categorySlug.trim().toLowerCase();
  const isAllCategories = slug === "all";
  const rawSearch = params.search?.trim() ?? "";
  const parsedSearch = rawSearch ? parseCatalogSearchQuery(rawSearch) : null;

  const explicitCategorySlugs = Array.from(
    new Set(
      (params.categorySlugs ?? [])
        .map((s) => s.trim().toLowerCase())
        .filter((s) => Boolean(s) && s !== "all")
    )
  );
  // Resolve parsed category intent up front so Postgres uses the single-category
  // composite index `(category_id, is_featured DESC, id DESC)` instead of scanning `catalog_items_pkey`!
  const categorySlugs =
    explicitCategorySlugs.length > 0
      ? explicitCategorySlugs
      : isAllCategories &&
        parsedSearch &&
        !parsedSearch.skuQuery &&
        parsedSearch.categorySlugs.length > 0
        ? parsedSearch.categorySlugs
        : [];

  let categoryIdsToFilter: number[] | null = null;
  if (isAllCategories) {
    if (categorySlugs.length > 0) {
      const { data: catRows, error: catErr } = await supabase
        .from("categories")
        .select("id, slug")
        .in("slug", categorySlugs);
      if (catErr) return null;
      categoryIdsToFilter = (catRows ?? []).map((r) => r.id);
      if (categoryIdsToFilter.length === 0) {
        return {
          groups: [],
          totalSkus: 0,
          hasMore: false,
          nextOffset: 0,
          metalOptions: [],
          stoneOptions: [],
          hasNoStoneItems: false,
          hasSizableItems: false,
          lengthOptions: [],
          closureOptions: [],
          ringSizeOptions: [],
        };
      }
    }
  } else {
    const { data: catRow, error: catErr } = await supabase
      .from("categories")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (catErr) return null;
    if (!catRow) {
      return {
        groups: [],
        totalSkus: 0,
        hasMore: false,
        nextOffset: 0,
        metalOptions: [],
        stoneOptions: [],
        hasNoStoneItems: false,
        hasSizableItems: false,
        lengthOptions: [],
        closureOptions: [],
        ringSizeOptions: [],
      };
    }
    categoryIdsToFilter = [catRow.id];
  }

  const offset = Math.max(0, params.offset ?? 0);
  const defaultBatch = isAllCategories ? 200 : 400;
  const batchSize = Math.min(Math.max(params.batchSize ?? defaultBatch, 48), isAllCategories ? 240 : 500);

  // Normalize single & multi-select filter inputs
  const audiences = Array.from(
    new Set(
      [...(params.audiences ?? []), ...(params.audience ? [params.audience] : [])]
        .filter((a): a is CatalogAudience => a === "men" || a === "women")
    )
  );
  // Selecting both Men's and Women's is equivalent to no audience restriction
  const effectiveAudience: CatalogAudience | undefined =
    audiences.length === 1 ? audiences[0] : undefined;

  const styles = Array.from(
    new Set((params.styles ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const chainStyles = Array.from(
    new Set((params.chainStyles ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const widths = Array.from(
    new Set((params.widths ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const bandFits = Array.from(
    new Set((params.bandFits ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const bandProfiles = Array.from(
    new Set((params.bandProfiles ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const edgeDetails = Array.from(
    new Set((params.edgeDetails ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const stoneShapes = Array.from(
    new Set((params.stoneShapes ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const settingStates = Array.from(
    new Set((params.settingStates ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const stoneOrigins = Array.from(
    new Set((params.stoneOrigins ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const caratTiers = Array.from(
    new Set((params.caratTiers ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const jewelryTypes = Array.from(
    new Set((params.jewelryTypes ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const finishes = Array.from(
    new Set((params.finishes ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const earringSizes = Array.from(
    new Set((params.earringSizes ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const pendantChains = Array.from(
    new Set((params.pendantChains ?? []).map((s) => s.trim()).filter(Boolean))
  );
  const adjustableOnly = Boolean(params.adjustableOnly);
  const metalTypes = Array.from(
    new Set(
      [
        ...(params.metalTypes ?? []),
        ...(params.metalType?.trim() ? [params.metalType.trim()] : []),
      ].filter(Boolean)
    )
  );
  const primaryStones = Array.from(
    new Set(
      [
        ...(params.primaryStones ?? []),
        ...(params.primaryStone?.trim() ? [params.primaryStone.trim()] : []),
      ].filter(Boolean)
    )
  );
  const lengths = Array.from(
    new Set(
      [
        ...(params.lengths ?? []),
        ...(params.length?.trim() ? [params.length.trim()] : []),
      ].filter(Boolean)
    )
  );
  const closures = Array.from(
    new Set(
      [
        ...(params.closures ?? []),
        ...(params.closure?.trim() ? [params.closure.trim()] : []),
      ].filter(Boolean)
    )
  );
  const rawRingSizes = Array.from(
    new Set(
      [
        ...(params.ringSizes ?? []),
        ...(params.ringSize?.trim() ? [params.ringSize.trim()] : []),
      ].filter(Boolean)
    )
  );
  const sizableOnly =
    Boolean(params.sizableOnly) ||
    rawRingSizes.includes(RING_SIZE_SIZABLE_VALUE);
  const ringSizes = rawRingSizes.filter((s) => s !== RING_SIZE_SIZABLE_VALUE);

  const hasFilter = Boolean(
    effectiveAudience ||
    categorySlugs.length > 0 ||
    styles.length > 0 ||
    chainStyles.length > 0 ||
    widths.length > 0 ||
    bandFits.length > 0 ||
    bandProfiles.length > 0 ||
    edgeDetails.length > 0 ||
    stoneShapes.length > 0 ||
    settingStates.length > 0 ||
    stoneOrigins.length > 0 ||
    caratTiers.length > 0 ||
    jewelryTypes.length > 0 ||
    finishes.length > 0 ||
    earringSizes.length > 0 ||
    pendantChains.length > 0 ||
    adjustableOnly ||
    metalTypes.length > 0 ||
    primaryStones.length > 0 ||
    lengths.length > 0 ||
    closures.length > 0 ||
    ringSizes.length > 0 ||
    sizableOnly ||
    params.search?.trim()
  );

  // Use `{ count: "exact" }` only on unfiltered B-tree category views; for filtered
  // JSONB/FTS views, fetch `batchSize + 1` rows to compute `hasMore` without an
  // expensive full COUNT(*) over a GIN bitmap scan (prevents 3s statement timeouts).
  let query = supabase
    .from("catalog_items")
    .select(
      `
      id,
      supplier_sku,
      supplier_item_id,
      group_code,
      title,
      metal_type,
      primary_stone,
      merchandising_area,
      attributes,
      is_featured,
      suppliers ( code, name ),
      categories ( slug, name )
    `,
      hasFilter || isAllCategories ? undefined : { count: "exact" }
    )
    .eq("is_active", true);

  if (categoryIdsToFilter && categoryIdsToFilter.length === 1) {
    query = query
      .eq("category_id", categoryIdsToFilter[0])
      .order("is_featured", { ascending: false })
      .order("id", { ascending: false });
  } else if (categoryIdsToFilter && categoryIdsToFilter.length > 1) {
    query = query.in("category_id", categoryIdsToFilter);
    if (!hasFilter) {
      query = query.order("id", { ascending: false });
    }
  } else if (!hasFilter) {
    // Unfiltered all-categories view: order by primary key `id DESC` so Postgres uses
    // `catalog_items_pkey` in < 20ms instead of sorting all 86K+ rows.
    // For filtered all-categories searches, omit `ORDER BY id DESC` so Postgres uses
    // GIN/B-tree bitmap index scans instead of walking `catalog_items_pkey` backwards.
    query = query.order("id", { ascending: false });
  }

  query = query.range(
    offset,
    offset + (hasFilter || isAllCategories ? batchSize : batchSize - 1)
  );

  if (metalTypes.length > 0) {
    const specs = metalTypes.map((m) => getMetalFilterSqlSpec(m));
    const clauses = Array.from(new Set(specs.flatMap((s) => s.orClauses)));
    if (clauses.length === 1) {
      const single = clauses[0];
      if (single.startsWith("metal_type.ilike.")) {
        query = query.ilike(
          "metal_type",
          single.slice("metal_type.ilike.".length)
        );
      } else {
        query = query.or(single);
      }
    } else if (clauses.length > 1) {
      query = query.or(clauses.join(","));
    }
    const wantsPlated = metalTypes.includes("gold-filled-vermeil");
    const shouldExcludePlated =
      !wantsPlated && specs.some((s) => s.excludePlated);
    if (shouldExcludePlated) {
      query = query
        .not("metal_type", "ilike", "%Plated%")
        .not("metal_type", "ilike", "%Filled%");
    }
  }

  if (primaryStones.length > 0) {
    const wantsNoStone = primaryStones.includes(STONE_NONE_VALUE);
    const namedStones = primaryStones.filter((s) => s !== STONE_NONE_VALUE);
    if (wantsNoStone && namedStones.length === 0) {
      query = query.is("primary_stone", null);
    } else if (!wantsNoStone && namedStones.length === 1) {
      query = query.ilike(
        "primary_stone",
        `%${escapeJsonValue(namedStones[0])}%`
      );
      if (isAllCategories && !rawSearch) {
        query = query.textSearch("search_vector", namedStones[0], {
          type: "websearch",
          config: "english",
        });
      }
    } else if (!wantsNoStone && namedStones.length > 1) {
      const stoneClauses = namedStones.map(
        (s) => `primary_stone.ilike.%${escapeJsonValue(s)}%`
      );
      query = query.or(stoneClauses.join(","));
      if (isAllCategories && !rawSearch) {
        query = query.textSearch(
          "search_vector",
          `(${namedStones.join(" OR ")})`,
          {
            type: "websearch",
            config: "english",
          }
        );
      }
    } else if (wantsNoStone && namedStones.length > 0) {
      const stoneClauses = [
        "primary_stone.is.null",
        ...namedStones.map(
          (s) => `primary_stone.ilike.%${escapeJsonValue(s)}%`
        ),
      ];
      query = query.or(stoneClauses.join(","));
    }
  }

  // Category-specific Style / Type multi-select checkboxes
  if (styles.length > 0) {
    const categoryStyles = getStyleOptionsForCategory(slug);
    const matchedClauses = styles.flatMap(
      (styleId) =>
        categoryStyles.find((opt) => opt.id === styleId)?.orClauses ?? []
    );
    if (matchedClauses.length > 0) {
      query = query.or(matchedClauses.join(","));
    }
  }

  // Chain link style filter (Cable, Rope, Curb, Box, Paperclip, Figaro, etc.)
  if (chainStyles.length > 0) {
    const clauses = chainStyles.flatMap((cs) => {
      const val = escapeJsonValue(cs);
      return [
        `attributes.cs.{"Style":"${val}"}`,
        `attributes->>merchandisingPath.ilike.%> ${val}%`,
      ];
    });
    query = query.or(clauses.join(","));
  }

  // Width / Thickness filter (supports exact mm, chain width tiers, and ring band width tiers)
  if (widths.length > 0) {
    const expandedWidths = Array.from(
      new Set(
        widths.flatMap((w) => {
          const chainTier = CHAIN_WIDTH_TIER_OPTIONS.find((t) => t.id === w);
          if (chainTier) return chainTier.exactValues;
          const ringTier = RING_WIDTH_TIER_OPTIONS.find((t) => t.id === w);
          if (ringTier) return ringTier.exactValues;
          return [w];
        })
      )
    );
    const clauses = expandedWidths.map(
      (w) => `attributes.cs.{"Width":"${escapeJsonValue(w)}"}`
    );
    query = query.or(clauses.join(","));
  }

  // Wedding band fit filter (Comfort-Fit, Standard)
  if (bandFits.length > 0) {
    const clauses = bandFits.map(
      (f) => `attributes.cs.{"Ring Fit":"${escapeJsonValue(f)}"}`
    );
    query = query.or(clauses.join(","));
  }

  // Wedding band profile filter (Half Round, Flat, Knife, Square, etc.)
  if (bandProfiles.length > 0) {
    const clauses = bandProfiles.map(
      (p) => `attributes.cs.{"Profile":"${escapeJsonValue(p)}"}`
    );
    query = query.or(clauses.join(","));
  }

  // Wedding band edge detail filter (Milgrain, Stepped Edge, Beveled Edge)
  if (edgeDetails.length > 0) {
    const clauses = edgeDetails.map(
      (e) => `attributes.cs.{"Design Detail":"${escapeJsonValue(e)}"}`
    );
    query = query.or(clauses.join(","));
  }

  // Center / primary stone shape filter (Round, Oval, Emerald, Marquise, etc.)
  const effectiveStoneShapes =
    stoneShapes.length > 0
      ? stoneShapes
      : parsedSearch?.stoneShape
        ? [parsedSearch.stoneShape]
        : [];
  if (effectiveStoneShapes.length > 0) {
    const shapeDefs = getStoneShapeOptionsForCategory(slug);
    const expandedShapes = Array.from(
      new Set(
        effectiveStoneShapes.flatMap((id) => {
          const def = shapeDefs.find((d) => d.id === id);
          return def ? def.values : [id.replace(/\b\w/g, (c) => c.toUpperCase())];
        })
      )
    );
    const clauses = expandedShapes.flatMap((s) => {
      const val = escapeJsonValue(s);
      return [
        `attributes.cs.{"Center Stone Shape":"${val}"}`,
        `attributes.cs.{"Primary Stone Shape":"${val}"}`,
      ];
    });
    query = query.or(clauses.join(","));
  }

  // Engagement ring setting state filter (Set, Semi-Set, Unset)
  if (settingStates.length > 0) {
    const clauses = settingStates.map(
      (st) => `attributes.cs.{"Jewelry State":"${escapeJsonValue(st)}"}`
    );
    query = query.or(clauses.join(","));
  }

  // Stone origin filter (Natural vs Lab-Grown) — also honors parsed search intent when no manual checkbox is set
  const effectiveStoneOrigins =
    stoneOrigins.length > 0
      ? stoneOrigins
      : parsedSearch?.stoneOrigin
        ? [parsedSearch.stoneOrigin]
        : [];
  if (effectiveStoneOrigins.length > 0) {
    const clauses = effectiveStoneOrigins.flatMap(
      (id) => STONE_ORIGIN_OPTIONS.find((o) => o.id === id)?.orClauses ?? []
    );
    if (clauses.length > 0) {
      query = query.or(clauses.join(","));
    }
  }

  // Total Carat Weight (CTW) tier filter
  if (caratTiers.length > 0) {
    const clauses = caratTiers.flatMap(
      (id) =>
        CARAT_WEIGHT_TIER_OPTIONS.find((o) => o.id === id)?.orClauses ?? []
    );
    if (clauses.length > 0) {
      query = query.or(clauses.join(","));
    }
  }

  // Gemstone Jewelry piece type filter (Rings, Earrings, Necklaces & Pendants, Bracelets)
  if (jewelryTypes.length > 0) {
    const clauses = jewelryTypes.flatMap(
      (id) =>
        GEMSTONE_JEWELRY_TYPE_OPTIONS.find((o) => o.id === id)?.orClauses ?? []
    );
    if (clauses.length > 0) {
      query = query.or(clauses.join(","));
    }
  }

  // Wedding band surface finish filter (Polished, Brushed / Satin, Hammered / Textured)
  const effectiveFinishes =
    finishes.length > 0
      ? finishes
      : parsedSearch?.finish
        ? [parsedSearch.finish]
        : [];
  if (effectiveFinishes.length > 0) {
    const clauses = effectiveFinishes.flatMap(
      (id) => SURFACE_FINISH_OPTIONS.find((o) => o.id === id)?.orClauses ?? []
    );
    if (clauses.length > 0) {
      query = query.or(clauses.join(","));
    }
  }

  // Earring scale / diameter / drop length tier filter
  const effectiveEarringSizes =
    earringSizes.length > 0
      ? earringSizes
      : parsedSearch?.earringSize
        ? [parsedSearch.earringSize]
        : [];
  if (effectiveEarringSizes.length > 0) {
    const clauses = effectiveEarringSizes.flatMap(
      (id) =>
        EARRING_SIZE_TIER_OPTIONS.find((o) => o.id === id)?.orClauses ?? []
    );
    if (clauses.length > 0) {
      query = query.or(clauses.join(","));
    }
  }

  // Pendant chain included vs pendant only filter
  const effectivePendantChains =
    pendantChains.length > 0
      ? pendantChains
      : parsedSearch?.pendantChain
        ? [parsedSearch.pendantChain]
        : [];
  if (effectivePendantChains.length > 0) {
    const clauses = effectivePendantChains.flatMap(
      (id) => PENDANT_CHAIN_OPTIONS.find((o) => o.id === id)?.orClauses ?? []
    );
    if (clauses.length > 0) {
      query = query.or(clauses.join(","));
    }
  }

  // Adjustable length toggle (necklaces & bracelets)
  if (adjustableOnly) {
    query = query.or(
      "title.ilike.%Adjustable%,title.ilike.%Bolo%,title.ilike.%16-18%,title.ilike.%18-20%"
    );
  }

  // Category-specific JSONB attribute filters using GIN `catalog_items_attributes_gin_idx`
  if (lengths.length > 0) {
    const clauses = lengths.flatMap((len) => {
      const val = escapeJsonValue(len);
      return [
        `attributes.cs.{"Length":"${val}"}`,
        `attributes.cs.{"Bracelet Size":"${val}"}`,
        `attributes.cs.{"Bracelet Length":"${val}"}`,
        `attributes.cs.{"Necklace Length":"${val}"}`,
        `attributes.cs.{"Chain Length":"${val}"}`,
      ];
    });
    query = query.or(clauses.join(","));
  }

  if (closures.length > 0) {
    const clauses = closures.flatMap((cls) => {
      const val = escapeJsonValue(cls);
      return [
        `attributes.cs.{"Closure":"${val}"}`,
        `attributes.cs.{"Clasp Type":"${val}"}`,
        `attributes.cs.{"Clasp":"${val}"}`,
      ];
    });
    query = query.or(clauses.join(","));
  }

  if (sizableOnly) {
    query = query.contains("attributes", { Sizable: "Yes" });
  }

  if (ringSizes.length === 1) {
    query = query.contains("attributes", { "Ring Size": ringSizes[0] });
  } else if (ringSizes.length > 1) {
    const clauses = ringSizes.map(
      (rs) => `attributes.cs.{"Ring Size":"${escapeJsonValue(rs)}"}`
    );
    query = query.or(clauses.join(","));
  }

  // Category-aware Men's / Women's filtering using distinct, non-overlapping size/length/style rules
  const resolvedAudience: CatalogAudience | undefined =
    effectiveAudience ?? (audiences.length === 0 ? (parsedSearch?.audience ?? undefined) : undefined);
  const resolvedCategorySlugs =
    categorySlugs.length > 0
      ? categorySlugs
      : isAllCategories && parsedSearch && parsedSearch.categorySlugs.length > 0
        ? parsedSearch.categorySlugs
        : [];
  const audienceSlug = isAllCategories
    ? resolvedCategorySlugs.length === 1
      ? resolvedCategorySlugs[0]
      : "all"
    : slug;

  if (resolvedAudience && audienceSlug !== "gemstone-jewelry") {
    if (audienceSlug === "bracelets") {
      const audLengths =
        resolvedAudience === "men"
          ? ["7 3/4 In", "8 In", "8 1/2 In", "9 In", "9 1/2 In"]
          : ["6 In", "6 1/2 In", "6 3/4 In", "7 In", "7 1/2 In", "6 1/2-7 1/2 In"];
      const clauses = audLengths.flatMap((l) => [
        `attributes.cs.{"Length":"${l}"}`,
        `attributes.cs.{"Bracelet Size":"${l}"}`,
        `attributes.cs.{"Bracelet Length":"${l}"}`,
      ]);
      query = query.or(clauses.join(","));
      if (resolvedAudience === "men") {
        query = query
          .not("title", "ilike", "%Monogram%")
          .not("title", "ilike", "%Script%")
          .not("title", "ilike", "%Silhouette%");
      }
    } else if (audienceSlug === "necklaces-pendants") {
      if (resolvedAudience === "men") {
        query = query
          .or(
            'attributes.cs.{"Length":"20 In"},attributes.cs.{"Length":"22 In"},attributes.cs.{"Length":"24 In"},attributes.cs.{"Length":"26 In"},attributes.cs.{"Necklace Length":"20 In"},attributes.cs.{"Necklace Length":"22 In"},attributes.cs.{"Necklace Length":"24 In"},title.ilike.%Curb%,title.ilike.%Figaro%,title.ilike.%Franco%,title.ilike.%Rope%'
          )
          .not("title", "ilike", "%Pearl%")
          .not("title", "ilike", "%Enamel%")
          .not("title", "ilike", "%Youth%");
      } else {
        query = query.or(
          'attributes.cs.{"Length":"16 In"},attributes.cs.{"Length":"18 In"},attributes.cs.{"Necklace Length":"16 In"},attributes.cs.{"Necklace Length":"18 In"},attributes.cs.{"Necklace Length":"16-18 In"},primary_stone.not.is.null'
        );
      }
    } else if (audienceSlug === "wedding-bands") {
      const sizes =
        resolvedAudience === "men"
          ? ["9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "14", "15"]
          : ["3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5"];
      query = query.or(
        sizes.map((s) => `attributes.cs.{"Ring Size":"${s}"}`).join(",")
      );
    } else if (audienceSlug === "fashion-rings") {
      if (resolvedAudience === "men") {
        const menSizes = ["9", "9.5", "10", "10.5", "11", "11.5", "12", "13", "14"];
        query = query.or(
          [
            ...menSizes.map((s) => `attributes.cs.{"Ring Size":"${s}"}`),
            "attributes->>merchandisingPath.ilike.%> Mens%",
            "title.ilike.%Signet%",
          ].join(",")
        );
      } else {
        const womenSizes = ["4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5"];
        query = query
          .or(womenSizes.map((s) => `attributes.cs.{"Ring Size":"${s}"}`).join(","))
          .not("title", "ilike", "%Signet%");
      }
    } else if (audienceSlug === "engagement-rings") {
      if (resolvedAudience === "men") {
        const menSizes = ["9", "9.5", "10", "10.5", "11", "11.5", "12", "13", "14"];
        query = query.or(
          menSizes.map((s) => `attributes.cs.{"Ring Size":"${s}"}`).join(",")
        );
      } else {
        const womenSizes = ["4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5"];
        query = query.or(
          [
            ...womenSizes.map((s) => `attributes.cs.{"Ring Size":"${s}"}`),
            "title.ilike.%Engagement%",
            "title.ilike.%Solitaire%",
            "title.ilike.%Halo%",
          ].join(",")
        );
      }
    } else if (audienceSlug === "earrings") {
      if (resolvedAudience === "men") {
        query = query.textSearch("search_vector", "stud OR hoop", {
          type: "websearch",
          config: "english",
        });
      }
    } else if (audienceSlug === "all") {
      if (resolvedAudience === "men") {
        const menSizes = ["9", "9.5", "10", "10.5", "11", "11.5", "12", "13", "14"];
        query = query.or(
          [
            ...menSizes.map((s) => `attributes.cs.{"Ring Size":"${s}"}`),
            'attributes.cs.{"Length":"20 In"}',
            'attributes.cs.{"Length":"22 In"}',
            'attributes.cs.{"Length":"24 In"}',
            'attributes.cs.{"Length":"8 In"}',
            'attributes.cs.{"Length":"8 1/2 In"}',
            'attributes.cs.{"Length":"9 In"}',
            "attributes->>merchandisingPath.ilike.%> Mens%",
            "title.ilike.%Signet%",
          ].join(",")
        );
      } else {
        const womenSizes = ["4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5"];
        query = query.or(
          [
            ...womenSizes.map((s) => `attributes.cs.{"Ring Size":"${s}"}`),
            'attributes.cs.{"Length":"16 In"}',
            'attributes.cs.{"Length":"18 In"}',
            'attributes.cs.{"Length":"7 In"}',
            'attributes.cs.{"Length":"7 1/2 In"}',
            "title.ilike.%Engagement%",
            "title.ilike.%Solitaire%",
            "title.ilike.%Halo%",
          ].join(",")
        );
      }
    }
  }

  if (parsedSearch) {
    const parsed = parsedSearch;
    if (parsed.skuQuery) {
      const cleanSku = escapeJsonValue(parsed.skuQuery);
      query = query.ilike("supplier_sku", `${cleanSku}%`);
    } else {
      const ftsParts: string[] = [];
      if (parsed.metalPattern && metalTypes.length === 0) {
        const isExactCanonicalMetal =
          /^(?:1[048]K (?:Yellow|White|Rose) Gold|Platinum|Sterling Silver)$/.test(
            parsed.metalPattern
          );
        if (isExactCanonicalMetal) {
          query = query.eq("metal_type", parsed.metalPattern);
        } else {
          const hasSpecificPrefix = /^(1[048]K|Platinum|Sterling)/i.test(
            parsed.metalPattern
          );
          query = query.ilike(
            "metal_type",
            hasSpecificPrefix
              ? `${parsed.metalPattern}%`
              : `%${parsed.metalPattern}%`
          );
        }
        if (parsed.excludePlated) {
          query = query
            .not("metal_type", "ilike", "%Plated%")
            .not("metal_type", "ilike", "%Filled%");
        }
      }

      if (parsed.stoneNone && primaryStones.length === 0) {
        query = query.is("primary_stone", null);
      } else if (parsed.stonePatterns.length === 1 && primaryStones.length === 0) {
        query = query.ilike("primary_stone", `%${parsed.stonePatterns[0]}%`);
        // Pre-narrow via the indexed `search_vector` GIN index so multi-category gemstone
        // searches (e.g. "14k yellow gold emerald ring") never seq-scan 50K+ rows.
        ftsParts.push(parsed.stonePatterns[0]);
      } else if (parsed.stonePatterns.length > 1 && primaryStones.length === 0) {
        const stoneOr = parsed.stonePatterns
          .map((s) => `primary_stone.ilike.%${escapeJsonValue(s)}%`)
          .join(",");
        query = query.or(stoneOr);
        ftsParts.push(`(${parsed.stonePatterns.join(" OR ")})`);
      }

      // Prevent `gemstone-jewelry` bracelets/earrings from leaking into gemstone ring searches
      if (
        parsed.pieceType === "rings" &&
        categorySlugs.includes("gemstone-jewelry")
      ) {
        query = query.or("title.ilike.%Ring%,title.ilike.%Band%");
      }

      if (parsed.excludePendants) {
        query = query.not("title", "ilike", "%Pendant%");
      }

      if (parsed.closurePattern && closures.length === 0) {
        const val = escapeJsonValue(parsed.closurePattern);
        query = query.or(
          `attributes->>Closure.ilike.%${val}%,attributes->>Clasp Type.ilike.%${val}%,title.ilike.%${val}%`
        );
      }

      if (parsed.widthTier && widths.length === 0) {
        const isChainLike =
          categorySlugs.includes("necklaces-pendants") ||
          categorySlugs.includes("bracelets");
        const tierList = isChainLike
          ? CHAIN_WIDTH_TIER_OPTIONS
          : RING_WIDTH_TIER_OPTIONS;
        const targetTier =
          parsed.widthTier === "wide"
            ? tierList[tierList.length - 1]
            : tierList[0];
        if (targetTier) {
          const wClauses = targetTier.exactValues.map(
            (w) => `attributes.cs.{"Width":"${escapeJsonValue(w)}"}`
          );
          if (wClauses.length > 0) {
            query = query.or(wClauses.join(","));
          }
        }
      }

      if (parsed.sizable && !sizableOnly) {
        query = query.contains("attributes", { Sizable: "Yes" });
      }
      if (parsed.initialLetter) {
        const label = `Initial ${parsed.initialLetter.toUpperCase()}`;
        query = query.or(
          `attributes.cs.{"Design":"${label}"},attributes.cs.{"Design Detail":"${label}"}`
        );
      }
      if (parsed.lengths.length > 0 && lengths.length === 0) {
        const lenClauses = parsed.lengths.flatMap((len) => {
          const val = escapeJsonValue(len);
          return [
            `attributes.cs.{"Length":"${val}"}`,
            `attributes.cs.{"Bracelet Length":"${val}"}`,
            `attributes.cs.{"Bracelet Size":"${val}"}`,
            `attributes.cs.{"Necklace Length":"${val}"}`,
            `attributes.cs.{"Chain Length":"${val}"}`,
          ];
        });
        query = query.or(lenClauses.join(","));
      }
      if (parsed.ringSize && ringSizes.length === 0) {
        query = query.contains("attributes", { "Ring Size": parsed.ringSize });
      }

      if (parsed.textQuery.trim()) {
        ftsParts.push(parsed.textQuery.trim());
      }
      const combinedFts = ftsParts.join(" ").trim();
      if (combinedFts) {
        query = query.textSearch("search_vector", combinedFts, {
          type: "websearch",
          config: "english",
        });
      }
    }
  }

  const { data, error, count } = await query;
  if (error || !data) {
    if (error) {
      console.error("[getCategoryListingsPage]", slug, error.code, error.message);
    }
    return null;
  }

  const rawRows = data as unknown as RawJoinedCatalogRow[];
  const usesLookahead = hasFilter || isAllCategories;
  const fetchedExtraRow = usesLookahead && rawRows.length > batchSize;
  const rows = fetchedExtraRow ? rawRows.slice(0, batchSize) : rawRows;

  // Extract category-specific filter options from this batch before stripping heavy attributes for card payloads
  const metals = new Set<string>();
  const stones = new Set<string>();
  const lengthSet = new Set<string>();
  const closureSet = new Set<string>();
  const ringSizeSet = new Set<string>();
  let hasNoStoneItems = false;
  let hasSizableItems = false;

  for (const row of rows) {
    if (row.metal_type) metals.add(row.metal_type);
    if (row.primary_stone) {
      stones.add(row.primary_stone);
    } else {
      hasNoStoneItems = true;
    }

    const sizableVal = pickAttr(row.attributes, ["Sizable"]);
    if (sizableVal && sizableVal.toLowerCase() === "yes") {
      hasSizableItems = true;
    }

    const len = pickAttr(row.attributes, [
      "Bracelet Size",
      "Bracelet Length",
      "Necklace Length",
      "Chain Length",
      "Length",
    ]);
    if (len && isCleanLengthOption(len)) lengthSet.add(len);

    const cls = pickAttr(row.attributes, ["Closure", "Clasp Type", "Clasp"]);
    if (cls) closureSet.add(cls);

    const rs = pickAttr(row.attributes, ["Ring Size", "Finger Size"]);
    if (rs) ringSizeSet.add(rs);
  }

  // Keep only lean card fields for the grid payload (<250 KB, safely under 2 MB cache limit)
  const preliminaryVariants = rows.map((r) =>
    mapRowToVariant({
      ...r,
      short_description: null,
      description: null,
      attributes: null,
    })
  );
  const preliminaryGroups = groupCatalogVariants(preliminaryVariants);

  const repIds = preliminaryGroups.map((g) => g.defaultVariant.id);
  const imageMap = await fetchPrimaryImagesByItemIds(repIds);

  const unsortedGroups: CatalogItemGroup[] = preliminaryGroups.map((g) => {
    const imgs = imageMap.get(g.defaultVariant.id) ?? [];
    const defaultVariant = { ...g.defaultVariant, images: imgs };
    const variants = g.variants.map((v) =>
      v.id === defaultVariant.id ? defaultVariant : v
    );
    return {
      ...g,
      defaultVariant,
      variants,
    };
  });

  // Curated merchandising order: mix classic essentials with high-luxury tiers & prevent adjacent duplicates
  const groups = params.search?.trim()
    ? unsortedGroups
    : merchandiseCatalogGroups(unsortedGroups);

  const totalSkus = usesLookahead
    ? offset + rows.length + (fetchedExtraRow ? 1 : 0)
    : (count ?? rows.length);
  const nextOffset = offset + rows.length;
  const hasMore = usesLookahead
    ? fetchedExtraRow
    : nextOffset < totalSkus && rows.length === batchSize;

  return {
    groups,
    totalSkus,
    hasMore,
    nextOffset,
    metalOptions: Array.from(metals).sort(),
    stoneOptions: Array.from(stones).sort(),
    hasNoStoneItems,
    hasSizableItems,
    lengthOptions: Array.from(lengthSet).sort(compareSizeOrLength),
    closureOptions: Array.from(closureSet).sort(),
    ringSizeOptions: Array.from(ringSizeSet).sort(compareSizeOrLength),
  };
}

/**
 * On-demand detail loader for `PieceDetailModal` (`GET /api/catalog/group`).
 * Scopes by `(group_code, primary_stone)` so gemstone pieces only load variants
 * for THAT specific gemstone (e.g., 10–25 metal/size/length options instead of 120+).
 */
export async function getCatalogGroupDetail(params: {
  groupCode?: string | null;
  primaryStone?: string | null;
  sku?: string | null;
}): Promise<CatalogItemGroup | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const groupCode = params.groupCode?.trim() || null;
  const primaryStone = params.primaryStone?.trim() || null;
  const sku = params.sku?.trim() || null;
  if (!groupCode && !sku) return null;

  let query = supabase
    .from("catalog_items")
    .select(
      `
      id,
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
      is_featured,
      suppliers ( code, name ),
      categories ( slug, name )
    `
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("supplier_sku", { ascending: true })
    .limit(150);

  if (groupCode) {
    query = query.eq("group_code", groupCode);
    if (primaryStone === "__none__") {
      query = query.is("primary_stone", null);
    } else if (primaryStone) {
      query = query.eq("primary_stone", primaryStone);
    }
  } else if (sku) {
    query = query.eq("supplier_sku", sku);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return null;
  }

  const rows = data as unknown as RawJoinedCatalogRow[];
  const imageMap = await fetchPrimaryImagesByItemIds(rows.map((r) => r.id));
  const variants = rows.map((row) => mapRowToVariant(row, imageMap));
  const grouped = groupCatalogVariants(variants);

  if (sku) {
    const exactGroup = grouped.find((g) =>
      g.variants.some((v) => v.supplierSku === sku)
    );
    if (exactGroup) return exactGroup;
  }
  return grouped[0] ?? null;
}

export interface SmartSearchResult {
  groups: CatalogItemGroup[];
  hasMore: boolean;
  nextOffset: number;
  parsed: ParsedSearchQuery;
  relaxedReason: string | null;
  source: "supabase" | "demo";
}

interface SearchRpcRow {
  id: number;
  supplier_sku: string;
  supplier_item_id: string | null;
  group_code: string | null;
  title: string;
  metal_type: string | null;
  primary_stone: string | null;
  merchandising_area: string | null;
  is_featured: boolean;
  supplier_code: string;
  supplier_name: string;
  category_slug: string | null;
  category_name: string | null;
  score: number;
}

async function executeStructuredFallbackSearch(
  parsed: ParsedSearchQuery,
  offset: number,
  limit: number
): Promise<RawJoinedCatalogRow[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const selectCols = `
    id,
    supplier_sku,
    supplier_item_id,
    group_code,
    title,
    metal_type,
    primary_stone,
    merchandising_area,
    is_featured,
    suppliers ( code, name ),
    categories ( slug, name )
  `;

  if (parsed.mode === "sku" && parsed.skuQuery) {
    const cleanSku = parsed.skuQuery.trim().toUpperCase();
    const { data, error } = await supabase
      .from("catalog_items")
      .select(selectCols)
      .eq("is_active", true)
      .eq("supplier_sku", cleanSku)
      .limit(20);
    if (!error && data && data.length > 0) {
      return data as unknown as RawJoinedCatalogRow[];
    }
    const { data: ftsData, error: ftsErr } = await supabase
      .from("catalog_items")
      .select(selectCols)
      .eq("is_active", true)
      .textSearch("search_vector", parsed.skuQuery, {
        type: "websearch",
        config: "english",
      })
      .range(offset, offset + limit - 1);
    if (ftsErr) return null;
    return (ftsData ?? []) as unknown as RawJoinedCatalogRow[];
  }

  let categoryIds: number[] | null = null;
  if (parsed.categorySlugs.length > 0) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id")
      .in("slug", parsed.categorySlugs);
    categoryIds = (cats ?? []).map((c) => c.id);
    if (categoryIds.length === 0) return [];
  }

  const ftsParts: string[] = [];
  if (parsed.textQuery) ftsParts.push(parsed.textQuery);
  if (parsed.metalPattern) ftsParts.push(parsed.metalPattern.replace(/%/g, " "));
  if (parsed.stonePattern && !parsed.stoneNone) ftsParts.push(parsed.stonePattern);
  const combinedFts = ftsParts.join(" ").trim();

  let query = supabase
    .from("catalog_items")
    .select(selectCols)
    .eq("is_active", true)
    .range(offset, offset + limit - 1);

  if (categoryIds) {
    query = query.in("category_id", categoryIds);
  }
  if (parsed.metalPattern) {
    query = query.ilike("metal_type", `%${parsed.metalPattern}%`);
  }
  if (parsed.stoneNone) {
    query = query.is("primary_stone", null);
  } else if (parsed.stonePattern) {
    query = query.ilike("primary_stone", `%${parsed.stonePattern}%`);
  }
  if (parsed.sizable) {
    query = query.contains("attributes", { Sizable: "Yes" });
  }
  if (parsed.initialLetter) {
    const label = `Initial ${parsed.initialLetter.toUpperCase()}`;
    query = query.or(
      `attributes.cs.{"Design":"${label}"},attributes.cs.{"Design Detail":"${label}"}`
    );
  }
  if (parsed.length) {
    const val = escapeJsonValue(parsed.length);
    query = query.or(
      `attributes.cs.{"Length":"${val}"},attributes.cs.{"Bracelet Length":"${val}"},attributes.cs.{"Bracelet Size":"${val}"},attributes.cs.{"Necklace Length":"${val}"},attributes.cs.{"Chain Length":"${val}"}`
    );
  }
  if (parsed.ringSize) {
    query = query.contains("attributes", { "Ring Size": parsed.ringSize });
  }
  if (combinedFts) {
    query = query.textSearch("search_vector", combinedFts, {
      type: "websearch",
      config: "english",
    });
  } else {
    query = query
      .order("is_featured", { ascending: false })
      .order("id", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return null;
  return (data ?? []) as unknown as RawJoinedCatalogRow[];
}

async function runSearchAttempt(
  parsed: ParsedSearchQuery,
  offset: number,
  groupLimit: number
): Promise<{ groups: CatalogItemGroup[]; hasMore: boolean; usedRpc: boolean } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Prefer the SQL-grouped `public.search_catalog` RPC (0005_search_grouping_and_precision.sql)
  const rpcRes = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: SearchRpcRow[] | null; error: { message: string } | null }>;
    }
  ).rpc("search_catalog", {
    p_mode: parsed.mode,
    p_sku_query: parsed.skuQuery,
    p_text_query: parsed.textQuery || null,
    p_category_slugs:
      parsed.categorySlugs.length > 0 ? parsed.categorySlugs : null,
    p_metal_pattern: parsed.metalPattern,
    p_stone_pattern: parsed.stonePattern,
    p_stone_none: parsed.stoneNone,
    p_sizable: parsed.sizable,
    p_length: parsed.length,
    p_ring_size: parsed.ringSize,
    p_initial_letter: parsed.initialLetter,
    p_offset: offset,
    p_limit: groupLimit + 1,
  });

  if (!rpcRes.error && rpcRes.data) {
    const hasMore = rpcRes.data.length > groupLimit;
    const sliced = hasMore ? rpcRes.data.slice(0, groupLimit) : rpcRes.data;
    const variants: CatalogVariant[] = sliced.map((row) => ({
      id: row.id,
      supplierCode: row.supplier_code,
      supplierName: row.supplier_name,
      supplierSku: row.supplier_sku,
      supplierItemId: row.supplier_item_id,
      groupCode: row.group_code,
      title: row.title,
      shortDescription: null,
      description: null,
      metalType: row.metal_type,
      primaryStone: row.primary_stone,
      merchandisingArea: row.merchandising_area,
      categorySlug: row.category_slug,
      categoryName: row.category_name,
      attributes: {},
      isFeatured: row.is_featured,
      images: [],
    }));
    return {
      groups: groupCatalogVariants(variants),
      hasMore,
      usedRpc: true,
    };
  }

  // Graceful fallback if 0005_search_grouping_and_precision.sql has not been applied yet
  const fallbackBatch = 400;
  const fallbackRows = await executeStructuredFallbackSearch(
    parsed,
    offset,
    fallbackBatch + 1
  );
  if (!fallbackRows) return null;
  const hasMore = fallbackRows.length > fallbackBatch;
  const sliced = hasMore ? fallbackRows.slice(0, fallbackBatch) : fallbackRows;
  const variants = sliced.map((r) =>
    mapRowToVariant({
      ...r,
      short_description: null,
      description: null,
      attributes: null,
    })
  );
  return {
    groups: groupCatalogVariants(variants).slice(0, groupLimit),
    hasMore,
    usedRpc: false,
  };
}

/**
 * Hybrid global search: deterministic jewelry facet/initial/synonym parser +
 * SQL-grouped `search_catalog` RPC with pagination (`offset`/`limit`) and 1-step relaxation.
 */
export async function smartSearchCatalog(
  rawQuery: string,
  options: { offset?: number; limit?: number } = {}
): Promise<SmartSearchResult | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(Math.max(options.limit ?? 36, 12), 72);

  const parsed = parseCatalogSearchQuery(rawQuery);
  if (parsed.raw.length < 2) {
    return {
      groups: [],
      hasMore: false,
      nextOffset: 0,
      parsed,
      relaxedReason: null,
      source: "supabase",
    };
  }

  let attempt = await runSearchAttempt(parsed, offset, limit);
  if (attempt === null) return null;

  let relaxedReason: string | null = null;
  if (attempt.groups.length === 0 && offset === 0) {
    const relaxation = relaxParsedQuery(parsed);
    if (relaxation) {
      const relaxedAttempt = await runSearchAttempt(
        relaxation.relaxed,
        0,
        limit
      );
      if (relaxedAttempt && relaxedAttempt.groups.length > 0) {
        attempt = relaxedAttempt;
        relaxedReason = relaxation.droppedLabel;
      }
    }
  }

  const imageMap = await fetchPrimaryImagesByItemIds(
    attempt.groups.map((g) => g.defaultVariant.id)
  );

  const groups = attempt.groups.map((g) => {
    const imgs = imageMap.get(g.defaultVariant.id) ?? [];
    const defaultVariant = { ...g.defaultVariant, images: imgs };
    return {
      ...g,
      defaultVariant,
      variants: g.variants.map((v) =>
        v.id === defaultVariant.id ? defaultVariant : v
      ),
    };
  });

  const stepSize = attempt.usedRpc ? groups.length : 400;

  return {
    groups,
    hasMore: attempt.hasMore,
    nextOffset: offset + stepSize,
    parsed,
    relaxedReason,
    source: "supabase",
  };
}

/**
 * Fast, indexed global search across all 52,000+ SKUs for `GET /api/catalog/search`.
 */
export async function searchCatalogListings(
  rawQuery: string,
  maxGroups = 36
): Promise<CatalogItemGroup[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const clean = rawQuery
    .trim()
    .replace(/[,().*%\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length < 2) {
    return [];
  }

  const selectCols = `
    id,
    supplier_sku,
    supplier_item_id,
    group_code,
    title,
    metal_type,
    primary_stone,
    merchandising_area,
    is_featured,
    suppliers ( code, name ),
    categories ( slug, name )
  `;

  const isLikelyExactSku = clean.includes(":") || /^[A-Za-z0-9-]+$/.test(clean);
  const [skuRes, ftsRes] = await Promise.all([
    isLikelyExactSku
      ? supabase
        .from("catalog_items")
        .select(selectCols)
        .eq("is_active", true)
        .eq("supplier_sku", clean.toUpperCase())
        .limit(20)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("catalog_items")
      .select(selectCols)
      .eq("is_active", true)
      .textSearch("search_vector", clean, {
        type: "websearch",
        config: "english",
      })
      .limit(120),
  ]);

  if (skuRes.error && ftsRes.error) {
    return null;
  }

  const seenIds = new Set<number>();
  const mergedRows: RawJoinedCatalogRow[] = [];
  for (const row of [
    ...((skuRes.data ?? []) as unknown as RawJoinedCatalogRow[]),
    ...((ftsRes.data ?? []) as unknown as RawJoinedCatalogRow[]),
  ]) {
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    mergedRows.push(row);
  }

  const prelimVariants = mergedRows.map((r) =>
    mapRowToVariant({
      ...r,
      short_description: null,
      description: null,
      attributes: null,
    })
  );
  const prelimGroups = groupCatalogVariants(prelimVariants).slice(0, maxGroups);

  const imageMap = await fetchPrimaryImagesByItemIds(
    prelimGroups.map((g) => g.defaultVariant.id)
  );

  return prelimGroups.map((g) => {
    const imgs = imageMap.get(g.defaultVariant.id) ?? [];
    const defaultVariant = { ...g.defaultVariant, images: imgs };
    return {
      ...g,
      defaultVariant,
      variants: g.variants.map((v) =>
        v.id === defaultVariant.id ? defaultVariant : v
      ),
    };
  });
}

/**
 * Legacy helper kept for compatibility; delegates to bounded indexed queries.
 */
export async function getGroupedCatalogItems(
  filters: CatalogFilterParams = {}
): Promise<CatalogItemGroup[] | null> {
  if (filters.search?.trim()) {
    return searchCatalogListings(filters.search, filters.limit ?? 36);
  }
  if (filters.categorySlug?.trim()) {
    const page = await getCategoryListingsPage({
      categorySlug: filters.categorySlug,
      metalType: filters.metalType,
      primaryStone: filters.primaryStone,
      batchSize: filters.limit ?? 400,
    });
    return page ? page.groups : null;
  }
  return null;
}

/**
 * Submits a customer inquiry referencing a specific manufacturer SKU.
 */
export async function submitInquiry(
  input: InquiryInput
): Promise<InquiryResult> {
  const supplierSku = input.supplierSku.trim();
  const customerName = input.customerName.trim();
  const customerContact = input.customerContact.trim();
  const message = input.message?.trim() || null;

  if (!supplierSku || !customerName || !customerContact) {
    return {
      ok: false,
      configured: true,
      error: "Item #, name, and phone or email are required.",
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      configured: false,
      error: "Supabase is not configured in this environment.",
    };
  }

  const { error } = await supabase.from("inquiries").insert({
    item_id: input.itemId ?? null,
    supplier_sku: supplierSku,
    customer_name: customerName,
    customer_contact: customerContact,
    message,
  });

  if (error) {
    return {
      ok: false,
      configured: true,
      error: error.message,
    };
  }

  return { ok: true, configured: true };
}
