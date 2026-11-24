#!/usr/bin/env node
/**
 * One-Command Direct Merge (`dev` -> `main`) Without a Pull Request
 *
 * 1. Verifies there are no uncommitted changes (or auto-commits them if `--commit` is passed)
 * 2. Generates thorough Release Patch Notes for `origin/main..dev`
 * 3. Checks out `main`, merges `dev` (--no-ff) with the full patch notes as the merge commit body
 * 4. Pushes `main` to `origin/main` (which automatically triggers GitHub Actions to update
 *    CHANGELOG.md and publish a GitHub Release!)
 * 5. Switches right back to `dev`
 *
 * Usage:
 *   npm run merge:main                  # merge dev -> main & push (triggers GitHub Release + CHANGELOG)
 *   node scripts/merge-to-main.mjs --dry-run   # preview merge patch notes without touching branches
 */

import { execSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function runGit(cmd) {
  return execSync(`git ${cmd}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runGitInherited(gitArgs) {
  const res = spawnSync("git", gitArgs, { stdio: "inherit" });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function main() {
  const status = runGit("status --porcelain");
  if (status && !dryRun) {
    console.error(
      "You have uncommitted changes. Run `npm run push:dev` first so everything is safely saved on `dev` before merging to `main`."
    );
    process.exit(1);
  }

  runGitInherited(["fetch", "origin", "main", "dev"]);

  const notes = execSync(
    "node scripts/generate-patch-notes.mjs --mode=release --base=origin/main --head=dev",
    { encoding: "utf8" }
  ).trim();

  const today = new Date().toISOString().slice(0, 10);
  const mergeSubject = `release(${today}): merge dev into main`;

  console.log("=== Thorough Release Patch Notes for `dev` -> `main` ===\n");
  console.log(notes);
  console.log("\n=========================================================");

  if (dryRun) {
    console.log("\n[dry-run] No merge or push performed.");
    process.exit(0);
  }

  // Ensure local `main` exists and tracks origin/main
  const hasLocalMain = (() => {
    try {
      runGit("rev-parse --verify main");
      return true;
    } catch {
      return false;
    }
  })();

  if (hasLocalMain) {
    runGitInherited(["checkout", "main"]);
    runGitInherited(["pull", "--ff-only", "origin", "main"]);
  } else {
    runGitInherited(["checkout", "-b", "main", "origin/main"]);
  }

  // Merge dev with --no-ff and full thorough patch notes in the merge commit body
  runGitInherited(["merge", "--no-ff", "dev", "-m", mergeSubject, "-m", notes]);

  // Push main -> triggers `.github/workflows/main-release-notes.yml` automatically!
  runGitInherited(["push", "origin", "main"]);

  // Return cleanly to dev
  runGitInherited(["checkout", "dev"]);
  console.log(
    "\nMerged `dev` -> `main` and pushed! GitHub Actions is now updating CHANGELOG.md and publishing the GitHub Release automatically."
  );
}

main();
