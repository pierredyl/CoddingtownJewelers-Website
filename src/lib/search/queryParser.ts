export interface SearchChip {
  id: string;
  kind:
    | "sku"
    | "initial"
    | "category"
    | "audience"
    | "metal"
    | "stone"
    | "stone_none"
    | "stone_origin"
    | "stone_shape"
    | "finish"
    | "earring_size"
    | "pendant_chain"
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
  /** Hint when `gemstone-jewelry` is included alongside a specific piece intent */
  pieceType: "rings" | "earrings" | "necklaces" | "bracelets" | null;
  audience: "men" | "women" | null;
  metalPattern: string | null;
  /** True when user explicitly asked for solid/real gold or generic "gold" without plated/filled */
  excludePlated: boolean;
  stonePattern: string | null;
  /** Multiple candidate stones for birthstones (e.g. Oct -> Opal, Tourmaline) or color words (e.g. blue -> Sapphire, Topaz...) */
  stonePatterns: string[];
  stoneNone: boolean;
  stoneOrigin: "natural" | "lab-grown" | null;
  stoneShape: string | null;
  finish: string | null;
  widthTier: "narrow" | "wide" | null;
  earringSize: "small" | "medium" | "large" | null;
  pendantChain: "pendant-only" | "with-chain" | null;
  excludePendants: boolean;
  closurePattern: string | null;
  sizable: boolean;
  length: string | null;
  lengths: string[];
  ringSize: string | null;
  chips: SearchChip[];
  corrections: SearchTypoCorrection[];
}

// High-frequency everyday & phonetic typos that Damerau-Levenshtein dist-1 might miss
const EXPLICIT_TYPO_ALIASES: Record<string, string> = {
  sizeable: "sizable",
  neckless: "necklace",
  necklase: "necklace",
  neckace: "necklace",
  chane: "chain",
  chocker: "choker",
  chokar: "choker",
  engagment: "engagement",
  engagemnt: "engagement",
  solitare: "solitaire",
  dimond: "diamond",
  dimonds: "diamonds",
  saphire: "sapphire",
  saphires: "sapphires",
  emrald: "emerald",
  emeralds: "emerald",
  amathyst: "amethyst",
  turqoise: "turquoise",
  moisannite: "moissanite",
  platnum: "platinum",
  earing: "earring",
  earings: "earrings",
  braclet: "bracelet",
  braclets: "bracelets",
  bracellet: "bracelet",
  weddin: "wedding",
  ladys: "ladies",
  womans: "womens",
  dangly: "dangle",
  tanzanight: "tanzanite",
  morganight: "morganite",
  zircona: "zirconia",
  huggys: "huggies",
  ankelt: "anklet",
  bangel: "bangle",
  bangels: "bangles",
  rosegold: "rose gold",
  whitegold: "white gold",
  yellowgold: "yellow gold",
  labgrown: "lab grown",
  screwback: "screw back",
  screwbacks: "screw back",
};

// Curated jewelry vocabulary for deterministic typo correction
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
  "huggie",
  "huggies",
  "drop",
  "dangle",
  "leverback",
  "bracelet",
  "bracelets",
  "bangle",
  "bangles",
  "cuff",
  "cuffs",
  "anklet",
  "anklets",
  "charm",
  "charms",
  "locket",
  "lockets",
  "choker",
  "crucifix",
  "initial",
  "initials",
  "letter",
  "monogram",
  // Audience & Origin
  "mens",
  "womens",
  "gents",
  "ladies",
  "natural",
  "grown",
  "created",
  "cultured",
  "freshwater",
  "genuine",
  "birthstone",
  "birthstones",
  // Metals
  "gold",
  "yellow",
  "white",
  "rose",
  "platinum",
  "silver",
  "sterling",
  "titanium",
  "tungsten",
  "cobalt",
  "palladium",
  "vermeil",
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
  "zirconia",
  "moonstone",
  "quartz",
  // Chain link styles
  "rope",
  "box",
  "curb",
  "figaro",
  "cable",
  "snake",
  "wheat",
  "franco",
  "mariner",
  "paperclip",
  "cuban",
  "byzantine",
  "singapore",
  "anchor",
  "spiga",
  "rolo",
  "herringbone",
  "omega",
  "station",
  // Stone cuts & shapes
  "round",
  "oval",
  "princess",
  "cushion",
  "pear",
  "marquise",
  "radiant",
  "asscher",
  "heart",
  "baguette",
  "trillion",
  // Attributes, settings & motifs
  "sizable",
  "resizable",
  "solitaire",
  "halo",
  "cathedral",
  "eternity",
  "anniversary",
  "tennis",
  "signet",
  "plain",
  "cross",
  "bezel",
  "pave",
  "prong",
  "channel",
  "cluster",
  "milgrain",
  "engraved",
  "hammered",
  "brushed",
  "satin",
  "polished",
  "stackable",
  "stacking",
  "contour",
  "curved",
  "chevron",
  "comfort",
  "dome",
  "flat",
  "knife",
  "vintage",
  "classic",
  "modern",
  "dainty",
  "delicate",
  "bold",
  "heavy",
  "wide",
  "thin",
  "narrow",
  "thick",
  "chunky",
  "butterfly",
  "infinity",
  "medallion",
  "lariat",
  "strand",
  "climber",
  "crawler",
  "jacket",
  "adjustable",
] as const;

