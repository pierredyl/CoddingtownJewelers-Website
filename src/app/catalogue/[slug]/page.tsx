import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import {
  getCategoryListingsPage,
  type CatalogAudience,
} from "@/lib/supabase/queries";

export const revalidate = 86400;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ audience?: string; style?: string; stone?: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const dbCategories = await getCachedCategories();
  const categories =
    dbCategories && dbCategories.length > 0 ? dbCategories : MOCK_CATEGORIES;
  const activeCategory = categories.find((c) => c.slug === slug);

  if (!activeCategory) {
    return {
      title: `Catalogue | ${SITE_CONFIG.name}`,
    };
  }

  return {
    title: `${activeCategory.name} | ${SITE_CONFIG.name}`,
    description: `Browse ${activeCategory.name.toLowerCase()} from ${SITE_CONFIG.name}. Select any piece to personalize options and view its Item #.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const rawAudience = (sp.audience ?? "").trim().toLowerCase();
  const initialAudience: CatalogAudience | "" =
    slug !== "gemstone-jewelry" &&
    (rawAudience === "men" || rawAudience === "women")
      ? rawAudience
      : "";
  const initialStyle = (sp.style ?? "").trim();
  const initialStone = (sp.stone ?? "").trim();
  const hasInitialFilter = Boolean(
    initialAudience || initialStyle || initialStone
  );

  const [dbCategories, dbPage, baselinePage] = await Promise.all([
    getCachedCategories(),
    hasInitialFilter
      ? getCategoryListingsPage({
          categorySlug: slug,
          offset: 0,
          batchSize: 400,
          audience: initialAudience || undefined,
          styles: initialStyle ? [initialStyle] : undefined,
          primaryStones: initialStone ? [initialStone] : undefined,
        })
      : getCachedCategoryFirstPage(slug),
    hasInitialFilter ? getCachedCategoryFirstPage(slug) : Promise.resolve(null),
  ]);

  const categories =
    dbCategories && dbCategories.length > 0 ? dbCategories : MOCK_CATEGORIES;
  const activeCategory = categories.find((c) => c.slug === slug);

  if (!activeCategory) {
    notFound();
  }

  const usingSupabase = dbPage !== null;
  const facetSource = baselinePage ?? dbPage;
  const mockGroups = MOCK_CATALOG_GROUPS.filter((g) => g.categorySlug === slug);

  const initialGroups = usingSupabase ? dbPage.groups : mockGroups;
  const totalSkus = usingSupabase
    ? dbPage.totalSkus
    : mockGroups.reduce((sum, g) => sum + g.variants.length, 0);
  const initialHasMore = usingSupabase ? dbPage.hasMore : false;
  const initialNextOffset = usingSupabase ? dbPage.nextOffset : 0;
  const initialMetalOptions =
    usingSupabase && facetSource
      ? facetSource.metalOptions
      : Array.from(
          new Set(
            mockGroups
              .flatMap((g) => g.variants.map((v) => v.metalType))
              .filter((v): v is string => Boolean(v))
          )
        ).sort();
  const initialStoneOptions =
    usingSupabase && facetSource
      ? facetSource.stoneOptions
      : Array.from(
          new Set(
            mockGroups
              .flatMap((g) => g.variants.map((v) => v.primaryStone))
              .filter((v): v is string => Boolean(v))
          )
        ).sort();
  const initialHasNoStoneItems =
    usingSupabase && facetSource
      ? facetSource.hasNoStoneItems
      : mockGroups.some((g) => g.variants.some((v) => !v.primaryStone));
  const initialHasSizableItems =
    usingSupabase && facetSource ? facetSource.hasSizableItems : false;
  const initialLengthOptions =
    usingSupabase && facetSource ? facetSource.lengthOptions : [];
  const initialClosureOptions =
    usingSupabase && facetSource ? facetSource.closureOptions : [];
  const initialRingSizeOptions =
    usingSupabase && facetSource ? facetSource.ringSizeOptions : [];

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
                {activeCategory.name}
              </li>
            </ol>
          </nav>

          {/* Category Title */}
          <div className="mt-3 border-b border-hairline pb-5">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-obsidian sm:text-4xl">
              {initialAudience === "men"
                ? `Men's ${activeCategory.name}`
                : initialAudience === "women"
                  ? `Women's ${activeCategory.name}`
                  : activeCategory.name}
            </h1>
          </div>

          {/* Quick Category Switcher (single scrollable row on mobile, wraps on desktop) */}
          <nav
            aria-label="Jewelry categories"
            className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          >
            {categories.map((cat) => {
              const isCurrent = cat.slug === activeCategory.slug;
              return (
                <Link
                  key={cat.slug}
                  href={`/catalogue/${cat.slug}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`shrink-0 rounded-pill border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    isCurrent
                      ? "border-obsidian bg-obsidian text-canvas"
                      : "border-hairline-strong bg-surface text-ink-secondary hover:border-obsidian hover:text-obsidian"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </nav>

          {/* Category Piece Browser */}
          <CatalogBrowser
            key={activeCategory.slug}
            categorySlug={activeCategory.slug}
            categoryName={activeCategory.name}
            initialAudience={initialAudience}
            initialStyle={initialStyle}
            initialStone={initialStone}
            initialGroups={initialGroups}
            initialTotalSkus={totalSkus}
            initialHasMore={initialHasMore}
            initialNextOffset={initialNextOffset}
            initialMetalOptions={initialMetalOptions}
            initialStoneOptions={initialStoneOptions}
            initialHasNoStoneItems={initialHasNoStoneItems}
            initialHasSizableItems={initialHasSizableItems}
            initialLengthOptions={initialLengthOptions}
            initialClosureOptions={initialClosureOptions}
            initialRingSizeOptions={initialRingSizeOptions}
            dataSource={usingSupabase ? "supabase" : "demo"}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
