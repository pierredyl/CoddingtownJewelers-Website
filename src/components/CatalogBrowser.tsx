"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import {
  BAND_FIT_OPTIONS,
  BAND_PROFILE_OPTIONS,
  CARAT_WEIGHT_TIER_OPTIONS,
  CHAIN_LINK_STYLE_OPTIONS,
  CHAIN_WIDTH_TIER_OPTIONS,
  EARRING_SIZE_TIER_OPTIONS,
  EDGE_DETAIL_OPTIONS,
  GEMSTONE_JEWELRY_TYPE_OPTIONS,
  PENDANT_CHAIN_OPTIONS,
  RING_WIDTH_TIER_OPTIONS,
  SETTING_STATE_OPTIONS,
  STONE_ORIGIN_OPTIONS,
  SURFACE_FINISH_OPTIONS,
  getStoneShapeOptionsForCategory,
  getStyleOptionsForCategory,
} from "@/config/catalogFilters";
import { compareSizeOrLength } from "@/lib/catalog/formatters";
import type { CatalogItemGroup } from "@/types/catalog";
import { CatalogCard } from "./CatalogCard";
import {
  CatalogFilterSidebar,
  STONE_NONE_VALUE,
  type CategoryFilterState,
} from "./CatalogFilterSidebar";
import { PieceDetailModal } from "./PieceDetailModal";

interface CatalogBrowserProps {
  categorySlug: string;
  categoryName: string;
  initialAudience?: "men" | "women" | "";
  initialStyle?: string;
  initialStone?: string;
  initialGroups: CatalogItemGroup[];
  initialTotalSkus: number;
  initialHasMore: boolean;
  initialNextOffset: number;
  initialMetalOptions: string[];
  initialStoneOptions: string[];
  initialHasNoStoneItems: boolean;
  initialHasSizableItems: boolean;
  initialLengthOptions: string[];
  initialClosureOptions: string[];
  initialRingSizeOptions: string[];
  dataSource: "supabase" | "demo";
}

function makeInitialFilters(
  initialAudience: "men" | "women" | "",
  initialStyle = "",
  initialStone = ""
): CategoryFilterState {
  return {
    query: "",
    audiences: initialAudience ? [initialAudience] : [],
    styles: initialStyle ? [initialStyle] : [],
    chainStyles: [],
    widths: [],
    bandFits: [],
    bandProfiles: [],
    edgeDetails: [],
    stoneShapes: [],
    settingStates: [],
    stoneOrigins: [],
    caratTiers: [],
    jewelryTypes: [],
    finishes: [],
    earringSizes: [],
    pendantChains: [],
    adjustableOnly: false,
    metalTypes: [],
    primaryStones: initialStone ? [initialStone] : [],
    lengths: [],
    closures: [],
    ringSizes: [],
    sizableOnly: false,
  };
}

