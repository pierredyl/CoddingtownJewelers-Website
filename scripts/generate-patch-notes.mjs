#!/usr/bin/env node
/**
 * Automated Patch Notes & Diff Tracker for Coddingtown Jewelers
 *
 * Modes:
 *   --mode=diff     Preview uncommitted working-tree changes + commits ahead of base (local dev)
 *   --mode=pr       Generate PR patch notes comparing base..head (used by GitHub Actions on PRs)
 *   --mode=release  Generate curated "Main Changes" release notes when dev merges into main
 *
 * Options:
 *   --base=<ref>        Base git ref (default: origin/main)
 *   --head=<ref>        Head git ref (default: HEAD)
 *   --out=<path>        Write generated markdown to a file in addition to stdout
 *   --update-changelog  Prepend generated release notes to CHANGELOG.md (release mode)
 *   --version=<tag>     Optional release tag label (default: YYYY-MM-DD)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeDiffDeterministically,
  classifyArea,
  maybeEnhanceWithGemini,
  parseStructuredCommitBody,
} from "./lib/diff-analyzer.mjs";

function parseArgs(argv) {
  const opts = {
    mode: "diff",
    base: "origin/main",
    head: "HEAD",
    out: null,
    updateChangelog: false,
    version: null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--mode=")) opts.mode = arg.slice("--mode=".length);
    else if (arg.startsWith("--base=")) opts.base = arg.slice("--base=".length);
    else if (arg.startsWith("--head=")) opts.head = arg.slice("--head=".length);
    else if (arg.startsWith("--out=")) opts.out = arg.slice("--out=".length);
    else if (arg.startsWith("--version=")) opts.version = arg.slice("--version=".length);
    else if (arg === "--update-changelog") opts.updateChangelog = true;
  }
  return opts;
}

function runGit(cmd) {
  try {
    return execSync(`git ${cmd}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function refExists(ref) {
  if (!ref || /^0+$/.test(ref)) return false;
  return runGit(`rev-parse --verify "${ref}"`) !== "";
}

function resolveRange(baseArg, headArg) {
  const head = refExists(headArg) ? headArg : "HEAD";
  if (refExists(baseArg)) {
    return { base: baseArg, head };
  }
  if (refExists("origin/main")) {
    return { base: "origin/main", head };
  }
  if (refExists("main")) {
    return { base: "main", head };
  }
  if (refExists(`${head}~1`)) {
    return { base: `${head}~1`, head };
  }
  return { base: null, head };
}

function classifyCommitKind(subject) {
  const s = subject.toLowerCase();
  if (/^(fix|bug|hotfix|patch)\b|\b(fix|fixed|bug|timeout|broken|wipe|loop)\b/.test(s)) {
    return "fix";
  }
  if (/^(feat|add)\b|\b(add|added|implement|create|new|feature|redesign|automation)\b/.test(s)) {
    return "feat";
  }
  if (/^(perf|opt)\b|\b(perf|cache|speed|fast|optimize|index)\b/.test(s)) {
    return "perf";
  }
  if (/^(refactor|clean|chore|style|docs)\b/.test(s)) {
    return "chore";
  }
  return "update";
}

function getCommits(base, head) {
  const range = base ? `${base}..${head}` : head;
  const raw = runGit(
    `log ${range} --no-merges --pretty=format:"%H%x1f%h%x1f%ad%x1f%an%x1f%s%x1f%b%x1e" --date=short`
  );
  if (!raw) return [];
  return raw
    .split("\x1e")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [hash, shortHash, date, author, subject, body = ""] =
        chunk.split("\x1f");
      return {
        hash,
        shortHash,
        date,
        author,
        subject: subject?.trim() || "(no message)",
        body: body.trim(),
        structured: parseStructuredCommitBody(body),
        kind: classifyCommitKind(subject || ""),
      };
    });
}

function parseNumstat(raw) {
  if (!raw) return [];
  const files = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const added = parts[0] === "-" ? 0 : Number.parseInt(parts[0], 10) || 0;
    const removed = parts[1] === "-" ? 0 : Number.parseInt(parts[1], 10) || 0;
    const file = parts.slice(2).join("\t");
    files.push({
      file,
      added,
      removed,
      area: classifyArea(file),
    });
  }
  return files;
}

function getFileStatuses(base, head) {
  if (!base) return new Map();
  const raw = runGit(`diff --name-status ${base}...${head}`);
  const map = new Map();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0]?.[0] || "M";
    const file = parts[parts.length - 1];
    const label =
      status === "A"
        ? "Added"
        : status === "D"
          ? "Removed"
          : status === "R"
            ? "Renamed"
            : "Updated";
    map.set(file, label);
  }
  return map;
}

/**
 * Extracts newly added or modified exported functions/components/constants/migrations
 * directly from the git diff so patch notes stay thorough even with brief commit titles.
 */
