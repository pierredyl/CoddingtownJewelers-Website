/**
 * Category-specific Style / Type and Progressive Sub-Filter definitions backed
 * by verified live `attributes` distributions across all 52,444 active Stuller
 * catalog items.
 */

export interface CategoryStyleOption {
  id: string;
  label: string;
  /**
   * PostgREST `.or(...)` condition fragments that match items belonging to this style.
   * Multiple fragments inside one style are OR'd together.
   */
  orClauses: string[];
}

export interface SimpleFilterOption {
  id: string;
  label: string;
  /** Exact attribute values matched via JSONB containment */
  values: string[];
}

export const CHAIN_LINK_STYLE_OPTIONS: SimpleFilterOption[] = [
  { id: "Cable", label: "Cable", values: ["Cable"] },
  { id: "Curb", label: "Curb", values: ["Curb"] },
  { id: "Rope", label: "Rope", values: ["Rope"] },
  { id: "Box", label: "Box", values: ["Box"] },
  { id: "Paperclip-Style", label: "Paperclip", values: ["Paperclip-Style"] },
  { id: "Figaro", label: "Figaro", values: ["Figaro"] },
  { id: "Rolo", label: "Rolo", values: ["Rolo"] },
  { id: "Snake", label: "Snake", values: ["Snake"] },
  { id: "Wheat", label: "Wheat", values: ["Wheat"] },
  { id: "Bead", label: "Bead", values: ["Bead"] },
  { id: "Anchor", label: "Anchor / Mariner", values: ["Anchor"] },
];

export const CHAIN_WIDTH_TIER_OPTIONS: Array<{
  id: string;
  label: string;
  minMm: number;
  maxMm: number;
  /** Exhaustive Stuller exact width values from live DB for fast GIN matching */
  exactValues: string[];
}> = [
  {
    id: "delicate",
    label: "Delicate (Under 1.5 mm)",
    minMm: 0,
    maxMm: 1.49,
    exactValues: [
      ".5 Mm", ".55 Mm", ".6 Mm", ".65 Mm", ".7 Mm", ".75 Mm", ".8 Mm",
      ".85 Mm", ".9 Mm", ".95 Mm", "1 Mm", "1.1 Mm", "1.15 Mm", "1.2 Mm",
      "1.25 Mm", "1.28 Mm", "1.3 Mm", "1.4 Mm",
    ],
  },
  {
    id: "fine",
    label: "Fine (1.5 – 2.5 mm)",
    minMm: 1.5,
    maxMm: 2.5,
    exactValues: [
      "1.5 Mm", "1.55 Mm", "1.6 Mm", "1.7 Mm", "1.75 Mm", "1.75 Mm2 Mm",
      "1.8 Mm", "1.82 Mm", "1.9 Mm", "1.95 Mm", "2 Mm", "2.1 Mm", "2.2 Mm",
      "2.25 Mm", "2.3 Mm", "2.4 Mm", "2.44 Mm", "2.5 Mm",
    ],
  },
  {
    id: "medium",
    label: "Medium (2.6 – 4 mm)",
    minMm: 2.51,
    maxMm: 4,
    exactValues: [
      "2.6 Mm", "2.7 Mm", "2.75 Mm", "2.8 Mm", "2.9 Mm", "3 Mm", "3.1 Mm",
      "3.2 Mm", "3.25 Mm", "3.4 Mm", "3.5 Mm", "3.6 Mm", "3.75 Mm", "3.8 Mm",
      "3.85 Mm", "3.9 Mm", "3.95 Mm", "4 Mm",
    ],
  },
  {
    id: "bold",
    label: "Bold (4.1 – 6 mm)",
    minMm: 4.01,
    maxMm: 6,
    exactValues: [
      "4.2 Mm", "4.35 Mm", "4.4 Mm", "4.5 Mm", "4.6 Mm", "4.7 Mm", "4.8 Mm",
      "5 Mm", "5.2 Mm", "5.3 Mm", "5.5 Mm", "5.7 Mm", "5.8 Mm", "5.9 Mm", "6 Mm",
    ],
  },
  {
    id: "heavy",
    label: "Heavy (Over 6 mm)",
    minMm: 6.01,
    maxMm: 99,
    exactValues: [
      "6.2 Mm", "6.3 Mm", "6.5 Mm", "6.75 Mm", "7 Mm", "7.4 Mm", "7.5 Mm",
      "7.75 Mm", "8 Mm", "8.5 Mm", "9 Mm", "9.8 Mm", "10 Mm", "11 Mm",
      "12 Mm", "14 Mm", "16 Mm",
    ],
  },
];

