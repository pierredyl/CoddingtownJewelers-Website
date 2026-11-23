"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import {
  CATALOG_SHOWCASE_SECTIONS,
  type ShowcaseSectionConfig,
} from "@/config/catalogShowcase";

interface CatalogLandingProps {
  skuImageMap: Record<string, string>;
  dataSource: "supabase" | "demo";
}

type SectionLayoutSpec =
  | {
      kind: "full-bleed";
      minHeightClass: string;
    }
  | {
      kind: "split";
      imagePosition: "left" | "right";
      imageColClass: string;
      textColClass: string;
      aspectClass: string;
      textVerticalAlign: string;
    };

/**
 * Alternating editorial rhythm:
 * Blown-up full-bleed banner (always left-aligned) — Deeper Warm Travertine standalone spread — Blown-up — Standalone — Blown-up.
 */
function getSectionLayout(index: number): SectionLayoutSpec {
  const specs: SectionLayoutSpec[] = [
    // 0: Rings — Full-bleed edge-to-edge banner (left-aligned)
    {
      kind: "full-bleed",
      minHeightClass: "min-h-[460px] sm:min-h-[560px] lg:min-h-[630px]",
    },
    // 1: Necklaces & Chains — Deeper Warm Travertine standalone spread (5:4 photo Left, lower-anchored copy Right)
    {
      kind: "split",
      imagePosition: "left",
      imageColClass: "lg:col-span-6",
      textColClass: "lg:col-span-6",
      aspectClass: "aspect-[5/4]",
      textVerticalAlign: "lg:self-end lg:pb-4",
    },
    // 2: Bracelets — Full-bleed edge-to-edge banner (left-aligned)
    {
      kind: "full-bleed",
      minHeightClass: "min-h-[440px] sm:min-h-[520px] lg:min-h-[580px]",
    },
    // 3: Earrings — Deeper Warm Travertine standalone spread (copy Left, 4:3 photo Right)
    {
      kind: "split",
      imagePosition: "right",
      imageColClass: "lg:col-span-7",
      textColClass: "lg:col-span-5",
      aspectClass: "aspect-[4/3]",
      textVerticalAlign: "lg:self-center",
    },
    // 4: Gemstone Jewelry — Full-bleed edge-to-edge banner (left-aligned)
    {
      kind: "full-bleed",
      minHeightClass: "min-h-[460px] sm:min-h-[540px] lg:min-h-[600px]",
    },
  ];
  return specs[index % specs.length];
}