function extractDiffSymbolsByFile(base, head) {
  if (!base) return new Map();
  const raw = runGit(`diff -U0 ${base}...${head} -- "src/" "scripts/" "supabase/" ".github/"`);
  if (!raw) return new Map();

  const map = new Map();
  let currentFile = null;
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim();
      continue;
    }
    if (!currentFile || !line.startsWith("+") || line.startsWith("+++")) continue;
    const code = line.slice(1).trim();
    const match =
      code.match(/^export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/) ||
      code.match(/^(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/) ||
      code.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?(?:INDEX|FUNCTION|TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_."]+)/i);
    if (match?.[1]) {
      const set = map.get(currentFile) ?? new Set();
      set.add(match[1]);
      map.set(currentFile, set);
    }
  }
  return map;
}

function getDiffStats(base, head, includeWorking) {
  const committed = base ? parseNumstat(runGit(`diff --numstat ${base}...${head}`)) : [];
  if (!includeWorking) return { committed, working: [] };

  const workingRaw = [
    runGit("diff --numstat"),
    runGit("diff --cached --numstat"),
  ]
    .filter(Boolean)
    .join("\n");
  const workingMap = new Map();
  for (const item of parseNumstat(workingRaw)) {
    const prev = workingMap.get(item.file);
    if (prev) {
      prev.added += item.added;
      prev.removed += item.removed;
    } else {
      workingMap.set(item.file, item);
    }
  }
  // Include untracked files
  const untracked = runGit("ls-files --others --exclude-standard");
  for (const file of untracked.split(/\r?\n/).filter(Boolean)) {
    if (!workingMap.has(file)) {
      workingMap.set(file, {
        file,
        added: 0,
        removed: 0,
        area: classifyArea(file),
        untracked: true,
      });
    }
  }
  return { committed, working: Array.from(workingMap.values()) };
}

function groupByArea(files) {
  const map = new Map();
  for (const f of files) {
    const list = map.get(f.area) ?? [];
    list.push(f);
    map.set(f.area, list);
  }
  return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
}

function summarizeTotals(files) {
  let added = 0;
  let removed = 0;
  for (const f of files) {
    added += f.added;
    removed += f.removed;
  }
  return { fileCount: files.length, added, removed };
}

function buildImportantHighlights(commits, allFiles) {
  const highlights = [];
  const areaPriority = [
    "Search & Discovery",
    "Catalogue & Filters",
    "Storefront Design, Copy & Media",
    "Database & Supplier Sync",
    "Automation & Tooling",
    "Core & Configuration",
  ];

  // 1. Prioritize feat / fix / perf commits (skip noise like "wip", "skip ci")
  const meaningfulCommits = commits.filter(
    (c) => !/\[skip ci\]|^wip\b|^merge\b/i.test(c.subject)
  );
  const topCommits = [
    ...meaningfulCommits.filter((c) => c.kind === "feat"),
    ...meaningfulCommits.filter((c) => c.kind === "fix"),
    ...meaningfulCommits.filter((c) => c.kind === "perf"),
    ...meaningfulCommits.filter((c) => c.kind === "update"),
  ].slice(0, 8);

  for (const c of topCommits) {
    const tag =
      c.kind === "feat"
        ? "Feature"
        : c.kind === "fix"
          ? "Fix"
          : c.kind === "perf"
            ? "Performance"
            : "Update";
    highlights.push(`- **${tag}:** ${c.subject} (\`${c.shortHash}\`)`);
  }

  // 2. If few commits but many touched files (e.g. squashed dev merge), summarize by impact area
  if (highlights.length < 3 && allFiles.length > 0) {
    const byArea = new Map(groupByArea(allFiles));
    for (const area of areaPriority) {
      const items = byArea.get(area);
      if (!items || items.length === 0) continue;
      const topFiles = items
        .slice()
        .sort((a, b) => b.added + b.removed - (a.added + a.removed))
        .slice(0, 3)
        .map((f) => `\`${path.basename(f.file)}\``)
        .join(", ");
      const totals = summarizeTotals(items);
      highlights.push(
        `- **${area}:** Updated ${totals.fileCount} ${totals.fileCount === 1 ? "file" : "files"} (+${totals.added}/-${totals.removed}), including ${topFiles}`
      );
    }
  }

  return highlights.length > 0
    ? highlights
    : ["- Maintenance and configuration updates."];
}

