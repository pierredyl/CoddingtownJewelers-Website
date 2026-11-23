#!/usr/bin/env node
/**
 * Dedicated Quality Gold Catalog Sync CLI (Isolated from Stuller)
 *
 * Strictly scoped to `supplier_id = quality_gold` — never touches, updates,
 * or deactivates any Stuller rows in Supabase.
 *
 * Usage (once your Quality Gold CSV/XML feed is ready):
 *   npm run sync:quality-gold -- --file=./feeds/qgold.csv --dry-run
 *   npm run sync:quality-gold -- --file=./feeds/qgold.csv
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "../src/lib/supabase/client";
import { upsertNormalizedItems } from "../src/lib/suppliers/normalizer";
import { parseQualityGoldFeed } from "../src/lib/suppliers/qualityGold";

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

async function main(): Promise<void> {
  await loadDotEnv();
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const deactivateMissing = argv.includes("--deactivate-missing");
  const fileArg = argv.find((a) => a.startsWith("--file="))?.slice("--file=".length).trim();
  const resolvedPath = fileArg || process.env.QUALITY_GOLD_FEED_PATH?.trim();

  if (!resolvedPath) {
    console.log(
      "Usage: npm run sync:quality-gold -- --file=<path-to-qgold.csv|xml> [--dry-run] [--deactivate-missing]"
    );
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), resolvedPath);
  const content = await readFile(absolutePath, "utf8");
  const ext = path.extname(absolutePath).toLowerCase();
  const format = ext === ".xml" ? "xml" : ext === ".csv" ? "csv" : undefined;

  const items = parseQualityGoldFeed(content, format);
  console.log(`[sync:quality-gold] Parsed ${items.length} item(s) from ${absolutePath}.`);

  if (dryRun) {
    console.log("[sync:quality-gold] Dry run complete — no database writes performed.");
    return;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  for (const item of items) {
    item.rawPayload = null;
  }

  const result = await upsertNormalizedItems(supabase, "quality_gold", items, {
    dryRun: false,
    deactivateMissing,
  });

  console.log(
    `[sync:quality-gold] Done: upserted=${result.itemsUpserted}, deactivated=${result.itemsDeactivated}.`
  );
}

main().catch((err) => {
  console.error("[sync:quality-gold] Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
