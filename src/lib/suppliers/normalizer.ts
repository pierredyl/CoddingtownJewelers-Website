import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, SupplierCode } from "../supabase/types";

export interface NormalizedCatalogImage {
  thumbnailUrl: string | null;
  fullUrl: string;
  zoomUrl: string | null;
  angle: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface NormalizedCatalogItem {
  supplierCode: SupplierCode;
  supplierSku: string;
  supplierItemId: string | null;
  groupCode: string | null;
  title: string;
  shortDescription: string | null;
  description: string | null;
  metalType: string | null;
  primaryStone: string | null;
  merchandisingArea: string | null;
  categorySlug: string | null;
  attributes: Record<string, string | number | boolean | null>;
  rawPayload: Json;
  isActive: boolean;
  isFeatured: boolean;
  images: NormalizedCatalogImage[];
}

export interface UpsertBatchOptions {
  dryRun?: boolean;
  deactivateMissing?: boolean;
  batchSize?: number;
  /** Store sanitized raw supplier JSON in `raw_payload` (set false to save ~70-80% DB storage on large catalogs) */
  storeRawPayload?: boolean;
}

/**
 * Ensures ingested image URLs use safe protocols (https/http or relative paths),
 * rejecting `javascript:` or unsafe `data:` schemes.
 */
export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export interface UpsertBatchResult {
  supplierCode: SupplierCode;
  totalProcessed: number;
  itemsUpserted: number;
  itemsDeactivated: number;
  dryRun: boolean;
}

const PRICE_KEY_PATTERN =
  /(price|cost|msrp|retail|wholesale|margin|markup|amount|currency)/i;

/**
 * Strips any pricing/cost keys recursively so zero pricing data is stored
 * in Postgres `attributes` or `raw_payload`.
 */
export function stripPricingFields(value: unknown): Json {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => stripPricingFields(entry));
  }
  if (typeof value === "object") {
    const clean: { [key: string]: Json } = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (PRICE_KEY_PATTERN.test(key)) {
        continue;
      }
      clean[key] = stripPricingFields(val);
    }
    return clean;
  }
  return String(value);
}

/**
 * Strips pricing keys from flat attribute maps.
 */
export function sanitizeAttributes(
  attrs: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const trimmedKey = key.trim();
    if (!trimmedKey || PRICE_KEY_PATTERN.test(trimmedKey)) {
      continue;
    }
    if (value === undefined) continue;
    if (typeof value === "string") {
      const trimmedVal = value.trim();
      if (trimmedVal.length > 0) {
        clean[trimmedKey] = trimmedVal;
      }
    } else {
      clean[trimmedKey] = value;
    }
  }
  return clean;
}

/**
 * Maps supplier merchandising categories/descriptions to normalized storefront
 * category slugs defined in `public.categories`.
 */
export function deriveCategorySlug(
  hints: Array<string | null | undefined>
): string | null {
  const combined = hints
    .filter((h): h is string => Boolean(h && h.trim()))
    .join(" ")
    .toLowerCase();

  if (!combined) return null;

  if (/\bengagement\b|\bsolitaire\b|\bbridal\s+mounting\b/.test(combined)) {
    return "engagement-rings";
  }
  if (/\bwedding\s+band\b|\banniversary\s+band\b|\beternity\b|\bbands?\b/.test(combined)) {
    return "wedding-bands";
  }
  if (/\bearring\b|\bstuds?\b|\bhoops?\b|\bdrop\s+ear/.test(combined)) {
    return "earrings";
  }
  if (/\bnecklace\b|\bpendant\b|\bchain\b|\bchoker\b|\blocket\b/.test(combined)) {
    return "necklaces-pendants";
  }
  if (/\bbracelet\b|\bbangle\b|\bcuff\b|\banklet\b/.test(combined)) {
    return "bracelets";
  }
  if (
    /\bsapphire\b|\bruby\b|\bemerald\b|\bgemstone\b|\btanzanite\b|\bamethyst\b|\baquamarine\b|\bopal\b|\bpearl\b/.test(
      combined
    )
  ) {
    return "gemstone-jewelry";
  }
  if (/\bring\b/.test(combined)) {
    return "fashion-rings";
  }

  return null;
}

/**
 * Idempotently upserts normalized supplier items into `catalog_items` and
 * synchronizes their `catalog_images` rows.
 */
