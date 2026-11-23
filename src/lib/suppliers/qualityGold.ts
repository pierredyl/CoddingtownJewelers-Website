import {
  deriveCategorySlug,
  sanitizeAttributes,
  stripPricingFields,
  type NormalizedCatalogImage,
  type NormalizedCatalogItem,
} from "./normalizer";

export type QualityGoldRecord = Record<string, string>;

// ---------------------------------------------------------------------------
// Zero-dependency RFC-4180 CSV & XML Parsers for Quality Gold Data Feeds
// ---------------------------------------------------------------------------

/**
 * Parses a Quality Gold CSV feed into an array of header-keyed string records.
 * Handles quoted fields, embedded commas, escaped quotes (`""`), and CRLF/LF.
 */
export function parseQualityGoldCsv(csvContent: string): QualityGoldRecord[] {
  const input = csvContent.replace(/^\uFEFF/, ""); // Strip UTF-8 BOM
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
    } else if (char === "\r" && next === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      i++;
    } else if (char === "\n" || char === "\r") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h) => h.trim());
  const records: QualityGoldRecord[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((cell) => cell.trim() === "")) {
      continue;
    }
    const record: QualityGoldRecord = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      if (!header) continue;
      record[header] = (row[c] ?? "").trim();
    }
    records.push(record);
  }

  return records;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

/**
 * Parses a Quality Gold XML data feed (`<Item>`, `<Product>`, or `<Row>` blocks)
 * into an array of tag-keyed string records.
 */
export function parseQualityGoldXml(xmlContent: string): QualityGoldRecord[] {
  const input = xmlContent.replace(/^\uFEFF/, "");
  const records: QualityGoldRecord[] = [];

  const itemPattern = /<(Item|Product|Row)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const fieldPattern = /<([A-Za-z0-9_:-]+)\b[^>]*>([\s\S]*?)<\/\1>/g;

  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemPattern.exec(input)) !== null) {
    const body = itemMatch[2];
    const record: QualityGoldRecord = {};

    let fieldMatch: RegExpExecArray | null;
    fieldPattern.lastIndex = 0;
    while ((fieldMatch = fieldPattern.exec(body)) !== null) {
      const tag = fieldMatch[1].trim();
      const rawValue = fieldMatch[2];
      // Skip nested container tags; capture leaf values
      if (/<[A-Za-z0-9_:-]+\b[^>]*>/.test(rawValue) && !rawValue.includes("<![CDATA[")) {
        continue;
      }
      const value = decodeXmlEntities(rawValue);
      if (tag && value) {
        record[tag] = value;
      }
    }

    if (Object.keys(record).length > 0) {
      records.push(record);
    }
  }

  return records;
}

// ---------------------------------------------------------------------------
// Record Normalization (zero pricing retained)
// ---------------------------------------------------------------------------

function buildCaseInsensitiveMap(record: QualityGoldRecord): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, val] of Object.entries(record)) {
    const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
    if (normalizedKey && val.trim()) {
      map.set(normalizedKey, val.trim());
    }
  }
  return map;
}

function pickField(map: Map<string, string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const val = map.get(candidate.toLowerCase().replace(/[\s_-]+/g, ""));
    if (val) return val;
  }
  return null;
}

const CONSUMED_KEYS = new Set([
  "itemnumber",
  "sku",
  "itemno",
  "item",
  "itemid",
  "productid",
  "stylenumber",
  "mastersku",
  "parentsku",
  "itemgroupid",
  "groupcode",
  "style",
  "title",
  "productname",
  "name",
  "shortdescription",
  "description",
  "longdescription",
  "category",
  "productcategory",
  "subcategory",
  "jewelrytype",
  "merchandisingarea",
  "metaltype",
  "metal",
  "metalpurity",
  "metalcolor",
  "primarymaterial",
  "karat",
  "material",
  "stonetype",
  "primarystone",
  "gemstone",
  "stone",
  "imageurl",
  "fullurl",
  "primaryimage",
  "image",
  "thumbnailurl",
  "thumburl",
  "zoomurl",
  "alternateimage1",
  "alternateimage2",
  "alternateimage3",
  "alternateimage4",
  "alternateimage5",
  "alternateimageurl1",
  "alternateimageurl2",
  "alternateimageurl3",
  "alternateimageurl4",
  "alternateimageurl5",
  "status",
  "isactive",
  "active",
]);