function formatCommitLog(commits) {
  if (commits.length === 0) return "_No new commits in this range._";
  return commits
    .map((c) => `- \`${c.shortHash}\` (${c.date}) **${c.subject}** — _${c.author}_`)
    .join("\n");
}

function formatAreaBreakdown(files, statusMap = new Map(), symbolMap = new Map()) {
  if (files.length === 0) return "_No file differences detected._";
  const grouped = groupByArea(files);
  return grouped
    .map(([area, items]) => {
      const t = summarizeTotals(items);
      const sorted = items
        .slice()
        .sort((a, b) => b.added + b.removed - (a.added + a.removed));
      const fileList = sorted
        .slice(0, 12)
        .map((f) => {
          const status = f.untracked ? "Added" : (statusMap.get(f.file) ?? "Updated");
          const syms = Array.from(symbolMap.get(f.file) ?? []).slice(0, 5);
          const symNote =
            syms.length > 0 ? ` — _symbols: ${syms.map((s) => `\`${s}\``).join(", ")}_` : "";
          return f.untracked
            ? `  - **${status}** \`${f.file}\`${symNote}`
            : `  - **${status}** \`${f.file}\` (+${f.added} / -${f.removed})${symNote}`;
        })
        .join("\n");
      const extra =
        sorted.length > 12 ? `\n  - _...and ${sorted.length - 12} more files_` : "";
      return `#### ${area} (${t.fileCount} ${t.fileCount === 1 ? "file" : "files"}, +${t.added} / -${t.removed})\n${fileList}${extra}`;
    })
    .join("\n\n");
}

async function buildNarrativeSections(range, commits, allFiles) {
  const rawDiff = range.base
    ? runGit(`diff -U0 ${range.base}...${range.head} -- "src/" "scripts/" "supabase/" ".github/"`)
    : "";
  const det = analyzeDiffDeterministically(allFiles, rawDiff);

  // Aggregate any structured Why / Fixed / Accomplished bullets already recorded in dev commits
  const whySet = new Set();
  const fixedSet = new Set();
  const accomplishedSet = new Set();

  for (const c of commits) {
    for (const w of c.structured?.why ?? []) whySet.add(w);
    for (const f of c.structured?.fixed ?? []) fixedSet.add(f);
    for (const a of c.structured?.accomplished ?? []) accomplishedSet.add(a);
  }
  for (const w of det.why) whySet.add(w);
  for (const f of det.fixed) fixedSet.add(f);
  for (const a of det.accomplished) accomplishedSet.add(a);

  const fallback = {
    subject: "",
    why: Array.from(whySet).slice(0, 6),
    fixed: Array.from(fixedSet).slice(0, 8),
    accomplished: Array.from(accomplishedSet).slice(0, 8),
  };

  const contextSummary = [
    `Commits (${commits.length}):`,
    ...commits.map((c) => `- ${c.shortHash} ${c.subject}`),
    "",
    `Files (${allFiles.length}):`,
    ...allFiles.slice(0, 30).map((f) => `- ${f.file} (+${f.added}/-${f.removed})`),
    "",
    "Diff excerpt:",
    rawDiff.slice(0, 8000),
  ].join("\n");

  return maybeEnhanceWithGemini(contextSummary, fallback);
}