export async function upsertNormalizedItems(
  supabase: SupabaseClient<Database>,
  supplierCode: SupplierCode,
  items: NormalizedCatalogItem[],
  options: UpsertBatchOptions = {}
): Promise<UpsertBatchResult> {
  const dryRun = options.dryRun ?? false;
  const deactivateMissing = options.deactivateMissing ?? false;
  const batchSize = Math.max(1, options.batchSize ?? 100);
  const storeRawPayload = options.storeRawPayload ?? true;

  // Deduplicate incoming items by supplierSku (last wins)
  const dedupedMap = new Map<string, NormalizedCatalogItem>();
  for (const item of items) {
    const sku = item.supplierSku.trim();
    if (!sku) continue;
    dedupedMap.set(sku, { ...item, supplierSku: sku });
  }
  const deduped = Array.from(dedupedMap.values());

  if (dryRun) {
    return {
      supplierCode,
      totalProcessed: deduped.length,
      itemsUpserted: deduped.length,
      itemsDeactivated: 0,
      dryRun: true,
    };
  }

  // 1. Resolve supplier_id
  const { data: supplierRow, error: supplierError } = await supabase
    .from("suppliers")
    .select("id, code")
    .eq("code", supplierCode)
    .maybeSingle();

  if (supplierError) {
    throw new Error(`Failed to look up supplier '${supplierCode}': ${supplierError.message}`);
  }
  if (!supplierRow) {
    throw new Error(
      `Supplier '${supplierCode}' does not exist in public.suppliers. Run supabase/seed.sql first.`
    );
  }
  const supplierId = supplierRow.id;

  // 2. Load category slug -> id map
  const { data: categoryRows, error: catError } = await supabase
    .from("categories")
    .select("id, slug");

  if (catError) {
    throw new Error(`Failed to load categories: ${catError.message}`);
  }
  const categoryMap = new Map<string, number>();
  for (const row of categoryRows ?? []) {
    categoryMap.set(row.slug.toLowerCase(), row.id);
  }

  // 3. Batch upsert catalog_items and replace catalog_images per upserted item
  let itemsUpserted = 0;
  const syncedSkus = new Set<string>();
  const nowIso = new Date().toISOString();

  for (let i = 0; i < deduped.length; i += batchSize) {
    const chunk = deduped.slice(i, i + batchSize);

    const rowsToUpsert: Database["public"]["Tables"]["catalog_items"]["Insert"][] =
      chunk.map((item) => {
        syncedSkus.add(item.supplierSku);
        const categoryId = item.categorySlug
          ? (categoryMap.get(item.categorySlug.toLowerCase()) ?? null)
          : null;

        return {
          supplier_id: supplierId,
          category_id: categoryId,
          supplier_sku: item.supplierSku,
          supplier_item_id: item.supplierItemId,
          group_code: item.groupCode,
          title: item.title,
          short_description: item.shortDescription,
          description: item.description,
          metal_type: item.metalType,
          primary_stone: item.primaryStone,
          merchandising_area: item.merchandisingArea,
          attributes: sanitizeAttributes(item.attributes),
          raw_payload: storeRawPayload ? stripPricingFields(item.rawPayload) : null,
          is_active: item.isActive,
          is_featured: item.isFeatured,
          last_synced_at: nowIso,
        };
      });

    const { data: upsertedRows, error: upsertError } = await supabase
      .from("catalog_items")
      .upsert(rowsToUpsert, { onConflict: "supplier_id,supplier_sku" })
      .select("id, supplier_sku");

    if (upsertError) {
      throw new Error(
        `Failed to upsert catalog_items batch (${i}-${i + chunk.length}): ${upsertError.message}`
      );
    }

    const idBySku = new Map<string, number>();
    for (const row of upsertedRows ?? []) {
      idBySku.set(row.supplier_sku, row.id);
    }

    itemsUpserted += upsertedRows?.length ?? chunk.length;

    // Replace images for items in this chunk that include image records
    const itemIdsWithImages: number[] = [];
    const imagesToInsert: Database["public"]["Tables"]["catalog_images"]["Insert"][] =
      [];

    for (const item of chunk) {
      const itemId = idBySku.get(item.supplierSku);
      if (!itemId || item.images.length === 0) continue;

      itemIdsWithImages.push(itemId);
      // Keep only the single best (primary) safe image per SKU to keep DB footprint lean
      const bestImage = item.images.find((img) => isSafeImageUrl(img.fullUrl));
      if (bestImage) {
        imagesToInsert.push({
          item_id: itemId,
          thumbnail_url: isSafeImageUrl(bestImage.thumbnailUrl)
            ? bestImage.thumbnailUrl!.trim()
            : null,
          full_url: bestImage.fullUrl.trim(),
          zoom_url: isSafeImageUrl(bestImage.zoomUrl)
            ? bestImage.zoomUrl!.trim()
            : null,
          angle: bestImage.angle?.trim() || null,
          sort_order: 0,
          is_primary: true,
        });
      }
    }

    if (itemIdsWithImages.length > 0) {
      const { error: delImgError } = await supabase
        .from("catalog_images")
        .delete()
        .in("item_id", itemIdsWithImages);

      if (delImgError) {
        throw new Error(`Failed to clear old catalog_images: ${delImgError.message}`);
      }

      if (imagesToInsert.length > 0) {
        const { error: insImgError } = await supabase
          .from("catalog_images")
          .insert(imagesToInsert);

        if (insImgError) {
          throw new Error(`Failed to insert catalog_images: ${insImgError.message}`);
        }
      }
    }
  }

  // 4. Optionally deactivate items not seen in this full sync (paginated & chunked)
  let itemsDeactivated = 0;
  if (deactivateMissing && syncedSkus.size > 0) {
    const toDeactivateIds: number[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data: existingActive, error: activeError } = await supabase
        .from("catalog_items")
        .select("id, supplier_sku")
        .eq("supplier_id", supplierId)
        .eq("is_active", true)
        .range(from, from + pageSize - 1);

      if (activeError) {
        throw new Error(
          `Failed to fetch active items for deactivation: ${activeError.message}`
        );
      }

      if (!existingActive || existingActive.length === 0) break;

      for (const row of existingActive) {
        if (!syncedSkus.has(row.supplier_sku)) {
          toDeactivateIds.push(row.id);
        }
      }

      if (existingActive.length < pageSize) break;
      from += pageSize;
    }

    const deactivateChunkSize = 250;
    for (let i = 0; i < toDeactivateIds.length; i += deactivateChunkSize) {
      const chunk = toDeactivateIds.slice(i, i + deactivateChunkSize);
      const { error: deactError } = await supabase
        .from("catalog_items")
        .update({ is_active: false })
        .in("id", chunk);

      if (deactError) {
        throw new Error(
          `Failed to deactivate missing items: ${deactError.message}`
        );
      }
      itemsDeactivated += chunk.length;
    }
  }

  return {
    supplierCode,
    totalProcessed: deduped.length,
    itemsUpserted,
    itemsDeactivated,
    dryRun: false,
  };
}
