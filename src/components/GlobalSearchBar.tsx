"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { CATALOG_SHOWCASE_SECTIONS } from "@/config/catalogShowcase";

interface QuickSuggestion {
  id: string;
  label: string;
  categoryLabel: string;
  href: string;
  keywords: string;
}

function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizeToken(tok: string): string {
  if (tok.length <= 3) return tok;
  if (tok === "mens" || tok === "womens" || tok === "gents" || tok === "ladies") {
    return tok;
  }
  if (tok.endsWith("ies") && tok.length > 4) return `${tok.slice(0, -3)}y`;
  if (tok.endsWith("s") && !tok.endsWith("ss")) return tok.slice(0, -1);
  return tok;
}

function expandAudienceKeywords(raw: string): string {
  const norm = normalizeSearchText(raw);
  const extras: string[] = [];
  if (/\bmens?\b/.test(norm)) extras.push("men mens gents his");
  if (/\bwomens?\b/.test(norm)) extras.push("women womens ladies hers");
  return `${norm} ${extras.join(" ")}`.trim();
}

/**
 * Zero-latency client suggestion index built from the storefront's real
 * curated categories, styles, and popular gemstone shortcuts.
 */
const QUICK_SUGGESTIONS: QuickSuggestion[] = (() => {
  const list: QuickSuggestion[] = [];
  const seen = new Set<string>();

  for (const section of CATALOG_SHOWCASE_SECTIONS) {
    for (const card of section.cards) {
      if (!seen.has(card.href)) {
        seen.add(card.href);
        list.push({
          id: `col:${card.id}`,
          label: card.title,
          categoryLabel: section.title,
          href: card.href,
          keywords: expandAudienceKeywords(
            `${card.title} ${card.subtitle} ${section.title}`
          ),
        });
      }
    }
    for (const tile of section.styleCarouselTiles) {
      if (!seen.has(tile.href)) {
        seen.add(tile.href);
        list.push({
          id: `tile:${tile.id}`,
          label: tile.label,
          categoryLabel: section.title,
          href: tile.href,
          keywords: expandAudienceKeywords(`${tile.label} ${section.title}`),
        });
      }
    }
  }

  return list;
})();

function looksLikeCatalogItemNumber(raw: string): boolean {
  const compact = raw.replace(/\s+/g, "");
  if (!compact || /\s/.test(raw)) return false;
  return (
    compact.includes(":") ||
    /^[A-Za-z]{0,4}\d{3,}[A-Za-z0-9:-]*$/.test(compact)
  );
}

interface GlobalSearchBarProps {
  initialValue?: string;
  placeholder?: string;
  isLoading?: boolean;
  onSubmitQuery?: (query: string) => void;
}

export function GlobalSearchBar({
  initialValue = "",
  placeholder = "Search all jewelry by style, metal, stone, or Item #...",
  isLoading = false,
  onSubmitQuery,
}: GlobalSearchBarProps) {
  const router = useRouter();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const trimmed = value.trim();
  const looksLikeItemNumber = looksLikeCatalogItemNumber(trimmed);

  const matches = useMemo(() => {
    if (trimmed.length < 2 || looksLikeItemNumber) return [];
    const tokens = normalizeSearchText(trimmed)
      .split(/\s+/)
      .filter(Boolean)
      .map(singularizeToken);
    if (tokens.length === 0) return [];
    return QUICK_SUGGESTIONS.filter((s) =>
      tokens.every((tok) => s.keywords.includes(tok))
    ).slice(0, 6);
  }, [trimmed, looksLikeItemNumber]);

  const showDropdown = open && trimmed.length >= 2;

  function submitSearch(q: string) {
    const clean = q.trim();
    setOpen(false);
    if (onSubmitQuery) {
      onSubmitQuery(clean);
      return;
    }
    router.push(
      clean ? `/catalogue/all?q=${encodeURIComponent(clean)}` : "/catalogue/all"
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <search>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch(value);
          }}
          className="relative flex items-center"
        >
          <label htmlFor={inputId} className="sr-only">
            Search all jewelry categories
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-muted"
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="search"
            value={value}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              const next = e.target.value;
              setValue(next);
              setOpen(true);
              if (!next.trim() && onSubmitQuery) {
                onSubmitQuery("");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            className="w-full rounded-pill border border-obsidian/20 bg-white py-2.5 pr-28 pl-10 text-sm text-obsidian shadow-xs placeholder:text-ink-muted focus:border-obsidian focus:outline-none"
          />
          {isLoading ? (
            <Loader2
              className="pointer-events-none absolute right-21 h-4 w-4 animate-spin text-gold-deep"
              aria-hidden="true"
            />
          ) : (
            value && (
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  if (onSubmitQuery) onSubmitQuery("");
                }}
                aria-label="Clear search"
                className="absolute right-20 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-subtle hover:text-obsidian"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )
          )}
          <button
            type="submit"
            className="absolute right-1.5 rounded-pill bg-obsidian px-4 py-1.5 text-xs font-semibold tracking-wide text-canvas transition-colors hover:bg-gold-deep"
          >
            Search
          </button>
        </form>
      </search>

      {/* Instant Smart-Jump Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          aria-label="Quick search suggestions"
          className="absolute right-0 left-0 z-40 mt-2 overflow-hidden rounded-card border border-obsidian/15 bg-[#faf7f1] shadow-[0_18px_40px_rgba(17,17,17,0.16)]"
        >
          {matches.length > 0 && (
            <div className="border-b border-obsidian/10 py-1.5">
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-deep">
                Quick Collections &amp; Styles
              </p>
              {matches.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-obsidian transition-colors hover:bg-[#f2ede4]"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-ink-muted">
                    {item.categoryLabel}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => submitSearch(trimmed)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-obsidian transition-colors hover:bg-[#f2ede4]"
          >
            <span>
              {looksLikeItemNumber
                ? `Look up Item # "${trimmed.toUpperCase()}"`
                : `Search all jewelry for "${trimmed}"`}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