export const BAND_WIDTH_OPTIONS: string[] = [
  "1 Mm",
  "1.5 Mm",
  "2 Mm",
  "2.5 Mm",
  "3 Mm",
  "4 Mm",
  "5 Mm",
  "6 Mm",
  "7 Mm",
  "8 Mm",
  "9 Mm",
  "10 Mm",
];

export const BAND_FIT_OPTIONS: SimpleFilterOption[] = [
  { id: "Comfort-Fit", label: "Comfort-Fit", values: ["Comfort-Fit"] },
  { id: "Standard", label: "Standard Fit", values: ["Standard"] },
];

export const BAND_PROFILE_OPTIONS: SimpleFilterOption[] = [
  { id: "Half Round", label: "Half Round (Domed)", values: ["Half Round"] },
  { id: "Flat", label: "Flat", values: ["Flat"] },
  { id: "Knife", label: "Knife Edge", values: ["Knife"] },
  { id: "Square", label: "Square", values: ["Square"] },
  { id: "Round Tapered", label: "Round Tapered", values: ["Round Tapered"] },
  { id: "Flat Tapered", label: "Flat Tapered", values: ["Flat Tapered"] },
];

export const EDGE_DETAIL_OPTIONS: SimpleFilterOption[] = [
  { id: "Milgrain", label: "Milgrain", values: ["Milgrain"] },
  { id: "Double Milgrain", label: "Double Milgrain", values: ["Double Milgrain"] },
  { id: "Stepped Edge", label: "Stepped Edge", values: ["Stepped Edge"] },
  { id: "Beveled Edge", label: "Beveled Edge", values: ["Beveled Edge"] },
];

export const SETTING_STATE_OPTIONS: SimpleFilterOption[] = [
  { id: "Set", label: "Complete Ring (Set)", values: ["Set"] },
  { id: "Semi-Set", label: "Semi-Mount (Add Center Stone)", values: ["Semi-Set"] },
  { id: "Unset", label: "Mounting Only (Unset)", values: ["Unset"] },
];

export const STONE_ORIGIN_OPTIONS: CategoryStyleOption[] = [
  {
    id: "natural",
    label: "Natural",
    orClauses: ["primary_stone.ilike.Natural%"],
  },
  {
    id: "lab-grown",
    label: "Lab-Grown",
    orClauses: [
      "primary_stone.ilike.%Lab-Grown%",
      "primary_stone.ilike.%Lab Grown%",
      "primary_stone.ilike.%Created%",
    ],
  },
];

export const CARAT_WEIGHT_TIER_OPTIONS: CategoryStyleOption[] = [
  {
    id: "under-0.5",
    label: "Under 0.50 ct",
    orClauses: [
      "title.ilike.%1/10 CTW%",
      "title.ilike.%1/8 CTW%",
      "title.ilike.%1/6 CTW%",
      "title.ilike.%1/5 CTW%",
      "title.ilike.%1/4 CTW%",
      "title.ilike.%1/3 CTW%",
      "title.ilike.%3/8 CTW%",
      "title.ilike.%0.25%",
      "title.ilike.%0.33%",
    ],
  },
  {
    id: "0.5-1",
    label: "0.50 – 1.00 ct",
    orClauses: [
      "title.ilike.%1/2 CTW%",
      "title.ilike.%5/8 CTW%",
      "title.ilike.%3/4 CTW%",
      "title.ilike.%7/8 CTW%",
      "title.ilike.%0.50%",
      "title.ilike.%0.75%",
      "title.ilike.%1 CTW%",
      "title.ilike.%1.00%",
    ],
  },
  {
    id: "1-2",
    label: "1.00 – 2.00 ct",
    orClauses: [
      "title.ilike.%1 1/4 CTW%",
      "title.ilike.%1 1/2 CTW%",
      "title.ilike.%1 3/4 CTW%",
      "title.ilike.%1.25%",
      "title.ilike.%1.50%",
      "title.ilike.%1.75%",
      "title.ilike.%2 CTW%",
      "title.ilike.%2.00%",
    ],
  },
  {
    id: "2-3",
    label: "2.00 – 3.00 ct",
    orClauses: [
      "title.ilike.%2 1/4 CTW%",
      "title.ilike.%2 1/2 CTW%",
      "title.ilike.%2 3/4 CTW%",
      "title.ilike.%2.50%",
      "title.ilike.%3 CTW%",
      "title.ilike.%3.00%",
    ],
  },
  {
    id: "3-plus",
    label: "3.00 ct+",
    orClauses: [
      "title.ilike.%3 1/2 CTW%",
      "title.ilike.%4 CTW%",
      "title.ilike.%5 CTW%",
      "title.ilike.%6 CTW%",
      "title.ilike.%7 CTW%",
      "title.ilike.%8 CTW%",
      "title.ilike.%10 CTW%",
    ],
  },
];

