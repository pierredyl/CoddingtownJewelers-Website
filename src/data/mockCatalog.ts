import type {
  CatalogImage,
  CatalogItemGroup,
  CatalogVariant,
  CategorySummary,
} from "@/types/catalog";

type PieceSilhouette =
  | "solitaire-ring"
  | "halo-ring"
  | "eternity-band"
  | "comfort-band"
  | "pendant"
  | "stud-earrings"
  | "tennis-bracelet"
  | "three-stone-ring"
  | "pearl-drops";

interface MetalPalette {
  light: string;
  mid: string;
  dark: string;
  stroke: string;
}

interface StonePalette {
  fill: string;
  highlight: string;
  deep: string;
}

const METAL_PALETTES: Record<string, MetalPalette> = {
  "14K Yellow Gold": {
    light: "#F5DF9B",
    mid: "#D5B162",
    dark: "#9A7530",
    stroke: "#7C5B20",
  },
  "14K White Gold": {
    light: "#F8F9FB",
    mid: "#D6DBE2",
    dark: "#99A2AF",
    stroke: "#727B88",
  },
  "14K Rose Gold": {
    light: "#F6D5C8",
    mid: "#D99F8C",
    dark: "#A36B58",
    stroke: "#7E4E3E",
  },
  Platinum: {
    light: "#FFFFFF",
    mid: "#DFE3E8",
    dark: "#8D95A0",
    stroke: "#626A75",
  },
  "Sterling Silver": {
    light: "#F4F5F7",
    mid: "#CBD0D8",
    dark: "#8A929E",
    stroke: "#666E7A",
  },
};

const STONE_PALETTES: Record<string, StonePalette> = {
  Diamond: { fill: "#F7FAFF", highlight: "#FFFFFF", deep: "#C7D3E3" },
  Sapphire: { fill: "#23498C", highlight: "#7FA5E8", deep: "#11264F" },
  Emerald: { fill: "#1B6B4A", highlight: "#6DC29C", deep: "#0D3D29" },
  Pearl: { fill: "#FAF6EE", highlight: "#FFFFFF", deep: "#DFD4C0" },
};

