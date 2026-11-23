import { CatalogHeader } from "@/components/CatalogHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function CategoryLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <CatalogHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-3 w-40 animate-pulse rounded bg-hairline" />
        <div className="mt-3 h-9 w-56 animate-pulse rounded bg-hairline" />

        <div className="mt-5 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-28 shrink-0 animate-pulse rounded-pill bg-hairline"
            />
          ))}
        </div>

        <div className="mt-6 h-14 w-full animate-pulse rounded-card bg-surface-subtle" />

        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card"
            >
              <div className="aspect-square w-full animate-pulse bg-surface-subtle" />
              <div className="space-y-2 p-3">
                <div className="h-2.5 w-20 animate-pulse rounded bg-hairline" />
                <div className="h-4 w-full animate-pulse rounded bg-hairline" />
                <div className="h-3 w-24 animate-pulse rounded bg-hairline/80" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