// Valid English / jewelry words that must NEVER be fuzzy-mutated into another word
const PROTECTED_WORDS = new Set([
  "station",
  "leather",
  "simple",
  "basic",
  "matte",
  "small",
  "large",
  "medium",
  "short",
  "screw",
  "hinged",
  "slider",
  "stretch",
  "beaded",
  "toggle",
  "cubic",
  "solid",
  "minimalist",
  "promise",
  "bridal",
  "pinky",
  "thumb",
  "religious",
  "floating",
  "everyday",
  "mother",
  "mothers",
  "daughter",
  "sister",
  "girlfriend",
  "boyfriend",
  "husband",
  "groom",
  "bride",
  "black",
  "green",
  "purple",
  "orange",
  "brown",
  "clear",
  "plated",
  "filled",
  "antique",
  "three",
  "stone",
  "stones",
  "guard",
  "french",
  "shaped",
  "january",
  "february",
  "march",
  "april",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

const FILLER_WORDS = new Set([
  "with",
  "and",
  "or",
  "for",
  "a",
  "an",
  "the",
  "of",
  "my",
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
  "simple",
  "basic",
  "minimalist",
  "everyday",
  "style",
  "cut",
  "shaped",
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
  "moonstone",
  "quartz",
] as const;

const BIRTHSTONE_MONTH_MAP: Record<string, { label: string; stones: string[] }> = {
  january: { label: "January (Garnet)", stones: ["Garnet"] },
  jan: { label: "January (Garnet)", stones: ["Garnet"] },
  february: { label: "February (Amethyst)", stones: ["Amethyst"] },
  feb: { label: "February (Amethyst)", stones: ["Amethyst"] },
  march: { label: "March (Aquamarine)", stones: ["Aquamarine"] },
  mar: { label: "March (Aquamarine)", stones: ["Aquamarine"] },
  april: { label: "April (Diamond)", stones: ["Diamond"] },
  apr: { label: "April (Diamond)", stones: ["Diamond"] },
  may: { label: "May (Emerald)", stones: ["Emerald"] },
  june: { label: "June (Pearl)", stones: ["Pearl", "Alexandrite"] },
  jun: { label: "June (Pearl)", stones: ["Pearl", "Alexandrite"] },
  july: { label: "July (Ruby)", stones: ["Ruby"] },
  jul: { label: "July (Ruby)", stones: ["Ruby"] },
  august: { label: "August (Peridot)", stones: ["Peridot"] },
  aug: { label: "August (Peridot)", stones: ["Peridot"] },
  september: { label: "September (Sapphire)", stones: ["Sapphire"] },
  sept: { label: "September (Sapphire)", stones: ["Sapphire"] },
  sep: { label: "September (Sapphire)", stones: ["Sapphire"] },
  october: { label: "October (Opal & Tourmaline)", stones: ["Opal", "Tourmaline"] },
  oct: { label: "October (Opal & Tourmaline)", stones: ["Opal", "Tourmaline"] },
  november: { label: "November (Citrine & Topaz)", stones: ["Citrine", "Topaz"] },
  nov: { label: "November (Citrine & Topaz)", stones: ["Citrine", "Topaz"] },
  december: {
    label: "December (Turquoise & Tanzanite)",
    stones: ["Turquoise", "Tanzanite", "Topaz"],
  },
  dec: {
    label: "December (Turquoise & Tanzanite)",
    stones: ["Turquoise", "Tanzanite", "Topaz"],
  },
};

const COLOR_STONE_MAP: Record<string, { label: string; stones: string[] }> = {
  blue: {
    label: "Blue Gemstones",
    stones: ["Sapphire", "Topaz", "Aquamarine", "Tanzanite", "Turquoise"],
  },
  green: {
    label: "Green Gemstones",
    stones: ["Emerald", "Peridot", "Tourmaline", "Jade"],
  },
  red: { label: "Red Gemstones", stones: ["Ruby", "Garnet"] },
  purple: { label: "Purple Gemstones", stones: ["Amethyst", "Tanzanite"] },
  pink: { label: "Pink Gemstones", stones: ["Morganite", "Tourmaline", "Sapphire"] },
  black: { label: "Black Gemstones", stones: ["Onyx", "Diamond"] },
  teal: { label: "Teal Gemstones", stones: ["Turquoise", "Aquamarine", "Topaz"] },
};

/**
 * Damerau-Levenshtein distance: treats adjacent character transpositions
 * (e.g. "peral" -> "pearl", "chian" -> "chain", "onxy" -> "onyx") as distance 1.
 */
function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    Array<number>(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        val = Math.min(val, d[i - 2][j - 2] + 1);
      }
      d[i][j] = val;
    }
  }
  return d[m][n];
}

