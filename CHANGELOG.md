# Changelog

All notable changes to Coddingtown Jewelers are tracked automatically here when `dev` merges into `main`.

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
