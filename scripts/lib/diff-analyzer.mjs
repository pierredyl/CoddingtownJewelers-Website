/**
 * Shared Diff & Intent Analyzer for Automated Commit Messages & Release Notes.
 *
 * Extracts:
 *  - What Changed (files, areas, exported symbols, line stats)
 *  - Why (motivation & context from diff comments, file domains, and commit bodies)
 *  - What Was Fixed (bug fixes, error guards, timeouts, state/loop fixes)
 *  - What Was Accomplished (concrete user-facing or developer capabilities delivered)
 *
 * Works 100% deterministically offline, and optionally enhances prose with Gemini
 * (`GEMINI_API_KEY`) if present in `.env.local` / `.env` / GitHub Secrets.
 */

import fs from "node:fs";
import path from "node:path";

export function loadOptionalEnv() {
  for (const name of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), name);
    if (!fs.existsSync(full)) continue;
    try {
      for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
        }
      }
    } catch {
      // ignore unreadable env file
    }
  }
}

export function classifyArea(filePath) {
  const p = filePath.replace(/\\/g, "/");
  if (
    p.includes("src/lib/search/") ||
    p.includes("GlobalSearchBar") ||
    p.includes("api/catalog/search")
  ) {
    return "Search & Discovery";
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
    return "Storefront Design, Copy & Media";
  }
  if (
    p.includes("supabase/") ||
    p.includes("src/lib/supabase/") ||
    p.includes("src/lib/suppliers/") ||
    p.includes("scripts/sync-")
  ) {
    return "Database & Supplier Sync";
  }
  if (p.includes(".github/") || p.includes("scripts/") || p === "package.json") {
    return "Automation & Tooling";
  }
  return "Core & Configuration";
}

/**
 * Parses structured sections ("Why:", "What Was Fixed:", "What Was Accomplished:")
 * out of existing commit bodies so `main` releases preserve full context from `dev`.
 */
export function parseStructuredCommitBody(body) {
  const sections = { why: [], fixed: [], accomplished: [] };
  if (!body) return sections;
  let current = null;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/^why\s*:$/i.test(line)) {
      current = "why";
      continue;
    }
    if (/^what was fixed\s*:$/i.test(line)) {
      current = "fixed";
      continue;
    }
    if (/^what was accomplished\s*:$/i.test(line)) {
      current = "accomplished";
      continue;
    }
    if (/^(files changed|auto-generated|\[)/i.test(line)) {
      current = null;
      continue;
    }
    if (current && line.startsWith("- ")) {
      const bullet = line.slice(2).trim();
      if (bullet) sections[current].push(bullet);
    }
  }
  return sections;
}

/**
 * Deterministic diff-hunk analyzer: inspects added code lines, comments, and file paths
 * to infer specific Why / Fixed / Accomplished statements without needing any API key.
 */