function EditorialCategorySection({
  section,
  skuImageMap,
  index,
}: {
  section: ShowcaseSectionConfig;
  skuImageMap: Record<string, string>;
  index: number;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const layout = getSectionLayout(index);
  const isTravertineSplit = layout.kind === "split";

  function scrollCarousel(direction: "prev" | "next") {
    const el = carouselRef.current;
    if (!el) return;
    const distance = Math.max(300, Math.round(el.clientWidth * 0.72));
    el.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  }

  return (
    <motion.section
      aria-labelledby={`section-${section.id}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={`relative w-full overflow-hidden border-b ${
        isTravertineSplit
          ? "border-obsidian/12 bg-gradient-to-b from-[#d8cebe] via-[#ddd4c5] to-[#e4dccf]"
          : "border-hairline/80 bg-[#f2ede4]"
      }`}
    >
      {layout.kind === "full-bleed" ? (
        /* Full-Bleed Edge-to-Edge Atmospheric Banner (Always Left-Aligned) */
        <div
          className={`group relative w-full overflow-hidden bg-obsidian ${layout.minHeightClass}`}
        >
          <img
            src={section.bannerImageUrl}
            alt={section.bannerAlt}
            fetchPriority={index === 0 ? "high" : undefined}
            loading={index === 0 ? undefined : "lazy"}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
          />

          {/* Left-Anchored Luxury Vignette */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-obsidian/85 via-obsidian/50 to-obsidian/15"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-obsidian/70 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gold/35"
          />

          <div
            className={`relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-end px-4 py-10 text-left sm:px-6 sm:py-14 lg:px-8 lg:py-16 ${layout.minHeightClass}`}
          >
            <div className="max-w-2xl">
              <h2
                id={`section-${section.id}`}
                className="font-display text-4xl font-bold tracking-normal text-canvas drop-shadow-xs sm:text-5xl lg:text-6xl"
              >
                {section.title}
              </h2>
              <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-canvas/92 sm:text-base lg:text-lg">
                {section.tagline}
              </p>

              {/* Sleek Frosted Collection Links */}
              <div className="mt-7 flex flex-wrap items-center justify-start gap-2.5">
                {section.cards.map((col) => (
                  <Link
                    key={col.id}
                    href={col.href}
                    className="inline-flex items-center gap-2 rounded-pill border border-canvas/30 bg-obsidian/45 px-4 py-2 text-xs font-medium tracking-wide text-canvas shadow-sm backdrop-blur-md transition-all duration-200 hover:border-gold hover:bg-gold hover:text-obsidian"
                  >
                    <span>{col.title}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standalone Framed Editorial Spread on Deeper Warm Travertine (#ddd4c5) */
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-12 lg:px-8 lg:pt-20 lg:pb-14">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Framed Editorial Photograph */}
            <div
              className={`${layout.imageColClass} ${
                layout.imagePosition === "right" ? "lg:order-2" : "lg:order-1"
              }`}
            >
              <div
                className={`group relative w-full overflow-hidden rounded-card border border-obsidian/15 bg-obsidian shadow-[0_22px_54px_rgba(17,17,17,0.18)] ${layout.aspectClass}`}
              >
                <img
                  src={section.bannerImageUrl}
                  alt={section.bannerAlt}
                  loading="lazy"
                  className="h-full w-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.04]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/25"
                />
              </div>
            </div>

            {/* Editorial Typography & Collection Pills */}
            <div
              className={`${layout.textColClass} ${layout.textVerticalAlign} ${
                layout.imagePosition === "right" ? "lg:order-1" : "lg:order-2"
              }`}
            >
              <h2
                id={`section-${section.id}`}
                className="font-display text-4xl font-bold tracking-normal text-obsidian sm:text-5xl lg:text-[54px]"
              >
                {section.title}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-obsidian/80 sm:text-base lg:text-lg">
                {section.tagline}
              </p>

              {/* Collection Quick-Links */}
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                {section.cards.map((col) => (
                  <Link
                    key={col.id}
                    href={col.href}
                    className="inline-flex items-center gap-2 rounded-pill border border-obsidian/22 bg-[#f6f1e7] px-4 py-2 text-xs font-medium tracking-wide text-obsidian shadow-xs transition-all duration-200 hover:border-obsidian hover:bg-obsidian hover:text-canvas"
                  >
                    <span>{col.title}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Style / Type Carousel */}
      {section.styleCarouselTiles.length > 0 && (
        <div
          className={`relative z-10 ${
            isTravertineSplit ? "pb-12 sm:pb-16" : "py-11 sm:py-14"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className={`mb-6 flex items-center justify-between gap-4 ${
                isTravertineSplit ? "border-t border-obsidian/12 pt-7" : ""
              }`}
            >
              <Link
                href={section.viewAllHref}
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep transition-colors hover:text-obsidian"
              >
                <span>View All {section.title}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollCarousel("prev")}
                  aria-label={`Scroll ${section.title} styles left`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-obsidian/20 bg-[#f6f1e7] text-obsidian transition-colors hover:border-gold hover:text-gold-deep"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel("next")}
                  aria-label={`Scroll ${section.title} styles right`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-obsidian/20 bg-[#f6f1e7] text-obsidian transition-colors hover:border-gold hover:text-gold-deep"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              ref={carouselRef}
              className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {section.styleCarouselTiles.map((tile) => {
                const imgSrc =
                  tile.preferredImageUrl ||
                  skuImageMap[tile.preferredSku] ||
                  tile.fallbackImageUrl ||
                  section.bannerImageUrl ||
                  "";
                const isLocalEditorial = imgSrc.startsWith("/images/");

                return (
                  <Link
                    key={tile.id}
                    href={tile.href}
                    className="group/item flex w-[180px] shrink-0 snap-start flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep sm:w-[205px]"
                  >
                    <div
                      className={`relative aspect-square w-full overflow-hidden rounded-card bg-[#f6f2ea] transition-all duration-300 ease-out group-hover/item:-translate-y-1.5 group-hover/item:bg-[#faf7f1] ${
                        isTravertineSplit
                          ? "shadow-[0_8px_24px_rgba(17,17,17,0.09)] group-hover/item:shadow-[0_16px_36px_rgba(17,17,17,0.16)]"
                          : "shadow-[0_6px_22px_rgba(17,17,17,0.05)] group-hover/item:shadow-[0_16px_36px_rgba(17,17,17,0.11)]"
                      } ${isLocalEditorial ? "" : "p-5"}`}
                    >
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={tile.label}
                          width={260}
                          height={260}
                          loading="lazy"
                          className={`h-full w-full transition-transform duration-500 ease-out group-hover/item:scale-[1.07] ${
                            isLocalEditorial
                              ? "object-cover"
                              : "object-contain mix-blend-multiply"
                          }`}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-ink-muted">
                          {tile.label}
                        </div>
                      )}
                    </div>

                    <h3 className="mt-3.5 px-0.5 font-serif text-lg font-semibold leading-snug text-obsidian transition-colors group-hover/item:text-gold-deep">
                      {tile.label}
                    </h3>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}

export function CatalogLanding({
  skuImageMap,
  dataSource,
}: CatalogLandingProps) {
  return (
    <div id="catalogue" className="w-full bg-[#f2ede4]">
      <h1 className="sr-only">Fine Jewelry Catalogue</h1>

      <div className="w-full">
        {CATALOG_SHOWCASE_SECTIONS.map((section, idx) => (
          <EditorialCategorySection
            key={section.id}
            section={section}
            skuImageMap={skuImageMap}
            index={idx}
          />
        ))}

        {dataSource === "demo" && (
          <p className="mx-auto max-w-7xl px-4 py-6 text-right text-xs text-ink-muted sm:px-6 lg:px-8">
            Displaying preview catalogue
          </p>
        )}
      </div>
    </div>
  );
}
