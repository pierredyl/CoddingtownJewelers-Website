import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { CatalogHeader } from "@/components/CatalogHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_CONFIG } from "@/config/site";
import { MOCK_CATALOG_GROUPS, MOCK_CATEGORIES } from "@/data/mockCatalog";
import {
  getCachedCategories,
  getCachedCategoryFirstPage,
} from "@/lib/cache/catalogCache";
import { compareSizeOrLength } from "@/lib/catalog/formatters";
import { getCategoryListingsPage } from "@/lib/supabase/queries";
import type { CatalogItemGroup } from "@/types/catalog";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `All Jewelry | ${SITE_CONFIG.name}`,
  description: `Browse and filter all fine jewelry categories at ${SITE_CONFIG.name} in Santa Rosa, CA.`,
};

interface AllCatalogPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AllCatalogPage({
  searchParams,
}: AllCatalogPageProps) {
  const sp = await searchParams;
  const initialQuery = (sp.q ?? "").trim();

  const dbCategories = await getCachedCategories();
  const categories =
    dbCategories && dbCategories.length > 0 ? dbCategories : MOCK_CATEGORIES;

  // Fetch cached first pages for baseline universal filter options + interleaved default grid
  const [categoryPages, queryPage] = await Promise.all([
    Promise.all(categories.map((c) => getCachedCategoryFirstPage(c.slug))),
    initialQuery
      ? getCategoryListingsPage({
          categorySlug: "all",
          offset: 0,
          batchSize: 400,
          search: initialQuery,
        })
      : Promise.resolve(null),
  ]);

  const usingSupabase = categoryPages.some((p) => p !== null);

  // Aggregate universal facet options from all 7 cached category pages
  const metalSet = new Set<string>();
  const stoneSet = new Set<string>();
  const lengthSet = new Set<string>();
  const closureSet = new Set<string>();
  const ringSizeSet = new Set<string>();
  let hasNoStoneItems = false;
  let hasSizableItems = false;
  let totalSkusSum = 0;

  for (const page of categoryPages) {
    if (!page) continue;
    totalSkusSum += page.totalSkus;
    if (page.hasNoStoneItems) hasNoStoneItems = true;
    if (page.hasSizableItems) hasSizableItems = true;
    for (const m of page.metalOptions) metalSet.add(m);
    for (const s of page.stoneOptions) stoneSet.add(s);
    for (const l of page.lengthOptions) lengthSet.add(l);
    for (const c of page.closureOptions) closureSet.add(c);
    for (const r of page.ringSizeOptions) ringSizeSet.add(r);
  }

  // Interleave cached first pages across all 7 categories for default "All Items" view
  const interleaved: CatalogItemGroup[] = [];
  const seen = new Set<string>();
  const pools = categoryPages.map((p) => p?.groups ?? []);
  if (usingSupabase && !initialQuery) {
    for (let round = 0; round < 30 && interleaved.length < 140; round++) {
      for (const pool of pools) {
        const item = pool[round];
        if (item && !seen.has(item.groupKey) && interleaved.length < 140) {
          seen.add(item.groupKey);
          interleaved.push(item);
        }
      }
    }
  }

  const initialGroups = initialQuery
    ? queryPage?.groups ?? []
    : interleaved.length > 0
      ? interleaved
      : MOCK_CATALOG_GROUPS;

  const initialTotalSkus = initialQuery
    ? queryPage?.totalSkus ?? 0
    : usingSupabase
      ? totalSkusSum
      : MOCK_CATALOG_GROUPS.reduce((sum, g) => sum + g.variants.length, 0);

  const initialHasMore = initialQuery
    ? queryPage?.hasMore ?? false
    : usingSupabase;

  const initialNextOffset = initialQuery ? queryPage?.nextOffset ?? 0 : 400;

  return (
    <div className="flex min-h-dvh flex-col">
      <CatalogHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  href="/catalogue"
                  className="transition-colors hover:text-obsidian"
                >
                  Catalogue
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li aria-current="page" className="font-medium text-obsidian">
                All Items
              </li>
            </ol>
          </nav>

          {/* Page Title */}
          <div className="mt-3 border-b border-hairline pb-5">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-obsidian sm:text-4xl">
              All Jewelry
            </h1>
          </div>

          {/* Quick Category Switcher (identical to /catalogue/[slug]) */}
          <nav
            aria-label="Jewelry categories"
            className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          >
            <Link
              href="/catalogue/all"
              aria-current="page"
              className="shrink-0 rounded-pill border border-obsidian bg-obsidian px-3.5 py-1.5 text-xs font-medium text-canvas transition-colors"
            >
              All Items
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/catalogue/${cat.slug}`}
                className="shrink-0 rounded-pill border border-hairline-strong bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-obsidian hover:text-obsidian"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* Unified Universal Catalogue Browser with Full Progressive Filter Sidebar */}
          <CatalogBrowser
            key="all"
            categorySlug="all"
            categoryName="All Jewelry"
            availableCategories={categories}
            initialQuery={initialQuery}
            initialGroups={initialGroups}
            initialTotalSkus={initialTotalSkus}
            initialHasMore={initialHasMore}
            initialNextOffset={initialNextOffset}
            initialMetalOptions={Array.from(metalSet).sort()}
            initialStoneOptions={Array.from(stoneSet).sort()}
            initialHasNoStoneItems={hasNoStoneItems}
            initialHasSizableItems={hasSizableItems}
            initialLengthOptions={Array.from(lengthSet).sort(compareSizeOrLength)}
            initialClosureOptions={Array.from(closureSet).sort()}
            initialRingSizeOptions={Array.from(ringSizeSet).sort(
              compareSizeOrLength
            )}
            dataSource={usingSupabase ? "supabase" : "demo"}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
