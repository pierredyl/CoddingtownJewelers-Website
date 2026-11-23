/**
 * Shared consumer-facing formatters for catalog descriptions, metals, and sizes.
 * Rules derived from a full audit of all 52,444 active Stuller catalog items.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&reg;": "®",
  "&trade;": "™",
  "&deg;": "°",
  "&ndash;": "–",
  "&mdash;": "—",
};

const B2B_INTERNAL_PATTERN =
  /\b(for\s+two[- ]tone\s+version|two[- ]tone\s+version\s*:|order\s+[a-z0-9]{4,}|mounting\s+only\s+is|matching\s+(earrings?|necklaces?|pendants?|rings?|bands?|bracelets?)\s*:|charm\s+only\s+is|item\s+number\s+\d{4,}|sold\s+sep[ae]rately)\b/i;

const BARE_DIMENSION_PATTERN =
  /^\d+(\.\d+)?\s*(mm|in|cm)(\s*x\s*\d+(\.\d+)?\s*(mm|in|cm))?$/i;

function decodeHtmlEntities(input: string): string {
  return input
    .replace(
      /&(nbsp|amp|quot|#39|apos|lt|gt|reg|trade|deg|ndash|mdash);/gi,
      (match) => HTML_ENTITY_MAP[match.toLowerCase()] ?? match
    )
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number.parseInt(code, 10);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    });
}

/**
 * Cleans raw supplier item descriptions for consumer display.
 * Returns `null` when the text is empty, broken HTML, a Stuller internal B2B note,
 * a slash-delimited spec dump, a bare dimension, or an exact duplicate of the title.
 */
export function formatItemDescription(
  rawDescription: string | null | undefined,
  title?: string | null
): string | null {
  if (!rawDescription) return null;

  let text = rawDescription
    // Drop embedded Stuller <img> tags completely
    .replace(/<img\b[^>]*>/gi, " ")
    // Turn structural HTML breaks into spaces so adjacent text doesn't smash together
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr)>/gi, " ")
    // Strip all remaining HTML tags (TinyMCE spans, fonts, strong, etc.)
    .replace(/<[^>]+>/g, "");

  text = decodeHtmlEntities(text);

  // Normalize whitespace and fix common Stuller spacing/typo quirks
  text = text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.([A-Z])/g, ". $1")
    .replace(/\bSeperately\b/g, "Separately")
    .replace(/\bseperately\b/g, "separately")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

  if (!text || text.length < 12) return null;

  // Reject bare dimensions like "15 mm x 10 mm"
  if (BARE_DIMENSION_PATTERN.test(text)) return null;

  // Reject slash-delimited spec dumps ("12720 / Band / 10K Yellow Gold / ...")
  if (text.split(" / ").length >= 4) return null;

  // Reject Stuller internal B2B ordering cross-references
  if (B2B_INTERNAL_PATTERN.test(text)) return null;

  // Reject exact (or punctuation-only) duplicates of the item title
  if (title) {
    const normDesc = text.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const normTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (normDesc && normDesc === normTitle) return null;
  }

  return text;
}

export interface ParsedMetal {
  raw: string;
  purity: string;
  purityOrder: number;
  color: string;
  colorOrder: number;
  swatch: string;
}

const PURITY_ORDER: Record<string, number> = {
  "10K Gold": 1,
  "14K Gold": 2,
  "18K Gold": 3,
  "22K Gold": 4,
  Platinum: 5,
  Palladium: 6,
  "Sterling Silver": 7,
  "Gold-Filled & Vermeil": 8,
  "Two-Tone & Mixed": 9,
  Alternative: 10,
  Other: 11,
};

const COLOR_ORDER: Record<string, number> = {
  Yellow: 1,
  White: 2,
  Rose: 3,
  "Two-Tone": 4,
  "Tri-Tone": 5,
  "Silver / Natural": 6,
};

export function getMetalSwatchColor(metalType: string | null | undefined): string {
  const n = (metalType ?? "").toLowerCase();
  if (
    (n.includes("white") && n.includes("yellow")) ||
    (n.includes("white") && n.includes("rose")) ||
    (n.includes("yellow") && n.includes("rose")) ||
    n.includes("&")
  ) {
    return "linear-gradient(135deg, #d8b25a 50%, #d8dde4 50%)";
  }
  if (n.includes("rose")) return "#d99f8c";
  if (n.includes("yellow")) return "#d5b162";
  if (n.includes("platinum") || n.includes("palladium")) return "#dfe3e8";
  if (n.includes("white")) return "#d6dbe2";
  if (n.includes("silver")) return "#cbd0d8";
  if (n.includes("steel") || n.includes("titanium")) return "#9aa1aa";
  return "#b8a890";
}

/**
 * Classifies any Stuller `metal_type` string into a clean Purity/Family group
 * and Color label for two-step metal pickers and sidebar filter grouping.
 */