export const RING_WIDTH_TIER_OPTIONS: Array<{
  id: string;
  label: string;
  exactValues: string[];
}> = [
  {
    id: "ring-delicate",
    label: "Delicate (Under 2 mm)",
    exactValues: ["1 Mm", "1.2 Mm", "1.5 Mm", "1.75 Mm", "1.8 Mm", "1.9 Mm"],
  },
  {
    id: "ring-classic",
    label: "Classic (2 – 3 mm)",
    exactValues: ["2 Mm", "2.2 Mm", "2.25 Mm", "2.5 Mm", "2.75 Mm", "3 Mm"],
  },
  {
    id: "ring-wide",
    label: "Wide (3.5 – 5 mm)",
    exactValues: ["3.5 Mm", "4 Mm", "4.5 Mm", "5 Mm"],
  },
  {
    id: "ring-bold",
    label: "Bold (6 mm+)",
    exactValues: ["6 Mm", "7 Mm", "8 Mm", "9 Mm", "10 Mm"],
  },
];

export const SURFACE_FINISH_OPTIONS: CategoryStyleOption[] = [
  {
    id: "polished",
    label: "Polished",
    orClauses: [
      'attributes.cs.{"Surface Finish":"Polished"}',
      "title.ilike.%Polished%",
    ],
  },
  {
    id: "brushed-satin",
    label: "Brushed / Satin",
    orClauses: [
      'attributes.cs.{"Surface Finish":"Satin"}',
      'attributes.cs.{"Surface Finish":"Brushed"}',
      "title.ilike.%Satin%",
      "title.ilike.%Brushed%",
    ],
  },
  {
    id: "hammered-textured",
    label: "Hammered / Textured",
    orClauses: [
      'attributes.cs.{"Surface Finish":"Hammered"}',
      "title.ilike.%Hammered%",
      "title.ilike.%Textured%",
      "title.ilike.%Florentine%",
    ],
  },
];

export const GEMSTONE_JEWELRY_TYPE_OPTIONS: CategoryStyleOption[] = [
  {
    id: "rings",
    label: "Rings",
    orClauses: [
      "title.ilike.%Ring%",
      "attributes->>merchandisingPath.ilike.%> Rings%",
    ],
  },
  {
    id: "earrings",
    label: "Earrings",
    orClauses: [
      "title.ilike.%Earring%",
      "title.ilike.%Stud%",
      "title.ilike.%Hoop%",
      "attributes->>merchandisingPath.ilike.%> Earrings%",
    ],
  },
  {
    id: "necklaces-pendants",
    label: "Necklaces & Pendants",
    orClauses: [
      "title.ilike.%Necklace%",
      "title.ilike.%Pendant%",
      "attributes->>merchandisingPath.ilike.%> Pendants%",
      "attributes->>merchandisingPath.ilike.%> Necklaces%",
    ],
  },
  {
    id: "bracelets",
    label: "Bracelets",
    orClauses: [
      "title.ilike.%Bracelet%",
      "title.ilike.%Bangle%",
      "attributes->>merchandisingPath.ilike.%> Bracelets%",
    ],
  },
];