function assembleQualityGoldMetal(lookup: Map<string, string>): string | null {
  const direct = pickField(lookup, ["MetalType", "Metal", "PrimaryMaterial", "Material"]);
  const purity = pickField(lookup, ["MetalPurity", "Karat"]);
  const color = pickField(lookup, ["MetalColor"]);

  // If direct already includes karat/silver/platinum (e.g. "14K Yellow Gold"), keep it
  if (direct && /\b(10k|14k|18k|22k|24k|sterling|platinum|palladium|titanium|steel)\b/i.test(direct)) {
    if (color && !direct.toLowerCase().includes(color.toLowerCase()) && /gold/i.test(direct)) {
      return direct.replace(/\bgold\b/i, `${color} Gold`);
    }
    return direct;
  }

  const parts = [purity, color, direct].filter((p): p is string => Boolean(p));
  if (parts.length > 0) {
    // Deduplicate overlapping words like ["14K", "Yellow", "Yellow Gold"]
    const joined = parts.join(" ").replace(/\b(\w+)\s+\1\b/gi, "$1");
    return joined;
  }
  return direct ?? purity ?? null;
}

/**
 * Normalizes a single Quality Gold CSV/XML row into the unified catalog item
 * schema. Pricing/cost columns are stripped automatically, and attributes are
 * aligned with our storefront filter/configurator keys so zero plumbing changes
 * are required.
 */
