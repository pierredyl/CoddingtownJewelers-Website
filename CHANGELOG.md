# Changelog

All notable changes to Coddingtown Jewelers are tracked automatically here when `dev` merges into `main`.


## Release v2026.11.24-977418c

> **Summary:** 1 commit merged into `main` across **5 files** (+540 / -139).

### Why These Changes Were Made
- Automate git commits, diff tracking, and main-branch release notes so every update documents what changed, why, what was fixed, and what was accomplished without manual effort.
- Automatically inspects all changed/new/deleted files AND their diffs,
- 1. Extract high-signal explanatory comments added in code (often state "why" directly!)

### What Was Fixed
- Eliminated unstable default array prop re-render loop in CatalogBrowser so category switching and Load More Pieces stay responsive and never wipe loaded items.
- Fixed git status porcelain parsing so leading spaces never truncate filenames and untracked directories expand to individual files.
- Fixed search typo autocorrection to handle transpositions safely while protecting valid everyday jewelry words from corruption.
- Fixed negated and solid-metal searches (such as 'no diamond', 'chain no pendant', and 'solid gold') so excluded items no longer appear.
- Prevented 3-second Postgres statement timeouts on multi-category and gemstone searches by routing queries through indexed paths.

### What Was Accomplished
- Added one-command `npm run push:dev` auto-commit and push with structured patch-note commit messages.
- Built automated PR and main-release patch-note generation with diff-intent analysis, area grouping, and CHANGELOG tracking.

### Detailed Changes by Area
#### Automation & Tooling (5 files, +540 / -139)
  - **Added** `scripts/lib/diff-analyzer.mjs` (+335 / -0) — _symbols: `loadOptionalEnv`, `classifyArea`, `parseStructuredCommitBody`, `analyzeDiffDeterministically`, `maybeEnhanceWithGemini`_
  - **Updated** `scripts/auto-push.mjs` (+93 / -78) — _symbols: `getWorkingDiffText`, `buildAutoCommitMessage`, `main`_
  - **Updated** `scripts/generate-patch-notes.mjs` (+108 / -61) — _symbols: `buildNarrativeSections`, `renderMarkdown`, `main`_
  - **Updated** `.github/workflows/main-release-notes.yml` (+2 / -0)
  - **Updated** `.github/workflows/pr-patch-notes.yml` (+2 / -0)

<details>
<summary>Full Commit Log (1 commit)</summary>

- `a8d7f41` (2026-11-23) **feat(automation/tooling): main-release-notes.yml and 4 other files** — _Dylan Pierre_

</details>

## Release v2026.11.24-995da14

> **Summary:** 3 commits merged into `main` across **12 files** (+1042 / -56).

### Main Changes (Highlights)
- **Feature:** update(automation/tooling): package.json and 2 other files (`d1f2d09`)
- **Feature:** update(automation/tooling): auto-push.mjs (`71a6c66`)
- **Feature:** update(catalogue & filters & automation & tooling): ackage.json, route.t (`0f8b337`)

### Detailed Changes by Area
#### Automation & Tooling (6 files, +965 / -0)
  - **Added** `scripts/generate-patch-notes.mjs` (+489 / -0) — _symbols: `parseArgs`, `runGit`, `refExists`, `resolveRange`, `classifyArea`_
  - **Added** `scripts/auto-push.mjs` (+227 / -0) — _symbols: `runGit`, `classifyArea`, `getStatusEntries`, `getDiffLineCounts`, `buildAutoCommitMessage`_
  - **Added** `scripts/merge-to-main.mjs` (+94 / -0) — _symbols: `runGit`, `runGitInherited`, `main`_
  - **Added** `.github/workflows/main-release-notes.yml` (+79 / -0)
  - **Added** `.github/workflows/pr-patch-notes.yml` (+71 / -0)
  - **Updated** `package.json` (+5 / -0)

#### Catalogue & Filters (5 files, +72 / -56)
  - **Updated** `src/app/api/catalog/category/route.ts` (+38 / -29)
  - **Updated** `src/components/CatalogBrowser.tsx` (+30 / -24)
  - **Updated** `src/components/CatalogFilterSidebar.tsx` (+2 / -1)
  - **Updated** `src/app/catalogue/[slug]/page.tsx` (+1 / -1)
  - **Updated** `src/app/catalogue/all/page.tsx` (+1 / -1)

#### Core & Configuration (1 file, +5 / -0)
  - **Added** `CHANGELOG.md` (+5 / -0)

<details>
<summary>Full Commit Log (3 commits)</summary>

- `d1f2d09` (2026-11-23) **update(automation/tooling): package.json and 2 other files** — _Dylan Pierre_
- `71a6c66` (2026-11-23) **update(automation/tooling): auto-push.mjs** — _Dylan Pierre_
- `0f8b337` (2026-11-23) **update(catalogue & filters & automation & tooling): ackage.json, route.t** — _Dylan Pierre_

</details>