export function analyzeDiffDeterministically(files, rawDiff) {
  const why = new Set();
  const fixed = new Set();
  const accomplished = new Set();

  const fileNames = files.map((f) => f.file.replace(/\\/g, "/"));
  const addedLines = [];
  for (const line of (rawDiff || "").split(/\r?\n/)) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      addedLines.push(line.slice(1));
    }
  }
  const addedBlob = addedLines.join("\n");

  // 1. Extract high-signal explanatory comments added in code (often state "why" directly!)
  const commentNotes = [];
  for (const line of addedLines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^\/\/\s*(.{18,140})$/) || trimmed.match(/^\*\s+([A-Z].{18,140})$/);
    if (!m) continue;
    const text = m[1].replace(/\s+/g, " ").trim();
    if (
      /^(eslint|@ts-|prettier|note:|todo|usage:|mode|options|--|npm run)/i.test(text) ||
      text.includes("===") ||
      text.startsWith("http")
    ) {
      continue;
    }
    if (
      /\b(prevent|avoid|ensure|so that|instead of|fix|preserve|eliminate|guard|fallback|trigger|automatically|consolidate|extract|support|enable|keep)\b/i.test(
        text
      )
    ) {
      commentNotes.push(text.replace(/[.]+$/, ""));
    }
  }

  // 2. Pattern-based Fix detection from actual diff content
  if (/EMPTY_CATEGORIES|prevRouteKeyRef/i.test(addedBlob)) {
    fixed.add(
      "Eliminated unstable default array prop re-render loop in CatalogBrowser so category switching and Load More Pieces stay responsive and never wipe loaded items."
    );
  }
  if (/try\s*\{[\s\S]{0,600}catch\s*\([^)]*\)\s*\{[\s\S]{0,200}503/m.test(addedBlob)) {
    fixed.add(
      "Added error handling in the catalogue API route so unexpected query failures return a clean 503 response instead of crashing."
    );
  }
  if (/setFilterError\(true\)/i.test(addedBlob)) {
    fixed.add(
      "Surfaced Load More API errors to the UI instead of failing silently."
    );
  }
  if (/trimStart\s*=\s*false|status --porcelain -uall/i.test(addedBlob)) {
    fixed.add(
      "Fixed git status porcelain parsing so leading spaces never truncate filenames and untracked directories expand to individual files."
    );
  }
  if (/damerauLevenshtein|PROTECTED_WORDS|EXPLICIT_TYPO_ALIASES/i.test(addedBlob)) {
    fixed.add(
      "Fixed search typo autocorrection to handle transpositions safely while protecting valid everyday jewelry words from corruption."
    );
  }
  if (/noStoneMatch|excludePendants|excludePlated/i.test(addedBlob)) {
    fixed.add(
      "Fixed negated and solid-metal searches (such as 'no diamond', 'chain no pendant', and 'solid gold') so excluded items no longer appear."
    );
  }
  if (/merchandisingPath\.ilike\.%> Mens%/i.test(addedBlob)) {
    fixed.add(
      "Replaced overly broad '%Men%' title matching (which falsely matched 'Engagement') with Stuller's exact '> Mens' merchandising path."
    );
  }
  if (/statement timeout|search_vector|catalog_items_pkey/i.test(addedBlob)) {
    fixed.add(
      "Prevented 3-second Postgres statement timeouts on multi-category and gemstone searches by routing queries through indexed paths."
    );
  }

  // 3. Area-based Why & Accomplished synthesis
  const areas = new Set(files.map((f) => classifyArea(f.file)));

  if (areas.has("Search & Discovery")) {
    why.add(
      "Improve search accuracy and everyday-language understanding so shoppers find the exact jewelry they mean without knowing technical terms."
    );
    accomplished.add(
      "Enhanced global search parsing, facet extraction, and quick-jump suggestions across the full catalogue."
    );
  }
  if (areas.has("Catalogue & Filters")) {
    why.add(
      "Keep catalogue browsing, filtering, and pagination seamless and uncluttered across all categories."
    );
    if (fileNames.some((f) => f.includes("catalogFilters"))) {
      accomplished.add(
        "Consolidated raw supplier metal/gemstone variants into clean shopper-facing filters while searching every underlying alloy and stone."
      );
    }
    if (fileNames.some((f) => f.includes("CatalogBrowser") || f.includes("catalogue/"))) {
      accomplished.add(
        "Stabilized category navigation, active filter chips, and multi-batch 'Load More Pieces' pagination."
      );
    }
  }
  if (areas.has("Storefront Design, Copy & Media")) {
    why.add(
      "Align storefront visuals, contrast, and copy with Coddingtown Jewelers' real-world boutique look and brand voice."
    );
    accomplished.add(
      "Refined storefront presentation, imagery, and user-facing copy."
    );
  }
  if (areas.has("Database & Supplier Sync")) {
    why.add(
      "Keep live Supabase queries fast, accurate, and aligned with Stuller catalog structure."
    );
    accomplished.add(
      "Updated database query logic and/or schema migrations for faster, more accurate catalog lookups."
    );
  }
  if (areas.has("Automation & Tooling")) {
    why.add(
      "Automate git commits, diff tracking, and main-branch release notes so every update documents what changed, why, what was fixed, and what was accomplished without manual effort."
    );
    if (fileNames.some((f) => f.includes("auto-push"))) {
      accomplished.add(
        "Added one-command `npm run push:dev` auto-commit and push with structured patch-note commit messages."
      );
    }
    if (fileNames.some((f) => f.includes("merge-to-main"))) {
      accomplished.add(
        "Added one-command `npm run merge:main` direct merge workflow (no PR required) that triggers automated GitHub Release notes and CHANGELOG updates."
      );
    }
    if (fileNames.some((f) => f.includes("generate-patch-notes") || f.includes(".github/workflows/"))) {
      accomplished.add(
        "Built automated PR and main-release patch-note generation with diff-intent analysis, area grouping, and CHANGELOG tracking."
      );
    }
  }

  // Add up to 2 concrete code-comment rationales if we have room
  for (const note of commentNotes.slice(0, 2)) {
    if (why.size < 4) why.add(note);
  }

  if (why.size === 0) {
    why.add("Maintain and improve storefront reliability, code quality, and developer workflow.");
  }
  if (accomplished.size === 0) {
    accomplished.add(
      `Updated ${files.length} ${files.length === 1 ? "file" : "files"} across ${Array.from(areas).join(", ")}.`
    );
  }

  return {
    why: Array.from(why),
    fixed: Array.from(fixed),
    accomplished: Array.from(accomplished),
  };
}

/**
 * Optional Gemini enhancement (only runs if GEMINI_API_KEY is present).
 * Safely falls back to `fallback` on any error or timeout.
 */
export async function maybeEnhanceWithGemini(contextSummary, fallback) {
  loadOptionalEnv();
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fallback;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const prompt = [
      "You are writing thorough, clear engineering patch notes for the Coddingtown Jewelers Next.js + Supabase storefront.",
      "Given the git diff and file summary below, return ONLY valid JSON with keys:",
      '{ "subject": "short conventional commit title <= 72 chars", "why": ["1-3 concise bullets explaining WHY these changes were made"], "fixed": ["0-4 concise bullets explaining WHAT WAS FIXED (empty array if no bugs fixed)"], "accomplished": ["1-4 concise bullets explaining WHAT WAS ACCOMPLISHED for users or developers"] }',
      "Be concrete and specific to the actual code diff. Do not invent changes not present in the diff.",
      "",
      contextSummary.slice(0, 12000),
    ].join("\n");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallback;
    const parsed = JSON.parse(text);
    return {
      subject: typeof parsed.subject === "string" && parsed.subject.trim() ? parsed.subject.trim().slice(0, 72) : fallback.subject,
      why: Array.isArray(parsed.why) && parsed.why.length > 0 ? parsed.why : fallback.why,
      fixed: Array.isArray(parsed.fixed) ? parsed.fixed : fallback.fixed,
      accomplished: Array.isArray(parsed.accomplished) && parsed.accomplished.length > 0 ? parsed.accomplished : fallback.accomplished,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