export function normalizeQualityGoldRecord(
  record: QualityGoldRecord
): NormalizedCatalogItem | null {
  const lookup = buildCaseInsensitiveMap(record);

  const supplierSku = pickField(lookup, ["ItemNumber", "SKU", "ItemNo", "Item"]);
  if (!supplierSku) {
    return null;
  }

  const supplierItemId = pickField(lookup, ["ItemId", "ProductId"]) ?? `QG-${supplierSku}`;
  const rawGroup = pickField(lookup, [
    "ParentSKU",
    "ItemGroupID",
    "StyleNumber",
    "MasterSKU",
    "GroupCode",
  ]);
  const groupCode = rawGroup
    ? rawGroup.toUpperCase().startsWith("QG-")
      ? rawGroup
      : `QG-${rawGroup}`
    : null;

  const title =
    pickField(lookup, ["Title", "ProductName", "Name", "ShortDescription"]) ??
    `Quality Gold Item ${supplierSku}`;
  const shortDescription = pickField(lookup, ["ShortDescription", "Title", "ProductName"]);
  const description = pickField(lookup, ["Description", "LongDescription", "ShortDescription"]);

  const category = pickField(lookup, ["Category", "ProductCategory", "MerchandisingArea"]);
  const subCategory = pickField(lookup, ["SubCategory", "JewelryType"]);
  const metalType = assembleQualityGoldMetal(lookup);
  const primaryStone = pickField(lookup, ["StoneType", "PrimaryStone", "Gemstone", "Stone"]);

  // Store only the single best (primary) image per SKU to stay lean inside Supabase storage limits
  const primaryFullUrl = pickField(lookup, [
    "FullUrl",
    "ImageUrl",
    "PrimaryImage",
    "Image",
    "AlternateImage1",
    "AlternateImageUrl1",
  ]);
  const thumbnailUrl = pickField(lookup, ["ThumbnailUrl", "ThumbUrl"]);
  const zoomUrl = pickField(lookup, ["ZoomUrl"]);

  const images: NormalizedCatalogImage[] = [];
  if (primaryFullUrl) {
    images.push({
      thumbnailUrl: thumbnailUrl ?? primaryFullUrl,
      fullUrl: primaryFullUrl,
      zoomUrl: zoomUrl ?? primaryFullUrl,
      angle: "front",
      sortOrder: 0,
      isPrimary: true,
    });
  }

  // Remaining feed columns go into `attributes` (with pricing keys stripped)
  const extraAttrs: Record<string, string> = {};
  for (const [key, val] of Object.entries(record)) {
    const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
    if (!normalizedKey || CONSUMED_KEYS.has(normalizedKey)) continue;
    if (val.trim()) {
      extraAttrs[key.trim()] = val.trim();
    }
  }

  // Align common Quality Gold column names to the exact attribute keys used by
  // our progressive sidebar filters & dynamic piece configurator
  const qgLength = pickField(lookup, ["Length", "ChainLength", "NecklaceLength", "BraceletLength", "ItemLength"]);
  if (qgLength) extraAttrs["Length"] = qgLength;

  const qgWidth = pickField(lookup, ["Width", "ChainWidth", "BandWidth", "ItemWidth"]);
  if (qgWidth) extraAttrs["Width"] = qgWidth;

  const qgRingSize = pickField(lookup, ["RingSize", "FingerSize", "Size"]);
  if (qgRingSize) extraAttrs["Ring Size"] = qgRingSize;

  const qgClasp = pickField(lookup, ["ClaspType", "Clasp", "Closure", "EarringClosure", "BackingType"]);
  if (qgClasp) extraAttrs["Clasp Type"] = qgClasp;

  const qgChainStyle = pickField(lookup, ["ChainType", "ChainStyle", "Style"]);
  if (qgChainStyle) extraAttrs["Style"] = qgChainStyle;

  const qgStoneShape = pickField(lookup, ["StoneShape", "CenterStoneShape", "PrimaryStoneShape"]);
  if (qgStoneShape) extraAttrs["Center Stone Shape"] = qgStoneShape;

  const qgCtw = pickField(lookup, ["TotalCaratWeight", "CaratWeight", "TCW", "CTW"]);
  if (qgCtw) extraAttrs["Total Carat Weight"] = qgCtw;

  const qgGender = pickField(lookup, ["Gender", "TargetAudience"]);
  if (qgGender) extraAttrs["Gender"] = qgGender;

  const pathParts = [category, subCategory].filter((p): p is string => Boolean(p));
  if (pathParts.length > 0) {
    extraAttrs.merchandisingPath = pathParts.join(" > ");
  }
  if (subCategory) {
    extraAttrs.subCategory = subCategory;
  }

  const statusVal = pickField(lookup, ["Status", "IsActive", "Active"])?.toLowerCase();
  const isActive =
    statusVal === undefined
      ? true
      : !["inactive", "discontinued", "false", "0", "no"].includes(statusVal);

  const categorySlug = deriveCategorySlug([category, subCategory, title, description]);

  return {
    supplierCode: "quality_gold",
    supplierSku,
    supplierItemId,
    groupCode,
    title,
    shortDescription,
    description,
    metalType,
    primaryStone,
    merchandisingArea: category ?? "Fine Jewelry",
    categorySlug,
    attributes: sanitizeAttributes(extraAttrs),
    rawPayload: stripPricingFields(record),
    isActive,
    isFeatured: false,
    images,
  };
}

/**
 * Parses a Quality Gold CSV or XML data feed string into normalized catalog items.
 */
export function parseQualityGoldFeed(
  content: string,
  format?: "csv" | "xml"
): NormalizedCatalogItem[] {
  const trimmed = content.trim();
  const detectedFormat =
    format ?? (trimmed.startsWith("<") ? "xml" : "csv");

  const records =
    detectedFormat === "xml"
      ? parseQualityGoldXml(trimmed)
      : parseQualityGoldCsv(trimmed);

  const items: NormalizedCatalogItem[] = [];
  for (const record of records) {
    const normalized = normalizeQualityGoldRecord(record);
    if (normalized) {
      items.push(normalized);
    }
  }
  return items;
}