export const EARRING_SIZE_TIER_OPTIONS: CategoryStyleOption[] = [
  {
    id: "small",
    label: "Small / Huggie (Under 15 mm)",
    orClauses: [
      "title.ilike.%Huggie%",
      "title.ilike.%10 mm%",
      "title.ilike.%12 mm%",
      "title.ilike.%14 mm%",
      'attributes.cs.{"Length":"10 Mm"}',
      'attributes.cs.{"Length":"12 Mm"}',
      'attributes.cs.{"Length":"14 Mm"}',
    ],
  },
  {
    id: "medium",
    label: "Medium (15 – 25 mm)",
    orClauses: [
      "title.ilike.%15 mm%",
      "title.ilike.%16 mm%",
      "title.ilike.%18 mm%",
      "title.ilike.%20 mm%",
      "title.ilike.%22 mm%",
      "title.ilike.%25 mm%",
      'attributes.cs.{"Length":"16 Mm"}',
      'attributes.cs.{"Length":"18 Mm"}',
      'attributes.cs.{"Length":"20 Mm"}',
      'attributes.cs.{"Length":"25 Mm"}',
    ],
  },
  {
    id: "large",
    label: "Large / Long (25 mm+)",
    orClauses: [
      "title.ilike.%30 mm%",
      "title.ilike.%35 mm%",
      "title.ilike.%40 mm%",
      "title.ilike.%45 mm%",
      "title.ilike.%50 mm%",
      'attributes.cs.{"Length":"30 Mm"}',
      'attributes.cs.{"Length":"35 Mm"}',
      'attributes.cs.{"Length":"40 Mm"}',
    ],
  },
];

export const PENDANT_CHAIN_OPTIONS: CategoryStyleOption[] = [
  {
    id: "chain-included",
    label: "Chain Included",
    orClauses: [
      "title.ilike.%Necklace%",
      "title.ilike.%16-18%",
      "title.ilike.%18 In%",
      "title.ilike.%16 In%",
    ],
  },
  {
    id: "pendant-only",
    label: "Pendant Only",
    orClauses: [
      'attributes.cs.{"Product Type":"Pendants"}',
      "title.ilike.%Pendant%",
      "title.ilike.%Charm%",
    ],
  },
];

const BIRTHSTONE_MONTHS: Array<{ pattern: RegExp; month: string }> = [
  { pattern: /\bgarnet\b/i, month: "Jan" },
  { pattern: /\bamethyst\b/i, month: "Feb" },
  { pattern: /\baquamarine\b/i, month: "Mar" },
  { pattern: /\bdiamond\b/i, month: "Apr" },
  { pattern: /\bemerald\b/i, month: "May" },
  { pattern: /\b(?:pearl|alexandrite|moonstone)\b/i, month: "Jun" },
  { pattern: /\bruby\b/i, month: "Jul" },
  { pattern: /\bperidot\b/i, month: "Aug" },
  { pattern: /\bsapphire\b/i, month: "Sep" },
  { pattern: /\b(?:opal|tourmaline)\b/i, month: "Oct" },
  { pattern: /\b(?:citrine|topaz)\b/i, month: "Nov" },
  { pattern: /\b(?:tanzanite|turquoise|zircon)\b/i, month: "Dec" },
];

export function formatStoneWithBirthstone(stone: string): string {
  for (const entry of BIRTHSTONE_MONTHS) {
    if (entry.pattern.test(stone)) {
      return `${stone} (${entry.month})`;
    }
  }
  return stone;
}

