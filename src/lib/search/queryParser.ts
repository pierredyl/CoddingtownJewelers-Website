export interface SearchChip {
  id: string;
  kind:
    | "sku"
    | "initial"
    | "category"
    | "metal"
    | "stone"
    | "stone_none"
    | "sizable"
    | "length"
    | "ring_size";
  label: string;
  /** Original matched substring(s) to strip when the user clicks × */
  removePattern: string;
}

export interface SearchTypoCorrection {
  from: string;
  to: string;
}

export interface ParsedSearchQuery {
  raw: string;
  mode: "sku" | "general";
  skuQuery: string | null;
  textQuery: string;
  initialLetter: string | null;
  categorySlugs: string[];
  metalPattern: string | null;
  stonePattern: string | null;
  stoneNone: boolean;
  sizable: boolean;
  length: string | null;
  ringSize: string | null;
  chips: SearchChip[];
  corrections: SearchTypoCorrection[];
}

// Curated jewelry vocabulary for fast deterministic typo correction
const JEWELRY_VOCABULARY = [
  // Categories
  "ring",
  "rings",
  "engagement",
  "wedding",
  "band",
  "bands",
  "necklace",
  "necklaces",
  "pendant",
  "pendants",
  "chain",
  "chains",
  "earring",
  "earrings",
  "stud",
  "studs",
  "hoop",
  "hoops",
  "bracelet",
  "bracelets",
  "bangle",
  "bangles",
  "initial",
  "initials",
  "letter",
  "monogram",
  // Metals
  "gold",
  "yellow",
  "white",
  "rose",
  "platinum",
  "silver",
  "sterling",
  // Gemstones
  "diamond",
  "diamonds",
  "sapphire",
  "emerald",
  "ruby",
  "amethyst",
  "aquamarine",
  "opal",
  "pearl",
  "topaz",
  "garnet",
  "peridot",
  "citrine",
  "tanzanite",
  "morganite",
  "alexandrite",
  "onyx",
  "turquoise",
  "moissanite",
  "tourmaline",
  // Attributes & Styles
  "sizable",
  "resizable",
  "solitaire",
  "halo",
  "cathedral",
  "eternity",
  "tennis",
  "signet",
  "herringbone",
  "omega",
  "plain",
] as const;

const FILLER_WORDS = new Set([
  "with",
  "and",
  "or",
  "for",
  "a",
  "an",
  "the",
  "of",
  "that",
  "is",
  "are",
  "can",
  "be",
  "resized",
  "jewelry",
  "jewellery",
  "piece",
  "pieces",
  "letter",
  "monogram",
]);

