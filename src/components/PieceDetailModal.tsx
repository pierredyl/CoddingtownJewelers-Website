"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import {
  compareSizeOrLength,
  parseMetalPurityAndColor,
} from "@/lib/catalog/formatters";
import type { CatalogItemGroup, CatalogVariant } from "@/types/catalog";

interface PieceDetailModalProps {
  group: CatalogItemGroup | null;
  initialSku?: string | null;
  /** True only when opened from an explicit SKU search match so the SKU is immediately visible */
  autoRevealSku?: boolean;
  onClose: () => void;
}

interface ConfigDimension {
  id: string;
  label: string;
  keys: string[];
  numericSort?: boolean;
}

/**
 * Ordered configurator dimensions checked dynamically per product group.
 * Only dimensions that actually vary across the variants of the selected metal
 * are shown — eliminating duplicate identical size buttons when variants differ
 * by center stone shape, stone size, carat weight, band profile, or width.
 */
const CONFIG_DIMENSIONS: ConfigDimension[] = [
  { id: "state", label: "Setting Type", keys: ["Jewelry State"] },
  {
    id: "stoneShape",
    label: "Center Stone Shape",
    keys: [
      "Eng. Center Stone Shape",
      "Center Stone Shape",
      "Primary Stone Shape",
    ],
  },
  {
    id: "stoneSize",
    label: "Center Stone Size",
    keys: [
      "Eng. Center Stone Size",
      "Center Stone Size",
      "Primary Stone Size",
      "Stone Size",
    ],
    numericSort: true,
  },
  {
    id: "carat",
    label: "Carat & Quality",
    keys: ["Total Carat Weight", "Total Diamond Weight", "Clarity, Color :: CTW"],
  },
  { id: "profile", label: "Band Profile", keys: ["Profile"] },
  { id: "fit", label: "Band Fit", keys: ["Ring Fit"] },
  { id: "edge", label: "Edge Detail", keys: ["Design Detail"] },
  {
    id: "width",
    label: "Width",
    keys: ["Width", "Band Width", "Shank Width"],
    numericSort: true,
  },
  {
    id: "length",
    label: "Length",
    keys: [
      "Bracelet Size",
      "Bracelet Length",
      "Necklace Length",
      "Chain Length",
      "Length",
      "Earring Length",
    ],
    numericSort: true,
  },
  {
    id: "ringSize",
    label: "Ring Size",
    keys: ["Ring Size", "Finger Size"],
    numericSort: true,
  },
  {
    id: "clasp",
    label: "Clasp / Backing",
    keys: ["Clasp Type", "Closure", "Backing Type"],
  },
];

