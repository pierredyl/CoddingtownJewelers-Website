import {
  deriveCategorySlug,
  sanitizeAttributes,
  stripPricingFields,
  type NormalizedCatalogImage,
  type NormalizedCatalogItem,
} from "./normalizer";

// ---------------------------------------------------------------------------
// Stuller API v2 Product JSON Types (verified against live API responses)
// ---------------------------------------------------------------------------

export interface StullerImage {
  ThumbnailUrl?: string | null;
  FullUrl?: string | null;
  ZoomUrl?: string | null;
  Angle?: string | null;
  SortOrder?: number | null;
}

export interface StullerDescriptiveElement {
  Name?: string | null;
  Value?: string | null;
  DisplayValue?: string | null;
}

export interface StullerDescriptiveElementGroup {
  GroupName?: string | null;
  DescriptiveElements?: StullerDescriptiveElement[] | null;
}

export interface StullerProduct {
  Id?: number | string | null;
  SKU: string;
  DefaultProductGroupId?: number | string | null;
  GroupDescription?: string | null;
  LongGroupDescription?: string | null;
  ShortDescription?: string | null;
  Description?: string | null;
  ProductType?: string | null;
  ReadyToWear?: boolean | null;
  QualityCatalogValue?: string | null;
  CenterStoneShape?: string | null;
  RingSize?: number | string | null;
  RingSizable?: boolean | null;
  GramWeight?: number | null;
  MerchandisingArea?: string | null;
  MerchandisingCategory1?: string | null;
  MerchandisingCategory2?: string | null;
  MerchandisingCategory3?: string | null;
  MerchandisingCategory4?: string | null;
  MerchandisingCategory5?: string | null;
  Status?: string | null;
  Orderable?: boolean | null;
  Images?: StullerImage[] | null;
  GroupImages?: StullerImage[] | null;
  FullySetImages?: StullerImage[] | null;
  DescriptiveElementGroup?: StullerDescriptiveElementGroup | null;
  DescriptiveElementGroups?: StullerDescriptiveElementGroup[] | null;
  // Allow extra supplier fields in raw payload (pricing fields are stripped before DB storage)
  [key: string]: unknown;
}

export interface StullerProductsResponse {
  Products?: StullerProduct[];
  NextPage?: string | null;
}

export interface FetchStullerOptions {
  username?: string;
  password?: string;
  baseUrl?: string;
  /** Optional list of specific SKUs to fetch */
  skus?: string[];
  /** Optional Stuller WebCategory IDs */
  categoryIds?: number[];
  /** Optional Stuller ProductFilter values (defaults to Orderable + OnPriceList + Finished when no SKUs given) */
  filters?: string[];
  /** Only keep Front-of-Store (Fos) consumer jewelry — drops Bos tools/findings and Mos loose stones (default: true) */
  fosOnly?: boolean;
  /** Drop items that have zero product images (default: true) */
  requireImages?: boolean;
  /** Maximum pages to fetch per query (guards API usage) */
  maxPages?: number;
  /** Page size hint when supported */
  pageSize?: number;
}

/**
 * Verified Stuller WebCategory IDs for balanced multi-department catalog syncs.
 */
export const STULLER_JEWELRY_DEPARTMENTS: ReadonlyArray<{
  label: string;
  categoryIds: number[];
}> = [
  { label: "Engagement Rings", categoryIds: [21344, 21345, 21347, 21350] },
  { label: "Wedding & Anniversary Bands", categoryIds: [32463, 32470] },
  { label: "Fashion Rings", categoryIds: [11990] },
  { label: "Necklaces, Pendants & Chains", categoryIds: [11992, 3089] },
  { label: "Earrings", categoryIds: [11991] },
  { label: "Bracelets", categoryIds: [11993] },
  { label: "Gemstone Jewelry", categoryIds: [31572] },
];

const DEFAULT_STULLER_BASE_URL = "https://api.stuller.com/v2/products";

const QUALITY_CODE_LABELS: Record<string, string> = {
  "10KY": "10K Yellow Gold",
  "10KW": "10K White Gold",
  "10KR": "10K Rose Gold",
  "14KY": "14K Yellow Gold",
  "14KW": "14K White Gold",
  "14KR": "14K Rose Gold",
  "18KY": "18K Yellow Gold",
  "18KW": "18K White Gold",
  "18KR": "18K Rose Gold",
  PLAT: "Platinum",
  PT950: "Platinum 950",
  SS: "Sterling Silver",
  "925": "Sterling Silver",
};