const STONE_NAMES = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "amethyst",
  "aquamarine",
  "opal",
  "pearl",
  "topaz",
  "garnet",
  "peridot",
  "citrine",
  "tanzanite",
  "morganite",
  "alexandrite",
  "onyx",
  "turquoise",
  "moissanite",
  "tourmaline",
  "jade",
] as const;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function correctJewelryWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower.length < 4) return lower;
  if (lower === "sizeable") return "sizable";
  if ((JEWELRY_VOCABULARY as readonly string[]).includes(lower)) return lower;

  const maxDist = lower.length >= 7 ? 2 : 1;
  let best: string | null = null;
  let bestDist = maxDist + 1;

  for (const candidate of JEWELRY_VOCABULARY) {
    if (candidate[0] !== lower[0]) continue;
    const d = levenshtein(lower, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best ?? lower;
}

function formatStullerLength(numStr: string): string {
  const clean = numStr.trim().replace(/\s+/g, " ");
  if (clean.endsWith(".5")) {
    return `${clean.slice(0, -2)} 1/2 In`;
  }
  if (clean.endsWith(".25")) {
    return `${clean.slice(0, -3)} 1/4 In`;
  }
  if (clean.endsWith(".75")) {
    return `${clean.slice(0, -3)} 3/4 In`;
  }
  return `${clean} In`;
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Deterministic, zero-cost jewelry search parser (<1ms).
 * Detects direct/partial SKUs, fixes jewelry typos, extracts initial/letter queries,
 * maps consumer synonyms (e.g. tennis -> line bracelet), and extracts structured facets.
 */
export function parseCatalogSearchQuery(rawInput: string): ParsedSearchQuery {
  const raw = rawInput.trim();
  const empty: ParsedSearchQuery = {
    raw,
    mode: "general",
    skuQuery: null,
    textQuery: "",
    initialLetter: null,
    categorySlugs: [],
    metalPattern: null,
    stonePattern: null,
    stoneNone: false,
    sizable: false,
    length: null,
    ringSize: null,
    chips: [],
    corrections: [],
  };

  if (!raw) return empty;

  // 1. SKU fast-path (colon-delimited SKUs or alphanumeric item codes like CH1025 / 12720 / Q12345Y)
  const compact = raw.replace(/\s+/g, "");
  const isSkuQuery =
    compact.includes(":") ||
    /^[A-Za-z]{0,4}\d{3,}[A-Za-z0-9:-]*$/.test(compact);

  if (isSkuQuery && !/\s/.test(raw)) {
    return {
      ...empty,
      mode: "sku",
      skuQuery: raw,
      chips: [
        {
          id: "sku",
          kind: "sku",
          label: `Item #: ${raw.toUpperCase()}`,
          removePattern: raw,
        },
      ],
    };
  }

  // 2. Normalize punctuation and correct common jewelry typos token-by-token
  const corrections: SearchTypoCorrection[] = [];
  let working = raw
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  working = working
    .split(" ")
    .map((tok) => {
      if (!/^[A-Za-z]+$/.test(tok)) return tok;
      const fixed = correctJewelryWord(tok);
      if (fixed !== tok.toLowerCase()) {
        corrections.push({ from: tok, to: fixed });
      }
      return fixed;
    })
    .join(" ");

  const chips: SearchChip[] = [];

  // 3. Extract Initial / Letter BEFORE filler stripping so "letter A" and "letter I" are preserved!
  let initialLetter: string | null = null;
  const initialPatterns: RegExp[] = [
    /\b(?:letter|initial|monogram)\s+([a-z])\b/i,
    /\b([a-z])\s+(?:initial|letter|monogram)\b/i,
    // Exclude "a" and "i" unless paired with letter/initial/monogram above so "a necklace" is not "Initial: A"
    /(?:^|\s)([b-hj-z])\s+(?=(?:pendants?|necklaces?|charms?|earrings?|studs?)\b)/i,
  ];

  for (const rx of initialPatterns) {
    const match = working.match(rx);
    if (match) {
      initialLetter = match[1].toUpperCase();
      chips.push({
        id: "initial",
        kind: "initial",
        label: `Initial: ${initialLetter}`,
        removePattern: match[0].trim(),
      });
      working = working.replace(match[0], " ");
      break;
    }
  }

  // 4. Extract Length (e.g. "18 in", "7.5 in", "7 1/2 in", '20"')
  let length: string | null = null;
  const lengthMatch = working.match(
    /\b(\d{1,2}(?:\.\d+|\s+[13]\/[24])?)\s*(?:inches|inch|in\b|")/i
  );
  if (lengthMatch) {
    length = formatStullerLength(lengthMatch[1]);
    chips.push({
      id: "length",
      kind: "length",
      label: `Length: ${length}`,
      removePattern: lengthMatch[0],
    });
    working = working.replace(lengthMatch[0], " ");
  }

  // 5. Extract Ring Size (e.g. "size 7", "sz 6.5", "ring size 10")
  let ringSize: string | null = null;
  const sizeMatch = working.match(/\b(?:ring\s+)?(?:size|sz)\s*(\d{1,2}(?:\.5)?)\b/i);
  if (sizeMatch) {
    ringSize = sizeMatch[1];
    chips.push({
      id: "ring_size",
      kind: "ring_size",
      label: `Size ${ringSize}`,
      removePattern: sizeMatch[0],
    });
    working = working.replace(sizeMatch[0], " ");
  }

  // 6. Extract Sizable
  let sizable = false;
  const sizableMatch = working.match(/\b(sizable|resizable)\b/i);
  if (sizableMatch) {
    sizable = true;
    chips.push({
      id: "sizable",
      kind: "sizable",
      label: "Sizable",
      removePattern: sizableMatch[0],
    });
    working = working.replace(sizableMatch[0], " ");
  }

  // 7. Extract "No Stone" negation phrases
  let stoneNone = false;
  const noStoneMatch = working.match(
    /\b(no\s+stones?|without\s+stones?|metal\s+only|plain\s+metal)\b/i
  );
  if (noStoneMatch) {
    stoneNone = true;
    chips.push({
      id: "stone_none",
      kind: "stone_none",
      label: "No Stone",
      removePattern: noStoneMatch[0],
    });
    working = working.replace(noStoneMatch[0], " ");
  }

  // 8. Extract Metal (handles "14k gold" -> "14K%Gold" so Yellow/White/Rose 14K Gold all match!)
  let metalPattern: string | null = null;
  const metalRegexes: Array<{
    regex: RegExp;
    buildPattern: (m: RegExpMatchArray) => string;
    buildLabel: (m: RegExpMatchArray) => string;
  }> = [
    {
      regex: /\b(1[048]k)\s+(yellow|white|rose)\s+gold\b/i,
      buildPattern: (m) => `${m[1].toUpperCase()} ${titleCase(m[2])} Gold`,
      buildLabel: (m) => `${m[1].toUpperCase()} ${titleCase(m[2])} Gold`,
    },
    {
      regex: /\b(yellow|white|rose)\s+gold\b/i,
      buildPattern: (m) => `${titleCase(m[1])} Gold`,
      buildLabel: (m) => `${titleCase(m[1])} Gold`,
    },
    {
      regex: /\b(1[048]k)\s+gold\b/i,
      buildPattern: (m) => `${m[1].toUpperCase()}%Gold`,
      buildLabel: (m) => `${m[1].toUpperCase()} Gold`,
    },
    {
      regex: /\b(1[048]k)\b/i,
      buildPattern: (m) => `${m[1].toUpperCase()}`,
      buildLabel: (m) => `${m[1].toUpperCase()} Gold`,
    },
    {
      regex: /\b(sterling\s+silver)\b/i,
      buildPattern: () => "Sterling Silver",
      buildLabel: () => "Sterling Silver",
    },
    {
      regex: /\b(platinum)\b/i,
      buildPattern: () => "Platinum",
      buildLabel: () => "Platinum",
    },
    {
      regex: /\b(silver)\b/i,
      buildPattern: () => "Silver",
      buildLabel: () => "Silver",
    },
    {
      regex: /\b(gold)\b/i,
      buildPattern: () => "Gold",
      buildLabel: () => "Gold",
    },
  ];

  for (const m of metalRegexes) {
    const match = working.match(m.regex);
    if (match) {
      metalPattern = m.buildPattern(match);
      chips.push({
        id: "metal",
        kind: "metal",
        label: m.buildLabel(match),
        removePattern: match[0],
      });
      working = working.replace(match[0], " ");
      break;
    }
  }

  // 9. Extract Gemstone (unless stoneNone was specified)
  let stonePattern: string | null = null;
  if (!stoneNone) {
    for (const stone of STONE_NAMES) {
      const rx = new RegExp(`\\b(${stone}s?)\\b`, "i");
      const match = working.match(rx);
      if (match) {
        stonePattern = titleCase(stone);
        chips.push({
          id: "stone",
          kind: "stone",
          label: stonePattern,
          removePattern: match[0],
        });
        working = working.replace(match[0], " ");
        break;
      }
    }
  }

  // 10. Extract Category intent (and strip redundant parent words when specific style matched)
  let categorySlugs: string[] = [];
  const categoryRules: Array<{
    regex: RegExp;
    slugs: string[];
    label: string;
    stripRedundant?: RegExp;
  }> = [
    {
      regex: /\b(engagement\s+rings?)\b/i,
      slugs: ["engagement-rings"],
      label: "Engagement Rings",
    },
    {
      regex: /\b(wedding\s+bands?|anniversary\s+bands?|eternity\s+bands?|bands?)\b/i,
      slugs: ["wedding-bands"],
      label: "Wedding Bands",
    },
    {
      regex: /\b(rings?)\b/i,
      // Only include gemstone-jewelry when a gemstone was explicitly mentioned
      slugs: stonePattern
        ? ["engagement-rings", "wedding-bands", "fashion-rings", "gemstone-jewelry"]
        : ["engagement-rings", "wedding-bands", "fashion-rings"],
      label: "Rings",
    },
    {
      regex: /\b(necklaces?|pendants?|chains?)\b/i,
      slugs: ["necklaces-pendants"],
      label: "Necklaces & Pendants",
      stripRedundant: /\b(necklaces?)\b/gi,
    },
    {
      regex: /\b(hoops?|studs?|earrings?)\b/i,
      slugs: ["earrings"],
      label: "Earrings",
      stripRedundant: /\b(earrings?)\b/gi,
    },
    {
      regex: /\b(bangles?|cuffs?|bracelets?)\b/i,
      slugs: ["bracelets"],
      label: "Bracelets",
      stripRedundant: /\b(bracelets?)\b/gi,
    },
  ];

  for (const rule of categoryRules) {
    const match = working.match(rule.regex);
    if (match) {
      categorySlugs = rule.slugs;
      chips.push({
        id: "category",
        kind: "category",
        label: rule.label,
        removePattern: match[0],
      });
      const keepAsKeyword =
        /^(chains?|pendants?|studs?|hoops?|bangles?|cuffs?)$/i.test(match[0]);
      if (!keepAsKeyword) {
        working = working.replace(match[0], " ");
      } else if (rule.stripRedundant) {
        // e.g., "hoop earrings" -> keep "hoop", drop redundant "earrings"
        working = working.replace(rule.stripRedundant, " ");
      }
      break;
    }
  }

  // 11. Consumer -> Stuller synonym mapping
  // Stuller titles tennis bracelets as "Line Bracelet" (559 SKUs vs 0 "Tennis Bracelet")
  if (
    categorySlugs.includes("bracelets") &&
    /\btennis\b/i.test(working)
  ) {
    working = working.replace(/\btennis\b/gi, "line");
  }
  // If user searched an initial/letter, drop generic "pendant" when already scoped to necklaces-pendants
  // so both "Initial Pendant" and "Initial Necklace" match cleanly for that letter!
  if (initialLetter) {
    working = working.replace(/\b(initials?|pendants?|necklaces?)\b/gi, " ");
  }

  // 12. Clean leftover free-text keywords
  const remainingTokens = working
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((tok) => tok.length > 1 && !FILLER_WORDS.has(tok.toLowerCase()));

  const textQuery = remainingTokens.join(" ");

  return {
    raw,
    mode: "general",
    skuQuery: null,
    textQuery,
    initialLetter,
    categorySlugs,
    metalPattern,
    stonePattern,
    stoneNone,
    sizable,
    length,
    ringSize,
    chips,
    corrections,
  };
}

/**
 * Produces a relaxed version of a parsed query when the full combination returns 0 rows,
 * dropping the narrowest constraint first (`sizable` -> `length` -> `ringSize` -> metal karat -> free text).
 */
export function relaxParsedQuery(
  parsed: ParsedSearchQuery
): { relaxed: ParsedSearchQuery; droppedLabel: string } | null {
  if (parsed.mode === "sku") return null;

  if (parsed.sizable) {
    return {
      relaxed: { ...parsed, sizable: false },
      droppedLabel: "Sizable",
    };
  }
  if (parsed.length) {
    return {
      relaxed: { ...parsed, length: null },
      droppedLabel: `Length (${parsed.length})`,
    };
  }
  if (parsed.ringSize) {
    return {
      relaxed: { ...parsed, ringSize: null },
      droppedLabel: `Size ${parsed.ringSize}`,
    };
  }
  if (parsed.metalPattern && /\b1[048]K/i.test(parsed.metalPattern)) {
    return {
      relaxed: { ...parsed, metalPattern: "Gold" },
      droppedLabel: `specific karat (${parsed.metalPattern.replace("%", " ")})`,
    };
  }
  if (parsed.textQuery && parsed.chips.length > 0) {
    return {
      relaxed: { ...parsed, textQuery: "" },
      droppedLabel: `"${parsed.textQuery}"`,
    };
  }
  return null;
}
