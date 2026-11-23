"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import {
  BAND_FIT_OPTIONS,
  BAND_PROFILE_OPTIONS,
  BAND_WIDTH_OPTIONS,
  CARAT_WEIGHT_TIER_OPTIONS,
  CHAIN_LINK_STYLE_OPTIONS,
  CHAIN_WIDTH_TIER_OPTIONS,
  EARRING_SIZE_TIER_OPTIONS,
  EDGE_DETAIL_OPTIONS,
  GEMSTONE_JEWELRY_TYPE_OPTIONS,
  METAL_FILTER_OPTIONS,
  PENDANT_CHAIN_OPTIONS,
  RING_WIDTH_TIER_OPTIONS,
  SETTING_STATE_OPTIONS,
  STONE_ORIGIN_OPTIONS,
  SURFACE_FINISH_OPTIONS,
  extractBaseStoneFamily,
  formatStoneWithBirthstone,
  getStoneShapeOptionsForCategory,
  getStyleOptionsForCategory,
} from "@/config/catalogFilters";
import type { CategorySummary } from "@/types/catalog";

export const STONE_NONE_VALUE = "__none__";

export interface CategoryFilterState {
  query: string;
  categories: string[];
  audiences: ("men" | "women")[];
  styles: string[];
  chainStyles: string[];
  widths: string[];
  bandFits: string[];
  bandProfiles: string[];
  edgeDetails: string[];
  stoneShapes: string[];
  settingStates: string[];
  stoneOrigins: string[];
  caratTiers: string[];
  jewelryTypes: string[];
  finishes: string[];
  earringSizes: string[];
  pendantChains: string[];
  adjustableOnly: boolean;
  metalTypes: string[];
  primaryStones: string[];
  lengths: string[];
  closures: string[];
  ringSizes: string[];
  sizableOnly: boolean;
}

interface CatalogFilterSidebarProps {
  categorySlug: string;
  availableCategories?: CategorySummary[];
  filters: CategoryFilterState;
  onChange: (updater: (prev: CategoryFilterState) => CategoryFilterState) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  metalOptions: string[];
  stoneOptions: string[];
  hasNoStoneItems: boolean;
  hasSizableItems: boolean;
  lengthOptions: string[];
  closureOptions: string[];
  ringSizeOptions: string[];
}

