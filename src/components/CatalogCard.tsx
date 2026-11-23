"use client";

import { ArrowRight } from "lucide-react";
import type { CatalogItemGroup } from "@/types/catalog";

interface CatalogCardProps {
  group: CatalogItemGroup;
  /** Elevate LCP loading priority for the first few above-the-fold cards only */
  isPriority?: boolean;
  /** Optional Item # matched by active search query to preview that variant on the card */
  highlightedSku?: string | null;
  onSelect: (group: CatalogItemGroup, initialSku: string) => void;
}

export function CatalogCard({
  group,
  isPriority = false,
  highlightedSku = null,
  onSelect,
}: CatalogCardProps) {
  const displayVariant =
    (highlightedSku
      ? group.variants.find((v) => v.supplierSku === highlightedSku)
      : undefined) ?? group.defaultVariant;

  const primaryImage = displayVariant.images[0];
  const imageSrc = primaryImage?.fullUrl || primaryImage?.thumbnailUrl || "";

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-card-hover">
      <button
        type="button"
        onClick={() => onSelect(group, displayVariant.supplierSku)}
        className="flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep focus-visible:ring-inset"
      >
        {/* Subtle gold hairline that lights up on hover */}
        <span
          aria-hidden="true"
          className="h-0.5 w-full bg-transparent transition-colors duration-300 group-hover:bg-gold"
        />

        {/* Clean Studio Photography Frame */}
        <div className="relative aspect-square w-full overflow-hidden border-b border-hairline bg-white p-4">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={displayVariant.title}
              width={400}
              height={400}
              fetchPriority={isPriority ? "high" : undefined}
              loading={isPriority ? undefined : "lazy"}
              className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-ink-muted">
              No Image
            </div>
          )}
        </div>

        {/* Clean, Readable Card Body */}
        <div className="flex flex-1 flex-col p-3.5">
          <h2 className="line-clamp-2 font-serif text-base font-semibold leading-snug text-obsidian transition-colors group-hover:text-gold-deep sm:text-[17px]">
            {displayVariant.title}
          </h2>

          <div className="mt-auto flex items-center justify-end pt-3 text-[11px] transition-opacity duration-200 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
            <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.13em] text-gold-deep">
              <span>Personalize</span>
              <ArrowRight
                className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