function getDimValue(variant: CatalogVariant, keys: string[]): string | null {
  const attrs = variant.attributes ?? {};
  for (const key of keys) {
    const val = attrs[key];
    if (val != null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return null;
}

function getFallbackOptionLabel(variant: CatalogVariant, index: number): string {
  const attrs = variant.attributes ?? {};
  const desc = attrs["Description"];
  if (desc != null && String(desc).trim()) return String(desc).trim();
  const weight = attrs["Weight"];
  if (weight != null && String(weight).trim()) return String(weight).trim();
  return `Option ${index + 1}`;
}

// Consumer-friendly spec allowlist (hides technical/internal Stuller fields)
const CONSUMER_SPEC_LABELS: Record<string, string> = {
  jewelrystate: "Setting Type",
  engcenterstoneshape: "Center Stone Shape",
  centerstoneshape: "Center Stone Shape",
  primarystoneshape: "Stone Shape",
  engcenterstonesize: "Center Stone Size",
  centerstonesize: "Center Stone Size",
  primarystonesize: "Stone Size",
  sizable: "Sizable",
  ringsize: "Ring Size",
  fingersize: "Ring Size",
  ringfit: "Fit",
  profile: "Profile",
  designdetail: "Edge Detail",
  length: "Length",
  braceletsize: "Length",
  braceletlength: "Length",
  necklacelength: "Length",
  chainlength: "Length",
  earringlength: "Length",
  width: "Width",
  bandwidth: "Band Width",
  shankwidth: "Band Width",
  clasptype: "Clasp",
  clasp: "Clasp",
  closure: "Closure",
  backingtype: "Backing",
  surfacefinish: "Finish",
  finish: "Finish",
  weight: "Weight",
  totalcaratweight: "Carat Weight",
  caratweight: "Carat Weight",
  totaldiamondweight: "Diamond Weight",
  "clarity,color::ctw": "Diamond Details",
};

interface PurityGroup {
  purity: string;
  purityOrder: number;
  metals: Array<{
    raw: string;
    color: string;
    colorOrder: number;
    swatch: string;
  }>;
}

interface ActiveConfigStep {
  id: string;
  label: string;
  options: Array<{ value: string; label: string; sampleSku: string }>;
  activeValue: string | null;
}

export function PieceDetailModal({
  group,
  initialSku = null,
  autoRevealSku = false,
  onClose,
}: PieceDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pointerDownOnBackdropRef = useRef(false);
  const displayedImageSrcRef = useRef("");
  const titleId = useId();

  const [resolvedGroup, setResolvedGroup] = useState<CatalogItemGroup | null>(
    null
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [defaultOpenSku, setDefaultOpenSku] = useState<string>("");
  const [hasPickedMetal, setHasPickedMetal] = useState(false);
  const [pickedSteps, setPickedSteps] = useState<Record<string, boolean>>({});
  const [displayedImageSrc, setDisplayedImageSrc] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!group) {
      setResolvedGroup(null);
      setLoadingDetails(false);
      displayedImageSrcRef.current = "";
      setDisplayedImageSrc("");
      setImageLoading(false);
      if (dialog.open) {
        dialog.close();
      }
      return;
    }

    const targetSku =
      initialSku && group.variants.some((v) => v.supplierSku === initialSku)
        ? initialSku
        : group.defaultVariant.supplierSku;
    const initialVariant =
      group.variants.find((v) => v.supplierSku === targetSku) ??
      group.defaultVariant;
    const initialImg =
      initialVariant.images[0]?.fullUrl ||
      initialVariant.images[0]?.thumbnailUrl ||
      "";
    setResolvedGroup(group);
    setSelectedSku(targetSku);
    setDefaultOpenSku(targetSku);
    setHasPickedMetal(true);
    setPickedSteps({ __all__: true });
    displayedImageSrcRef.current = initialImg;
    setDisplayedImageSrc(initialImg);
    setImageLoading(false);

    if (!dialog.open) {
      dialog.showModal();
    }

    // Hydrate full variant list scoped to this exact (groupCode, primaryStone)
    const controller = new AbortController();
    const qs = new URLSearchParams();
    if (group.groupCode) {
      qs.set("groupCode", group.groupCode);
      qs.set(
        "stone",
        group.defaultVariant.primaryStone
          ? group.defaultVariant.primaryStone
          : "__none__"
      );
    } else {
      qs.set("sku", targetSku);
    }
    qs.set("sku", targetSku);

    setLoadingDetails(true);
    fetch(`/api/catalog/group?${qs.toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { group?: CatalogItemGroup | null } | null) => {
        if (data?.group && !controller.signal.aborted) {
          setResolvedGroup(data.group);
          // Guard against >150-variant groups where targetSku wasn't in the hydrated slice
          const hasTarget = data.group.variants.some(
            (v) => v.supplierSku === targetSku
          );
          if (!hasTarget) {
            const fallbackSku = data.group.defaultVariant.supplierSku;
            setDefaultOpenSku(fallbackSku);
            setSelectedSku(fallbackSku);
          }
        }
      })
      .catch(() => {
        // Keep initial card group gracefully if offline or in demo mode
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingDetails(false);
        }
      });

    return () => controller.abort();
  }, [group, initialSku, autoRevealSku]);

  const activeGroup = resolvedGroup ?? group;
  const activeVariant =
    activeGroup?.variants.find((v) => v.supplierSku === selectedSku) ??
    activeGroup?.defaultVariant ??
    null;

  // 1. Group metals cleanly into Purity -> Color two-step structure
  // 2. Dynamically compute cascading configurator steps for every dimension that varies
  const {
    purityGroups,
    activePurityGroup,
    totalDistinctMetals,
    variantsForSelectedMetal,
    activeSteps,
  } = useMemo(() => {
    const variants = activeGroup?.variants ?? [];
    const byPurity = new Map<string, PurityGroup>();
    const seenRawMetals = new Set<string>();

    for (const v of variants) {
      const parsed = parseMetalPurityAndColor(v.metalType);
      if (seenRawMetals.has(parsed.raw)) continue;
      seenRawMetals.add(parsed.raw);

      const existing = byPurity.get(parsed.purity);
      const entry = {
        raw: parsed.raw,
        color: parsed.color,
        colorOrder: parsed.colorOrder,
        swatch: parsed.swatch,
      };
      if (existing) {
        existing.metals.push(entry);
      } else {
        byPurity.set(parsed.purity, {
          purity: parsed.purity,
          purityOrder: parsed.purityOrder,
          metals: [entry],
        });
      }
    }

    const sortedGroups = Array.from(byPurity.values())
      .sort((a, b) => a.purityOrder - b.purityOrder)
      .map((g) => ({
        ...g,
        metals: g.metals.sort((a, b) => {
          if (a.colorOrder !== b.colorOrder) return a.colorOrder - b.colorOrder;
          return a.raw.localeCompare(b.raw);
        }),
      }));

    const activeMetalRaw = (activeVariant?.metalType ?? "").trim() || "Standard";
    const activeParsed = parseMetalPurityAndColor(activeMetalRaw);
    const activePG =
      sortedGroups.find((g) => g.purity === activeParsed.purity) ??
      sortedGroups[0] ??
      null;

    const matchingMetal = variants.filter(
      (v) => ((v.metalType ?? "").trim() || "Standard") === activeMetalRaw
    );

    // Cascade through CONFIG_DIMENSIONS so each varying attribute gets its own clean selector
    const steps: ActiveConfigStep[] = [];
    let pool = matchingMetal;

    for (const dim of CONFIG_DIMENSIONS) {
      if (pool.length <= 1) break;
      const valueToVariant = new Map<string, CatalogVariant>();
      let hasNullVariant = false;
      for (const v of pool) {
        const val = getDimValue(v, dim.keys);
        if (val) {
          if (!valueToVariant.has(val)) {
            valueToVariant.set(val, v);
          }
        } else {
          hasNullVariant = true;
        }
      }
      // If mixed valued + null variants exist, include a Standard bucket so no variant becomes unreachable
      if (hasNullVariant && valueToVariant.size > 0) {
        const nullVar = pool.find((v) => !getDimValue(v, dim.keys));
        if (nullVar && !valueToVariant.has("Standard")) {
          valueToVariant.set("Standard", nullVar);
        }
      }
      if (valueToVariant.size > 1) {
        const sortedValues = Array.from(valueToVariant.keys()).sort((a, b) => {
          if (a === "Standard") return 1;
          if (b === "Standard") return -1;
          return dim.numericSort
            ? compareSizeOrLength(a, b)
            : a.localeCompare(b);
        });
        const currentVal = activeVariant
          ? (getDimValue(activeVariant, dim.keys) ??
            (hasNullVariant ? "Standard" : null))
          : null;
        const effectiveVal =
          currentVal && valueToVariant.has(currentVal)
            ? currentVal
            : sortedValues[0];

        steps.push({
          id: dim.id,
          label: dim.label,
          options: sortedValues.map((val) => ({
            value: val,
            label: val,
            sampleSku: valueToVariant.get(val)!.supplierSku,
          })),
          activeValue: effectiveVal,
        });

        // Narrow pool for downstream steps (e.g., picking Oval narrows Center Stone Size to Oval sizes)
        pool = pool.filter((v) => {
          const vVal =
            getDimValue(v, dim.keys) ?? (hasNullVariant ? "Standard" : null);
          return vVal === effectiveVal;
        });
      }
    }

    // Rare fallback: if >1 variant still remains after all named dimensions, disambiguate cleanly
    if (pool.length > 1) {
      const seenLabels = new Map<string, number>();
      const opts = pool.map((v, idx) => {
        const base = getFallbackOptionLabel(v, idx);
        const count = (seenLabels.get(base) ?? 0) + 1;
        seenLabels.set(base, count);
        return {
          value: v.supplierSku,
          label: count > 1 ? `${base} (${count})` : base,
          sampleSku: v.supplierSku,
        };
      });
      steps.push({
        id: "__variant__",
        label: "Style Option",
        options: opts,
        activeValue:
          activeVariant &&
          pool.some((v) => v.supplierSku === activeVariant.supplierSku)
            ? activeVariant.supplierSku
            : pool[0].supplierSku,
      });
    }

    return {
      purityGroups: sortedGroups,
      activePurityGroup: activePG,
      totalDistinctMetals: seenRawMetals.size,
      variantsForSelectedMetal: matchingMetal,
      activeSteps: steps,
    };
  }, [activeGroup, activeVariant]);

  const needsMetalChoice = totalDistinctMetals > 1;
  const isMetalReady = !needsMetalChoice || hasPickedMetal;
  const isStepPicked = (stepId: string) =>
    Boolean(pickedSteps.__all__ || pickedSteps[stepId]);
  const allStepsReady = activeSteps.every((s) => isStepPicked(s.id));
  const isConfigured = isMetalReady && allStepsReady;

  function selectMetalRaw(metalRaw: string) {
    if (!activeGroup) return;
    const candidates = activeGroup.variants.filter(
      (v) => ((v.metalType ?? "").trim() || "Standard") === metalRaw
    );
    if (candidates.length === 0) return;

    // Try to preserve as many currently selected dimension values as possible
    let bestPool = candidates;
    for (const step of activeSteps) {
      if (step.id === "__variant__") continue;
      const dim = CONFIG_DIMENSIONS.find((d) => d.id === step.id);
      if (!dim || !step.activeValue) continue;
      const matching = bestPool.filter(
        (v) => getDimValue(v, dim.keys) === step.activeValue
      );
      if (matching.length > 0) {
        bestPool = matching;
      }
    }

    setSelectedSku(bestPool[0].supplierSku);
    setHasPickedMetal(true);
    setPickedSteps({ __all__: true });
  }

  function handleSelectPurity(purityGroup: PurityGroup) {
    if (!activeVariant) return;
    const currentColor = parseMetalPurityAndColor(activeVariant.metalType).color;
    const matchedColor =
      purityGroup.metals.find((m) => m.color === currentColor) ??
      purityGroup.metals[0];
    if (matchedColor) {
      selectMetalRaw(matchedColor.raw);
    }
  }

  function handleSelectStepOption(stepIndex: number, chosenValue: string) {
    const step = activeSteps[stepIndex];
    if (!step) return;

    if (step.id === "__variant__") {
      setSelectedSku(chosenValue);
      setPickedSteps((prev) => ({ ...prev, __variant__: true }));
      return;
    }

    let pool = variantsForSelectedMetal;
    for (let i = 0; i < stepIndex; i++) {
      const prevStep = activeSteps[i];
      const dim = CONFIG_DIMENSIONS.find((d) => d.id === prevStep.id);
      if (dim && prevStep.activeValue) {
        const narrowed = pool.filter(
          (v) => getDimValue(v, dim.keys) === prevStep.activeValue
        );
        if (narrowed.length > 0) pool = narrowed;
      }
    }

    const currentDim = CONFIG_DIMENSIONS.find((d) => d.id === step.id);
    if (currentDim) {
      const narrowed = pool.filter(
        (v) => getDimValue(v, currentDim.keys) === chosenValue
      );
      if (narrowed.length > 0) pool = narrowed;
    }

    const nextPicked: Record<string, boolean> = {};
    for (let i = 0; i < stepIndex; i++) {
      if (isStepPicked(activeSteps[i].id)) {
        nextPicked[activeSteps[i].id] = true;
      }
    }
    nextPicked[step.id] = true;

    for (let i = stepIndex + 1; i < activeSteps.length; i++) {
      const laterStep = activeSteps[i];
      const dim = CONFIG_DIMENSIONS.find((d) => d.id === laterStep.id);
      if (dim && laterStep.activeValue) {
        const narrowed = pool.filter(
          (v) => getDimValue(v, dim.keys) === laterStep.activeValue
        );
        if (narrowed.length > 0) {
          pool = narrowed;
          if (isStepPicked(laterStep.id)) {
            nextPicked[laterStep.id] = true;
          }
        }
      }
    }

    setSelectedSku(pool[0].supplierSku);
    setPickedSteps({ __all__: true });
  }

  function handleBackdropPointerDown(e: React.PointerEvent<HTMLDialogElement>) {
    pointerDownOnBackdropRef.current = e.target === dialogRef.current;
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current && pointerDownOnBackdropRef.current) {
      dialogRef.current?.close();
    }
    pointerDownOnBackdropRef.current = false;
  }

  const primaryImage = activeVariant?.images[0];
  const imageSrc = primaryImage?.fullUrl || primaryImage?.thumbnailUrl || "";

  // Smooth blur-out -> preload -> unblur-in whenever the selected option changes the photo
  useEffect(() => {
    if (!imageSrc) {
      displayedImageSrcRef.current = "";
      setDisplayedImageSrc("");
      setImageLoading(false);
      return;
    }
    if (!displayedImageSrcRef.current) {
      displayedImageSrcRef.current = imageSrc;
      setDisplayedImageSrc(imageSrc);
      setImageLoading(false);
      return;
    }
    if (imageSrc === displayedImageSrcRef.current) {
      setImageLoading(false);
      return;
    }

    let cancelled = false;
    setImageLoading(true);

    const preloader = new window.Image();
    const commitSwap = () => {
      if (cancelled) return;
      displayedImageSrcRef.current = imageSrc;
      setDisplayedImageSrc(imageSrc);
      window.requestAnimationFrame(() => {
        if (!cancelled) {
          setImageLoading(false);
        }
      });
    };

    preloader.onload = () => {
      if (typeof preloader.decode === "function") {
        preloader.decode().then(commitSwap).catch(commitSwap);
      } else {
        commitSwap();
      }
    };
    preloader.onerror = () => {
      if (!cancelled) {
        displayedImageSrcRef.current = imageSrc;
        setDisplayedImageSrc(imageSrc);
        setImageLoading(false);
      }
    };
    preloader.src = imageSrc;

    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  // Exclude any spec already shown as an interactive configurator step above
  const configuredSpecLabels = new Set<string>();
  if (needsMetalChoice) configuredSpecLabels.add("Metal");
  for (const step of activeSteps) {
    configuredSpecLabels.add(step.label);
    if (step.id === "fit") configuredSpecLabels.add("Fit");
    if (step.id === "profile") configuredSpecLabels.add("Profile");
    if (step.id === "width") configuredSpecLabels.add("Band Width");
    if (step.id === "clasp") {
      configuredSpecLabels.add("Clasp");
      configuredSpecLabels.add("Closure");
      configuredSpecLabels.add("Backing");
    }
    if (step.id === "carat") {
      configuredSpecLabels.add("Carat Weight");
      configuredSpecLabels.add("Diamond Weight");
      configuredSpecLabels.add("Diamond Details");
    }
    if (step.id === "stoneShape") configuredSpecLabels.add("Stone Shape");
    if (step.id === "stoneSize") configuredSpecLabels.add("Stone Size");
  }

  const specEntries: Array<[string, string]> = [];
  const seenSpecLabels = new Set<string>();
  for (const [rawKey, val] of Object.entries(activeVariant?.attributes ?? {})) {
    if (val === null || val === undefined || String(val).trim() === "") continue;
    const normalizedKey = rawKey.toLowerCase().replace(/[\s._-]+/g, "");
    const friendlyLabel =
      CONSUMER_SPEC_LABELS[normalizedKey] ??
      CONSUMER_SPEC_LABELS[rawKey.toLowerCase().replace(/\s+/g, "")];
    if (
      !friendlyLabel ||
      seenSpecLabels.has(friendlyLabel) ||
      configuredSpecLabels.has(friendlyLabel)
    ) {
      continue;
    }
    seenSpecLabels.add(friendlyLabel);
    specEntries.push([friendlyLabel, String(val).trim()]);
  }

  const showSingleMetalSpec = Boolean(activeVariant?.metalType && !needsMetalChoice);
  const hasBottomSpecs =
    showSingleMetalSpec ||
    Boolean(activeVariant?.primaryStone) ||
    specEntries.length > 0;

  const configuredSummary = activeVariant
    ? [
        activeVariant.metalType,
        ...activeSteps
          .filter((s) => s.activeValue)
          .map((s) =>
            s.id === "__variant__"
              ? s.options.find((o) => o.value === s.activeValue)?.label ?? null
              : `${s.label}: ${s.activeValue}`
          ),
      ]
        .filter(Boolean)
        .join(" • ")
    : "";

  const remainingSteps = [
    ...(needsMetalChoice && !isMetalReady ? ["Metal"] : []),
    ...activeSteps.filter((s) => !isStepPicked(s.id)).map((s) => s.label),
  ];

  const remainingPrompt =
    remainingSteps.length === 0
      ? ""
      : remainingSteps.length === 1
        ? `Choose ${remainingSteps[0]} for Item #`
        : `Choose ${remainingSteps.slice(0, -1).join(", ")} & ${remainingSteps[remainingSteps.length - 1]} for Item #`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onPointerDown={handleBackdropPointerDown}
      onClick={handleBackdropClick}
      className="catalog-dialog"
      {...({ closedby: "any" } as Record<string, string>)}
    >
      {activeGroup && activeVariant && (
        <div className="relative bg-[#faf7f1]">
          {/* Minimal Luxury Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-obsidian/8 bg-[#faf7f1]/95 px-6 py-4 backdrop-blur-md sm:px-8 sm:py-5">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate font-serif text-2xl font-semibold tracking-tight text-obsidian sm:text-3xl"
              >
                {activeVariant.title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {defaultOpenSku &&
                activeVariant.supplierSku !== defaultOpenSku && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSku(defaultOpenSku);
                      setHasPickedMetal(true);
                      setPickedSteps({ __all__: true });
                      closeButtonRef.current?.focus();
                    }}
                    aria-label="Reset to original configuration"
                    className="inline-flex items-center gap-1.5 rounded-full border border-obsidian/15 bg-[#f2ede4] px-3.5 py-2 text-xs font-medium text-obsidian transition-colors hover:border-obsidian"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                )}

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-obsidian/12 bg-[#f2ede4] text-ink-secondary transition-colors hover:border-obsidian hover:text-obsidian"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* 2-Column Calm Editorial Layout */}
          <div className="grid gap-8 p-6 md:grid-cols-12 md:items-start sm:p-8">
            {/* Left: Crisp Pure White Studio Pedestal with Blur-to-Clear Transition */}
            <div className="md:sticky md:top-24 md:col-span-6">
              <div className="relative overflow-hidden rounded-card border border-obsidian/10 bg-white p-6 sm:p-8">
                {displayedImageSrc ? (
                  <img
                    src={displayedImageSrc}
                    alt={`${activeVariant.title} in ${activeVariant.metalType ?? "precious metal"}`}
                    width={640}
                    height={640}
                    className={`aspect-square h-full w-full object-contain transition-all duration-300 ease-out will-change-[filter,opacity,transform] motion-reduce:transition-none ${
                      imageLoading
                        ? "scale-[0.98] opacity-60 blur-md"
                        : "scale-100 opacity-100 blur-0"
                    }`}
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-xs uppercase tracking-widest text-ink-muted">
                    No Image
                  </div>
                )}
              </div>
            </div>

            {/* Right: Calm, Uncluttered Personalization Controls */}
            <div className="flex min-w-0 flex-col space-y-6 md:col-span-6">
              {/* Two-Step Metal Picker (Purity -> Color) */}
              {needsMetalChoice && (
                <div className="space-y-5">
                  {purityGroups.length > 1 && (
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                        Metal
                      </span>

                      <div
                        role="group"
                        aria-label="Select metal purity"
                        className="mt-2.5 flex flex-wrap gap-2"
                      >
                        {purityGroups.map((pg) => {
                          const isSelected =
                            isMetalReady &&
                            activePurityGroup?.purity === pg.purity;
                          const pillLabel =
                            pg.metals.length === 1 &&
                            pg.metals[0].raw !== pg.purity
                              ? pg.metals[0].raw
                              : pg.purity;
                          return (
                            <button
                              key={pg.purity}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => handleSelectPurity(pg)}
                              className={`rounded-pill border px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                                isSelected
                                  ? "border-obsidian bg-obsidian text-canvas shadow-xs"
                                  : "border-obsidian/12 bg-[#f2ede4]/75 text-obsidian hover:border-gold hover:bg-[#f2ede4]"
                              }`}
                            >
                              {pillLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activePurityGroup &&
                    (activePurityGroup.metals.length > 1 ||
                      purityGroups.length === 1) && (() => {
                      // Count color occurrences so duplicate colors (e.g. "14K White Gold" & "14K X1 White Gold"
                      // or "Sterling Silver" & "Continuum Sterling Silver") always display their full distinct names.
                      const colorCounts = new Map<string, number>();
                      for (const m of activePurityGroup.metals) {
                        colorCounts.set(m.color, (colorCounts.get(m.color) ?? 0) + 1);
                      }
                      const isSilverOrNaturalOnly = activePurityGroup.metals.every(
                        (m) => m.color === "Silver / Natural"
                      );

                      return (
                        <div>
                          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                            {purityGroups.length > 1
                              ? isSilverOrNaturalOnly
                                ? "Finish / Alloy"
                                : "Color"
                              : "Metal"}
                          </span>

                          <div
                            role="group"
                            aria-label="Select metal variation"
                            className="mt-2.5 flex flex-wrap gap-2"
                          >
                            {activePurityGroup.metals.map((m) => {
                              const isSelected =
                                isMetalReady &&
                                ((activeVariant.metalType ?? "").trim() ||
                                  "Standard") === m.raw;
                              const hasDuplicateColor =
                                (colorCounts.get(m.color) ?? 0) > 1;
                              const useShortColor =
                                purityGroups.length > 1 &&
                                activePurityGroup.metals.length > 1 &&
                                m.color !== "Silver / Natural" &&
                                !hasDuplicateColor;
                              const label = useShortColor ? m.color : m.raw;

                              return (
                                <button
                                  key={m.raw}
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={() => selectMetalRaw(m.raw)}
                                  className={`inline-flex items-center gap-2 rounded-pill border px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                                    isSelected
                                      ? "border-obsidian bg-obsidian text-canvas shadow-xs"
                                      : "border-obsidian/12 bg-[#f2ede4]/75 text-obsidian hover:border-gold hover:bg-[#f2ede4]"
                                  }`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="h-3 w-3 shrink-0 rounded-full border border-obsidian/20"
                                    style={{ background: m.swatch }}
                                  />
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                </div>
              )}

              {/* Dynamic Cascading Attribute Steps */}
              {activeSteps.map((step, idx) => {
                const picked = isStepPicked(step.id);

                return (
                  <div key={step.id}>
                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                      {step.label}
                    </span>

                    <div
                      role="group"
                      aria-label={`Select ${step.label}`}
                      className="mt-2.5 flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1"
                    >
                      {step.options.map((opt) => {
                        const isSelected =
                          picked && step.activeValue === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() =>
                              handleSelectStepOption(idx, opt.value)
                            }
                            className={`rounded-pill border px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                              isSelected
                                ? "border-obsidian bg-obsidian text-canvas shadow-xs"
                                : "border-obsidian/12 bg-[#f2ede4]/75 text-obsidian hover:border-gold hover:bg-[#f2ede4]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Always-Visible Item Number Plaque */}
              <div className="pt-1" aria-live="polite" aria-atomic="true">
                <div className="rounded-card border border-gold/60 bg-[#f2e8d4] px-5 py-4">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
                    Item Number
                  </span>
                  <motion.span
                    key={activeVariant.supplierSku}
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="mt-1 block select-all break-all font-mono text-lg font-semibold tracking-tight text-obsidian"
                  >
                    {activeVariant.supplierSku}
                  </motion.span>
                </div>
              </div>

              {/* Quiet, Deduplicated Details */}
              {hasBottomSpecs && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-obsidian/10 pt-5 text-xs">
                  {showSingleMetalSpec && activeVariant.metalType && (
                    <div>
                      <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                        Metal
                      </dt>
                      <dd className="mt-0.5 font-medium text-obsidian">
                        {activeVariant.metalType}
                      </dd>
                    </div>
                  )}
                  {activeVariant.primaryStone && (
                    <div>
                      <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                        Stone
                      </dt>
                      <dd className="mt-0.5 font-medium text-obsidian">
                        {activeVariant.primaryStone}
                      </dd>
                    </div>
                  )}
                  {specEntries.slice(0, 6).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                        {key}
                      </dt>
                      <dd className="mt-0.5 font-medium text-obsidian">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