export function parseMetalPurityAndColor(
  metalType: string | null | undefined
): ParsedMetal {
  const raw = (metalType ?? "").trim() || "Standard";
  const lower = raw.toLowerCase();

  const isPlatedOrFilled =
    lower.includes("gold-filled") ||
    lower.includes("vermeil") ||
    lower.includes("gold-plated");

  const isMixed =
    raw.includes("/") ||
    raw.includes("&");

  let purity = "Other";
  if (isPlatedOrFilled) {
    purity = "Gold-Filled & Vermeil";
  } else if (isMixed) {
    // Keep pure gold two-tone under its karat if single-karat (e.g. "14K White/Yellow Gold")
    const karatMatch = raw.match(/^(10K|14K|18K|22K)\b/i);
    if (karatMatch && !lower.includes("silver") && !lower.includes("platinum")) {
      purity = `${karatMatch[1].toUpperCase()} Gold`;
    } else {
      purity = "Two-Tone & Mixed";
    }
  } else if (/^10k\b/i.test(raw)) {
    purity = "10K Gold";
  } else if (/^14k\b/i.test(raw)) {
    purity = "14K Gold";
  } else if (/^18k\b/i.test(raw)) {
    purity = "18K Gold";
  } else if (/^22k\b/i.test(raw)) {
    purity = "22K Gold";
  } else if (lower.includes("platinum")) {
    purity = "Platinum";
  } else if (lower.includes("palladium")) {
    purity = "Palladium";
  } else if (lower.includes("silver")) {
    purity = "Sterling Silver";
  } else if (lower.includes("steel") || lower.includes("titanium")) {
    purity = "Alternative";
  }

  let color = "Silver / Natural";
  const hasWhite = lower.includes("white");
  const hasYellow = lower.includes("yellow");
  const hasRose = lower.includes("rose");
  const colorCount = Number(hasWhite) + Number(hasYellow) + Number(hasRose);

  if (colorCount >= 3) {
    color = "Tri-Tone";
  } else if (colorCount === 2 || isMixed) {
    color = "Two-Tone";
  } else if (hasYellow) {
    color = "Yellow";
  } else if (hasWhite) {
    color = "White";
  } else if (hasRose) {
    color = "Rose";
  }

  return {
    raw,
    purity,
    purityOrder: PURITY_ORDER[purity] ?? 99,
    color,
    colorOrder: COLOR_ORDER[color] ?? 99,
    swatch: getMetalSwatchColor(raw),
  };
}

/**
 * Filters out known Stuller data-entry typos in length attributes
 * (e.g. "7 In7 In", "7 1/2 Mm" on bracelets) while keeping valid lengths.
 */
export function isCleanLengthOption(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/In\s*\d/i.test(v)) return false; // e.g. "7 In7 In"
  if (/\bMm\b/i.test(v)) return false; // unit typo for bracelets/necklaces
  return true;
}

/**
 * Parses leading numeric values including mixed fractions ("7 1/2 In" -> [7.5])
 * and W x H dimensions ("7 x 5 mm" -> [7, 5]) for accurate ascending order.
 */
function parseDimensionNumbers(label: string): number[] {
  const s = label.trim();
  // Match "7 x 5 mm" or "10.5 x 8.5 mm"
  const dimMatch = s.match(
    /^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
  );
  if (dimMatch) {
    return [parseFloat(dimMatch[1]), parseFloat(dimMatch[2])];
  }
  // Match mixed fraction "7 1/2" or simple fraction "1/2" or decimal "6.5"
  const mixedMatch = s.match(
    /^(\d+(?:\.\d+)?)(?:\s+(\d+)\s*\/\s*(\d+))?/
  );
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    if (mixedMatch[2] && mixedMatch[3]) {
      const denom = parseFloat(mixedMatch[3]);
      if (denom > 0) return [whole + parseFloat(mixedMatch[2]) / denom];
    }
    return [whole];
  }
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)/);
  if (fracMatch) {
    const denom = parseFloat(fracMatch[2]);
    if (denom > 0) return [parseFloat(fracMatch[1]) / denom];
  }
  return [];
}

/**
 * Sorts ring sizes, inch lengths, or mm dimensions numerically
 * (e.g., 5, 5.5, 6, 6 1/2, 7, 7 1/2 In, 16 In, 18 In, 7 x 5 mm, 10 x 8 mm).
 */
export function compareSizeOrLength(a: string, b: string): number {
  const numsA = parseDimensionNumbers(a);
  const numsB = parseDimensionNumbers(b);
  const len = Math.min(numsA.length, numsB.length);
  for (let i = 0; i < len; i++) {
    if (numsA[i] !== numsB[i]) {
      return numsA[i] - numsB[i];
    }
  }
  if (numsA.length !== numsB.length && (numsA.length > 0 || numsB.length > 0)) {
    return numsA.length - numsB.length;
  }
  return a.localeCompare(b, undefined, { numeric: true });
}
