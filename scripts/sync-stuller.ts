#!/usr/bin/env node
/**
 * Dedicated Stuller Catalog Sync CLI (Weekly / On-Demand)
 *
 * Strictly scoped to `supplier_id = stuller` — never touches Quality Gold rows.
 * Omits `raw_payload` by default to keep Supabase storage lean, upserts only
 * new/changed SKUs idempotently, and optionally busts the Next.js Data Cache.
 *
 * Examples:
 *   npm run sync:stuller -- --all-departments --max-pages=10
 *   npm run sync:stuller -- --departments=bracelets,fashion-rings,gemstone-jewelry --max-pages=15
 *   npm run sync:stuller -- --category-ids=11993,11990 --filters="Orderable,OnPriceList" --max-pages=12
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../src/lib/supabase/client";
import type { Database } from "../src/lib/supabase/types";
import {
  upsertNormalizedItems,
  type NormalizedCatalogItem,
} from "../src/lib/suppliers/normalizer";
import {
  fetchStullerProducts,
  STULLER_JEWELRY_DEPARTMENTS,
} from "../src/lib/suppliers/stuller";

const DEPARTMENT_ALIASES: Record<string, { label: string; categoryIds: number[] }> = {
  "engagement-rings": STULLER_JEWELRY_DEPARTMENTS[0],
  "wedding-bands": STULLER_JEWELRY_DEPARTMENTS[1],
  "fashion-rings": STULLER_JEWELRY_DEPARTMENTS[2],
  "necklaces-pendants": STULLER_JEWELRY_DEPARTMENTS[3],
  earrings: STULLER_JEWELRY_DEPARTMENTS[4],
  bracelets: STULLER_JEWELRY_DEPARTMENTS[5],
  "gemstone-jewelry": STULLER_JEWELRY_DEPARTMENTS[6],
};

interface StullerCliArgs {
  dryRun: boolean;
  deactivateMissing: boolean;
  skipRawPayload: boolean;
  maxPages: number;
  skus: string[];
  categoryIds: number[];
  departments: string[];
  filters: string[];
  allDepartments: boolean;
  revalidate: boolean;
}

function parseArgs(argv: string[]): StullerCliArgs {
  let dryRun = false;
  let deactivateMissing = false;
  let skipRawPayload = true;
  let maxPages = 10;
  let skus: string[] = [];
  let categoryIds: number[] = [];
  let departments: string[] = [];
  let filters: string[] = [];
  let allDepartments = false;
  let revalidate = false;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--deactivate-missing") {
      deactivateMissing = true;
    } else if (arg === "--keep-raw-payload") {
      skipRawPayload = false;
    } else if (arg === "--skip-raw-payload") {
      skipRawPayload = true;
    } else if (arg === "--all-departments") {
      allDepartments = true;
    } else if (arg === "--revalidate") {
      revalidate = true;
    } else if (arg.startsWith("--max-pages=")) {
      const parsed = Number.parseInt(arg.slice("--max-pages=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) maxPages = parsed;
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
    } else if (arg.startsWith("--departments=")) {
      departments = arg
        .slice("--departments=".length)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    } else if (arg.startsWith("--filters=")) {
      filters = arg
        .slice("--filters=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage: npm run sync:stuller -- [options]",
          "",
          "Options:",
          "  --all-departments                     Sync evenly across all 7 Stuller jewelry departments",
          "  --departments=<slug1,slug2>           Sync specific departments (e.g. bracelets,fashion-rings,gemstone-jewelry)",
          "  --category-ids=<id1,id2>              Explicit Stuller WebCategory IDs",
          "  --skus=<sku1,sku2>                    Explicit Stuller SKUs",
          "  --filters=<Orderable,OnPriceList>     Stuller ProductFilter values",
          "  --max-pages=<n>                       Max API pages per department/query (default: 10)",
          "  --dry-run                             Normalize without writing to Supabase",
          "  --deactivate-missing                  Mark active Stuller SKUs absent from a full sync inactive",
          "  --revalidate                          Call POST /api/revalidate after sync completes",
        ].join("\n")
      );
      process.exit(0);
    }
  }

  return {
    dryRun,
    deactivateMissing,
    skipRawPayload,
    maxPages,
    skus,
    categoryIds,
    departments,
    filters,
    allDepartments,
    revalidate,
  };
}

async function loadDotEnv(): Promise<void> {
  for (const filename of [".env.local", ".env"]) {
    try {
      const content = await readFile(path.resolve(process.cwd(), filename), "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        let val = line.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    } catch {
      // Optional env file
    }
  }
}

async function startSyncRun(supabase: SupabaseClient<Database>): Promise<number> {
  const { data: sup, error: supErr } = await supabase
    .from("suppliers")
    .select("id")
    .eq("code", "stuller")
    .maybeSingle();

  if (supErr || !sup) {
    throw new Error("Supplier 'stuller' not found in public.suppliers.");
  }

  const { data: run, error: runErr } = await supabase
    .from("sync_runs")
    .insert({
      supplier_id: sup.id,
      status: "running",
      items_upserted: 0,
      items_deactivated: 0,
    })
    .select("id")
    .single();

  if (runErr || !run) {
    throw new Error(`Failed to create sync_runs row: ${runErr?.message ?? "unknown"}`);
  }
  return run.id;
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

async function triggerRevalidate(): Promise<void> {
  const url = process.env.REVALIDATE_URL?.trim();
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!url || !secret) {
    console.log("[sync:stuller] Skipping /api/revalidate (REVALIDATE_URL or REVALIDATE_SECRET not set).");
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log(`[sync:stuller] Revalidate ${url} -> HTTP ${res.status}`);
}

async function main(): Promise<void> {
  await loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  const supabase = args.dryRun ? null : getSupabaseAdminClient();

  if (!args.dryRun && !supabase) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  let runId: number | null = null;
  if (!args.dryRun && supabase) {
    runId = await startSyncRun(supabase);
  }

  try {
    const items: NormalizedCatalogItem[] = [];
    const targetDepartments = args.allDepartments
      ? STULLER_JEWELRY_DEPARTMENTS
      : args.departments
          .map((slug) => DEPARTMENT_ALIASES[slug])
          .filter((d): d is { label: string; categoryIds: number[] } => Boolean(d));

    if (targetDepartments.length > 0) {
      for (const dept of targetDepartments) {
        console.log(
          `[sync:stuller] Pulling ${dept.label} (CategoryIds=${dept.categoryIds.join(",")}, maxPages=${args.maxPages})...`
        );
        const batch = await fetchStullerProducts({
          maxPages: args.maxPages,
          categoryIds: dept.categoryIds,
          filters: args.filters.length > 0 ? args.filters : undefined,
        });
        console.log(`[sync:stuller]   -> ${batch.length} item(s)`);
        items.push(...batch);
      }
    } else {
      const batch = await fetchStullerProducts({
        maxPages: args.maxPages,
        skus: args.skus.length > 0 ? args.skus : undefined,
        categoryIds: args.categoryIds.length > 0 ? args.categoryIds : undefined,
        filters: args.filters.length > 0 ? args.filters : undefined,
      });
      items.push(...batch);
    }

    console.log(`[sync:stuller] Normalized ${items.length} Stuller item(s).`);

    if (args.dryRun || !supabase) {
      console.log("[sync:stuller] Dry run complete — no database writes performed.");
      return;
    }

    if (args.skipRawPayload) {
      for (const item of items) {
        item.rawPayload = null;
      }
    }

    const result = await upsertNormalizedItems(supabase, "stuller", items, {
      dryRun: false,
      deactivateMissing: args.deactivateMissing,
    });

    if (runId !== null) {
      await finishSyncRun(supabase, runId, {
        status: "succeeded",
        itemsUpserted: result.itemsUpserted,
        itemsDeactivated: result.itemsDeactivated,
      });
    }

    console.log(
      `[sync:stuller] Done: upserted=${result.itemsUpserted}, deactivated=${result.itemsDeactivated}.`
    );

    if (args.revalidate) {
      await triggerRevalidate();
    }
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

main().catch((err) => {
  console.error("[sync:stuller] Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