export const STONE_SHAPE_OPTIONS_BY_CATEGORY: Record<string, SimpleFilterOption[]> = {
  "engagement-rings": [
    { id: "Round", label: "Round", values: ["Round", "ROUND"] },
    { id: "Oval", label: "Oval", values: ["Oval", "OVAL", "Elongated Oval"] },
    { id: "Pear", label: "Pear", values: ["Pear"] },
    { id: "Emerald", label: "Emerald", values: ["Emerald", "EMERALD"] },
    { id: "Marquise", label: "Marquise", values: ["Marquise"] },
    { id: "Cushion", label: "Elongated Cushion", values: ["Elongated Cushion", "Cushion"] },
    { id: "Square", label: "Square / Princess", values: ["Square"] },
    { id: "Radiant", label: "Radiant", values: ["Radiant"] },
    { id: "Hexagon", label: "Hexagon", values: ["Elongated Hexagon", "Hexagon"] },
    { id: "Baguette", label: "Baguette", values: ["Straight Baguette", "Tapered Baguette"] },
  ],
  "wedding-bands": [
    { id: "Round", label: "Round", values: ["Round", "ROUND"] },
    { id: "Oval", label: "Oval", values: ["Oval", "OVAL"] },
    { id: "Emerald", label: "Emerald", values: ["Emerald", "EMERALD"] },
    { id: "Baguette", label: "Baguette", values: ["Straight Baguette", "Tapered Baguette"] },
    { id: "Square", label: "Square / Princess", values: ["Square"] },
    { id: "Marquise", label: "Marquise", values: ["Marquise"] },
  ],
  "fashion-rings": [
    { id: "Round", label: "Round", values: ["Round", "ROUND"] },
    { id: "Baguette", label: "Baguette", values: ["Straight Baguette", "Tapered Baguette"] },
    { id: "Pear", label: "Pear", values: ["Pear"] },
    { id: "Marquise", label: "Marquise", values: ["Marquise"] },
    { id: "Square", label: "Square", values: ["Square"] },
  ],
  "gemstone-jewelry": [
    { id: "Round", label: "Round", values: ["Round", "ROUND"] },
    { id: "Oval", label: "Oval", values: ["Oval", "OVAL"] },
    { id: "Square", label: "Square", values: ["Square"] },
    { id: "Pear", label: "Pear", values: ["Pear"] },
    { id: "Emerald", label: "Emerald", values: ["Emerald", "EMERALD"] },
    { id: "Marquise", label: "Marquise", values: ["Marquise"] },
  ],
  "necklaces-pendants": [
    { id: "Round", label: "Round", values: ["Round", "ROUND"] },
    { id: "Emerald", label: "Emerald", values: ["Emerald", "EMERALD"] },
    { id: "Oval", label: "Oval", values: ["Oval", "OVAL"] },
    { id: "Pearl", label: "Pearl", values: ["Pearl"] },
  ],
  bracelets: [
    { id: "Round", label: "Round", values: ["Round", "ROUND"] },
    { id: "Emerald", label: "Emerald", values: ["Emerald", "EMERALD"] },
    { id: "Oval", label: "Oval", values: ["Oval", "OVAL"] },
    { id: "Pear", label: "Pear", values: ["Pear"] },
    { id: "Marquise", label: "Marquise", values: ["Marquise"] },
    { id: "Baguette", label: "Baguette", values: ["Straight Baguette", "Tapered Baguette"] },
    { id: "Square", label: "Square", values: ["Square"] },
    { id: "Pearl", label: "Pearl", values: ["Pearl"] },
  ],
  earrings: [
    { id: "Round", label: "Round", values: ["Round", "ROUND"] },
    { id: "Baguette", label: "Baguette", values: ["Straight Baguette", "Tapered Baguette"] },
    { id: "Pear", label: "Pear", values: ["Pear"] },
    { id: "Square", label: "Square", values: ["Square"] },
    { id: "Trillion", label: "Trillion", values: ["Trillion"] },
    { id: "Pearl", label: "Pearl", values: ["Pearl"] },
  ],
};

