import { CatalogHeader } from "@/components/CatalogHeader";
import { HomeShowcase } from "@/components/HomeShowcase";
import { SiteFooter } from "@/components/SiteFooter";
import { getStoreYelpReviews } from "@/lib/yelp/reviews";

export const revalidate = 86400;

export default async function HomePage() {
  const yelpData = await getStoreYelpReviews();

  return (
    <div className="flex min-h-dvh flex-col">
      <CatalogHeader />

      <main className="flex-1">
        <HomeShowcase yelpData={yelpData} />
      </main>

      <SiteFooter />
    </div>
  );
}