function buildJewelrySvgUri(
  silhouette: PieceSilhouette,
  metalType: string,
  primaryStone: string | null
): string {
  const m = METAL_PALETTES[metalType] ?? METAL_PALETTES["14K Yellow Gold"];
  const s =
    (primaryStone && STONE_PALETTES[primaryStone]) || STONE_PALETTES.Diamond;

  let artwork = "";

  switch (silhouette) {
    case "solitaire-ring":
      artwork = `
        <ellipse cx="200" cy="298" rx="76" ry="12" fill="#1A1918" opacity="0.09"/>
        <circle cx="200" cy="206" r="74" fill="none" stroke="url(#metalGrad)" stroke-width="18"/>
        <circle cx="200" cy="206" r="74" fill="none" stroke="${m.stroke}" stroke-width="1.2" opacity="0.5"/>
        <circle cx="200" cy="206" r="65" fill="none" stroke="${m.light}" stroke-width="2" opacity="0.7"/>
        <path d="M168 142 L182 114 L218 114 L232 142" fill="none" stroke="url(#metalGrad)" stroke-width="7" stroke-linecap="round"/>
        <polygon points="200,72 232,102 218,128 182,128 168,102" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1.5"/>
        <polygon points="200,72 216,102 200,126 184,102" fill="${s.highlight}" opacity="0.75"/>
        <line x1="168" y1="102" x2="232" y2="102" stroke="${s.deep}" stroke-width="1" opacity="0.6"/>
        <circle cx="176" cy="96" r="3.5" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
        <circle cx="224" cy="96" r="3.5" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
      `;
      break;
    case "halo-ring":
      artwork = `
        <ellipse cx="200" cy="300" rx="74" ry="11" fill="#1A1918" opacity="0.09"/>
        <circle cx="200" cy="212" r="70" fill="none" stroke="url(#metalGrad)" stroke-width="14"/>
        <circle cx="200" cy="212" r="70" fill="none" stroke="${m.stroke}" stroke-width="1" opacity="0.45"/>
        <ellipse cx="200" cy="112" rx="44" ry="50" fill="url(#metalGrad)" stroke="${m.stroke}" stroke-width="1.2"/>
        <ellipse cx="200" cy="112" rx="37" ry="43" fill="${s.highlight}" stroke="${s.deep}" stroke-width="1" stroke-dasharray="6 4"/>
        <ellipse cx="200" cy="112" rx="26" ry="32" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1.5"/>
        <ellipse cx="195" cy="103" rx="11" ry="16" fill="${s.highlight}" opacity="0.7"/>
      `;
      break;
    case "eternity-band":
      artwork = `
        <ellipse cx="200" cy="282" rx="86" ry="12" fill="#1A1918" opacity="0.09"/>
        <ellipse cx="200" cy="196" rx="84" ry="54" fill="none" stroke="url(#metalGrad)" stroke-width="22"/>
        <ellipse cx="200" cy="196" rx="84" ry="54" fill="none" stroke="${m.stroke}" stroke-width="1.2" opacity="0.5"/>
        <circle cx="144" cy="236" r="6" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1"/>
        <circle cx="164" cy="244" r="6.5" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1"/>
        <circle cx="182" cy="249" r="7" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1"/>
        <circle cx="200" cy="250" r="7" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1"/>
        <circle cx="218" cy="249" r="7" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1"/>
        <circle cx="236" cy="244" r="6.5" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1"/>
        <circle cx="256" cy="236" r="6" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1"/>
      `;
      break;
    case "comfort-band":
      artwork = `
        <ellipse cx="200" cy="284" rx="86" ry="12" fill="#1A1918" opacity="0.1"/>
        <ellipse cx="200" cy="196" rx="82" ry="52" fill="none" stroke="url(#metalGrad)" stroke-width="28"/>
        <ellipse cx="200" cy="196" rx="96" ry="66" fill="none" stroke="${m.stroke}" stroke-width="1.2" opacity="0.45"/>
        <ellipse cx="200" cy="196" rx="68" ry="38" fill="none" stroke="${m.light}" stroke-width="2.5" opacity="0.75"/>
        <path d="M132 184 Q200 226 268 184" fill="none" stroke="${m.light}" stroke-width="3" opacity="0.45"/>
      `;
      break;
    case "pendant":
      artwork = `
        <ellipse cx="200" cy="306" rx="46" ry="9" fill="#1A1918" opacity="0.08"/>
        <path d="M126 52 Q200 182 200 182 Q200 182 274 52" fill="none" stroke="url(#metalGrad)" stroke-width="3.5" stroke-dasharray="4 2"/>
        <ellipse cx="200" cy="186" rx="8" ry="13" fill="none" stroke="url(#metalGrad)" stroke-width="5"/>
        <circle cx="200" cy="234" r="38" fill="url(#metalGrad)" stroke="${m.stroke}" stroke-width="1.5"/>
        <circle cx="200" cy="234" r="29" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1.2"/>
        <polygon points="200,206 218,234 200,262 182,234" fill="${s.highlight}" opacity="0.65"/>
      `;
      break;
    case "stud-earrings":
      artwork = `
        <ellipse cx="144" cy="272" rx="34" ry="8" fill="#1A1918" opacity="0.08"/>
        <ellipse cx="256" cy="272" rx="34" ry="8" fill="#1A1918" opacity="0.08"/>
        <circle cx="144" cy="192" r="36" fill="url(#metalGrad)" stroke="${m.stroke}" stroke-width="1.2"/>
        <circle cx="144" cy="192" r="28" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1.2"/>
        <polygon points="144,166 160,192 144,218 128,192" fill="${s.highlight}" opacity="0.72"/>
        <circle cx="122" cy="170" r="4" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
        <circle cx="166" cy="170" r="4" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
        <circle cx="122" cy="214" r="4" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
        <circle cx="166" cy="214" r="4" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
        <circle cx="256" cy="192" r="36" fill="url(#metalGrad)" stroke="${m.stroke}" stroke-width="1.2"/>
        <circle cx="256" cy="192" r="28" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1.2"/>
        <polygon points="256,166 272,192 256,218 240,192" fill="${s.highlight}" opacity="0.72"/>
        <circle cx="234" cy="170" r="4" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
        <circle cx="278" cy="170" r="4" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
        <circle cx="234" cy="214" r="4" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
        <circle cx="278" cy="214" r="4" fill="${m.light}" stroke="${m.stroke}" stroke-width="1"/>
      `;
      break;
    case "tennis-bracelet":
      artwork = `
        <ellipse cx="200" cy="288" rx="108" ry="12" fill="#1A1918" opacity="0.09"/>
        <ellipse cx="200" cy="194" rx="106" ry="62" fill="none" stroke="url(#metalGrad)" stroke-width="16"/>
        <ellipse cx="200" cy="194" rx="106" ry="62" fill="none" stroke="${m.stroke}" stroke-width="1" opacity="0.5"/>
        ${[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336]
          .map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const cx = (200 + 106 * Math.cos(rad)).toFixed(1);
            const cy = (194 + 62 * Math.sin(rad)).toFixed(1);
            return `<circle cx="${cx}" cy="${cy}" r="5.5" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="0.9"/>`;
          })
          .join("")}
      `;
      break;
    case "three-stone-ring":
      artwork = `
        <ellipse cx="200" cy="298" rx="76" ry="12" fill="#1A1918" opacity="0.09"/>
        <circle cx="200" cy="208" r="72" fill="none" stroke="url(#metalGrad)" stroke-width="16"/>
        <circle cx="200" cy="208" r="72" fill="none" stroke="${m.stroke}" stroke-width="1.2" opacity="0.5"/>
        <rect x="174" y="84" width="52" height="64" rx="5" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1.8"/>
        <rect x="184" y="95" width="32" height="42" rx="2" fill="none" stroke="${s.highlight}" stroke-width="1.5" opacity="0.8"/>
        <polygon points="148,104 170,110 170,136 148,130" fill="#F7FAFF" stroke="#B7C4D6" stroke-width="1.2"/>
        <polygon points="252,104 230,110 230,136 252,130" fill="#F7FAFF" stroke="#B7C4D6" stroke-width="1.2"/>
      `;
      break;
    case "pearl-drops":
      artwork = `
        <ellipse cx="146" cy="296" rx="28" ry="8" fill="#1A1918" opacity="0.08"/>
        <ellipse cx="254" cy="296" rx="28" ry="8" fill="#1A1918" opacity="0.08"/>
        <path d="M146 112 L146 196" stroke="url(#metalGrad)" stroke-width="4" stroke-linecap="round"/>
        <circle cx="146" cy="144" r="9" fill="#F7FAFF" stroke="#C7D3E3" stroke-width="1.2"/>
        <circle cx="146" cy="224" r="28" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1.2"/>
        <circle cx="137" cy="214" r="9" fill="#FFFFFF" opacity="0.8"/>
        <path d="M254 112 L254 196" stroke="url(#metalGrad)" stroke-width="4" stroke-linecap="round"/>
        <circle cx="254" cy="144" r="9" fill="#F7FAFF" stroke="#C7D3E3" stroke-width="1.2"/>
        <circle cx="254" cy="224" r="28" fill="url(#stoneGrad)" stroke="${s.deep}" stroke-width="1.2"/>
        <circle cx="245" cy="214" r="9" fill="#FFFFFF" opacity="0.8"/>
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360" width="400" height="360">
    <defs>
      <radialGradient id="studioBg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="70%" stop-color="#F6F3EC"/>
        <stop offset="100%" stop-color="#ECE6DA"/>
      </radialGradient>
      <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${m.light}"/>
        <stop offset="48%" stop-color="${m.mid}"/>
        <stop offset="100%" stop-color="${m.dark}"/>
      </linearGradient>
      <linearGradient id="stoneGrad" x1="15%" y1="10%" x2="85%" y2="90%">
        <stop offset="0%" stop-color="${s.highlight}"/>
        <stop offset="52%" stop-color="${s.fill}"/>
        <stop offset="100%" stop-color="${s.deep}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="360" fill="url(#studioBg)"/>
    ${artwork}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeImage(
  id: number,
  silhouette: PieceSilhouette,
  metalType: string,
  primaryStone: string | null
): CatalogImage[] {
  const url = buildJewelrySvgUri(silhouette, metalType, primaryStone);
  return [
    {
      id,
      thumbnailUrl: url,
      fullUrl: url,
      zoomUrl: url,
      angle: "front",
      sortOrder: 0,
      isPrimary: true,
    },
  ];
}

function createGroup(variants: CatalogVariant[]): CatalogItemGroup {
  const defaultVariant = variants[0];
  return {
    groupKey: defaultVariant.groupCode ?? defaultVariant.supplierSku,
    groupCode: defaultVariant.groupCode,
    title: defaultVariant.title,
    shortDescription: defaultVariant.shortDescription,
    description: defaultVariant.description,
    categorySlug: defaultVariant.categorySlug,
    categoryName: defaultVariant.categoryName,
    supplierCode: defaultVariant.supplierCode,
    supplierName: defaultVariant.supplierName,
    isFeatured: variants.some((v) => v.isFeatured),
    defaultVariant,
    variants,
  };
}

export const MOCK_CATEGORIES: CategorySummary[] = [
  { id: 1, parentId: null, slug: "engagement-rings", name: "Engagement Rings", sortOrder: 1 },
  { id: 2, parentId: null, slug: "wedding-bands", name: "Wedding Bands", sortOrder: 2 },
  { id: 3, parentId: null, slug: "necklaces-pendants", name: "Necklaces & Pendants", sortOrder: 3 },
  { id: 4, parentId: null, slug: "earrings", name: "Earrings", sortOrder: 4 },
  { id: 5, parentId: null, slug: "bracelets", name: "Bracelets", sortOrder: 5 },
  { id: 6, parentId: null, slug: "gemstone-jewelry", name: "Gemstone Jewelry", sortOrder: 6 },
];

export const MOCK_CATALOG_GROUPS: CatalogItemGroup[] = [
  createGroup([
    {
      id: 101,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "309:77802:S",
      supplierItemId: "30977802S",
      groupCode: "309:77802",
      title: "Cathedral Solitaire Engagement Mounting",
      shortDescription: "Six-prong tapered cathedral mounting crafted for a 1.00 ct round center stone.",
      description:
        "A timeless cathedral arch elevates the six-prong crown for maximum light return. Available as a semi-mount or custom-set in-house with natural or lab-grown diamonds.",
      metalType: "14K Yellow Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "engagement-rings",
      categoryName: "Engagement Rings",
      attributes: {
        "Center Stone": "6.5mm Round (1.00 ct)",
        "Shank Width": "2.1 mm",
        "Prong Count": "6-Prong",
        Finish: "High Polish",
      },
      isFeatured: true,
      images: makeImage(1011, "solitaire-ring", "14K Yellow Gold", "Diamond"),
    },
    {
      id: 102,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "309:77802:W",
      supplierItemId: "30977802W",
      groupCode: "309:77802",
      title: "Cathedral Solitaire Engagement Mounting",
      shortDescription: "Six-prong tapered cathedral mounting crafted for a 1.00 ct round center stone.",
      description:
        "A timeless cathedral arch elevates the six-prong crown for maximum light return. Rhodium-plated 14K white gold finish.",
      metalType: "14K White Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "engagement-rings",
      categoryName: "Engagement Rings",
      attributes: {
        "Center Stone": "6.5mm Round (1.00 ct)",
        "Shank Width": "2.1 mm",
        "Prong Count": "6-Prong",
        Finish: "Rhodium Polish",
      },
      isFeatured: false,
      images: makeImage(1021, "solitaire-ring", "14K White Gold", "Diamond"),
    },
    {
      id: 103,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "309:77802:R",
      supplierItemId: "30977802R",
      groupCode: "309:77802",
      title: "Cathedral Solitaire Engagement Mounting",
      shortDescription: "Six-prong tapered cathedral mounting crafted for a 1.00 ct round center stone.",
      description:
        "Warm 14K rose gold cathedral mounting with delicate tapered shoulders.",
      metalType: "14K Rose Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "engagement-rings",
      categoryName: "Engagement Rings",
      attributes: {
        "Center Stone": "6.5mm Round (1.00 ct)",
        "Shank Width": "2.1 mm",
        "Prong Count": "6-Prong",
        Finish: "High Polish",
      },
      isFeatured: false,
      images: makeImage(1031, "solitaire-ring", "14K Rose Gold", "Diamond"),
    },
    {
      id: 104,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "309:77802:P",
      supplierItemId: "30977802P",
      groupCode: "309:77802",
      title: "Cathedral Solitaire Engagement Mounting",
      shortDescription: "Six-prong tapered cathedral mounting crafted for a 1.00 ct round center stone.",
      description:
        "Heirloom-weight 950 Platinum cathedral solitaire mounting with enduring bright luster.",
      metalType: "Platinum",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "engagement-rings",
      categoryName: "Engagement Rings",
      attributes: {
        "Center Stone": "6.5mm Round (1.00 ct)",
        "Shank Width": "2.1 mm",
        "Prong Count": "6-Prong",
        Purity: "950 Platinum",
      },
      isFeatured: false,
      images: makeImage(1041, "solitaire-ring", "Platinum", "Diamond"),
    },
  ]),

  createGroup([
    {
      id: 201,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "124188:600:S",
      supplierItemId: "124188600S",
      groupCode: "124188",
      title: "Oval Halo Diamond Engagement Ring",
      shortDescription: "Micro-pavé diamond halo framing an 8×6mm oval center with delicate gallery.",
      description:
        "Twenty-two full-cut accent diamonds encircle an elongated oval silhouette with a flush-fit profile designed to pair seamlessly with straight wedding bands.",
      metalType: "14K White Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "engagement-rings",
      categoryName: "Engagement Rings",
      attributes: {
        "Center Fit": "8×6mm Oval",
        "Accent Total": "0.28 ctw",
        "Band Width": "1.8 mm",
        "Setting Style": "Micro-Pavé",
      },
      isFeatured: true,
      images: makeImage(2011, "halo-ring", "14K White Gold", "Diamond"),
    },
    {
      id: 202,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "124188:601:S",
      supplierItemId: "124188601S",
      groupCode: "124188",
      title: "Oval Halo Diamond Engagement Ring",
      shortDescription: "Micro-pavé diamond halo framing an 8×6mm oval center with delicate gallery.",
      description:
        "Rich 14K yellow gold band paired with a luminous diamond halo.",
      metalType: "14K Yellow Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "engagement-rings",
      categoryName: "Engagement Rings",
      attributes: {
        "Center Fit": "8×6mm Oval",
        "Accent Total": "0.28 ctw",
        "Band Width": "1.8 mm",
        "Setting Style": "Micro-Pavé",
      },
      isFeatured: false,
      images: makeImage(2021, "halo-ring", "14K Yellow Gold", "Diamond"),
    },
    {
      id: 203,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "124188:602:P",
      supplierItemId: "124188602P",
      groupCode: "124188",
      title: "Oval Halo Diamond Engagement Ring",
      shortDescription: "Micro-pavé diamond halo framing an 8×6mm oval center with delicate gallery.",
      description:
        "Crafted in dense 950 Platinum for superior prong security and generational durability.",
      metalType: "Platinum",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "engagement-rings",
      categoryName: "Engagement Rings",
      attributes: {
        "Center Fit": "8×6mm Oval",
        "Accent Total": "0.28 ctw",
        "Band Width": "1.8 mm",
        Purity: "950 Platinum",
      },
      isFeatured: false,
      images: makeImage(2031, "halo-ring", "Platinum", "Diamond"),
    },
  ]),

  createGroup([
    {
      id: 301,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q12345Y",
      supplierItemId: "Q12345Y",
      groupCode: "Q12345",
      title: "Comfort-Fit Satin Wedding Band (5mm)",
      shortDescription: "Heavyweight 5mm domed band with satin brushed center and polished beveled edges.",
      description:
        "Engineered with a contoured interior court profile for effortless all-day wear. Available in half and quarter sizes from 5 to 14.",
      metalType: "14K Yellow Gold",
      primaryStone: null,
      merchandisingArea: "Wedding Bands",
      categorySlug: "wedding-bands",
      categoryName: "Wedding Bands",
      attributes: {
        Width: "5.0 mm",
        Profile: "Comfort-Fit",
        Finish: "Satin / Polished Edge",
        "Approx. Weight": "6.4 g",
      },
      isFeatured: false,
      images: makeImage(3011, "comfort-band", "14K Yellow Gold", null),
    },
    {
      id: 302,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q12345W",
      supplierItemId: "Q12345W",
      groupCode: "Q12345",
      title: "Comfort-Fit Satin Wedding Band (5mm)",
      shortDescription: "Heavyweight 5mm domed band with satin brushed center and polished beveled edges.",
      description:
        "14K white gold edition with crisp satin center and mirror-bright chamfered borders.",
      metalType: "14K White Gold",
      primaryStone: null,
      merchandisingArea: "Wedding Bands",
      categorySlug: "wedding-bands",
      categoryName: "Wedding Bands",
      attributes: {
        Width: "5.0 mm",
        Profile: "Comfort-Fit",
        Finish: "Satin / Rhodium Edge",
        "Approx. Weight": "6.5 g",
      },
      isFeatured: false,
      images: makeImage(3021, "comfort-band", "14K White Gold", null),
    },
    {
      id: 303,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q12345P",
      supplierItemId: "Q12345P",
      groupCode: "Q12345",
      title: "Comfort-Fit Satin Wedding Band (5mm)",
      shortDescription: "Heavyweight 5mm domed band with satin brushed center and polished beveled edges.",
      description:
        "Solid 950 Platinum comfort-fit wedding band with substantial heirloom heft.",
      metalType: "Platinum",
      primaryStone: null,
      merchandisingArea: "Wedding Bands",
      categorySlug: "wedding-bands",
      categoryName: "Wedding Bands",
      attributes: {
        Width: "5.0 mm",
        Profile: "Comfort-Fit",
        Finish: "Satin / Polished Edge",
        "Approx. Weight": "9.8 g",
      },
      isFeatured: false,
      images: makeImage(3031, "comfort-band", "Platinum", null),
    },
  ]),

  createGroup([
    {
      id: 401,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "123904:100:S",
      supplierItemId: "123904100S",
      groupCode: "123904",
      title: "French-Cut Pavé Half-Eternity Band",
      shortDescription: "Fifteen shared-prong round brilliant diamonds totaling 0.50 ctw.",
      description:
        "Low-profile gallery sits flush alongside solitaire and halo engagement rings while maximizing sparkle across the top half of the finger.",
      metalType: "14K Yellow Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "wedding-bands",
      categoryName: "Wedding Bands",
      attributes: {
        "Total Weight": "0.50 ctw",
        Width: "2.3 mm",
        "Diamond Quality": "G-H / SI1",
        "Ring Sizes": "4 – 9",
      },
      isFeatured: true,
      images: makeImage(4011, "eternity-band", "14K Yellow Gold", "Diamond"),
    },
    {
      id: 402,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "123904:101:S",
      supplierItemId: "123904101S",
      groupCode: "123904",
      title: "French-Cut Pavé Half-Eternity Band",
      shortDescription: "Fifteen shared-prong round brilliant diamonds totaling 0.50 ctw.",
      description:
        "14K white gold shared-prong diamond band with seamless side profile.",
      metalType: "14K White Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "wedding-bands",
      categoryName: "Wedding Bands",
      attributes: {
        "Total Weight": "0.50 ctw",
        Width: "2.3 mm",
        "Diamond Quality": "G-H / SI1",
        "Ring Sizes": "4 – 9",
      },
      isFeatured: false,
      images: makeImage(4021, "eternity-band", "14K White Gold", "Diamond"),
    },
    {
      id: 403,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "123904:102:S",
      supplierItemId: "123904102S",
      groupCode: "123904",
      title: "French-Cut Pavé Half-Eternity Band",
      shortDescription: "Fifteen shared-prong round brilliant diamonds totaling 0.50 ctw.",
      description:
        "Romantic 14K rose gold edition ideal for mixed-metal bridal stacks.",
      metalType: "14K Rose Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Bridal",
      categorySlug: "wedding-bands",
      categoryName: "Wedding Bands",
      attributes: {
        "Total Weight": "0.50 ctw",
        Width: "2.3 mm",
        "Diamond Quality": "G-H / SI1",
        "Ring Sizes": "4 – 9",
      },
      isFeatured: false,
      images: makeImage(4031, "eternity-band", "14K Rose Gold", "Diamond"),
    },
  ]),

  createGroup([
    {
      id: 501,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q44820Y",
      supplierItemId: "Q44820Y",
      groupCode: "Q44820",
      title: "Bezel-Set Solitaire Diamond Pendant",
      shortDescription: "0.50 ct round brilliant diamond suspended on an adjustable 16–18 in cable chain.",
      description:
        "A sleek full-bezel frame protects the diamond girdle while lending a clean, architectural warmth suited for everyday layering.",
      metalType: "14K Yellow Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Fine Neckwear",
      categorySlug: "necklaces-pendants",
      categoryName: "Necklaces & Pendants",
      attributes: {
        "Stone Weight": "0.50 ct",
        "Chain Length": "16–18 in Adjustable",
        Clasp: "Lobster Claw",
        Setting: "Full Bezel",
      },
      isFeatured: true,
      images: makeImage(5011, "pendant", "14K Yellow Gold", "Diamond"),
    },
    {
      id: 502,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q44820W",
      supplierItemId: "Q44820W",
      groupCode: "Q44820",
      title: "Bezel-Set Solitaire Diamond Pendant",
      shortDescription: "0.50 ct round brilliant diamond suspended on an adjustable 16–18 in cable chain.",
      description:
        "Crisp 14K white gold bezel setting on a diamond-cut cable chain.",
      metalType: "14K White Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Fine Neckwear",
      categorySlug: "necklaces-pendants",
      categoryName: "Necklaces & Pendants",
      attributes: {
        "Stone Weight": "0.50 ct",
        "Chain Length": "16–18 in Adjustable",
        Clasp: "Lobster Claw",
        Setting: "Full Bezel",
      },
      isFeatured: false,
      images: makeImage(5021, "pendant", "14K White Gold", "Diamond"),
    },
    {
      id: 503,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q44820R",
      supplierItemId: "Q44820R",
      groupCode: "Q44820",
      title: "Bezel-Set Solitaire Diamond Pendant",
      shortDescription: "0.50 ct round brilliant diamond suspended on an adjustable 16–18 in cable chain.",
      description:
        "Soft 14K rose gold bezel solitaire pendant with jump-ring length adjustment.",
      metalType: "14K Rose Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Fine Neckwear",
      categorySlug: "necklaces-pendants",
      categoryName: "Necklaces & Pendants",
      attributes: {
        "Stone Weight": "0.50 ct",
        "Chain Length": "16–18 in Adjustable",
        Clasp: "Lobster Claw",
        Setting: "Full Bezel",
      },
      isFeatured: false,
      images: makeImage(5031, "pendant", "14K Rose Gold", "Diamond"),
    },
  ]),

  createGroup([
    {
      id: 601,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "651842:100:S",
      supplierItemId: "651842100S",
      groupCode: "651842",
      title: "Four-Prong Martini Diamond Stud Earrings",
      shortDescription: "Matched 1.00 ctw round brilliant studs with secure La Poussette or screw backs.",
      description:
        "Tapered martini baskets nestle close to the ear without drooping. Available in custom carat weights from 0.50 ctw to 3.00 ctw.",
      metalType: "14K White Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Earwear",
      categorySlug: "earrings",
      categoryName: "Earrings",
      attributes: {
        "Total Weight": "1.00 ctw",
        Basket: "4-Prong Martini",
        Backings: "Heavy Friction / Screw",
        "Diamond Grade": "G / VS2",
      },
      isFeatured: true,
      images: makeImage(6011, "stud-earrings", "14K White Gold", "Diamond"),
    },
    {
      id: 602,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "651842:101:S",
      supplierItemId: "651842101S",
      groupCode: "651842",
      title: "Four-Prong Martini Diamond Stud Earrings",
      shortDescription: "Matched 1.00 ctw round brilliant studs with secure La Poussette or screw backs.",
      description:
        "Warm 14K yellow gold martini stud mountings set with matched round diamonds.",
      metalType: "14K Yellow Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Earwear",
      categorySlug: "earrings",
      categoryName: "Earrings",
      attributes: {
        "Total Weight": "1.00 ctw",
        Basket: "4-Prong Martini",
        Backings: "Heavy Friction / Screw",
        "Diamond Grade": "G / VS2",
      },
      isFeatured: false,
      images: makeImage(6021, "stud-earrings", "14K Yellow Gold", "Diamond"),
    },
    {
      id: 603,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "651842:102:P",
      supplierItemId: "651842102P",
      groupCode: "651842",
      title: "Four-Prong Martini Diamond Stud Earrings",
      shortDescription: "Matched 1.00 ctw round brilliant studs with secure La Poussette or screw backs.",
      description:
        "Hypoallergenic 950 Platinum martini diamond studs crafted for lifetime wear.",
      metalType: "Platinum",
      primaryStone: "Diamond",
      merchandisingArea: "Earwear",
      categorySlug: "earrings",
      categoryName: "Earrings",
      attributes: {
        "Total Weight": "1.00 ctw",
        Basket: "4-Prong Martini",
        Backings: "La Poussette Lock",
        Purity: "950 Platinum",
      },
      isFeatured: false,
      images: makeImage(6031, "stud-earrings", "Platinum", "Diamond"),
    },
  ]),

  createGroup([
    {
      id: 701,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q77210W",
      supplierItemId: "Q77210W",
      groupCode: "Q77210",
      title: "Classic Four-Prong Diamond Tennis Bracelet",
      shortDescription: "3.00 ctw calibrated round diamonds in a fluid articulated 7-inch box-clasp bracelet.",
      description:
        "Individually cast four-prong links drape effortlessly along the wrist with dual figure-eight safety catches.",
      metalType: "14K White Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Wristwear",
      categorySlug: "bracelets",
      categoryName: "Bracelets",
      attributes: {
        "Total Weight": "3.00 ctw",
        Length: "7.0 in",
        Clasp: "Box w/ Dual Safety",
        "Link Width": "2.8 mm",
      },
      isFeatured: true,
      images: makeImage(7011, "tennis-bracelet", "14K White Gold", "Diamond"),
    },
    {
      id: 702,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q77210Y",
      supplierItemId: "Q77210Y",
      groupCode: "Q77210",
      title: "Classic Four-Prong Diamond Tennis Bracelet",
      shortDescription: "3.00 ctw calibrated round diamonds in a fluid articulated 7-inch box-clasp bracelet.",
      description:
        "14K yellow gold articulated tennis bracelet with concealed box clasp and double safety latches.",
      metalType: "14K Yellow Gold",
      primaryStone: "Diamond",
      merchandisingArea: "Wristwear",
      categorySlug: "bracelets",
      categoryName: "Bracelets",
      attributes: {
        "Total Weight": "3.00 ctw",
        Length: "7.0 in",
        Clasp: "Box w/ Dual Safety",
        "Link Width": "2.8 mm",
      },
      isFeatured: false,
      images: makeImage(7021, "tennis-bracelet", "14K Yellow Gold", "Diamond"),
    },
  ]),

  createGroup([
    {
      id: 801,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "88412:200:P",
      supplierItemId: "88412200P",
      groupCode: "88412",
      title: "Emerald-Cut Sapphire & Baguette Three-Stone Ring",
      shortDescription: "Step-cut blue sapphire flanked by tapered baguette diamonds in an open gallery.",
      description:
        "Architectural emerald-cut natural sapphire paired with crisp straight-baguette diamond shoulders. Custom center stone sourcing available in-store.",
      metalType: "Platinum",
      primaryStone: "Sapphire",
      merchandisingArea: "Color & Estate",
      categorySlug: "gemstone-jewelry",
      categoryName: "Gemstone Jewelry",
      attributes: {
        "Center Stone": "8×6mm Emerald-Cut Sapphire",
        "Side Stones": "0.32 ctw Tapered Baguettes",
        Purity: "950 Platinum",
        "Gallery Height": "6.2 mm",
      },
      isFeatured: true,
      images: makeImage(8011, "three-stone-ring", "Platinum", "Sapphire"),
    },
    {
      id: 802,
      supplierCode: "stuller",
      supplierName: "Stuller",
      supplierSku: "88412:201:S",
      supplierItemId: "88412201S",
      groupCode: "88412",
      title: "Emerald-Cut Sapphire & Baguette Three-Stone Ring",
      shortDescription: "Step-cut blue sapphire flanked by tapered baguette diamonds in an open gallery.",
      description:
        "14K yellow gold setting creates rich royal-blue contrast against the step-cut sapphire.",
      metalType: "14K Yellow Gold",
      primaryStone: "Sapphire",
      merchandisingArea: "Color & Estate",
      categorySlug: "gemstone-jewelry",
      categoryName: "Gemstone Jewelry",
      attributes: {
        "Center Stone": "8×6mm Emerald-Cut Sapphire",
        "Side Stones": "0.32 ctw Tapered Baguettes",
        Finish: "High Polish",
        "Gallery Height": "6.2 mm",
      },
      isFeatured: false,
      images: makeImage(8021, "three-stone-ring", "14K Yellow Gold", "Sapphire"),
    },
  ]),

  createGroup([
    {
      id: 901,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q59104Y",
      supplierItemId: "Q59104Y",
      groupCode: "Q59104",
      title: "Akoya Cultured Pearl & Diamond Drop Earrings",
      shortDescription: "8.5mm AAA Japanese Akoya pearls suspended beneath bezel-set diamond accents.",
      description:
        "Lustrous rose-overtone cultured pearls sway gracefully from articulated 14K gold linear drops.",
      metalType: "14K Yellow Gold",
      primaryStone: "Pearl",
      merchandisingArea: "Fine Pearls",
      categorySlug: "earrings",
      categoryName: "Earrings",
      attributes: {
        "Pearl Size": "8.0–8.5 mm AAA",
        "Drop Length": "26 mm",
        "Diamond Accent": "0.14 ctw",
        Backings: "Post & Friction",
      },
      isFeatured: false,
      images: makeImage(9011, "pearl-drops", "14K Yellow Gold", "Pearl"),
    },
    {
      id: 902,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q59104W",
      supplierItemId: "Q59104W",
      groupCode: "Q59104",
      title: "Akoya Cultured Pearl & Diamond Drop Earrings",
      shortDescription: "8.5mm AAA Japanese Akoya pearls suspended beneath bezel-set diamond accents.",
      description:
        "14K white gold pearl drops with cool silver-white bridal elegance.",
      metalType: "14K White Gold",
      primaryStone: "Pearl",
      merchandisingArea: "Fine Pearls",
      categorySlug: "earrings",
      categoryName: "Earrings",
      attributes: {
        "Pearl Size": "8.0–8.5 mm AAA",
        "Drop Length": "26 mm",
        "Diamond Accent": "0.14 ctw",
        Backings: "Post & Friction",
      },
      isFeatured: false,
      images: makeImage(9021, "pearl-drops", "14K White Gold", "Pearl"),
    },
  ]),

  createGroup([
    {
      id: 1001,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q83019Y",
      supplierItemId: "Q83019Y",
      groupCode: "Q83019",
      title: "Natural Emerald Bezel Solitaire Pendant",
      shortDescription: "Vivid green round-cut natural emerald in a handcrafted bezel on an 18-inch chain.",
      description:
        "Rich botanical green emerald framed in luminous gold—an effortless signature piece or May birthstone heirloom.",
      metalType: "14K Yellow Gold",
      primaryStone: "Emerald",
      merchandisingArea: "Color & Birthstone",
      categorySlug: "gemstone-jewelry",
      categoryName: "Gemstone Jewelry",
      attributes: {
        "Stone Size": "6.0 mm Round",
        "Chain Length": "18 in Cable",
        Setting: "Handcrafted Bezel",
        Origin: "Natural Emerald",
      },
      isFeatured: false,
      images: makeImage(10011, "pendant", "14K Yellow Gold", "Emerald"),
    },
    {
      id: 1002,
      supplierCode: "quality_gold",
      supplierName: "Quality Gold",
      supplierSku: "Q83019W",
      supplierItemId: "Q83019W",
      groupCode: "Q83019",
      title: "Natural Emerald Bezel Solitaire Pendant",
      shortDescription: "Vivid green round-cut natural emerald in a handcrafted bezel on an 18-inch chain.",
      description:
        "14K white gold edition highlighting the cool brilliance of a vivid natural emerald.",
      metalType: "14K White Gold",
      primaryStone: "Emerald",
      merchandisingArea: "Color & Birthstone",
      categorySlug: "gemstone-jewelry",
      categoryName: "Gemstone Jewelry",
      attributes: {
        "Stone Size": "6.0 mm Round",
        "Chain Length": "18 in Cable",
        Setting: "Handcrafted Bezel",
        Origin: "Natural Emerald",
      },
      isFeatured: false,
      images: makeImage(10021, "pendant", "14K White Gold", "Emerald"),
    },
  ]),
];
