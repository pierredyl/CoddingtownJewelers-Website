import Link from "next/link";
import { SITE_CONFIG } from "@/config/site";
import { HeaderNavLinks } from "./HeaderNavLinks";

function BrandDiamondEmblem() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="h-6 w-6 shrink-0 text-gold-deep transition-transform duration-300 group-hover:scale-105 sm:h-7 sm:w-7"
    >
      <path
        d="M8.5 5.5H19.5L25 11.5L14 23.5L3 11.5L8.5 5.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M3 11.5H25M8.5 5.5L11 11.5L14 23.5L17 11.5L19.5 5.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function CatalogHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-obsidian/10 bg-[#faf7f1]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-3.5 sm:flex-row sm:px-6 sm:py-4 lg:px-8">
        {/* Brand Logo (uses SITE_CONFIG.logoUrl when provided, falls back to refined diamond emblem + wordmark) */}
        <Link
          href="/"
          aria-label={SITE_CONFIG.name}
          className="group flex shrink-0 items-center gap-2.5"
        >
          {SITE_CONFIG.logoUrl ? (
            <img
              src={SITE_CONFIG.logoUrl}
              alt={SITE_CONFIG.name}
              className="h-9 w-auto max-w-[230px] object-contain sm:h-11"
            />
          ) : (
            <>
              <BrandDiamondEmblem />
              <span className="font-display text-xl font-bold tracking-[0.02em] text-obsidian sm:text-2xl">
                {SITE_CONFIG.name}
              </span>
            </>
          )}
        </Link>

        {/* Minimal 3-Page Navigation */}
        <nav aria-label="Primary navigation" className="flex items-center">
          <HeaderNavLinks />
        </nav>
      </div>
    </header>
  );
}
