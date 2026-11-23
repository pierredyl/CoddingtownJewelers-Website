import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogHeader } from "@/components/CatalogHeader";
import { CatalogLanding } from "@/components/CatalogLanding";
import { SiteFooter } from "@/components/SiteFooter";
import { CATALOG_SHOWCASE_SECTIONS } from "@/config/catalogShowcase";
import { SITE_CONFIG } from "@/config/site";
import { getCachedCategoryShowcaseSummaries } from "@/lib/cache/catalogCache";
import { getPrimaryImagesBySkus } from "@/lib/supabase/queries";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Catalogue | ${SITE_CONFIG.name}`,
  description: `Browse the ${SITE_CONFIG.name} jewelry catalogue by section and select any piece to personalize options and view its Item #.`,
};

export default async function CataloguePage() {
  const tileSkus = CATALOG_SHOWCASE_SECTIONS.flatMap((section) =>
    section.styleCarouselTiles
      .map((t) => t.preferredSku)
      .filter((sku): sku is string => Boolean(sku))
  );

  const [dbSummaries, skuImageMap] = await Promise.all([
    getCachedCategoryShowcaseSummaries(),
    getPrimaryImagesBySkus(tileSkus),
  ]);

  const usingSupabase = Boolean(
    dbSummaries && dbSummaries.some((s) => s.variantCount > 0)
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <CatalogHeader />

      <main className="flex-1">
        <Suspense fallback={null}>
          <CatalogLanding
            skuImageMap={skuImageMap}
            dataSource={usingSupabase ? "supabase" : "demo"}
          />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