function renderMarkdown(opts, range, commits, diffStats, statusMap, symbolMap, narrative) {
  const today = opts.version || new Date().toISOString().slice(0, 10);
  const allFiles =
    opts.mode === "diff"
      ? [...diffStats.working, ...diffStats.committed]
      : diffStats.committed;
  const totals = summarizeTotals(allFiles);

  const whyBullets = narrative.why.map((w) => `- ${w}`);
  const fixedBullets =
    narrative.fixed.length > 0
      ? narrative.fixed.map((f) => `- ${f}`)
      : ["- No bug fixes in this update (feature/maintenance release)."];
  const accomplishedBullets = narrative.accomplished.map((a) => `- ${a}`);

  if (opts.mode === "release") {
    return [
      `## Release ${today}`,
      "",
      `> **Summary:** ${commits.length} ${commits.length === 1 ? "commit" : "commits"} merged into \`main\` across **${totals.fileCount} ${totals.fileCount === 1 ? "file" : "files"}** (+${totals.added} / -${totals.removed}).`,
      "",
      "### Why These Changes Were Made",
      ...whyBullets,
      "",
      "### What Was Fixed",
      ...fixedBullets,
      "",
      "### What Was Accomplished",
      ...accomplishedBullets,
      "",
      "### Detailed Changes by Area",
      formatAreaBreakdown(allFiles, statusMap, symbolMap),
      "",
      "<details>",
      `<summary>Full Commit Log (${commits.length} ${commits.length === 1 ? "commit" : "commits"})</summary>`,
      "",
      formatCommitLog(commits),
      "",
      "</details>",
      "",
    ].join("\n");
  }

  if (opts.mode === "pr") {
    return [
      "<!-- cj-patch-notes -->",
      `## Automated Patch Notes (\`${range.base ?? "root"}\` → \`${range.head}\`)`,
      "",
      `**Stats:** ${commits.length} ${commits.length === 1 ? "commit" : "commits"} · **${totals.fileCount} files changed** (+${totals.added} / -${totals.removed})`,
      "",
      "### Why These Changes Were Made",
      ...whyBullets,
      "",
      "### What Was Fixed",
      ...fixedBullets,
      "",
      "### What Was Accomplished",
      ...accomplishedBullets,
      "",
      "### Detailed Changes by Area",
      formatAreaBreakdown(allFiles, statusMap, symbolMap),
      "",
      "### Full Commit Log",
      formatCommitLog(commits),
      "",
    ].join("\n");
  }

  // Default: local diff / pre-push mode
  const workingTotals = summarizeTotals(diffStats.working);
  const branch = runGit("rev-parse --abbrev-ref HEAD") || "current";
  return [
    `# Local Patch Notes Preview (branch: \`${branch}\`)`,
    "",
    `- **Base comparison:** \`${range.base ?? "none"}\` → \`${range.head}\``,
    `- **Uncommitted changes:** ${workingTotals.fileCount} files (+${workingTotals.added} / -${workingTotals.removed})`,
    `- **Commits ahead of base:** ${commits.length}`,
    "",
    "## Why / Fixed / Accomplished",
    "**Why:**",
    ...whyBullets,
    "",
    "**What Was Fixed:**",
    ...fixedBullets,
    "",
    "**What Was Accomplished:**",
    ...accomplishedBullets,
    "",
    "## Uncommitted Changes by Area",
    formatAreaBreakdown(diffStats.working, statusMap, symbolMap),
    "",
    `## Full Commit Log Ahead of \`${range.base ?? "root"}\``,
    formatCommitLog(commits),
    "",
  ].join("\n");
}

function updateChangelogFile(entryMarkdown) {
  const changelogPath = path.resolve(process.cwd(), "CHANGELOG.md");
  const header =
    "# Changelog\n\nAll notable changes to Coddingtown Jewelers are tracked automatically here when `dev` merges into `main`.\n\n";
  let existing = "";
  if (fs.existsSync(changelogPath)) {
    existing = fs.readFileSync(changelogPath, "utf8");
    const firstSectionIdx = existing.indexOf("\n## ");
    if (firstSectionIdx !== -1) {
      const prefix = existing.slice(0, firstSectionIdx + 1);
      const rest = existing.slice(firstSectionIdx + 1);
      fs.writeFileSync(changelogPath, `${prefix}\n${entryMarkdown}\n${rest}`, "utf8");
      return;
    }
  }
  fs.writeFileSync(changelogPath, `${header}${entryMarkdown}`, "utf8");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const range = resolveRange(opts.base, opts.head);
  const commits = getCommits(range.base, range.head);
  const diffStats = getDiffStats(range.base, range.head, opts.mode === "diff");
  const statusMap = getFileStatuses(range.base, range.head);
  const symbolMap = extractDiffSymbolsByFile(range.base, range.head);
  const allFiles =
    opts.mode === "diff"
      ? [...diffStats.working, ...diffStats.committed]
      : diffStats.committed;
  const narrative = await buildNarrativeSections(range, commits, allFiles);
  const md = renderMarkdown(
    opts,
    range,
    commits,
    diffStats,
    statusMap,
    symbolMap,
    narrative
  );

  if (opts.out) {
    fs.writeFileSync(opts.out, md, "utf8");
  }
  if (opts.updateChangelog && opts.mode === "release") {
    updateChangelogFile(md);
  }
  process.stdout.write(md);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