function FilterDropBox({
  title,
  count = 0,
  defaultOpen = false,
  nested = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  nested?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || count > 0);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (count > 0 && prevCountRef.current === 0) {
      setOpen(true);
    }
    prevCountRef.current = count;
  }, [count]);
  return (
    <div
      className={
        nested
          ? "border-b border-hairline/70 py-2.5 first:pt-0 last:border-b-0 last:pb-0"
          : "border-b border-hairline py-3.5 first:pt-0 last:border-b-0 last:pb-0"
      }
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span
          className={`flex items-center gap-2 font-semibold uppercase tracking-[0.15em] ${
            nested
              ? "text-[11px] text-gold-deep"
              : "text-xs text-obsidian"
          }`}
        >
          <span>{title}</span>
          {count > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-gold-tint px-1.5 text-[10px] font-bold text-gold-deep">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-ink-muted transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

const CHAIN_CLASP_FALLBACK = ["Lobster Clasp", "Spring Ring", "Box Clasp"];

export function CatalogFilterSidebar({
  categorySlug,
  availableCategories = [],
  filters,
  onChange,
  onReset,
  hasActiveFilters,
  metalOptions,
  stoneOptions,
  hasNoStoneItems,
  hasSizableItems,
  lengthOptions,
  closureOptions,
  ringSizeOptions,
}: CatalogFilterSidebarProps) {
  const [stoneSearch, setStoneSearch] = useState("");

  const styleOptions = useMemo(
    () => getStyleOptionsForCategory(categorySlug),
    [categorySlug]
  );

  const stoneShapeOptions = useMemo(
    () => getStoneShapeOptionsForCategory(categorySlug),
    [categorySlug]
  );

  // Clean, consumer-facing Metal Family filters (hides supplier alloy noise like "10K X1 White Gold")
  const visibleTopMetals = useMemo(
    () =>
      METAL_FILTER_OPTIONS.filter(
        (opt) =>
          !opt.parent &&
          (metalOptions.length === 0 ||
            metalOptions.some((raw) => opt.matchesRawMetal(raw)) ||
            filters.metalTypes.includes(opt.id) ||
            (opt.id === "gold" &&
              filters.metalTypes.some((m) => m.includes("gold"))))
      ),
    [metalOptions, filters.metalTypes]
  );

  const visibleGoldSubMetals = useMemo(
    () =>
      METAL_FILTER_OPTIONS.filter(
        (opt) =>
          opt.parent === "gold" &&
          (metalOptions.length === 0 ||
            metalOptions.some((raw) => opt.matchesRawMetal(raw)) ||
            filters.metalTypes.includes(opt.id))
      ),
    [metalOptions, filters.metalTypes]
  );

  const selectedGoldSubCount = useMemo(
    () =>
      visibleGoldSubMetals.filter((m) => filters.metalTypes.includes(m.id))
        .length,
    [visibleGoldSubMetals, filters.metalTypes]
  );

  // Deduplicate raw supplier gemstone variants into clean base gemstone families
  const consolidatedStoneOptions = useMemo(() => {
    const set = new Set<string>();
    for (const raw of stoneOptions) {
      const base = extractBaseStoneFamily(raw);
      if (base) set.add(base);
    }
    for (const active of filters.primaryStones) {
      if (active !== STONE_NONE_VALUE) {
        set.add(extractBaseStoneFamily(active));
      }
    }
    return Array.from(set).sort((a, b) => {
      if (a === "Diamond") return -1;
      if (b === "Diamond") return 1;
      return a.localeCompare(b);
    });
  }, [stoneOptions, filters.primaryStones]);

  // Strict category applicability rules (works universally for single categories AND "all")
  const isAllCategories = categorySlug === "all";
  const selectedCats = filters.categories;
  const hasSelectedCat = (s: string) =>
    selectedCats.length === 0 || selectedCats.includes(s);
  const supportsAudience = categorySlug !== "gemstone-jewelry";
  const isNecklaceCategory = categorySlug === "necklaces-pendants";
  const isBraceletCategory = categorySlug === "bracelets";
  const isEarringCategory = categorySlug === "earrings";
  const isEngagementCategory = categorySlug === "engagement-rings";
  const isWeddingBandCategory = categorySlug === "wedding-bands";
  const isRingCategory =
    isEngagementCategory ||
    isWeddingBandCategory ||
    categorySlug === "fashion-rings" ||
    categorySlug === "gemstone-jewelry" ||
    (isAllCategories &&
      (hasSelectedCat("engagement-rings") ||
        hasSelectedCat("wedding-bands") ||
        hasSelectedCat("fashion-rings") ||
        hasSelectedCat("gemstone-jewelry")));
  const isLengthCategory =
    isNecklaceCategory ||
    isBraceletCategory ||
    (isAllCategories &&
      (hasSelectedCat("necklaces-pendants") || hasSelectedCat("bracelets")));

  // Progressive disclosure triggers based on parent selections
  const selectedStandaloneChains =
    isNecklaceCategory && filters.styles.includes("standalone-chains");
  const selectedOnlyStandaloneChains =
    selectedStandaloneChains && filters.styles.length === 1;

  const selectedChainBracelet =
    isBraceletCategory && filters.styles.includes("chain-link");
  const selectedWidthBracelet =
    isBraceletCategory &&
    (selectedChainBracelet ||
      filters.styles.includes("tennis-line") ||
      filters.styles.includes("bangles-cuffs"));

  const selectedBandDetailStyle =
    isWeddingBandCategory &&
    (filters.styles.includes("classic") ||
      filters.styles.includes("carved-milgrain") ||
      filters.widths.length > 0 ||
      filters.bandFits.length > 0 ||
      filters.bandProfiles.length > 0 ||
      filters.edgeDetails.length > 0);
  const selectedOnlyPlainBand =
    isWeddingBandCategory &&
    filters.styles.length === 1 &&
    filters.styles[0] === "classic";

  const hasNamedStoneSelected = filters.primaryStones.some(
    (s) => s !== STONE_NONE_VALUE
  );
  const selectedStoneStyle =
    filters.styles.some((s) =>
      [
        "pendants",
        "solitaire-halo",
        "solitaire",
        "halo",
        "halo-cluster",
        "three-stone",
        "two-stone",
        "accented",
        "studs",
        "tennis-line",
        "cabochon",
        "pearl",
        "pearl-beaded",
      ].includes(s)
    ) ||
    hasNamedStoneSelected ||
    filters.stoneShapes.length > 0;

  const showStoneShapeProgressive =
    stoneShapeOptions.length > 0 &&
    ((!selectedOnlyStandaloneChains &&
      !selectedOnlyPlainBand &&
      (selectedStoneStyle ||
        isEngagementCategory ||
        categorySlug === "gemstone-jewelry" ||
        isAllCategories)) ||
      filters.stoneShapes.length > 0);

  const showClaspSubFilter =
    selectedStandaloneChains ||
    selectedWidthBracelet ||
    filters.closures.length > 0 ||
    (isEarringCategory && filters.styles.length > 0);

  const effectiveClaspOptions =
    closureOptions.length > 0
      ? closureOptions
      : selectedStandaloneChains || selectedWidthBracelet || filters.closures.length > 0
        ? CHAIN_CLASP_FALLBACK
        : [];

  const showGemstoneDropBox =
    ((!selectedOnlyStandaloneChains && !selectedOnlyPlainBand) ||
      filters.primaryStones.length > 0) &&
    (stoneOptions.length > 0 || hasNoStoneItems || filters.primaryStones.length > 0);

  const showNoStoneOption =
    hasNoStoneItems ||
    isNecklaceCategory ||
    isBraceletCategory ||
    isWeddingBandCategory ||
    categorySlug === "fashion-rings" ||
    isEarringCategory;

  const filteredStones = useMemo(() => {
    const q = stoneSearch.trim().toLowerCase();
    if (!q) return consolidatedStoneOptions;
    return consolidatedStoneOptions.filter((s) =>
      formatStoneWithBirthstone(s).toLowerCase().includes(q)
    );
  }, [consolidatedStoneOptions, stoneSearch]);

  return (
    <div className="space-y-0.5">
      {hasActiveFilters && (
        <div className="mb-3 flex items-center justify-between border-b border-hairline pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">
            Active Filters
          </span>
          <button
            type="button"
            onClick={() => {
              setStoneSearch("");
              onReset();
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-obsidian"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>Clear All</span>
          </button>
        </div>
      )}

      {/* 0a. All-Items Entry Point: Multi-Select Category Filter */}
      {isAllCategories && availableCategories.length > 0 && (
        <FilterDropBox
          title="Category"
          count={filters.categories.length}
          defaultOpen
        >
          <div className="space-y-1.5">
            {availableCategories.map((cat) => {
              const checked = filters.categories.includes(cat.slug);
              return (
                <label
                  key={cat.slug}
                  className="flex min-h-[30px] cursor-pointer items-center gap-2.5 py-0.5 text-sm text-ink hover:text-obsidian"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange((prev) => ({
                        ...prev,
                        categories: toggleArrayItem(prev.categories, cat.slug),
                      }))
                    }
                    className="h-4 w-4 rounded border-hairline-strong accent-obsidian"
                  />
                  <span className={checked ? "font-medium text-obsidian" : ""}>
                    {cat.name}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterDropBox>
      )}

      {/* 0. Gemstone Jewelry Entry Point: Jewelry Type (Rings / Earrings / Necklaces / Bracelets) */}
      {categorySlug === "gemstone-jewelry" && (
        <FilterDropBox
          title="Jewelry Type"
          count={filters.jewelryTypes.length}
          defaultOpen
        >
          <div className="space-y-2">
            {GEMSTONE_JEWELRY_TYPE_OPTIONS.map((jt) => {
              const checked = filters.jewelryTypes.includes(jt.id);
              return (
                <label
                  key={jt.id}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-ink hover:text-obsidian"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange((prev) => ({
                        ...prev,
                        jewelryTypes: toggleArrayItem(prev.jewelryTypes, jt.id),
                      }))
                    }
                    className="h-4 w-4 rounded border-hairline-strong accent-obsidian"
                  />
                  <span className={checked ? "font-medium text-obsidian" : ""}>
                    {jt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterDropBox>
      )}

      {/* 1. Primary Entry Point: Type & Style (reveals specific sub-filters when checked!) */}
      {styleOptions.length > 0 && (
        <FilterDropBox
          title="Type & Style"
          count={filters.styles.length}
          defaultOpen
        >
          <div className="space-y-2">
            {styleOptions.map((opt) => {
              const checked = filters.styles.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-ink hover:text-obsidian"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange((prev) => ({
                        ...prev,
                        styles: toggleArrayItem(prev.styles, opt.id),
                      }))
                    }
                    className="h-4 w-4 rounded border-hairline-strong accent-obsidian"
                  />
                  <span className={checked ? "font-medium text-obsidian" : ""}>
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>

          {/* PROGRESSIVE SUB-FILTERS FOR CHAINS (Necklaces: Standalone Chains / Bracelets: Chain & Link) */}
          {(selectedStandaloneChains ||
            selectedChainBracelet ||
            selectedWidthBracelet ||
            filters.chainStyles.length > 0 ||
            (!isWeddingBandCategory && filters.widths.length > 0)) && (
            <div className="mt-3.5 rounded-control border border-gold-soft bg-gold-tint/35 p-3">
              {(selectedStandaloneChains ||
                selectedChainBracelet ||
                filters.chainStyles.length > 0) && (
                <FilterDropBox
                  title="Chain Link Style"
                  count={filters.chainStyles.length}
                  defaultOpen
                  nested
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {CHAIN_LINK_STYLE_OPTIONS.map((cs) => {
                      const checked = filters.chainStyles.includes(cs.id);
                      return (
                        <label
                          key={cs.id}
                          className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChange((prev) => ({
                                ...prev,
                                chainStyles: toggleArrayItem(
                                  prev.chainStyles,
                                  cs.id
                                ),
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                          />
                          <span
                            className={checked ? "font-medium text-obsidian" : ""}
                          >
                            {cs.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </FilterDropBox>
              )}

              <FilterDropBox
                title="Width / Thickness"
                count={filters.widths.length}
                defaultOpen={filters.widths.length > 0}
                nested
              >
                <div className="space-y-1.5">
                  {CHAIN_WIDTH_TIER_OPTIONS.map((tier) => {
                    const checked = filters.widths.includes(tier.id);
                    return (
                      <label
                        key={tier.id}
                        className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange((prev) => ({
                              ...prev,
                              widths: toggleArrayItem(prev.widths, tier.id),
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                        />
                        <span
                          className={checked ? "font-medium text-obsidian" : ""}
                        >
                          {tier.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterDropBox>

              {effectiveClaspOptions.length > 0 && (
                <FilterDropBox
                  title="Clasp Type"
                  count={filters.closures.length}
                  defaultOpen={filters.closures.length > 0}
                  nested
                >
                  <div className="space-y-1.5">
                    {effectiveClaspOptions.map((cls) => {
                      const checked = filters.closures.includes(cls);
                      return (
                        <label
                          key={cls}
                          className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChange((prev) => ({
                                ...prev,
                                closures: toggleArrayItem(prev.closures, cls),
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                          />
                          <span
                            className={checked ? "font-medium text-obsidian" : ""}
                          >
                            {cls}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </FilterDropBox>
              )}
            </div>
          )}

          {/* PROGRESSIVE SUB-FILTERS FOR WEDDING BANDS (Width, Fit, Profile, Edge Detail) */}
          {selectedBandDetailStyle && (
            <div className="mt-3.5 rounded-control border border-gold-soft bg-gold-tint/35 p-3">
              <FilterDropBox
                title="Band Width"
                count={filters.widths.length}
                defaultOpen
                nested
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {BAND_WIDTH_OPTIONS.map((w) => {
                    const checked = filters.widths.includes(w);
                    return (
                      <label
                        key={w}
                        className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange((prev) => ({
                              ...prev,
                              widths: toggleArrayItem(prev.widths, w),
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                        />
                        <span
                          className={checked ? "font-medium text-obsidian" : ""}
                        >
                          {w.replace("Mm", "mm")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterDropBox>

              <FilterDropBox
                title="Band Fit"
                count={filters.bandFits.length}
                defaultOpen={filters.bandFits.length > 0}
                nested
              >
                <div className="space-y-1.5">
                  {BAND_FIT_OPTIONS.map((fit) => {
                    const checked = filters.bandFits.includes(fit.id);
                    return (
                      <label
                        key={fit.id}
                        className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange((prev) => ({
                              ...prev,
                              bandFits: toggleArrayItem(prev.bandFits, fit.id),
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                        />
                        <span
                          className={checked ? "font-medium text-obsidian" : ""}
                        >
                          {fit.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterDropBox>

              <FilterDropBox
                title="Band Profile"
                count={filters.bandProfiles.length}
                defaultOpen={filters.bandProfiles.length > 0}
                nested
              >
                <div className="space-y-1.5">
                  {BAND_PROFILE_OPTIONS.map((prof) => {
                    const checked = filters.bandProfiles.includes(prof.id);
                    return (
                      <label
                        key={prof.id}
                        className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange((prev) => ({
                              ...prev,
                              bandProfiles: toggleArrayItem(
                                prev.bandProfiles,
                                prof.id
                              ),
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                        />
                        <span
                          className={checked ? "font-medium text-obsidian" : ""}
                        >
                          {prof.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterDropBox>

              <FilterDropBox
                title="Edge Detail"
                count={filters.edgeDetails.length}
                defaultOpen={filters.edgeDetails.length > 0}
                nested
              >
                <div className="space-y-1.5">
                  {EDGE_DETAIL_OPTIONS.map((edge) => {
                    const checked = filters.edgeDetails.includes(edge.id);
                    return (
                      <label
                        key={edge.id}
                        className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange((prev) => ({
                              ...prev,
                              edgeDetails: toggleArrayItem(
                                prev.edgeDetails,
                                edge.id
                              ),
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                        />
                        <span
                          className={checked ? "font-medium text-obsidian" : ""}
                        >
                          {edge.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterDropBox>

              <FilterDropBox
                title="Surface Finish"
                count={filters.finishes.length}
                defaultOpen={filters.finishes.length > 0}
                nested
              >
                <div className="space-y-1.5">
                  {SURFACE_FINISH_OPTIONS.map((fn) => {
                    const checked = filters.finishes.includes(fn.id);
                    return (
                      <label
                        key={fn.id}
                        className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange((prev) => ({
                              ...prev,
                              finishes: toggleArrayItem(prev.finishes, fn.id),
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                        />
                        <span
                          className={checked ? "font-medium text-obsidian" : ""}
                        >
                          {fn.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterDropBox>
            </div>
          )}

          {/* PROGRESSIVE SUB-FILTER FOR PENDANTS (Chain Included vs Pendant Only) */}
          {isNecklaceCategory &&
            (filters.styles.includes("pendants") ||
              filters.pendantChains.length > 0) && (
              <div className="mt-3.5 rounded-control border border-gold-soft bg-gold-tint/35 p-3">
                <FilterDropBox
                  title="Chain Option"
                  count={filters.pendantChains.length}
                  defaultOpen
                  nested
                >
                  <div className="space-y-1.5">
                    {PENDANT_CHAIN_OPTIONS.map((pc) => {
                      const checked = filters.pendantChains.includes(pc.id);
                      return (
                        <label
                          key={pc.id}
                          className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChange((prev) => ({
                                ...prev,
                                pendantChains: toggleArrayItem(
                                  prev.pendantChains,
                                  pc.id
                                ),
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                          />
                          <span
                            className={
                              checked ? "font-medium text-obsidian" : ""
                            }
                          >
                            {pc.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </FilterDropBox>
              </div>
            )}

          {/* PROGRESSIVE SUB-FILTER FOR EARRINGS SIZE / SCALE (Hoops & Drops) */}
          {isEarringCategory &&
            (filters.styles.includes("hoops-huggies") ||
              filters.styles.includes("drops-dangles") ||
              filters.earringSizes.length > 0) && (
              <div className="mt-3.5 rounded-control border border-gold-soft bg-gold-tint/35 p-3">
                <FilterDropBox
                  title="Size / Drop Length"
                  count={filters.earringSizes.length}
                  defaultOpen
                  nested
                >
                  <div className="space-y-1.5">
                    {EARRING_SIZE_TIER_OPTIONS.map((es) => {
                      const checked = filters.earringSizes.includes(es.id);
                      return (
                        <label
                          key={es.id}
                          className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChange((prev) => ({
                                ...prev,
                                earringSizes: toggleArrayItem(
                                  prev.earringSizes,
                                  es.id
                                ),
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                          />
                          <span
                            className={
                              checked ? "font-medium text-obsidian" : ""
                            }
                          >
                            {es.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </FilterDropBox>
              </div>
            )}

          {/* PROGRESSIVE SUB-FILTER FOR ENGAGEMENT RINGS (Setting State) */}
          {isEngagementCategory &&
            (filters.styles.length > 0 || filters.settingStates.length > 0) && (
              <div className="mt-3.5 rounded-control border border-gold-soft bg-gold-tint/35 p-3">
                <FilterDropBox
                  title="Setting Type"
                  count={filters.settingStates.length}
                  defaultOpen
                  nested
                >
                  <div className="space-y-1.5">
                    {SETTING_STATE_OPTIONS.map((st) => {
                      const checked = filters.settingStates.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChange((prev) => ({
                                ...prev,
                                settingStates: toggleArrayItem(
                                  prev.settingStates,
                                  st.id
                                ),
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                          />
                          <span
                            className={
                              checked ? "font-medium text-obsidian" : ""
                            }
                          >
                            {st.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </FilterDropBox>
              </div>
            )}

          {/* PROGRESSIVE SUB-FILTER FOR EARRINGS (Backing / Closure) */}
          {isEarringCategory && showClaspSubFilter && effectiveClaspOptions.length > 0 && (
            <div className="mt-3.5 rounded-control border border-gold-soft bg-gold-tint/35 p-3">
              <FilterDropBox
                title="Backing & Closure"
                count={filters.closures.length}
                defaultOpen
                nested
              >
                <div className="space-y-1.5">
                  {effectiveClaspOptions.map((cls) => {
                    const checked = filters.closures.includes(cls);
                    return (
                      <label
                        key={cls}
                        className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange((prev) => ({
                              ...prev,
                              closures: toggleArrayItem(prev.closures, cls),
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                        />
                        <span
                          className={checked ? "font-medium text-obsidian" : ""}
                        >
                          {cls}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterDropBox>
            </div>
          )}
        </FilterDropBox>
      )}

      {/* 2. For (Women's / Men's) — Hidden on Gemstone Jewelry */}
      {supportsAudience && (
        <FilterDropBox
          title="For"
          count={filters.audiences.length}
          defaultOpen={filters.audiences.length > 0}
        >
          <div className="space-y-2">
            {(
              [
                { value: "women", label: "Women's" },
                { value: "men", label: "Men's" },
              ] as const
            ).map((opt) => {
              const checked = filters.audiences.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-ink hover:text-obsidian"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange((prev) => ({
                        ...prev,
                        audiences: toggleArrayItem(prev.audiences, opt.value),
                      }))
                    }
                    className="h-4 w-4 rounded border-hairline-strong accent-obsidian"
                  />
                  <span className={checked ? "font-medium text-obsidian" : ""}>
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterDropBox>
      )}

      {/* 3. Metal (Clean consumer families: Gold + optional Color/Karat refine, Platinum, Sterling Silver, etc.) */}
      {visibleTopMetals.length > 0 && (
        <FilterDropBox
          title="Metal"
          count={filters.metalTypes.length}
          defaultOpen={filters.metalTypes.length > 0}
        >
          <div className="space-y-1.5">
            {visibleTopMetals.map((opt) => {
              const checked = filters.metalTypes.includes(opt.id);
              const isGold = opt.id === "gold";
              return (
                <div key={opt.id}>
                  <label className="flex min-h-[30px] cursor-pointer items-center gap-2.5 py-0.5 text-sm text-ink hover:text-obsidian">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange((prev) => ({
                          ...prev,
                          metalTypes: toggleArrayItem(prev.metalTypes, opt.id),
                        }))
                      }
                      className="h-4 w-4 rounded border-hairline-strong accent-obsidian"
                    />
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full border border-obsidian/20"
                      style={{ background: opt.swatch }}
                    />
                    <span className={checked ? "font-medium text-obsidian" : ""}>
                      {opt.label}
                    </span>
                  </label>

                  {isGold && visibleGoldSubMetals.length > 0 && (
                    <div className="mt-1.5 ml-2 rounded-control border border-hairline/80 bg-canvas/60 px-3 py-2">
                      <FilterDropBox
                        title="Gold Color & Karat"
                        count={selectedGoldSubCount}
                        defaultOpen={selectedGoldSubCount > 0}
                        nested
                      >
                        <div className="grid grid-cols-2 gap-1.5">
                          {visibleGoldSubMetals.map((sub) => {
                            const subChecked = filters.metalTypes.includes(
                              sub.id
                            );
                            return (
                              <label
                                key={sub.id}
                                className="flex min-h-[28px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                              >
                                <input
                                  type="checkbox"
                                  checked={subChecked}
                                  onChange={() =>
                                    onChange((prev) => ({
                                      ...prev,
                                      metalTypes: toggleArrayItem(
                                        prev.metalTypes.filter(
                                          (m) => m !== "gold"
                                        ),
                                        sub.id
                                      ),
                                    }))
                                  }
                                  className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                                />
                                <span
                                  aria-hidden="true"
                                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-obsidian/20"
                                  style={{ background: sub.swatch }}
                                />
                                <span
                                  className={`truncate ${
                                    subChecked
                                      ? "font-medium text-obsidian"
                                      : ""
                                  }`}
                                >
                                  {sub.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </FilterDropBox>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FilterDropBox>
      )}

      {/* 4. Ring Size & Resizing (Ring Categories ONLY) */}
      {isRingCategory && (ringSizeOptions.length > 0 || hasSizableItems) && (
        <FilterDropBox
          title="Ring Size"
          count={filters.ringSizes.length + (filters.sizableOnly ? 1 : 0)}
          defaultOpen={filters.ringSizes.length > 0 || filters.sizableOnly}
        >
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-control border border-gold-soft bg-gold-tint/50 px-2.5 py-2 text-xs font-medium text-obsidian">
              <input
                type="checkbox"
                checked={filters.sizableOnly}
                onChange={() =>
                  onChange((prev) => ({
                    ...prev,
                    sizableOnly: !prev.sizableOnly,
                  }))
                }
                className="h-4 w-4 rounded border-hairline-strong accent-obsidian"
              />
              <span>Sizable (Can Be Resized)</span>
            </label>

            {ringSizeOptions.length > 0 && (
              <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                {ringSizeOptions.map((size) => {
                  const checked = filters.ringSizes.includes(size);
                  return (
                    <label
                      key={size}
                      className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          onChange((prev) => ({
                            ...prev,
                            ringSizes: toggleArrayItem(prev.ringSizes, size),
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                      />
                      <span
                        className={checked ? "font-medium text-obsidian" : ""}
                      >
                        Size {size}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </FilterDropBox>
      )}

      {/* 4b. Ring Band Width (Engagement Rings, Fashion Rings & Diamond/Eternity Wedding Bands) */}
      {(isEngagementCategory ||
        categorySlug === "fashion-rings" ||
        (isWeddingBandCategory && !selectedBandDetailStyle)) && (
        <FilterDropBox
          title="Band Width"
          count={filters.widths.length}
          defaultOpen={filters.widths.length > 0}
        >
          <div className="space-y-1.5">
            {RING_WIDTH_TIER_OPTIONS.map((tier) => {
              const checked = filters.widths.includes(tier.id);
              return (
                <label
                  key={tier.id}
                  className="flex cursor-pointer items-center gap-2 text-xs text-ink hover:text-obsidian"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange((prev) => ({
                        ...prev,
                        widths: toggleArrayItem(prev.widths, tier.id),
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                  />
                  <span className={checked ? "font-medium text-obsidian" : ""}>
                    {tier.label}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterDropBox>
      )}

      {/* 5. Length (Necklaces/Chains & Bracelets ONLY) */}
      {isLengthCategory && lengthOptions.length > 0 && (
        <FilterDropBox
          title="Length"
          count={filters.lengths.length + (filters.adjustableOnly ? 1 : 0)}
          defaultOpen={filters.lengths.length > 0 || filters.adjustableOnly}
        >
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-control border border-gold-soft bg-gold-tint/50 px-2.5 py-2 text-xs font-medium text-obsidian">
              <input
                type="checkbox"
                checked={filters.adjustableOnly}
                onChange={() =>
                  onChange((prev) => ({
                    ...prev,
                    adjustableOnly: !prev.adjustableOnly,
                  }))
                }
                className="h-4 w-4 rounded border-hairline-strong accent-obsidian"
              />
              <span>Adjustable Length</span>
            </label>

            <div className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
              {lengthOptions.map((len) => {
                const checked = filters.lengths.includes(len);
                return (
                  <label
                    key={len}
                    className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange((prev) => ({
                          ...prev,
                          lengths: toggleArrayItem(prev.lengths, len),
                        }))
                      }
                      className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                    />
                    <span
                      className={`truncate ${
                        checked ? "font-medium text-obsidian" : ""
                      }`}
                    >
                      {len}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </FilterDropBox>
      )}

      {/* 6. Gemstone (with inline Stone Origin + Birthstone Month labels) */}
      {showGemstoneDropBox && (
        <FilterDropBox
          title="Gemstone"
          count={filters.primaryStones.length + filters.stoneOrigins.length}
          defaultOpen={
            filters.primaryStones.length > 0 || filters.stoneOrigins.length > 0
          }
        >
          <div className="space-y-2.5">
            {/* Compact Stone Origin Toggle (Natural vs Lab-Grown) */}
            {!filters.primaryStones.includes(STONE_NONE_VALUE) && (
              <div className="grid grid-cols-2 gap-1.5">
                {STONE_ORIGIN_OPTIONS.map((origin) => {
                  const checked = filters.stoneOrigins.includes(origin.id);
                  return (
                    <label
                      key={origin.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-control border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        checked
                          ? "border-obsidian bg-obsidian/5 text-obsidian"
                          : "border-hairline bg-canvas text-ink hover:border-obsidian/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          onChange((prev) => ({
                            ...prev,
                            stoneOrigins: toggleArrayItem(
                              prev.stoneOrigins,
                              origin.id
                            ),
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                      />
                      <span>{origin.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {showNoStoneOption && (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-control border border-hairline bg-canvas px-2.5 py-2 text-xs font-medium text-obsidian">
                <input
                  type="checkbox"
                  checked={filters.primaryStones.includes(STONE_NONE_VALUE)}
                  onChange={() =>
                    onChange((prev) => ({
                      ...prev,
                      primaryStones: toggleArrayItem(
                        prev.primaryStones,
                        STONE_NONE_VALUE
                      ),
                    }))
                  }
                  className="h-4 w-4 rounded border-hairline-strong accent-obsidian"
                />
                <span>No Stone (Metal Only)</span>
              </label>
            )}

            {stoneOptions.length > 8 && (
              <input
                type="search"
                value={stoneSearch}
                onChange={(e) => setStoneSearch(e.target.value)}
                placeholder="Filter stones..."
                aria-label="Filter gemstone options"
                className="w-full rounded-control border border-hairline-strong bg-canvas px-2.5 py-1.5 text-xs text-obsidian placeholder:text-ink-muted focus:border-obsidian focus:bg-surface focus:outline-none"
              />
            )}

            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {filteredStones.map((stone) => {
                const checked = filters.primaryStones.includes(stone);
                return (
                  <label
                    key={stone}
                    className="flex min-h-[30px] cursor-pointer items-center gap-2 py-0.5 text-xs text-ink hover:text-obsidian"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange((prev) => ({
                          ...prev,
                          primaryStones: toggleArrayItem(
                            prev.primaryStones,
                            stone
                          ),
                        }))
                      }
                      className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                    />
                    <span
                      className={`truncate ${
                        checked ? "font-medium text-obsidian" : ""
                      }`}
                    >
                      {formatStoneWithBirthstone(stone)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </FilterDropBox>
      )}

      {/* 6b. Progressive Carat Weight (revealed when a stone/diamond style or stone is active) */}
      {(showStoneShapeProgressive ||
        filters.caratTiers.length > 0 ||
        (isWeddingBandCategory &&
          (filters.styles.includes("eternity") ||
            filters.styles.includes("anniversary-diamond")))) && (
        <FilterDropBox
          title="Carat Weight"
          count={filters.caratTiers.length}
          defaultOpen={filters.caratTiers.length > 0}
        >
          <div className="space-y-1.5">
            {CARAT_WEIGHT_TIER_OPTIONS.map((ct) => {
              const checked = filters.caratTiers.includes(ct.id);
              return (
                <label
                  key={ct.id}
                  className="flex cursor-pointer items-center gap-2 text-xs text-ink hover:text-obsidian"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange((prev) => ({
                        ...prev,
                        caratTiers: toggleArrayItem(prev.caratTiers, ct.id),
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                  />
                  <span className={checked ? "font-medium text-obsidian" : ""}>
                    {ct.label}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterDropBox>
      )}

      {/* 7. Progressive Stone Shape (revealed when a stone/style applies!) */}
      {showStoneShapeProgressive && (
        <FilterDropBox
          title="Stone Shape"
          count={filters.stoneShapes.length}
          defaultOpen={filters.stoneShapes.length > 0}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {stoneShapeOptions.map((shape) => {
              const checked = filters.stoneShapes.includes(shape.id);
              return (
                <label
                  key={shape.id}
                  className="flex cursor-pointer items-center gap-2 text-xs text-ink hover:text-obsidian"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange((prev) => ({
                        ...prev,
                        stoneShapes: toggleArrayItem(prev.stoneShapes, shape.id),
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-hairline-strong accent-obsidian"
                  />
                  <span className={checked ? "font-medium text-obsidian" : ""}>
                    {shape.label}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterDropBox>
      )}
    </div>
  );
}
