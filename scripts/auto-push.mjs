#!/usr/bin/env node
/**
 * One-Command Auto-Commit & Push for `dev`
 *
 * Automatically inspects all changed/new/deleted files AND their diffs,
 * writes a thorough commit message explaining:
 *   - What changed
 *   - Why it was changed
 *   - What was fixed
 *   - What was accomplished
 * Then commits everything and pushes straight to `origin dev`.
 *
 * Usage:
 *   npm run push:dev                          # auto-commit all changes & push to origin dev
 *   node scripts/auto-push.mjs --dry-run      # preview the auto-generated commit without committing
 *   node scripts/auto-push.mjs --no-push      # auto-commit locally without pushing
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeDiffDeterministically,
  classifyArea,
  maybeEnhanceWithGemini,
} from "./lib/diff-analyzer.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noPush = args.includes("--no-push");
const allowMain = args.includes("--allow-main");

function runGit(cmd, trimStart = true) {
  try {
    const out = execSync(`git ${cmd}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return trimStart ? out.trim() : out.trimEnd();
  } catch {
    return "";
  }
}

function getStatusEntries() {
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
  const raw = [runGit("diff --numstat"), runGit("diff --cached --numstat")]
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

function getWorkingDiffText(entries) {
  const parts = [runGit("diff -U1"), runGit("diff --cached -U1")].filter(Boolean);
  for (const e of entries) {
    if (e.action === "Added" && /\.(m?js|ts|tsx|yml|yaml|sql|md|json)$/i.test(e.file)) {
      try {
        const content = fs.readFileSync(path.resolve(process.cwd(), e.file), "utf8");
        const lines = content
          .split(/\r?\n/)
          .slice(0, 120)
          .map((l) => `+${l}`)
          .join("\n");
        parts.push(`+++ b/${e.file}\n${lines}`);
      } catch {
        // ignore binary/unreadable
      }
    }
  }
  return parts.join("\n");
}

async function buildAutoCommitMessage(entries, lineCounts) {
  const byArea = new Map();
  for (const entry of entries) {
    const list = byArea.get(entry.area) ?? [];
    list.push(entry);
    byArea.set(entry.area, list);
  }
  const sortedAreas = Array.from(byArea.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const rawDiff = getWorkingDiffText(entries);
  const det = analyzeDiffDeterministically(entries, rawDiff);

  const primaryArea = sortedAreas[0]?.[0] ?? "Core";
  const hasNew = entries.some((e) => e.action === "Added");
  const hasFixes = det.fixed.length > 0;
  const verb = hasFixes ? "fix" : hasNew ? "feat" : "update";
  const scope = primaryArea.toLowerCase().replace(/\s*&\s*/g, "/").replace(/,\s*/g, "/");
  const firstFile = path.basename(entries[0].file);
  const summaryPart =
    entries.length === 1
      ? firstFile
      : `${firstFile} and ${entries.length - 1} other ${entries.length - 1 === 1 ? "file" : "files"}`;
  const defaultSubject = `${verb}(${scope}): ${summaryPart}`.slice(0, 72);

  const contextSummary = [
    `Files (${entries.length}):`,
    ...entries.map((e) => `- ${e.action} ${e.file}`),
    "",
    "Diff excerpt:",
    rawDiff.slice(0, 9000),
  ].join("\n");

  const narrative = await maybeEnhanceWithGemini(contextSummary, {
    subject: defaultSubject,
    ...det,
  });

  let totalAdded = 0;
  let totalRemoved = 0;
  for (const stats of lineCounts.values()) {
    totalAdded += stats.added;
    totalRemoved += stats.removed;
  }

  const bodyLines = [];
  if (narrative.why.length > 0) {
    bodyLines.push("Why:");
    for (const w of narrative.why) bodyLines.push(`- ${w}`);
    bodyLines.push("");
  }
  if (narrative.fixed.length > 0) {
    bodyLines.push("What Was Fixed:");
    for (const f of narrative.fixed) bodyLines.push(`- ${f}`);
    bodyLines.push("");
  }
  if (narrative.accomplished.length > 0) {
    bodyLines.push("What Was Accomplished:");
    for (const a of narrative.accomplished) bodyLines.push(`- ${a}`);
    bodyLines.push("");
  }

  bodyLines.push(
    `Files Changed (${entries.length} ${entries.length === 1 ? "file" : "files"}, +${totalAdded} / -${totalRemoved}):`
  );
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

  return { subject: narrative.subject, body: bodyLines.join("\n").trim() };
}

async function main() {
  const branch = runGit("rev-parse --abbrev-ref HEAD");
  if (branch === "main" && !allowMain) {
    console.error(
      "Refusing to auto-push directly to `main`. Switch to `dev` (`git checkout dev`) and run `npm run merge:main` when ready to release."
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
  const { subject, body } = await buildAutoCommitMessage(entries, lineCounts);

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
