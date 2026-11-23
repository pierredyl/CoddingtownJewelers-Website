#!/usr/bin/env node
/**
 * Catalog Sync CLI
 *
 * Syncs jewelry catalog metadata (never prices) from Stuller API v2 and/or
 * Quality Gold CSV/XML data feeds into Supabase, recording each run in
 * `public.sync_runs`.
 *
 * Usage:
 *   npx tsx scripts/sync-catalog.ts --supplier=stuller [--dry-run] [--deactivate-missing]
 *   npx tsx scripts/sync-catalog.ts --supplier=quality_gold --file=./feeds/qgold.csv [--dry-run]
 *   npx tsx scripts/sync-catalog.ts --supplier=all --file=./feeds/qgold.xml [--dry-run]
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../src/lib/supabase/client";
import type { Database, SupplierCode } from "../src/lib/supabase/types";
import {
  upsertNormalizedItems,
  type NormalizedCatalogItem,
} from "../src/lib/suppliers/normalizer";
import { parseQualityGoldFeed } from "../src/lib/suppliers/qualityGold";
import {
  fetchStullerProducts,
  STULLER_JEWELRY_DEPARTMENTS,
} from "../src/lib/suppliers/stuller";

type SupplierTarget = "stuller" | "quality_gold" | "all";

interface CliArgs {
  supplier: SupplierTarget;
  dryRun: boolean;
  deactivateMissing: boolean;
  skipRawPayload: boolean;
  filePath: string | null;
  maxPages: number;
  skus: string[];
  categoryIds: number[];
  filters: string[];
  allDepartments: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  let supplier: SupplierTarget = "all";
  let dryRun = false;
  let deactivateMissing = false;
  let skipRawPayload = false;
  let filePath: string | null = null;
  let maxPages = 10;
  let skus: string[] = [];
  let categoryIds: number[] = [];
  let filters: string[] = [];
  let allDepartments = false;

  for (const arg of argv) {
    if (arg.startsWith("--supplier=")) {
      const value = arg.slice("--supplier=".length).trim().toLowerCase();
      if (value === "stuller" || value === "quality_gold" || value === "all") {
        supplier = value;
      } else {
        throw new Error(
          `Invalid --supplier value '${value}'. Expected 'stuller', 'quality_gold', or 'all'.`
        );
      }
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--deactivate-missing") {
      deactivateMissing = true;
    } else if (arg === "--skip-raw-payload") {
      skipRawPayload = true;
    } else if (arg.startsWith("--file=")) {
      filePath = arg.slice("--file=".length).trim() || null;
    } else if (arg.startsWith("--max-pages=")) {
      const parsed = Number.parseInt(arg.slice("--max-pages=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        maxPages = parsed;
      }
    } else if (arg.startsWith("--skus=")) {
      skus = arg
        .slice("--skus=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--category-ids=")) {
      categoryIds = arg
        .slice("--category-ids=".length)
        .split(",")
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
    } else if (arg.startsWith("--filters=")) {
      filters = arg
        .slice("--filters=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--all-departments") {
      allDepartments = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage: npx tsx scripts/sync-catalog.ts [options]",
          "",
          "Options:",
          "  --supplier=stuller|quality_gold|all   Which supplier(s) to sync (default: all)",
          "  --file=<path>                         Local Quality Gold CSV/XML feed path",
          "  --skus=<sku1,sku2>                    Optional comma-separated Stuller SKUs",
          "  --category-ids=<id1,id2>              Optional comma-separated Stuller CategoryIds",
          "  --all-departments                     Sync evenly across all 7 Stuller jewelry departments",
          "  --filters=<Orderable,Finished,...>    Optional Stuller ProductFilter values",
          "  --max-pages=<n>                       Max Stuller API pages per department/query (default: 10)",
          "  --dry-run                             Parse & normalize without writing to Supabase",
          "  --deactivate-missing                  Mark active SKUs absent from this sync inactive",
          "  --skip-raw-payload                    Omit raw_payload jsonb to minimize Postgres storage",
        ].join("\n")
      );
      process.exit(0);
    }
  }

  return {
    supplier,
    dryRun,
    deactivateMissing,
    skipRawPayload,
    filePath,
    maxPages,
    skus,
    categoryIds,
    filters,
    allDepartments,
  };
}

async function startSyncRun(
  supabase: SupabaseClient<Database>,
  supplierCode: SupplierCode
): Promise<{ runId: number; supplierId: number }> {
  const { data: supplierRow, error: supErr } = await supabase
    .from("suppliers")
    .select("id")
    .eq("code", supplierCode)
    .maybeSingle();

  if (supErr || !supplierRow) {
    throw new Error(
      `Supplier '${supplierCode}' not found in public.suppliers. Run supabase/seed.sql first.`
    );
  }

  const { data: runRow, error: runErr } = await supabase
    .from("sync_runs")
    .insert({
      supplier_id: supplierRow.id,
      status: "running",
      items_upserted: 0,
      items_deactivated: 0,
    })
    .select("id")
    .single();

  if (runErr || !runRow) {
    throw new Error(`Failed to record sync_runs start: ${runErr?.message ?? "unknown error"}`);
  }

  return { runId: runRow.id, supplierId: supplierRow.id };
}

async function finishSyncRun(
  supabase: SupabaseClient<Database>,
  runId: number,
  outcome:
    | { status: "succeeded"; itemsUpserted: number; itemsDeactivated: number }
    | { status: "failed"; errorMessage: string }
): Promise<void> {
  const patch: Database["public"]["Tables"]["sync_runs"]["Update"] =
    outcome.status === "succeeded"
      ? {
          status: "succeeded",
          items_upserted: outcome.itemsUpserted,
          items_deactivated: outcome.itemsDeactivated,
          finished_at: new Date().toISOString(),
        }
      : {
          status: "failed",
          error_message: outcome.errorMessage.slice(0, 1000),
          finished_at: new Date().toISOString(),
        };

  await supabase.from("sync_runs").update(patch).eq("id", runId);
}

async function loadQualityGoldItems(
  filePath: string | null
): Promise<NormalizedCatalogItem[]> {
  const resolvedPath = filePath ?? process.env.QUALITY_GOLD_FEED_PATH?.trim() ?? null;
  if (!resolvedPath) {
    throw new Error(
      "Quality Gold sync requires --file=<path-to-csv-or-xml> or QUALITY_GOLD_FEED_PATH env var."
    );
  }

  const absolutePath = path.resolve(process.cwd(), resolvedPath);
  const content = await readFile(absolutePath, "utf8");
  const ext = path.extname(absolutePath).toLowerCase();
  const format = ext === ".xml" ? "xml" : ext === ".csv" ? "csv" : undefined;

  return parseQualityGoldFeed(content, format);
}

async function loadStullerItems(
  args: CliArgs
): Promise<NormalizedCatalogItem[]> {
  if (args.allDepartments) {
    const combined: NormalizedCatalogItem[] = [];
    for (const dept of STULLER_JEWELRY_DEPARTMENTS) {
      console.log(
        `[sync] stuller department: ${dept.label} (CategoryIds=${dept.categoryIds.join(",")}, maxPages=${args.maxPages})...`
      );
      const deptItems = await fetchStullerProducts({
        maxPages: args.maxPages,
        categoryIds: dept.categoryIds,
        filters: args.filters.length > 0 ? args.filters : undefined,
      });
      console.log(`[sync]   -> ${deptItems.length} item(s)`);
      combined.push(...deptItems);
    }
    return combined;
  }

  return fetchStullerProducts({
    maxPages: args.maxPages,
    skus: args.skus.length > 0 ? args.skus : undefined,
    categoryIds: args.categoryIds.length > 0 ? args.categoryIds : undefined,
    filters: args.filters.length > 0 ? args.filters : undefined,
  });
}

async function syncSupplier(
  supplierCode: "stuller" | "quality_gold",
  args: CliArgs,
  supabase: SupabaseClient<Database> | null
): Promise<void> {
  console.log(
    `[sync] Starting ${supplierCode} sync${args.dryRun ? " (DRY RUN)" : ""}...`
  );

  let runId: number | null = null;
  if (!args.dryRun && supabase) {
    const started = await startSyncRun(supabase, supplierCode);
    runId = started.runId;
  }

  try {
    const items =
      supplierCode === "stuller"
        ? await loadStullerItems(args)
        : await loadQualityGoldItems(args.filePath);

    console.log(`[sync] ${supplierCode}: normalized ${items.length} item(s).`);

    if (args.dryRun) {
      const uniqueSkus = new Map<string, NormalizedCatalogItem>();
      for (const item of items) {
        uniqueSkus.set(item.supplierSku, item);
      }
      const deduped = Array.from(uniqueSkus.values());
      const categoryCounts = new Map<string, number>();
      const groupKeys = new Set<string>();
      let missingMetal = 0;
      let missingImages = 0;

      for (const item of deduped) {
        const slug = item.categorySlug ?? "(unmapped)";
        categoryCounts.set(slug, (categoryCounts.get(slug) ?? 0) + 1);
        groupKeys.add(item.groupCode ?? item.supplierSku);
        if (!item.metalType) missingMetal++;
        if (item.images.length === 0) missingImages++;
      }

      console.log(
        `[sync] ${supplierCode} dry-run summary: uniqueSkus=${deduped.length}, uniqueGroups=${groupKeys.size}, missingMetal=${missingMetal}, missingImages=${missingImages}`
      );
      console.log(
        `[sync] ${supplierCode} category breakdown:`,
        Object.fromEntries(
          [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])
        )
      );

      const sample = deduped.slice(0, 3).map((item) => ({
        sku: item.supplierSku,
        groupCode: item.groupCode,
        title: item.title,
        metalType: item.metalType,
        primaryStone: item.primaryStone,
        categorySlug: item.categorySlug,
        imageCount: item.images.length,
      }));
      console.log(
        `[sync] ${supplierCode} dry-run sample:`,
        JSON.stringify(sample, null, 2)
      );
      return;
    }

    if (!supabase) {
      throw new Error(
        "Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const result = await upsertNormalizedItems(supabase, supplierCode, items, {
      dryRun: false,
      deactivateMissing: args.deactivateMissing,
      storeRawPayload: !args.skipRawPayload,
    });

    if (runId !== null) {
      await finishSyncRun(supabase, runId, {
        status: "succeeded",
        itemsUpserted: result.itemsUpserted,
        itemsDeactivated: result.itemsDeactivated,
      });
    }

    console.log(
      `[sync] ${supplierCode} completed: upserted=${result.itemsUpserted}, deactivated=${result.itemsDeactivated}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId !== null && supabase) {
      await finishSyncRun(supabase, runId, {
        status: "failed",
        errorMessage: message,
      });
    }
    throw err;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const supabase = args.dryRun ? null : getSupabaseAdminClient();

  if (!args.dryRun && !supabase) {
    throw new Error(
      "Missing Supabase service-role credentials. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run."
    );
  }

  const targets: Array<"stuller" | "quality_gold"> =
    args.supplier === "all" ? ["stuller", "quality_gold"] : [args.supplier];

  for (const target of targets) {
    await syncSupplier(target, args, supabase);
  }

  // Optional: bust the Next.js server catalog cache immediately after a live sync
  const revalidateUrl = process.env.SITE_REVALIDATE_URL?.trim();
  const revalidateSecret = process.env.REVALIDATE_SECRET?.trim();
  if (!args.dryRun && revalidateUrl && revalidateSecret) {
    console.log(`[sync] Triggering cache revalidation at ${revalidateUrl}...`);
    const res = await fetch(revalidateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${revalidateSecret}`,
      },
    });
    if (!res.ok) {
      console.warn(
        `[sync] Warning: cache revalidation returned ${res.status} ${res.statusText}`
      );
    } else {
      console.log("[sync] Next.js catalog cache revalidated.");
    }
  }
}

main().catch((err) => {
  console.error("[sync] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
