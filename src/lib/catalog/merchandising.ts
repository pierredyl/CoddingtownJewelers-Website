import type { CatalogItemGroup } from "@/types/catalog";

type LuxuryTier = 1 | 2 | 3;

const HIGH_LUXURY_STONES =
  /\b(natural diamond|diamond|emerald|sapphire|ruby|tanzanite|alexandrite)\b/i;

const STATEMENT_TITLE =
  /\b(halo|three[- ]stone|3[- ]stone|eternity|anniversary|tennis|line bracelet|cluster|statement|cocktail|inside[- ]outside|double row|bypass|bezel)\b/i;

const STYLE_PATTERNS: Array<[string, RegExp]> = [
  ["solitaire", /\bsolitaire\b/i],
  ["halo", /\bhalo\b/i],
  ["three-stone", /\b(three[- ]stone|3[- ]stone)\b/i],
  ["eternity", /\beternity\b/i],
  ["anniversary", /\banniversary\b/i],
  ["signet", /\bsignet\b/i],
  ["stackable", /\bstackable\b/i],
  ["bypass", /\bbypass\b/i],
  ["rope", /\brope\b/i],
  ["curb", /\bcurb\b/i],
  ["cable", /\bcable\b/i],
  ["box", /\bbox\b/i],
  ["figaro", /\bfigaro\b/i],
  ["herringbone", /\bherringbone\b/i],
  ["paperclip", /\bpaperclip\b/i],
  ["pendant", /\bpendant\b/i],
  ["cross", /\bcross\b/i],
  ["heart", /\bheart\b/i],
  ["tennis", /\b(tennis|line)\b/i],
  ["bangle", /\b(bangle|cuff)\b/i],
  ["stud", /\bstud\b/i],
  ["hoop", /\b(hoop|huggie)\b/i],
  ["drop", /\b(drop|dangle)\b/i],
  ["classic-band", /\b(half round|flat|comfort-fit|square band|knife)\b/i],
];

function classifyLuxuryTier(group: CatalogItemGroup): LuxuryTier {
  const v = group.defaultVariant;
  const allMetals = group.variants.map((x) => (x.metalType ?? "").toLowerCase());
  const hasPlatinumOr18K = allMetals.some(
    (m) => m.includes("platinum") || m.includes("18k") || m.includes("22k")
  );
  const has14K = allMetals.some((m) => m.includes("14k"));
  const hasPreciousStone = Boolean(
    v.primaryStone && HIGH_LUXURY_STONES.test(v.primaryStone)
  );
  const isStatement = STATEMENT_TITLE.test(group.title);

  // Tier 3: Aspirational / High-Luxury centerpiece
  if (
    (hasPlatinumOr18K && (hasPreciousStone || isStatement)) ||
    (hasPreciousStone && isStatement)
  ) {
    return 3;
  }

  // Tier 2: Mid-tier fine jewelry
  if (hasPlatinumOr18K || hasPreciousStone || (has14K && isStatement)) {
    return 2;
  }

  // Tier 1: Classic everyday essential
  return 1;
}

function getStyleSignature(group: CatalogItemGroup): string {
  const title = group.title.toLowerCase();
  for (const [tag, rx] of STYLE_PATTERNS) {
    if (rx.test(title)) {
      const stone = (group.defaultVariant.primaryStone ?? "metal")
        .toLowerCase()
        .replace(/^natural\s+/, "");
      return `${tag}:${stone}`;
    }
  }
  // Fallback to first 3 meaningful words of title
  const words = title
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .join("-");
  return words || group.groupKey;
}

function getTitleKey(group: CatalogItemGroup): string {
  return group.title.trim().toLowerCase();
}

/**
 * Deterministically orders a page of catalog groups for boutique merchandising:
 * - Interleaves everyday essentials (Tier 1), fine mid-tier (Tier 2), and
 *   aspirational high-luxury pieces (Tier 3) in a balanced 4-card rhythm
 *   `[Tier 1, Tier 3, Tier 2, Tier 3/1]` so every row feels varied and elevated.
 * - Prevents the same title or style silhouette from repeating back-to-back
 *   whenever another distinct style is available in the batch.
 */
export function merchandiseCatalogGroups(
  groups: CatalogItemGroup[]
): CatalogItemGroup[] {
  if (groups.length <= 2) return groups;

  const buckets: Record<LuxuryTier, CatalogItemGroup[]> = {
    1: [],
    2: [],
    3: [],
  };

  for (const g of groups) {
    buckets[classifyLuxuryTier(g)].push(g);
  }

  // Balanced 4-card desktop row rhythm: Everyday -> High-Luxury -> Fine -> Variety
  const RHYTHM: LuxuryTier[] = [1, 3, 2, 3, 1, 2, 3, 2];
  const result: CatalogItemGroup[] = [];
  const recentTitles: string[] = [];
  const recentStyles: string[] = [];

  function pickFromBucket(tier: LuxuryTier): CatalogItemGroup | null {
    const list = buckets[tier];
    if (list.length === 0) return null;

    // 1st preference: different title AND different style from the last 2 cards
    let idx = list.findIndex((g) => {
      const tk = getTitleKey(g);
      const sk = getStyleSignature(g);
      return !recentTitles.includes(tk) && !recentStyles.includes(sk);
    });

    // 2nd preference: at least different title from the immediately preceding card
    if (idx === -1) {
      const lastTitle = recentTitles[recentTitles.length - 1];
      idx = list.findIndex((g) => getTitleKey(g) !== lastTitle);
    }

    if (idx === -1) idx = 0;
    const [picked] = list.splice(idx, 1);
    return picked;
  }

  let step = 0;
  while (
    buckets[1].length > 0 ||
    buckets[2].length > 0 ||
    buckets[3].length > 0
  ) {
    const preferredTier = RHYTHM[step % RHYTHM.length];
    const fallbackOrder: LuxuryTier[] =
      preferredTier === 3
        ? [3, 2, 1]
        : preferredTier === 2
          ? [2, 3, 1]
          : [1, 2, 3];

    let chosen: CatalogItemGroup | null = null;
    for (const tier of fallbackOrder) {
      chosen = pickFromBucket(tier);
      if (chosen) break;
    }
    if (!chosen) break;

    result.push(chosen);
    recentTitles.push(getTitleKey(chosen));
    if (recentTitles.length > 3) recentTitles.shift();
    recentStyles.push(getStyleSignature(chosen));
    if (recentStyles.length > 2) recentStyles.shift();
    step++;
  }

  return result;
}
