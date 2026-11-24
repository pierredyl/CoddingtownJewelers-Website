#!/usr/bin/env node
/**
 * One-Command Auto-Commit & Push for `dev`
 *
 * Automatically inspects all changed/new/deleted files, generates a clean
 * commit subject + full grouped commit log body, commits everything, and
 * pushes to `origin <current-branch>` (blocks direct pushes to `main` by default).
 *
 * Usage:
 *   npm run push:dev                  # auto-commit all changes & push to origin dev
 *   npm run push:dev -- --dry-run     # preview the auto-generated commit message without committing
 *   npm run push:dev -- --no-push     # auto-commit locally without pushing
 */

import { execSync, spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noPush = args.includes("--no-push");
const allowMain = args.includes("--allow-main");

function runGit(cmd, trimStart = true) {
  const out = execSync(`git ${cmd}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return trimStart ? out.trim() : out.trimEnd();
}

function classifyArea(filePath) {
  const p = filePath.replace(/\\/g, "/");
  if (
    p.includes("src/lib/search/") ||
    p.includes("GlobalSearchBar") ||
    p.includes("api/catalog/search")
  ) {
    return "Search";
  }
  if (
    p.includes("CatalogBrowser") ||
    p.includes("CatalogFilterSidebar") ||
    p.includes("CatalogCard") ||
    p.includes("PieceDetailModal") ||
    p.includes("catalogFilters") ||
    p.includes("src/app/catalogue/") ||
    p.includes("src/app/api/catalog/")
  ) {
    return "Catalogue & Filters";
  }
  if (
    p.includes("HomeShowcase") ||
    p.includes("CatalogLanding") ||
    p.includes("JewelryGuide") ||
    p.includes("SiteHeader") ||
    p.includes("SiteFooter") ||
    p.includes("globals.css") ||
    p.includes("public/images/") ||
    p.includes("src/config/siteImages") ||
    p.includes("src/config/reviews") ||
    p.includes("src/config/faq")
  ) {
    return "Design & Media";
  }
  if (
    p.includes("supabase/") ||
    p.includes("src/lib/supabase/") ||
    p.includes("src/lib/suppliers/") ||
    p.includes("scripts/sync-")
  ) {
    return "Database & Sync";
  }
  if (p.includes(".github/") || p.includes("scripts/") || p === "package.json") {
    return "Automation & Tooling";
  }
  return "Core";
}

function getStatusEntries() {
  // Pass trimStart=false so leading status spaces (e.g. " M package.json") are preserved!
  const raw = runGit("status --porcelain -uall", false);
  if (!raw.trim()) return [];
  return raw
    .split(/\r?\n/)
    .filter((line) => line.length > 3)
    .map((line) => {
      const code = line.slice(0, 2);
      const file = line.slice(3).trim().replace(/^"(.*)"$/, "$1");
      let action = "Updated";
      if (code.includes("?") || code.includes("A")) action = "Added";
      else if (code.includes("D")) action = "Removed";
      else if (code.includes("R")) action = "Renamed";
      return { code, action, file, area: classifyArea(file) };
    });
}

function getDiffLineCounts() {
  const map = new Map();
  const raw = [
    runGit("diff --numstat"),
    runGit("diff --cached --numstat"),
  ]
    .filter(Boolean)
    .join("\n");
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const added = parts[0] === "-" ? 0 : Number.parseInt(parts[0], 10) || 0;
    const removed = parts[1] === "-" ? 0 : Number.parseInt(parts[1], 10) || 0;
    const file = parts.slice(2).join("\t");
    const prev = map.get(file) ?? { added: 0, removed: 0 };
    map.set(file, {
      added: prev.added + added,
      removed: prev.removed + removed,
    });
  }
  return map;
}

function buildAutoCommitMessage(entries, lineCounts) {
  const byArea = new Map();
  for (const entry of entries) {
    const list = byArea.get(entry.area) ?? [];
    list.push(entry);
    byArea.set(entry.area, list);
  }
  const sortedAreas = Array.from(byArea.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Build concise, readable subject line without mid-word truncation
  const primaryArea = sortedAreas[0]?.[0] ?? "Core";
  const hasNew = entries.some((e) => e.action === "Added");
  const hasMod = entries.some((e) => e.action === "Updated");
  const verb = hasNew && !hasMod ? "feat" : "update";
  const scope = primaryArea.toLowerCase().replace(/\s*&\s*/g, "/");
  const firstFile = path.basename(entries[0].file);
  const summaryPart =
    entries.length === 1
      ? firstFile
      : `${firstFile} and ${entries.length - 1} other ${entries.length - 1 === 1 ? "file" : "files"}`;
  const subject = `${verb}(${scope}): ${summaryPart}`;

  let totalAdded = 0;
  let totalRemoved = 0;
  for (const stats of lineCounts.values()) {
    totalAdded += stats.added;
    totalRemoved += stats.removed;
  }

  const bodyLines = [
    `Auto-generated patch notes (${entries.length} ${entries.length === 1 ? "file" : "files"}, +${totalAdded} / -${totalRemoved}):`,
    "",
  ];

  for (const [area, items] of sortedAreas) {
    bodyLines.push(`[${area}]`);
    for (const item of items) {
      const stats = lineCounts.get(item.file);
      const statStr =
        item.action === "Added"
          ? "(new)"
          : stats
            ? `(+${stats.added}/-${stats.removed})`
            : "";
      bodyLines.push(`- ${item.action}: ${item.file} ${statStr}`.trimEnd());
    }
    bodyLines.push("");
  }

  return { subject, body: bodyLines.join("\n").trim() };
}

function main() {
  const branch = runGit("rev-parse --abbrev-ref HEAD");
  if (branch === "main" && !allowMain) {
    console.error(
      "Refusing to auto-push directly to `main`. Switch to `dev` (`git checkout dev`) and merge `dev` into `main` on GitHub so release notes run cleanly."
    );
    process.exit(1);
  }

  const entries = getStatusEntries();
  if (entries.length === 0) {
    console.log("No local changes to commit.");
    if (!dryRun && !noPush) {
      console.log(`Pushing existing commits on \`${branch}\` to origin...`);
      const res = spawnSync("git", ["push", "origin", branch], {
        stdio: "inherit",
      });
      process.exit(res.status ?? 0);
    }
    process.exit(0);
  }

  const lineCounts = getDiffLineCounts();
  const { subject, body } = buildAutoCommitMessage(entries, lineCounts);

  console.log("=== Auto-Generated Commit ===");
  console.log(subject);
  console.log("");
  console.log(body);
  console.log("=============================");

  if (dryRun) {
    console.log("\n[dry-run] No commit or push performed.");
    process.exit(0);
  }

  const addRes = spawnSync("git", ["add", "-A"], { stdio: "inherit" });
  if (addRes.status !== 0) process.exit(addRes.status ?? 1);

  const commitRes = spawnSync("git", ["commit", "-m", subject, "-m", body], {
    stdio: "inherit",
  });
  if (commitRes.status !== 0) process.exit(commitRes.status ?? 1);

  if (!noPush) {
    const pushRes = spawnSync("git", ["push", "-u", "origin", branch], {
      stdio: "inherit",
    });
    process.exit(pushRes.status ?? 0);
  }
}

main();