export const CATEGORY_STYLE_OPTIONS: Record<string, CategoryStyleOption[]> = {
  "necklaces-pendants": [
    {
      id: "standalone-chains",
      label: "Standalone Chains",
      orClauses: ["attributes->>merchandisingPath.ilike.Chain >%"],
    },
    {
      id: "pendants",
      label: "Pendants",
      orClauses: [
        'attributes.cs.{"Product Type":"Pendants"}',
        "attributes->>merchandisingPath.ilike.%> Pendants >%",
      ],
    },
    {
      id: "solitaire-halo",
      label: "Solitaire & Halo",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Solitaire%",
        "attributes->>merchandisingPath.ilike.%> Halo%",
      ],
    },
    {
      id: "bar-station",
      label: "Bar & Station",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Bar%",
        "title.ilike.%Station%",
      ],
    },
    {
      id: "crosses-religious",
      label: "Crosses & Religious",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Religious%",
        "title.ilike.%Cross%",
      ],
    },
    {
      id: "hearts-symbols",
      label: "Hearts & Symbols",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Symbols/Nature%",
        "title.ilike.%Heart%",
      ],
    },
    {
      id: "pearl-beaded",
      label: "Pearl & Beaded",
      orClauses: ["title.ilike.%Pearl%", "title.ilike.%Bead%"],
    },
    {
      id: "initials",
      label: "Initials & Personalized",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Initials%",
        "attributes->>merchandisingPath.ilike.%> Personalized%",
      ],
    },
  ],

  bracelets: [
    {
      id: "chain-link",
      label: "Chain & Link",
      orClauses: [
        "attributes->>merchandisingPath.ilike.Chain >%",
        "attributes->>merchandisingPath.ilike.%> Link%",
      ],
    },
    {
      id: "tennis-line",
      label: "Tennis / Line",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Line%",
        "title.ilike.%Tennis%",
      ],
    },
    {
      id: "bangles-cuffs",
      label: "Bangles & Cuffs",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Bangles/Cuffs%",
        "title.ilike.%Bangle%",
        "title.ilike.%Cuff%",
      ],
    },
    {
      id: "id-bar",
      label: "ID & Bar",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Personalized%",
        "attributes->>merchandisingPath.ilike.%> Bar%",
      ],
    },
    {
      id: "charms-initials",
      label: "Charms & Initials",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Charm%",
        "attributes->>merchandisingPath.ilike.%> Initials%",
      ],
    },
    {
      id: "beaded-pearl",
      label: "Beaded & Pearl",
      orClauses: ["title.ilike.%Pearl%", "title.ilike.%Bead%"],
    },
    {
      id: "crosses-religious",
      label: "Crosses & Religious",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Religious%",
        "title.ilike.%Cross%",
      ],
    },
    {
      id: "bolo-adjustable",
      label: "Bolo / Adjustable",
      orClauses: ["title.ilike.%Bolo%", "title.ilike.%Adjustable%"],
    },
  ],

  earrings: [
    {
      id: "studs",
      label: "Studs",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Studs%",
        "title.ilike.%Stud%",
      ],
    },
    {
      id: "hoops-huggies",
      label: "Hoops & Huggies",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Hoops%",
        "title.ilike.%Hoop%",
        "title.ilike.%Huggie%",
      ],
    },
    {
      id: "halo-cluster",
      label: "Halo & Cluster",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Halo%",
        "title.ilike.%Cluster%",
      ],
    },
    {
      id: "drops-dangles",
      label: "Drops & Dangles",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Drops/Dangles%",
        "title.ilike.%Drop%",
        "title.ilike.%Dangle%",
      ],
    },
    {
      id: "ear-jackets",
      label: "Ear Jackets",
      orClauses: [
        'attributes.cs.{"Product Type":"Earring Jackets"}',
        "attributes->>merchandisingPath.ilike.%> Jackets%",
      ],
    },
    {
      id: "ear-climbers",
      label: "Ear Climbers",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Climbers%",
        "title.ilike.%Climber%",
      ],
    },
    {
      id: "initials",
      label: "Initials",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Initials%"],
    },
    {
      id: "pearl",
      label: "Pearl",
      orClauses: ["title.ilike.%Pearl%"],
    },
  ],

  "engagement-rings": [
    {
      id: "accented",
      label: "Side-Stone / Accented",
      orClauses: [
        "title.ilike.%Accented%",
        "attributes->>merchandisingPath.ilike.%> Accented%",
      ],
    },
    {
      id: "three-stone",
      label: "Three-Stone",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> 3-Stone%",
        "title.ilike.%Three Stone%",
        "title.ilike.%3-Stone%",
      ],
    },
    {
      id: "halo",
      label: "Halo",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Halo%",
        "title.ilike.%Halo%",
      ],
    },
    {
      id: "bezel-sculptural",
      label: "Bezel & Sculptural",
      orClauses: ["title.ilike.%Bezel%", "title.ilike.%Sculptural%"],
    },
    {
      id: "split-bypass",
      label: "Split Shank & Bypass",
      orClauses: [
        "title.ilike.%Split%",
        "title.ilike.%Bypass%",
        "title.ilike.%Twist%",
      ],
    },
    {
      id: "vintage-milgrain",
      label: "Vintage & Milgrain",
      orClauses: ["title.ilike.%Vintage%", "title.ilike.%Milgrain%"],
    },
    {
      id: "solitaire",
      label: "Solitaire",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Solitaire%",
        "title.ilike.%Solitaire%",
      ],
    },
  ],

  "wedding-bands": [
    {
      id: "classic",
      label: "Classic Plain Bands",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Classic Precious%"],
    },
    {
      id: "matching-bridal",
      label: "Matching Bridal Bands",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Matching Band%"],
    },
    {
      id: "curved-contour",
      label: "Curved / Contour",
      orClauses: [
        "title.ilike.%Contour%",
        "title.ilike.%Curved%",
        "title.ilike.%Chevron%",
      ],
    },
    {
      id: "carved-milgrain",
      label: "Milgrain & Stepped Edge",
      orClauses: [
        'attributes.cs.{"Design Detail":"Milgrain"}',
        'attributes.cs.{"Design Detail":"Stepped Edge"}',
        'attributes.cs.{"Design Detail":"Double Milgrain"}',
        'attributes.cs.{"Design Detail":"Beveled Edge"}',
      ],
    },
    {
      id: "eternity",
      label: "Eternity Bands",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Eternity Band%",
        "title.ilike.%Eternity%",
      ],
    },
    {
      id: "anniversary-diamond",
      label: "Anniversary & Diamond",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Anniversary Band%",
        "title.ilike.%Anniversary%",
      ],
    },
  ],

  "fashion-rings": [
    {
      id: "stackable",
      label: "Stackable",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Stackable%"],
    },
    {
      id: "freeform-bypass",
      label: "Freeform & Bypass",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Freeform/Bypass%"],
    },
    {
      id: "signet",
      label: "Signet",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Signet%",
        "title.ilike.%Signet%",
      ],
    },
    {
      id: "symbols-hearts",
      label: "Symbols & Hearts",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Symbols/Nature%",
        "title.ilike.%Heart%",
      ],
    },
    {
      id: "crosses-religious",
      label: "Crosses & Religious",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Religious%",
        "title.ilike.%Cross%",
      ],
    },
    {
      id: "negative-space",
      label: "Open / Negative Space",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Negative Space%"],
    },
    {
      id: "initials",
      label: "Initials & Personalized",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Initials%",
        "attributes->>merchandisingPath.ilike.%> Personalized%",
      ],
    },
    {
      id: "cluster-statement",
      label: "Cluster & Statement",
      orClauses: ["title.ilike.%Cluster%", "title.ilike.%Statement%"],
    },
    {
      id: "three-two-stone",
      label: "Two & Three-Stone",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> 3-Stone%",
        "attributes->>merchandisingPath.ilike.%> 2-Stone%",
      ],
    },
  ],

  "gemstone-jewelry": [
    {
      id: "stackable",
      label: "Stackable",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Stackable%"],
    },
    {
      id: "accented",
      label: "Accented",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Accented%"],
    },
    {
      id: "halo",
      label: "Halo",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Halo%"],
    },
    {
      id: "solitaire",
      label: "Solitaire",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Solitaire%"],
    },
    {
      id: "three-stone",
      label: "Three-Stone",
      orClauses: ["attributes->>merchandisingPath.ilike.%> 3-Stone%"],
    },
    {
      id: "two-stone",
      label: "Two-Stone",
      orClauses: ["attributes->>merchandisingPath.ilike.%> 2-Stone%"],
    },
    {
      id: "negative-space",
      label: "Open / Negative Space",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Negative Space%"],
    },
    {
      id: "cabochon",
      label: "Cabochon",
      orClauses: ["attributes->>merchandisingPath.ilike.%> Cabochon%"],
    },
    {
      id: "crosses-symbols",
      label: "Crosses & Symbols",
      orClauses: [
        "attributes->>merchandisingPath.ilike.%> Symbols%",
        "attributes->>merchandisingPath.ilike.%> Religious%",
      ],
    },
  ],
};

export function getStyleOptionsForCategory(
  categorySlug: string
): CategoryStyleOption[] {
  return CATEGORY_STYLE_OPTIONS[categorySlug] ?? [];
}

export function getStoneShapeOptionsForCategory(
  categorySlug: string
): SimpleFilterOption[] {
  return STONE_SHAPE_OPTIONS_BY_CATEGORY[categorySlug] ?? [];
}