/**
 * Deterministic Mulberry32 PRNG + Fisher-Yates shuffle.
 * Runs in O(n) on cached groups with zero DB overhead and preserves stable order
 * within a shopper's browser session while giving every new visit a fresh mix.
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  if (items.length <= 1) return items;
  const copy = [...items];
  let s = seed >>> 0;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(rand * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSessionShuffleSeed(): number {
  if (typeof window === "undefined") return 1;
  try {
    const key = "cj_catalog_shuffle_seed";
    const existing = window.sessionStorage.getItem(key);
    if (existing) {
      const parsed = Number.parseInt(existing, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const fresh = Math.floor(Math.random() * 2_000_000_000) + 1;
    window.sessionStorage.setItem(key, String(fresh));
    return fresh;
  } catch {
    return 1;
  }
}

function mergeGroups(
  existing: CatalogItemGroup[],
  incoming: CatalogItemGroup[]
): CatalogItemGroup[] {
  const byKey = new Map<string, CatalogItemGroup>();
  for (const g of existing) {
    byKey.set(g.groupKey, g);
  }
  for (const g of incoming) {
    const prev = byKey.get(g.groupKey);
    if (!prev) {
      byKey.set(g.groupKey, g);
    } else {
      const seenSkus = new Set(prev.variants.map((v) => v.supplierSku));
      const added = g.variants.filter((v) => !seenSkus.has(v.supplierSku));
      if (added.length > 0) {
        byKey.set(g.groupKey, {
          ...prev,
          variants: [...prev.variants, ...added],
        });
      }
    }
  }
  return Array.from(byKey.values());
}

export function CatalogBrowser({
  categorySlug,
  categoryName,
  initialAudience = "",
  initialStyle = "",
  initialStone = "",
  initialGroups,
  initialTotalSkus,
  initialHasMore,
  initialNextOffset,
  initialMetalOptions,
  initialStoneOptions,
  initialHasNoStoneItems,
  initialHasSizableItems,
  initialLengthOptions,
  initialClosureOptions,
  initialRingSizeOptions,
  dataSource,
}: CatalogBrowserProps) {
  const [filters, setFilters] = useState<CategoryFilterState>(() =>
    makeInitialFilters(initialAudience, initialStyle, initialStone)
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [groups, setGroups] = useState<CatalogItemGroup[]>(initialGroups);
  const [totalSkus, setTotalSkus] = useState<number>(initialTotalSkus);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [nextOffset, setNextOffset] = useState<number>(initialNextOffset);
  const [metalOptions, setMetalOptions] =
    useState<string[]>(initialMetalOptions);
  const [stoneOptions, setStoneOptions] =
    useState<string[]>(initialStoneOptions);
  const [hasNoStoneItems, setHasNoStoneItems] = useState<boolean>(
    initialHasNoStoneItems
  );
  const [hasSizableItems, setHasSizableItems] = useState<boolean>(
    initialHasSizableItems
  );
  const [lengthOptions, setLengthOptions] =
    useState<string[]>(initialLengthOptions);
  const [closureOptions, setClosureOptions] = useState<string[]>(
    initialClosureOptions
  );
  const [ringSizeOptions, setRingSizeOptions] = useState<string[]>(
    initialRingSizeOptions
  );
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterError, setFilterError] = useState(false);
  const loadMoreControllerRef = useRef<AbortController | null>(null);
  const sessionSeedRef = useRef<number>(0);

  // Per-session seeded shuffle on mount (zero SSR hydration mismatch, zero DB cost)
  useEffect(() => {
    const seed = getSessionShuffleSeed();
    sessionSeedRef.current = seed;
    if (!filters.query.trim()) {
      setGroups(seededShuffle(initialGroups, seed));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, initialGroups]);

  // Lock body scroll & support Escape key when mobile filter drawer is open
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileFiltersOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileFiltersOpen]);
  const [selectedPiece, setSelectedPiece] = useState<{
    group: CatalogItemGroup;
    initialSku: string;
    autoRevealSku: boolean;
  } | null>(null);

  const searchId = useId();
  const styleOptions = useMemo(
    () => getStyleOptionsForCategory(categorySlug),
    [categorySlug]
  );
  const stoneShapeOptions = useMemo(
    () => getStoneShapeOptionsForCategory(categorySlug),
    [categorySlug]
  );

  useEffect(() => {
    setFilters(makeInitialFilters(initialAudience, initialStyle, initialStone));
    setGroups(initialGroups);
    setTotalSkus(initialTotalSkus);
    setHasMore(initialHasMore);
    setNextOffset(initialNextOffset);
    setMetalOptions(initialMetalOptions);
    setStoneOptions(initialStoneOptions);
    setHasNoStoneItems(initialHasNoStoneItems);
    setHasSizableItems(initialHasSizableItems);
    setLengthOptions(initialLengthOptions);
    setClosureOptions(initialClosureOptions);
    setRingSizeOptions(initialRingSizeOptions);
  }, [
    categorySlug,
    initialAudience,
    initialStyle,
    initialStone,
    initialGroups,
    initialTotalSkus,
    initialHasMore,
    initialNextOffset,
    initialMetalOptions,
    initialStoneOptions,
    initialHasNoStoneItems,
    initialHasSizableItems,
    initialLengthOptions,
    initialClosureOptions,
    initialRingSizeOptions,
  ]);

  const initialAudienceKey = initialAudience || "";
  const currentAudienceKey =
    filters.audiences.length === 1 ? filters.audiences[0] : "";
  const initialStyleKey = initialStyle || "";
  const currentStyleKey = filters.styles.length === 1 ? filters.styles[0] : "";
  const initialStoneKey = initialStone || "";
  const currentStoneKey =
    filters.primaryStones.length === 1 ? filters.primaryStones[0] : "";

  const hasNonInitialFilters =
    Boolean(filters.query.trim()) ||
    currentAudienceKey !== initialAudienceKey ||
    currentStyleKey !== initialStyleKey ||
    filters.styles.length > 1 ||
    filters.chainStyles.length > 0 ||
    filters.widths.length > 0 ||
    filters.bandFits.length > 0 ||
    filters.bandProfiles.length > 0 ||
    filters.edgeDetails.length > 0 ||
    filters.stoneShapes.length > 0 ||
    filters.settingStates.length > 0 ||
    filters.stoneOrigins.length > 0 ||
    filters.caratTiers.length > 0 ||
    filters.jewelryTypes.length > 0 ||
    filters.finishes.length > 0 ||
    filters.earringSizes.length > 0 ||
    filters.pendantChains.length > 0 ||
    filters.adjustableOnly ||
    filters.metalTypes.length > 0 ||
    currentStoneKey !== initialStoneKey ||
    filters.primaryStones.length > 1 ||
    filters.lengths.length > 0 ||
    filters.closures.length > 0 ||
    filters.ringSizes.length > 0 ||
    filters.sizableOnly;

  const activeCheckboxCount =
    filters.audiences.length +
    filters.styles.length +
    filters.chainStyles.length +
    filters.widths.length +
    filters.bandFits.length +
    filters.bandProfiles.length +
    filters.edgeDetails.length +
    filters.stoneShapes.length +
    filters.settingStates.length +
    filters.stoneOrigins.length +
    filters.caratTiers.length +
    filters.jewelryTypes.length +
    filters.finishes.length +
    filters.earringSizes.length +
    filters.pendantChains.length +
    (filters.adjustableOnly ? 1 : 0) +
    filters.metalTypes.length +
    filters.primaryStones.length +
    filters.lengths.length +
    filters.closures.length +
    filters.ringSizes.length +
    (filters.sizableOnly ? 1 : 0);

  const hasActiveFilters =
    Boolean(filters.query.trim()) || activeCheckboxCount > 0;

  const filterKey = JSON.stringify(filters);

  function buildFilterQueryParams(offset: number): URLSearchParams {
    const qs = new URLSearchParams({
      slug: categorySlug,
      offset: String(offset),
    });
    if (filters.query.trim()) qs.set("q", filters.query.trim());
    for (const aud of filters.audiences) qs.append("audience", aud);
    for (const st of filters.styles) qs.append("style", st);
    for (const cs of filters.chainStyles) qs.append("chainStyle", cs);
    for (const w of filters.widths) qs.append("width", w);
    for (const f of filters.bandFits) qs.append("fit", f);
    for (const p of filters.bandProfiles) qs.append("profile", p);
    for (const e of filters.edgeDetails) qs.append("edge", e);
    for (const sh of filters.stoneShapes) qs.append("shape", sh);
    for (const ss of filters.settingStates) qs.append("state", ss);
    for (const so of filters.stoneOrigins) qs.append("origin", so);
    for (const ct of filters.caratTiers) qs.append("carat", ct);
    for (const jt of filters.jewelryTypes) qs.append("jewelryType", jt);
    for (const fn of filters.finishes) qs.append("finish", fn);
    for (const es of filters.earringSizes) qs.append("earringSize", es);
    for (const pc of filters.pendantChains) qs.append("pendantChain", pc);
    if (filters.adjustableOnly) qs.set("adjustable", "1");
    for (const m of filters.metalTypes) qs.append("metal", m);
    for (const s of filters.primaryStones) qs.append("stone", s);
    for (const l of filters.lengths) qs.append("length", l);
    for (const c of filters.closures) qs.append("closure", c);
    for (const r of filters.ringSizes) qs.append("ringSize", r);
    if (filters.sizableOnly) qs.set("sizable", "1");
    return qs;
  }

  useEffect(() => {
    if (dataSource !== "supabase") {
      const q = filters.query.trim().toLowerCase();
      const filtered = initialGroups.filter((group) =>
        group.variants.some((v) => {
          if (
            filters.metalTypes.length > 0 &&
            (!v.metalType || !filters.metalTypes.includes(v.metalType))
          ) {
            return false;
          }
          if (filters.primaryStones.length > 0) {
            const matchesNoStone =
              filters.primaryStones.includes(STONE_NONE_VALUE) &&
              !v.primaryStone;
            const matchesNamed =
              Boolean(v.primaryStone) &&
              filters.primaryStones.includes(v.primaryStone!);
            if (!matchesNoStone && !matchesNamed) return false;
          }
          if (q) {
            const hay = `${v.supplierSku} ${group.title} ${v.metalType ?? ""} ${v.primaryStone ?? ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        })
      );
      setGroups(filtered);
      setTotalSkus(filtered.reduce((s, g) => s + g.variants.length, 0));
      setHasMore(false);
      return;
    }

    // Abort any in-flight Load More request when filters or category change
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
    setLoadingMore(false);
    setFilterError(false);

    if (!hasNonInitialFilters) {
      const seed = sessionSeedRef.current;
      setGroups(seed > 0 ? seededShuffle(initialGroups, seed) : initialGroups);
      setTotalSkus(initialTotalSkus);
      setHasMore(initialHasMore);
      setNextOffset(initialNextOffset);
      setLoadingFilter(false);
      return;
    }

    const controller = new AbortController();
    setLoadingFilter(true);

    const timer = window.setTimeout(async () => {
      try {
        const qs = buildFilterQueryParams(0);
        const res = await fetch(`/api/catalog/category?${qs.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setFilterError(true);
          return;
        }
        const page = (await res.json()) as {
          groups: CatalogItemGroup[];
          totalSkus: number;
          hasMore: boolean;
          nextOffset: number;
        };
        setGroups(page.groups);
        setTotalSkus(page.totalSkus);
        setHasMore(page.hasMore);
        setNextOffset(page.nextOffset);
        setFilterError(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setFilterError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingFilter(false);
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataSource,
    categorySlug,
    filterKey,
    hasNonInitialFilters,
    initialGroups,
    initialTotalSkus,
    initialHasMore,
    initialNextOffset,
  ]);

  async function handleLoadMore() {
    if (loadingMore || loadingFilter || !hasMore || dataSource !== "supabase") {
      return;
    }
    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    setLoadingMore(true);
    try {
      let currentGroups = groups;
      let currentOffset = nextOffset;
      let currentHasMore: boolean = hasMore;
      let currentTotalSkus = totalSkus;
      let newCardsAdded = 0;

      const MAX_BATCHES_PER_CLICK = 4;
      const MIN_NEW_CARDS = 6;

      for (let attempt = 0; attempt < MAX_BATCHES_PER_CLICK; attempt++) {
        if (!currentHasMore || controller.signal.aborted) break;
        const qs = buildFilterQueryParams(currentOffset);
        const res = await fetch(`/api/catalog/category?${qs.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) break;
        const page = (await res.json()) as {
          groups: CatalogItemGroup[];
          totalSkus: number;
          hasMore: boolean;
          nextOffset: number;
          metalOptions?: string[];
          stoneOptions?: string[];
          lengthOptions?: string[];
          closureOptions?: string[];
          ringSizeOptions?: string[];
        };
        if (controller.signal.aborted) return;

        const beforeCount = currentGroups.length;
        const incomingGroups =
          !filters.query.trim() && sessionSeedRef.current > 0
            ? seededShuffle(page.groups, sessionSeedRef.current + currentOffset)
            : page.groups;
        currentGroups = mergeGroups(currentGroups, incomingGroups);
        newCardsAdded += currentGroups.length - beforeCount;
        currentTotalSkus = page.totalSkus;
        currentHasMore = page.hasMore;
        currentOffset = page.nextOffset;

        if (page.metalOptions?.length) {
          setMetalOptions((prev) =>
            Array.from(new Set([...prev, ...page.metalOptions!])).sort()
          );
        }
        if (page.stoneOptions?.length) {
          setStoneOptions((prev) =>
            Array.from(new Set([...prev, ...page.stoneOptions!])).sort()
          );
        }
        if (page.lengthOptions?.length) {
          setLengthOptions((prev) =>
            Array.from(new Set([...prev, ...page.lengthOptions!])).sort(
              compareSizeOrLength
            )
          );
        }
        if (page.closureOptions?.length) {
          setClosureOptions((prev) =>
            Array.from(new Set([...prev, ...page.closureOptions!])).sort()
          );
        }
        if (page.ringSizeOptions?.length) {
          setRingSizeOptions((prev) =>
            Array.from(new Set([...prev, ...page.ringSizeOptions!])).sort(
              compareSizeOrLength
            )
          );
        }

        if (newCardsAdded >= MIN_NEW_CARDS || !currentHasMore) {
          break;
        }
      }

      if (!controller.signal.aborted) {
        setGroups(currentGroups);
        setTotalSkus(currentTotalSkus);
        setHasMore(currentHasMore);
        setNextOffset(currentOffset);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setFilterError(true);
      }
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        setLoadingMore(false);
      }
    }
  }

  function resetFilters() {
    setFilters(makeInitialFilters(""));
  }

  // Active filter chips above the grid
  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> =
      [];

    for (const styleId of filters.styles) {
      const opt = styleOptions.find((s) => s.id === styleId);
      chips.push({
        id: `style:${styleId}`,
        label: opt?.label ?? styleId,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            styles: prev.styles.filter((s) => s !== styleId),
          })),
      });
    }
    for (const cs of filters.chainStyles) {
      const opt = CHAIN_LINK_STYLE_OPTIONS.find((o) => o.id === cs);
      chips.push({
        id: `chain:${cs}`,
        label: `${opt?.label ?? cs} Chain`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            chainStyles: prev.chainStyles.filter((v) => v !== cs),
          })),
      });
    }
    for (const w of filters.widths) {
      const chainTier = CHAIN_WIDTH_TIER_OPTIONS.find((t) => t.id === w);
      const ringTier = RING_WIDTH_TIER_OPTIONS.find((t) => t.id === w);
      chips.push({
        id: `width:${w}`,
        label: chainTier
          ? chainTier.label
          : ringTier
            ? ringTier.label
            : w.replace("Mm", "mm"),
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            widths: prev.widths.filter((v) => v !== w),
          })),
      });
    }
    for (const f of filters.bandFits) {
      const opt = BAND_FIT_OPTIONS.find((o) => o.id === f);
      chips.push({
        id: `fit:${f}`,
        label: opt?.label ?? f,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            bandFits: prev.bandFits.filter((v) => v !== f),
          })),
      });
    }
    for (const p of filters.bandProfiles) {
      const opt = BAND_PROFILE_OPTIONS.find((o) => o.id === p);
      chips.push({
        id: `prof:${p}`,
        label: opt?.label ?? p,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            bandProfiles: prev.bandProfiles.filter((v) => v !== p),
          })),
      });
    }
    for (const e of filters.edgeDetails) {
      const opt = EDGE_DETAIL_OPTIONS.find((o) => o.id === e);
      chips.push({
        id: `edge:${e}`,
        label: opt?.label ?? e,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            edgeDetails: prev.edgeDetails.filter((v) => v !== e),
          })),
      });
    }
    for (const sh of filters.stoneShapes) {
      const opt = stoneShapeOptions.find((o) => o.id === sh);
      chips.push({
        id: `shape:${sh}`,
        label: `${opt?.label ?? sh} Cut`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            stoneShapes: prev.stoneShapes.filter((v) => v !== sh),
          })),
      });
    }
    for (const ss of filters.settingStates) {
      const opt = SETTING_STATE_OPTIONS.find((o) => o.id === ss);
      chips.push({
        id: `state:${ss}`,
        label: opt?.label ?? ss,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            settingStates: prev.settingStates.filter((v) => v !== ss),
          })),
      });
    }
    for (const so of filters.stoneOrigins) {
      const opt = STONE_ORIGIN_OPTIONS.find((o) => o.id === so);
      chips.push({
        id: `origin:${so}`,
        label: opt?.label ?? so,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            stoneOrigins: prev.stoneOrigins.filter((v) => v !== so),
          })),
      });
    }
    for (const ct of filters.caratTiers) {
      const opt = CARAT_WEIGHT_TIER_OPTIONS.find((o) => o.id === ct);
      chips.push({
        id: `carat:${ct}`,
        label: opt?.label ?? ct,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            caratTiers: prev.caratTiers.filter((v) => v !== ct),
          })),
      });
    }
    for (const jt of filters.jewelryTypes) {
      const opt = GEMSTONE_JEWELRY_TYPE_OPTIONS.find((o) => o.id === jt);
      chips.push({
        id: `jtype:${jt}`,
        label: opt?.label ?? jt,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            jewelryTypes: prev.jewelryTypes.filter((v) => v !== jt),
          })),
      });
    }
    for (const fn of filters.finishes) {
      const opt = SURFACE_FINISH_OPTIONS.find((o) => o.id === fn);
      chips.push({
        id: `finish:${fn}`,
        label: opt?.label ?? fn,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            finishes: prev.finishes.filter((v) => v !== fn),
          })),
      });
    }
    for (const es of filters.earringSizes) {
      const opt = EARRING_SIZE_TIER_OPTIONS.find((o) => o.id === es);
      chips.push({
        id: `esize:${es}`,
        label: opt?.label ?? es,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            earringSizes: prev.earringSizes.filter((v) => v !== es),
          })),
      });
    }
    for (const pc of filters.pendantChains) {
      const opt = PENDANT_CHAIN_OPTIONS.find((o) => o.id === pc);
      chips.push({
        id: `pchain:${pc}`,
        label: opt?.label ?? pc,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            pendantChains: prev.pendantChains.filter((v) => v !== pc),
          })),
      });
    }
    if (filters.adjustableOnly) {
      chips.push({
        id: "adjustable",
        label: "Adjustable Length",
        onRemove: () =>
          setFilters((prev) => ({ ...prev, adjustableOnly: false })),
      });
    }
    for (const aud of filters.audiences) {
      chips.push({
        id: `aud:${aud}`,
        label: aud === "women" ? "Women's" : "Men's",
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            audiences: prev.audiences.filter((a) => a !== aud),
          })),
      });
    }
    for (const metal of filters.metalTypes) {
      chips.push({
        id: `metal:${metal}`,
        label: metal,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            metalTypes: prev.metalTypes.filter((m) => m !== metal),
          })),
      });
    }
    if (filters.sizableOnly) {
      chips.push({
        id: "sizable",
        label: "Sizable",
        onRemove: () =>
          setFilters((prev) => ({ ...prev, sizableOnly: false })),
      });
    }
    for (const size of filters.ringSizes) {
      chips.push({
        id: `size:${size}`,
        label: `Size ${size}`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            ringSizes: prev.ringSizes.filter((r) => r !== size),
          })),
      });
    }
    for (const len of filters.lengths) {
      chips.push({
        id: `len:${len}`,
        label: len,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            lengths: prev.lengths.filter((l) => l !== len),
          })),
      });
    }
    for (const stone of filters.primaryStones) {
      chips.push({
        id: `stone:${stone}`,
        label: stone === STONE_NONE_VALUE ? "No Stone (Metal Only)" : stone,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            primaryStones: prev.primaryStones.filter((s) => s !== stone),
          })),
      });
    }
    for (const cls of filters.closures) {
      chips.push({
        id: `cls:${cls}`,
        label: cls,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            closures: prev.closures.filter((c) => c !== cls),
          })),
      });
    }
    return chips;
  }, [filters, styleOptions, stoneShapeOptions]);

  const lowerQuery = filters.query.trim().toLowerCase();

  return (
    <section aria-label={`${categoryName} pieces`} className="mt-6">
      {/* Top Search Bar + Mobile Filter Drawer Trigger */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="inline-flex items-center gap-2 rounded-control border border-hairline-strong bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-obsidian shadow-card transition-colors hover:border-obsidian lg:hidden"
        >
          <SlidersHorizontal
            className="h-3.5 w-3.5 text-gold-deep"
            aria-hidden="true"
          />
          <span>Filters</span>
          {activeCheckboxCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-obsidian px-1.5 text-[10px] font-bold text-canvas">
              {activeCheckboxCount}
            </span>
          )}
        </button>

        <search className="min-w-[220px] flex-1">
          <form onSubmit={(e) => e.preventDefault()} className="relative">
            <label htmlFor={searchId} className="sr-only">
              Search {categoryName} by Item #, style, metal, or gemstone
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={filters.query}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, query: e.target.value }))
              }
              placeholder="Search for anything..."
              className="w-full rounded-control border border-hairline-strong bg-surface py-2.5 pr-9 pl-10 text-sm text-obsidian shadow-card placeholder:text-ink-muted/80 focus:border-obsidian focus:outline-none"
            />
            {loadingFilter ? (
              <Loader2
                className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gold-deep"
                aria-hidden="true"
              />
            ) : (
              filters.query && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, query: "" }))}
                  aria-label="Clear search query"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-obsidian"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )
            )}
          </form>
        </search>
      </div>

      {/* Main 2-Column Layout: Sticky Left Progressive Checkbox Sidebar (Desktop) + Gallery Grid */}
      <div className="mt-6 lg:flex lg:items-start lg:gap-7">
        {/* Desktop Sticky Left Filter Sidebar */}
        <aside
          aria-label="Catalogue filters"
          className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto"
        >
          <div className="rounded-card border border-hairline bg-surface p-5 shadow-card">
            <CatalogFilterSidebar
              categorySlug={categorySlug}
              filters={filters}
              onChange={setFilters}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
              metalOptions={metalOptions}
              stoneOptions={stoneOptions}
              hasNoStoneItems={hasNoStoneItems}
              hasSizableItems={hasSizableItems}
              lengthOptions={lengthOptions}
              closureOptions={closureOptions}
              ringSizeOptions={ringSizeOptions}
            />
          </div>
        </aside>

        {/* Right Results Column */}
        <div className="min-w-0 flex-1">
          {/* Active Filter Pills */}
          {activeChips.length > 0 && (
            <div
              aria-label="Active filters"
              className="mb-4 flex flex-wrap items-center gap-2"
            >
              {activeChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label} filter`}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-gold-soft bg-gold-tint px-3 py-1 text-xs font-medium text-obsidian transition-colors hover:border-obsidian"
                >
                  <span>{chip.label}</span>
                  <X className="h-3 w-3 text-gold-deep" aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-ink-muted underline decoration-gold underline-offset-4 hover:text-obsidian"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Result Count Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <p>
              Showing{" "}
              <strong className="font-semibold text-obsidian">
                {groups.length.toLocaleString()}
              </strong>{" "}
              {groups.length === 1 ? "piece" : "pieces"} (
              {hasActiveFilters && hasMore
                ? `${Math.max(0, totalSkus - 1).toLocaleString()}+`
                : totalSkus.toLocaleString()}{" "}
              matching {totalSkus === 1 ? "option" : "options"})
            </p>
            {dataSource === "demo" && (
              <span className="rounded-pill border border-gold-soft bg-gold-tint px-2.5 py-0.5 text-[11px] font-medium text-gold-deep">
                Preview Catalogue
              </span>
            )}
          </div>

          {filterError && (
            <div
              role="alert"
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-status-error/30 bg-status-error-bg px-4 py-2.5 text-xs text-status-error"
            >
              <span>Could not update results right now. Please try again.</span>
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev }))}
                className="font-semibold underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          {/* Gallery Grid */}
          {groups.length > 0 ? (
            <>
              <div
                className={`mt-4 grid grid-cols-2 gap-3.5 transition-opacity sm:grid-cols-3 xl:grid-cols-4 ${
                  loadingFilter ? "opacity-60" : "opacity-100"
                }`}
              >
                {groups.map((group, index) => {
                  const matchedSku = lowerQuery
                    ? group.variants.find((v) =>
                        v.supplierSku.toLowerCase().includes(lowerQuery)
                      )?.supplierSku ?? null
                    : null;
                  return (
                    <CatalogCard
                      key={group.groupKey}
                      group={group}
                      isPriority={index < 6}
                      highlightedSku={matchedSku}
                      onSelect={(selectedGroup, initialSku) =>
                        setSelectedPiece({
                          group: selectedGroup,
                          initialSku,
                          autoRevealSku: Boolean(matchedSku),
                        })
                      }
                    />
                  );
                })}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    disabled={loadingMore || loadingFilter}
                    onClick={handleLoadMore}
                    className="inline-flex items-center gap-2 rounded-control border border-obsidian bg-surface px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-obsidian transition-colors hover:bg-obsidian hover:text-canvas disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                        <span>Loading More...</span>
                      </>
                    ) : (
                      <span>Load More Pieces</span>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 rounded-card border border-hairline bg-surface px-6 py-16 text-center">
              <SlidersHorizontal
                className="mx-auto h-7 w-7 text-gold"
                aria-hidden="true"
              />
              <h2 className="mt-4 font-serif text-2xl font-medium text-obsidian">
                No matching pieces found
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">
                Try unchecking a filter or broadening your metal, length, width,
                or gemstone selection.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex items-center gap-2 rounded-control bg-obsidian px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-canvas transition-colors hover:bg-gold-deep"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter catalogue"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <div
            className="fixed inset-0 bg-obsidian/50 backdrop-blur-xs"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-xs flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <h2 className="font-serif text-lg font-bold text-obsidian">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-hairline text-ink-secondary hover:border-obsidian hover:text-obsidian"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <CatalogFilterSidebar
                categorySlug={categorySlug}
                filters={filters}
                onChange={setFilters}
                onReset={resetFilters}
                hasActiveFilters={hasActiveFilters}
                metalOptions={metalOptions}
                stoneOptions={stoneOptions}
                hasNoStoneItems={hasNoStoneItems}
                hasSizableItems={hasSizableItems}
                lengthOptions={lengthOptions}
                closureOptions={closureOptions}
                ringSizeOptions={ringSizeOptions}
              />
            </div>

            <div className="border-t border-hairline bg-surface p-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full rounded-control bg-obsidian px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-canvas transition-colors hover:bg-gold-deep"
              >
                {loadingFilter
                  ? "Updating..."
                  : `Show ${groups.length.toLocaleString()} ${groups.length === 1 ? "Piece" : "Pieces"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Click-to-View Detail & Variant Configurator Modal */}
      <PieceDetailModal
        group={selectedPiece?.group ?? null}
        initialSku={selectedPiece?.initialSku ?? null}
        autoRevealSku={selectedPiece?.autoRevealSku ?? false}
        onClose={() => setSelectedPiece(null)}
      />
    </section>
  );
}