function correctJewelryWord(word: string): string {
  const lower = word.toLowerCase();
  if (EXPLICIT_TYPO_ALIASES[lower]) return EXPLICIT_TYPO_ALIASES[lower];
  // Never fuzzy-mutate 4-letter or shorter English words (prevents half->halo, wife->wide, bolo->bold, wire->wide, hook->hoop)
  if (lower.length < 5) {
    // Allow exact 4-char transposition for very common 4-char stones (onxy -> onyx, ruyb -> ruby)
    if (lower === "onxy") return "onyx";
    return lower;
  }
  if (PROTECTED_WORDS.has(lower)) return lower;
  if ((JEWELRY_VOCABULARY as readonly string[]).includes(lower)) return lower;

  const maxDist = lower.length >= 8 ? 2 : 1;
  let best: string | null = null;
  let bestDist = maxDist + 1;

  for (const candidate of JEWELRY_VOCABULARY) {
    if (candidate[0] !== lower[0]) continue;
    const d = damerauLevenshtein(lower, candidate);
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
 * Detects direct/partial SKUs, fixes jewelry typos safely, extracts initial/letter queries,
 * maps everyday consumer language (birthstones, colors, cuts, finishes, sizes, negations),
 * and extracts structured facets for both sidebar marking and fast indexed DB queries.
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
    pieceType: null,
    audience: null,
    metalPattern: null,
    excludePlated: false,
    stonePattern: null,
    stonePatterns: [],
    stoneNone: false,
    stoneOrigin: null,
    stoneShape: null,
    finish: null,
    widthTier: null,
    earringSize: null,
    pendantChain: null,
    excludePendants: false,
    closurePattern: null,
    sizable: false,
    length: null,
    lengths: [],
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

  // 2. Normalize punctuation, karats, and correct common jewelry typos token-by-token
  const corrections: SearchTypoCorrection[] = [];
  let working = raw
    .replace(/[,;]+/g, " ")
    .replace(/\b(1[048])kt\b/gi, "$1k")
    .replace(/\b925\s+(?:sterling\s+)?silver\b/gi, "sterling silver")
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

  // 3. Extract Initial / Letter BEFORE filler stripping so "letter A" and "letter I" are preserved
  let initialLetter: string | null = null;
  const initialPatterns: RegExp[] = [
    /\b(?:letter|initial|monogram)\s+([a-z])\b/i,
    /\b([a-z])\s+(?:initial|letter|monogram)\b/i,
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
  const lengths: string[] = [];
  const lengthMatch = working.match(
    /\b(\d{1,2}(?:\.\d+|\s+[13]\/[24])?)\s*(?:inches|inch|in\b|")/i
  );
  if (lengthMatch) {
    length = formatStullerLength(lengthMatch[1]);
    lengths.push(length);
    chips.push({
      id: "length",
      kind: "length",
      label: `Length: ${length}`,
      removePattern: lengthMatch[0],
    });
    working = working.replace(lengthMatch[0], " ");
  }

  // 5. Extract Ring Size (preserve "ring" word so "ring size 7" still scopes to Rings!)
  let ringSize: string | null = null;
  const sizeMatch = working.match(/\b(?:size|sz)\s*(\d{1,2}(?:\.5)?)\b/i);
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

  // 6b. Extract Audience (Men's / Women's — including everyday terms like guy/husband/for him/for her/wife)
  let audience: "men" | "women" | null = null;
  const womenMatch = working.match(
    /\b(women['’]?s|womens|women|ladies|wife|girlfriend|bride|for\s+her|hers?)\b/i
  );
  const menMatch = working.match(
    /\b(men['’]?s|mens|men|gents?|guys?|male|husband|groom|boyfriend|for\s+him|his)\b/i
  );
  if (womenMatch) {
    audience = "women";
    chips.push({
      id: "audience",
      kind: "audience",
      label: "Women's",
      removePattern: womenMatch[0],
    });
    working = working.replace(womenMatch[0], " ");
  } else if (menMatch) {
    audience = "men";
    chips.push({
      id: "audience",
      kind: "audience",
      label: "Men's",
      removePattern: menMatch[0],
    });
    working = working.replace(menMatch[0], " ");
  }

  // 6c. Extract Chain / Pendant Exclusivity Negations BEFORE category extraction
  let excludePendants = false;
  let pendantChain: "pendant-only" | "with-chain" | null = null;
  const noPendantMatch = working.match(
    /\b(no\s+pendants?|without\s+pendants?|chain\s+only|bare\s+chain)\b/i
  );
  if (noPendantMatch) {
    excludePendants = true;
    working = working.replace(noPendantMatch[0], " chain ");
  }
  const pendantOnlyMatch = working.match(
    /\b(pendant\s+only|without\s+chains?|no\s+chains?)\b/i
  );
  if (pendantOnlyMatch) {
    pendantChain = "pendant-only";
    chips.push({
      id: "pendant_chain",
      kind: "pendant_chain",
      label: "Pendant Only",
      removePattern: pendantOnlyMatch[0],
    });
    working = working.replace(pendantOnlyMatch[0], " pendant ");
  }

  // 6d. Extract Stone Origin (Lab-Grown vs Natural, including "lab diamond" and "real diamond")
  let stoneOrigin: "natural" | "lab-grown" | null = null;
  const labMatch =
    working.match(
      /\b(lab[\s-]?grown|lab[\s-]?created|man[\s-]?made|synthetic)\b/i
    ) ??
    working.match(
      /\b(lab)\b(?=\s+(?:diamonds?|emeralds?|sapphires?|rub(?:y|ies)|stones?|gems?))/i
    );
  const naturalMatch =
    working.match(/\b(natural|earth[\s-]?mined|mined)\b/i) ??
    working.match(
      /\b(real|genuine|authentic)\b(?=\s+(?:diamonds?|emeralds?|sapphires?|rub(?:y|ies)|pearls?|opals?|stones?|gems?))/i
    );
  if (labMatch) {
    stoneOrigin = "lab-grown";
    chips.push({
      id: "stone_origin",
      kind: "stone_origin",
      label: "Lab-Grown",
      removePattern: labMatch[0],
    });
    working = working.replace(labMatch[0], " ");
  } else if (naturalMatch) {
    stoneOrigin = "natural";
    chips.push({
      id: "stone_origin",
      kind: "stone_origin",
      label: "Natural",
      removePattern: naturalMatch[0],
    });
    working = working.replace(naturalMatch[0], " ");
  }

  // 7. Extract "No Stone" / "No Diamond" negation phrases BEFORE gemstone extraction!
  let stoneNone = false;
  const noStoneMatch = working.match(
    /\b(?:no|without)\s+(?:stones?|diamonds?|gems?|gemstones?)\b|\b(?:metal\s+only|plain\s+metal|plain)\b/i
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

  // 7b. Extract Stone Cut / Shape BEFORE gemstone extraction (prevents "emerald cut" -> Emerald stone!)
  let stoneShape: string | null = null;
  const stoneCutMatch = working.match(
    /\b(emerald|princess|oval|cushion|pear|marquise|radiant|asscher|round|heart|trillion|baguette)\s+(?:cut|shaped?)\b/i
  );
  if (stoneCutMatch) {
    stoneShape = stoneCutMatch[1].toLowerCase();
    chips.push({
      id: "stone_shape",
      kind: "stone_shape",
      label: `${titleCase(stoneShape)} Cut`,
      removePattern: stoneCutMatch[0],
    });
    working = working.replace(stoneCutMatch[0], " ");
  }

  // 8. Extract Metal (including solid/real/pure prefix stripping + tungsten/titanium/palladium/cobalt/vermeil)
  let metalPattern: string | null = null;
  let excludePlated = false;
  const wantsPlated = /\b(plated|filled|vermeil)\b/i.test(working);
  const solidMetalPrefix = working.match(
    /\b(solid|real|pure)\b(?=\s+(?:1[048]k\s+)?(?:(?:yellow|white|rose)\s+)?(?:gold|silver|platinum))/i
  );
  if (solidMetalPrefix) {
    excludePlated = true;
    working = working.replace(solidMetalPrefix[0], " ");
  }

  const metalRegexes: Array<{
    regex: RegExp;
    buildPattern: (m: RegExpMatchArray) => string;
    buildLabel: (m: RegExpMatchArray) => string;
    solidDefault?: boolean;
  }> = [
    {
      regex: /\b(1[048]k)\s+(yellow|white|rose)\s+gold\b/i,
      buildPattern: (m) => `${m[1].toUpperCase()} ${titleCase(m[2])} Gold`,
      buildLabel: (m) => `${m[1].toUpperCase()} ${titleCase(m[2])} Gold`,
      solidDefault: true,
    },
    {
      regex: /\b(yellow|white|rose)\s+gold\b/i,
      buildPattern: (m) => `${titleCase(m[1])} Gold`,
      buildLabel: (m) => `${titleCase(m[1])} Gold`,
      solidDefault: true,
    },
    {
      regex: /\b(1[048]k)\s+gold\b/i,
      buildPattern: (m) => `${m[1].toUpperCase()}%Gold`,
      buildLabel: (m) => `${m[1].toUpperCase()} Gold`,
      solidDefault: true,
    },
    {
      regex: /\b(1[048]k)\b/i,
      buildPattern: (m) => `${m[1].toUpperCase()}`,
      buildLabel: (m) => `${m[1].toUpperCase()} Gold`,
      solidDefault: true,
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
      regex: /\b(palladium)\b/i,
      buildPattern: () => "Palladium",
      buildLabel: () => "Palladium",
    },
    {
      regex: /\b(tungsten)\b/i,
      buildPattern: () => "Tungsten",
      buildLabel: () => "Tungsten",
    },
    {
      regex: /\b(titanium)\b/i,
      buildPattern: () => "Titanium",
      buildLabel: () => "Titanium",
    },
    {
      regex: /\b(cobalt)\b/i,
      buildPattern: () => "Cobalt",
      buildLabel: () => "Cobalt",
    },
    {
      regex: /\b(vermeil)\b/i,
      buildPattern: () => "Vermeil",
      buildLabel: () => "Vermeil",
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
      solidDefault: true,
    },
  ];

  for (const m of metalRegexes) {
    const match = working.match(m.regex);
    if (match) {
      metalPattern = m.buildPattern(match);
      if (m.solidDefault && !wantsPlated) {
        excludePlated = true;
      }
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

  // 9. Extract Gemstone, Birthstone Month, CZ, or Color-Word -> Gemstone (unless stoneNone)
  let stonePattern: string | null = null;
  let stonePatterns: string[] = [];
  if (!stoneNone) {
    // 9a. Birthstone Month (e.g. "may birthstone ring", "july birthstone", "birthstone for october")
    const birthMatch =
      working.match(
        /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+birthstones?\b/i
      ) ??
      working.match(
        /\bbirthstones?\s+(?:for\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/i
      );
    if (birthMatch) {
      const entry = BIRTHSTONE_MONTH_MAP[birthMatch[1].toLowerCase()];
      if (entry) {
        stonePatterns = entry.stones;
        stonePattern = entry.stones.length === 1 ? entry.stones[0] : null;
        chips.push({
          id: "stone",
          kind: "stone",
          label: entry.label,
          removePattern: birthMatch[0],
        });
        working = working.replace(birthMatch[0], " ");
      }
    }

    // 9b. Cubic Zirconia / CZ
    if (stonePatterns.length === 0) {
      const czMatch = working.match(/\b(cubic\s+zirconia|cz)\b/i);
      if (czMatch) {
        stonePattern = "Cubic Zirconia";
        stonePatterns = ["Cubic Zirconia"];
        chips.push({
          id: "stone",
          kind: "stone",
          label: "Cubic Zirconia",
          removePattern: czMatch[0],
        });
        working = working.replace(czMatch[0], " ");
      }
    }

    // 9c. Named Gemstones
    if (stonePatterns.length === 0) {
      for (const stone of STONE_NAMES) {
        const rx = new RegExp(`\\b(${stone}s?)\\b`, "i");
        const match = working.match(rx);
        if (match) {
          stonePattern = titleCase(stone);
          stonePatterns = [stonePattern];
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

    // 9d. Color-word gemstone intent (e.g. "blue stone ring", "green necklace", "purple stone")
    if (stonePatterns.length === 0) {
      const colorMatch = working.match(
        /\b(blue|green|red|purple|pink|black|teal)\b(?:\s+(?:stones?|gems?|gemstones?))?/i
      );
      if (colorMatch) {
        const entry = COLOR_STONE_MAP[colorMatch[1].toLowerCase()];
        if (entry) {
          stonePatterns = entry.stones;
          chips.push({
            id: "stone",
            kind: "stone",
            label: entry.label,
            removePattern: colorMatch[0],
          });
          working = working.replace(colorMatch[0], " ");
        }
      }
    }

    // Strip generic "stone/gem/gemstone" filler once a gemstone/color was extracted
    if (stonePatterns.length > 0) {
      working = working.replace(/\b(stones?|gems?|gemstones?)\b/gi, " ");
    }
  }

  // 10. Extract Category intent (strict compound/specific precedence BEFORE generic chain/pendant/cuff!)
  let categorySlugs: string[] = [];
  let pieceType: "rings" | "earrings" | "necklaces" | "bracelets" | null = null;
  const hasAnyStone = stonePatterns.length > 0;

  const categoryRules: Array<{
    regex: RegExp;
    slugs: string[];
    label: string;
    pieceType?: "rings" | "earrings" | "necklaces" | "bracelets";
    keepKeyword?: RegExp;
    stripRedundant?: RegExp;
  }> = [
    {
      // Ear cuffs / climbers / earrings / huggies / studs / hoops / leverbacks BEFORE bracelet cuffs or pendant chains!
      regex:
        /\b(ear\s+(?:cuffs?|climbers?|crawlers?|jackets?)|earrings?|huggies?|studs?|hoops?|leverbacks?)\b/i,
      slugs: ["earrings"],
      label: "Earrings",
      pieceType: "earrings",
      keepKeyword:
        /^(huggies?|studs?|hoops?|ear\s+(?:cuffs?|climbers?|crawlers?|jackets?)|leverbacks?)$/i,
      stripRedundant: /\b(earrings?)\b/gi,
    },
    {
      // Bracelets / bangles / anklets BEFORE generic "chains?" so "mens chain bracelet" routes to Bracelets!
      regex: /\b(bracelets?|bangles?|anklets?)\b/i,
      slugs: ["bracelets"],
      label: "Bracelets",
      pieceType: "bracelets",
      keepKeyword: /^(bangles?|anklets?)$/i,
      stripRedundant: /\b(bracelets?)\b/gi,
    },
    {
      regex: /\b(engagement\s+rings?)\b/i,
      slugs: ["engagement-rings"],
      label: "Engagement Rings",
      pieceType: "rings",
    },
    {
      regex: /\b(bridal\s+sets?|wedding\s+sets?|engagement\s+sets?)\b/i,
      slugs: ["engagement-rings", "wedding-bands"],
      label: "Bridal & Wedding Rings",
      pieceType: "rings",
    },
    {
      // Keep "eternity" / "anniversary" in working text so they actually filter to those styles!
      regex: /\b(wedding\s+(?:bands?|rings?)|bands?)\b/i,
      slugs: ["wedding-bands"],
      label: "Wedding Bands",
      pieceType: "rings",
    },
    {
      regex: /\b(rings?)\b/i,
      slugs:
        audience === "men"
          ? ["wedding-bands", "fashion-rings"]
          : hasAnyStone
            ? [
                "engagement-rings",
                "wedding-bands",
                "fashion-rings",
                "gemstone-jewelry",
              ]
            : ["engagement-rings", "wedding-bands", "fashion-rings"],
      label: "Rings",
      pieceType: "rings",
    },
    {
      regex: /\b(signets?)\b/i,
      slugs: ["fashion-rings"],
      label: "Fashion Rings",
      pieceType: "rings",
      keepKeyword: /^signets?$/i,
    },
    {
      regex:
        /\b(necklaces?|pendants?|chains?|lockets?|chokers?|crucifix(?:es)?|dog\s+tags?|medallions?|lariats?)\b/i,
      slugs: ["necklaces-pendants"],
      label: "Necklaces & Pendants",
      pieceType: "necklaces",
      keepKeyword:
        /^(chains?|pendants?|lockets?|chokers?|crucifix(?:es)?|dog\s+tags?|medallions?|lariats?)$/i,
      stripRedundant: /\b(necklaces?)\b/gi,
    },
    {
      regex: /\b(cuffs?)\b/i,
      slugs: ["bracelets"],
      label: "Bracelets",
      pieceType: "bracelets",
      keepKeyword: /^cuffs?$/i,
    },
  ];

  for (const rule of categoryRules) {
    const match = working.match(rule.regex);
    if (match) {
      categorySlugs = rule.slugs;
      pieceType = rule.pieceType ?? null;
      chips.push({
        id: "category",
        kind: "category",
        label: rule.label,
        removePattern: match[0],
      });
      const keepAsKeyword = rule.keepKeyword?.test(match[0]) ?? false;
      if (!keepAsKeyword) {
        working = working.replace(match[0], " ");
      } else if (rule.stripRedundant) {
        working = working.replace(rule.stripRedundant, " ");
      }
      break;
    }
  }

  // If "chain only" / "no pendant" was requested without an explicit category match, scope to necklaces-pendants
  if (excludePendants && categorySlugs.length === 0) {
    categorySlugs = ["necklaces-pendants"];
    pieceType = "necklaces";
  }

  // 10b. Extract Surface Finish (matte/brushed/satin, hammered/textured)
  let finish: string | null = null;
  const satinMatch = working.match(/\b(matte|brushed|satin)\b/i);
  const hammeredMatch = working.match(/\b(hammered|textured)\b/i);
  if (satinMatch) {
    finish = "satin-brushed";
    chips.push({
      id: "finish",
      kind: "finish",
      label: "Brushed / Satin",
      removePattern: satinMatch[0],
    });
    working = working.replace(satinMatch[0], " ");
  } else if (hammeredMatch) {
    finish = "hammered-textured";
    chips.push({
      id: "finish",
      kind: "finish",
      label: "Hammered / Textured",
      removePattern: hammeredMatch[0],
    });
    working = working.replace(hammeredMatch[0], " ");
  }

  // 10c. Extract Everyday Earring Size (small/tiny/mini, medium, big/large)
  let earringSize: "small" | "medium" | "large" | null = null;
  if (categorySlugs.includes("earrings")) {
    const smallEar = working.match(/\b(small|tiny|mini)\b/i);
    const largeEar = working.match(/\b(big|large)\b/i);
    if (smallEar) {
      earringSize = "small";
      chips.push({
        id: "earring_size",
        kind: "earring_size",
        label: "Small / Everyday",
        removePattern: smallEar[0],
      });
      working = working.replace(smallEar[0], " ");
    } else if (largeEar) {
      earringSize = "large";
      chips.push({
        id: "earring_size",
        kind: "earring_size",
        label: "Statement / Large",
        removePattern: largeEar[0],
      });
      working = working.replace(largeEar[0], " ");
    }
  }

  // 10d. Extract Everyday Width / Thickness Adjectives (thick/wide/chunky vs thin/dainty/narrow)
  let widthTier: "narrow" | "wide" | null = null;
  const wideMatch = working.match(/\b(thick|wide|chunky|heavy)\b/i);
  const narrowMatch = working.match(/\b(thin|narrow|slim|dainty|delicate|skinny)\b/i);
  if (wideMatch) {
    widthTier = "wide";
    working = working.replace(wideMatch[0], " ");
  } else if (narrowMatch) {
    // Only apply width filter on chains/bands; for pendants, just strip subjective "dainty"/"delicate"
    if (
      categorySlugs.includes("wedding-bands") ||
      categorySlugs.includes("fashion-rings") ||
      /\bchains?\b/i.test(working) ||
      categorySlugs.includes("bracelets")
    ) {
      widthTier = "narrow";
    }
    working = working.replace(narrowMatch[0], " ");
  }

  // 10e. Extract Everyday Necklace Lengths ("long" -> 22–30 In, "choker" -> 14–16 In)
  if (lengths.length === 0 && categorySlugs.includes("necklaces-pendants")) {
    if (/\blong\b/i.test(working)) {
      lengths.push("22 In", "24 In", "26 In", "30 In");
      working = working.replace(/\blong\b/gi, " ");
    } else if (/\bchokers?\b/i.test(working)) {
      lengths.push("14 In", "16 In");
      working = working.replace(/\bchokers?\b/gi, " ");
    }
  }

  // 10f. Extract Earring Backings ("screw back" -> Threaded closure, "leverback" -> "lever back")
  let closurePattern: string | null = null;
  const screwBackMatch = working.match(/\bscrew\s+backs?\b/i);
  if (screwBackMatch) {
    closurePattern = "Threaded";
    working = working.replace(screwBackMatch[0], " ");
  }
  if (/\bleverbacks?\b/i.test(working)) {
    working = working.replace(/\bleverbacks?\b/gi, "lever back");
  }

  // 11. Consumer -> Stuller synonym mapping
  // Stuller titles tennis bracelets as "Line Bracelet"
  if (
    (categorySlugs.includes("bracelets") || /\banklets?\b/i.test(working)) &&
    /\btennis\b/i.test(working)
  ) {
    working = working.replace(/\btennis\b/gi, "line");
  }
  // Stuller catalogs Cuban links as "Curb"
  if (/\bcuban(?:\s+link)?\b/i.test(working)) {
    working = working.replace(/\bcuban(?:\s+link)?\b/gi, "curb");
    if (categorySlugs.length === 0) {
      categorySlugs = ["necklaces-pendants", "bracelets"];
    }
  }
  // Crucifix -> cross OR crucifix
  if (/\bcrucifix(?:es)?\b/i.test(working)) {
    working = working.replace(/\bcrucifix(?:es)?\b/gi, "cross");
  }
  // Religious -> cross
  if (/\breligious\b/i.test(working)) {
    working = working.replace(/\breligious\b/gi, "cross");
  }
  // Floating diamond necklace -> strip "floating" so it matches solitaire/bezel diamond necklaces
  if (/\bfloating\b/i.test(working)) {
    working = working.replace(/\bfloating\b/gi, " ");
  }
  // Initial/letter queries: drop generic "pendant"/"necklace" so both Initial Pendant and Initial Necklace match
  if (initialLetter) {
    working = working.replace(/\b(initials?|pendants?|necklaces?)\b/gi, " ");
  }

  // "half eternity" -> Stuller titles these "Eternity" or "Anniversary" without "half"
  if (/\bhalf\s+eternity\b/i.test(working)) {
    working = working.replace(/\bhalf\s+eternity\b/gi, "eternity");
  }

  // 12. Clean and deduplicate leftover free-text keywords
  const remainingTokens = Array.from(
    new Set(
      working
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter((tok) => tok.length > 1 && !FILLER_WORDS.has(tok.toLowerCase()))
    )
  );

  const textQuery = remainingTokens.join(" ");

  return {
    raw,
    mode: "general",
    skuQuery: null,
    textQuery,
    initialLetter,
    categorySlugs,
    pieceType,
    audience,
    metalPattern,
    excludePlated,
    stonePattern,
    stonePatterns,
    stoneNone,
    stoneOrigin,
    stoneShape,
    finish,
    widthTier,
    earringSize,
    pendantChain,
    excludePendants,
    closurePattern,
    sizable,
    length,
    lengths,
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
  if (parsed.length || parsed.lengths.length > 0) {
    return {
      relaxed: { ...parsed, length: null, lengths: [] },
      droppedLabel: `Length (${parsed.length ?? parsed.lengths.join(", ")})`,
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
