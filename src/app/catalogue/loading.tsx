import { CatalogHeader } from "@/components/CatalogHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function CatalogueLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <CatalogHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-3 w-36 animate-pulse rounded bg-hairline" />
        <div className="mt-2 h-9 w-64 animate-pulse rounded bg-hairline" />

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card"
            >
              <div className="aspect-[10/9] w-full animate-pulse bg-surface-subtle" />
              <div className="space-y-2.5 p-5">
                <div className="h-6 w-40 animate-pulse rounded bg-hairline" />
                <div className="h-4 w-full animate-pulse rounded bg-hairline/70" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-hairline/70" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