const EMPTY_VALUE_PATTERN = /^(n\/?a|none|not\s+applicable|-)$/i;

function cleanOptionalValue(val: string | null | undefined): string | null {
  const trimmed = val?.trim();
  if (!trimmed || EMPTY_VALUE_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Derives a stable `group_code` for Stuller products so metal/size/length variants
 * of the same design share one storefront card with in-place SKU switching.
 *
 * Prefers Stuller's native `DefaultProductGroupId` (`ST-GRP-120137`),
 * falling back to the SKU series prefix (`ST-CH1025`).
 */
function deriveStullerGroupCode(product: StullerProduct): string | null {
  if (
    product.DefaultProductGroupId != null &&
    String(product.DefaultProductGroupId).trim() !== ""
  ) {
    return `ST-GRP-${String(product.DefaultProductGroupId).trim()}`;
  }

  const sku = product.SKU?.trim();
  if (sku && sku.includes(":")) {
    const parts = sku.split(":").filter(Boolean);
    if (parts.length >= 1) {
      return `ST-${parts[0]}`;
    }
  }

  const groupDesc = product.GroupDescription?.trim();
  if (groupDesc) {
    const slug = groupDesc
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    if (slug) return `ST-${slug}`;
  }

  return sku ? `ST-${sku}` : null;
}

function collectDescriptiveElements(
  product: StullerProduct
): StullerDescriptiveElement[] {
  const elements: StullerDescriptiveElement[] = [];

  if (product.DescriptiveElementGroup?.DescriptiveElements) {
    elements.push(...product.DescriptiveElementGroup.DescriptiveElements);
  }
  if (Array.isArray(product.DescriptiveElementGroups)) {
    for (const group of product.DescriptiveElementGroups) {
      if (group?.DescriptiveElements) {
        elements.push(...group.DescriptiveElements);
      }
    }
  }

  return elements;
}

function findElementValue(
  elements: StullerDescriptiveElement[],
  patterns: RegExp[]
): string | null {
  for (const pattern of patterns) {
    const match = elements.find((el) => el.Name && pattern.test(el.Name));
    if (match) {
      const val = cleanOptionalValue(match.DisplayValue ?? match.Value);
      if (val) return val;
    }
  }
  return null;
}

/**
 * Maps Stuller's structured `ProductType` + `MerchandisingCategory1..3` directly
 * to our normalized storefront categories, avoiding misclassifications.
 */
function deriveStullerCategorySlug(
  product: StullerProduct,
  merchandisingCategories: string[],
  title: string
): string | null {
  const pt = (product.ProductType ?? "").trim().toLowerCase();
  const c1 = (product.MerchandisingCategory1 ?? "").trim().toLowerCase();
  const pathLower = merchandisingCategories.join(" > ").toLowerCase();
  const shortLower = (product.ShortDescription ?? "").trim().toLowerCase();

  if (c1 === "gemstone fashion") {
    return "gemstone-jewelry";
  }
  if (pt === "earrings" || pt === "earring jackets") {
    return "earrings";
  }
  if (pt === "bracelets" || pt === "anklets") {
    return "bracelets";
  }
  if (pt === "necklaces" || pt === "pendants" || c1 === "chain") {
    return "necklaces-pendants";
  }
  if (
    c1.includes("wedding band") ||
    /\b(matching band|wedding band|anniversary band|eternity band)\b/.test(
      shortLower
    )
  ) {
    return "wedding-bands";
  }
  if (
    c1 === "engagement" ||
    pathLower.includes("engagement rings") ||
    /\bengagement ring\b/.test(shortLower)
  ) {
    return "engagement-rings";
  }
  if (pt === "rings") {
    return "fashion-rings";
  }

  return deriveCategorySlug([
    product.MerchandisingArea,
    ...merchandisingCategories,
    product.GroupDescription,
    title,
  ]);
}

/**
 * Normalizes a Stuller API v2 Product JSON object into the unified catalog
 * item schema. Never retains pricing fields.
 */
export function normalizeStullerProduct(
  product: StullerProduct
): NormalizedCatalogItem {
  const sku = product.SKU.trim();
  const elements = collectDescriptiveElements(product);

  const rawAttributes: Record<string, string | number | boolean | null> = {};
  for (const el of elements) {
    const name = el.Name?.trim();
    const val = cleanOptionalValue(el.DisplayValue ?? el.Value);
    if (name && val) {
      rawAttributes[name] = val;
    }
  }

  if (product.ProductType?.trim()) {
    rawAttributes["Product Type"] = product.ProductType.trim();
  }
  if (typeof product.GramWeight === "number" && product.GramWeight > 0) {
    rawAttributes["Weight"] = `${product.GramWeight} g`;
  }
  if (product.RingSize != null && String(product.RingSize).trim() !== "") {
    rawAttributes["Ring Size"] = String(product.RingSize).trim();
  }
  if (typeof product.RingSizable === "boolean" && product.ProductType?.toLowerCase() === "rings") {
    rawAttributes["Sizable"] = product.RingSizable ? "Yes" : "No";
  }
  const centerShape = cleanOptionalValue(product.CenterStoneShape);
  if (centerShape) {
    rawAttributes["Center Stone Shape"] = centerShape;
  }

  const merchandisingCategories = [
    product.MerchandisingCategory1,
    product.MerchandisingCategory2,
    product.MerchandisingCategory3,
    product.MerchandisingCategory4,
    product.MerchandisingCategory5,
  ]
    .map((c) => c?.trim())
    .filter((c): c is string => Boolean(c));

  if (merchandisingCategories.length > 0) {
    rawAttributes.merchandisingPath = merchandisingCategories.join(" > ");
  }

  const qualityCode = product.QualityCatalogValue?.trim().toUpperCase() ?? "";
  const metalType =
    findElementValue(elements, [
      /^metal\s*type$/i,
      /^quality$/i,
      /^primary\s*metal$/i,
      /^metal$/i,
      /^material$/i,
    ]) ??
    (qualityCode ? QUALITY_CODE_LABELS[qualityCode] ?? qualityCode : null);

  const primaryStone = findElementValue(elements, [
    /^primary\s*stone(\s*type)?$/i,
    /^stone\s*type$/i,
    /^center\s*stone(\s*type)?$/i,
    /^gemstone(\s*type)?$/i,
  ]);

  // Prefer FullySetImages (rendered metal + stones) first, then Images, then GroupImages.
  // Store only the single best (primary) image per SKU to minimize DB storage & query size.
  const rawImages = [
    ...(product.FullySetImages ?? []),
    ...(product.Images ?? []),
    ...(product.GroupImages ?? []),
  ];
  const seenImageUrls = new Set<string>();
  const allSortedImages: NormalizedCatalogImage[] = rawImages
    .filter((img): img is StullerImage & { FullUrl: string } => {
      const url = img?.FullUrl?.trim();
      if (!url || seenImageUrls.has(url)) return false;
      seenImageUrls.add(url);
      return true;
    })
    .map((img, index) => ({
      thumbnailUrl: img.ThumbnailUrl?.trim() || null,
      fullUrl: img.FullUrl.trim(),
      zoomUrl: img.ZoomUrl?.trim() || null,
      angle: img.Angle?.trim() || null,
      sortOrder: typeof img.SortOrder === "number" ? img.SortOrder : index,
      isPrimary: index === 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const images: NormalizedCatalogImage[] =
    allSortedImages.length > 0
      ? [{ ...allSortedImages[0], sortOrder: 0, isPrimary: true }]
      : [];

  const title =
    product.GroupDescription?.trim() ||
    product.ShortDescription?.trim() ||
    product.Description?.trim() ||
    `Stuller Item ${sku}`;

  const statusLower = product.Status?.trim().toLowerCase() ?? "";
  const isDiscontinued =
    statusLower.includes("discontinued") ||
    statusLower.includes("inactive") ||
    product.Orderable === false;

  const categorySlug = deriveStullerCategorySlug(
    product,
    merchandisingCategories,
    title
  );

  return {
    supplierCode: "stuller",
    supplierSku: sku,
    supplierItemId: product.Id != null ? String(product.Id) : null,
    groupCode: deriveStullerGroupCode(product),
    title,
    shortDescription: product.ShortDescription?.trim() || null,
    description:
      product.LongGroupDescription?.trim() ||
      product.Description?.trim() ||
      product.GroupDescription?.trim() ||
      null,
    metalType,
    primaryStone,
    merchandisingArea: product.MerchandisingArea?.trim() || null,
    categorySlug,
    attributes: sanitizeAttributes(rawAttributes),
    rawPayload: stripPricingFields(product),
    isActive: !isDiscontinued,
    isFeatured: false,
    images,
  };
}

/**
 * Fetches products from the Stuller API v2 REST endpoint using HTTP Basic Auth
 * over SSL (Stuller Developer Login credentials).
 */
export async function fetchStullerProducts(
  options: FetchStullerOptions = {}
): Promise<NormalizedCatalogItem[]> {
  const username = (
    options.username ??
    process.env.STULLER_API_USERNAME ??
    process.env.STULLER_USERNAME
  )?.trim();
  const password = (
    options.password ??
    process.env.STULLER_API_PASSWORD ??
    process.env.STULLER_PASSWORD
  )?.trim();
  const rawBaseUrl = (
    options.baseUrl ??
    process.env.STULLER_API_BASE_URL ??
    DEFAULT_STULLER_BASE_URL
  )
    .trim()
    .replace(/\/+$/, "");

  const baseUrl = rawBaseUrl.endsWith("/v2")
    ? `${rawBaseUrl}/products`
    : rawBaseUrl;

  if (!username || !password) {
    throw new Error(
      "Missing Stuller credentials. Set STULLER_API_USERNAME and STULLER_API_PASSWORD in your environment."
    );
  }

  if (!baseUrl.startsWith("https://")) {
    throw new Error(
      `Stuller API requires SSL (https://). Received baseUrl: ${baseUrl}`
    );
  }

  const authHeader = `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
  const maxPages = Math.max(1, options.maxPages ?? 10);
  const fosOnly = options.fosOnly ?? !(options.skus && options.skus.length > 0);
  const requireImages =
    options.requireImages ?? !(options.skus && options.skus.length > 0);
  const results: NormalizedCatalogItem[] = [];

  let nextPageToken: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    // Include: ["Default"] returns Images, FullySetImages, DescriptiveElementGroup,
    // ProductType, MerchandisingCategory1..5, and DefaultProductGroupId at ~37% less bandwidth than ["All"].
    const body: Record<string, unknown> = {
      Include: ["Default"],
    };

    const effectiveFilters =
      options.filters && options.filters.length > 0
        ? options.filters
        : options.skus && options.skus.length > 0
          ? []
          : ["Orderable", "OnPriceList", "Finished"];

    if (effectiveFilters.length > 0) {
      body.Filter = effectiveFilters;
    }

    if (options.skus && options.skus.length > 0) {
      body.SKU = options.skus;
    }
    if (options.categoryIds && options.categoryIds.length > 0) {
      body.CategoryIds = options.categoryIds;
    }
    if (options.pageSize && options.pageSize > 0) {
      body.PageSize = options.pageSize;
    }
    if (nextPageToken) {
      body.NextPage = nextPageToken;
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Stuller API request failed (${response.status} ${response.statusText}): ${errorText.slice(0, 300)}`
      );
    }

    const payload = (await response.json()) as StullerProductsResponse;
    const products = payload.Products ?? [];

    for (const product of products) {
      if (!product?.SKU?.trim()) continue;

      // Skip Back-of-Store (Bos: tools/findings/stampings) and Middle-of-Store (Mos: loose stones)
      if (fosOnly && product.MerchandisingArea?.trim().toLowerCase() !== "fos") {
        continue;
      }

      // Skip raw bulk chain sold by length to bench jewelers
      if (product.ProductType?.trim().toLowerCase() === "bulk chain") {
        continue;
      }

      const normalized = normalizeStullerProduct(product);

      if (requireImages && normalized.images.length === 0) {
        continue;
      }

      results.push(normalized);
    }

    nextPageToken = payload.NextPage?.trim() || null;
    if (!nextPageToken || products.length === 0) {
      break;
    }
  }

  return results;
}
