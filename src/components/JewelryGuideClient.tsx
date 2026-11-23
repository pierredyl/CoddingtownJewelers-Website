"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { SITE_CONFIG, getPhoneHref } from "@/config/site";

const QUICK_NAV = [
  { id: "how-it-works", label: "How It Works" },
  { id: "ring-sizing", label: "Ring Sizing & Resizing" },
  { id: "band-widths", label: "Band Widths & Fit" },
  { id: "chains-bracelets", label: "Chain & Bracelet Lengths" },
  { id: "metals", label: "Metals" },
  { id: "stones", label: "Diamonds & Gemstones" },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    step: "1",
    title: "Browse at Your Own Pace",
    body: "Explore the catalogue by style, metal, or stone. There is no account required and no checkout pressure.",
  },
  {
    step: "2",
    title: "Pick Your Options & Note the Item #",
    body: "Click any piece to try different gold colors, sizes, or lengths. Your Item Number updates automatically as you personalize.",
  },
  {
    step: "3",
    title: "Call, Email, or Stop By",
    body: "Share that Item # with us and we will check current pricing, availability, or help you try similar styles in person.",
  },
] as const;

const CAN_RESIZE = [
  "10K, 14K, and 18K yellow, white, or rose gold bands",
  "Platinum solitaires and classic wedding bands",
  "Sterling silver everyday rings",
  "Rings with side stones that stop halfway down the band",
] as const;

const CANNOT_RESIZE = [
  "Full eternity bands (diamonds or gems set all the way around)",
  "Tungsten, titanium, cobalt, and ceramic bands",
  "Heavily engraved or patterned bands that wrap completely around",
  "Tension-set rings where pressure holds the center stone",
] as const;

const BAND_WIDTHS = [
  {
    mm: "1.5 – 2 mm",
    barPx: 6,
    name: "Delicate",
    feel: "Dainty and lightweight. Popular for minimalist engagement rings and stacking multiple bands together.",
  },
  {
    mm: "2.5 – 3.5 mm",
    barPx: 11,
    name: "Classic",
    feel: "The everyday sweet spot. Substantial enough to feel solid on the finger while staying comfortable and timeless.",
  },
  {
    mm: "4 – 5 mm",
    barPx: 17,
    name: "Substantial",
    feel: "A balanced medium-wide band. Very popular for standalone women's bands and slim men's wedding rings.",
  },
  {
    mm: "6 – 8 mm",
    barPx: 26,
    name: "Bold",
    feel: "Strong presence on the hand. The most common choice for men's classic, beveled, or comfort-fit wedding bands.",
  },
] as const;

const NECKLACE_LENGTHS = [
  {
    id: "16",
    size: '16"',
    fit: "Collarbone",
    note: "Sits neatly at the base of the neck. Ideal for delicate pendants and layering.",
    path: "M148 114 Q180 154 212 114",
    lineY: 134,
    labelY: 138,
    shortLabel: "Collarbone",
  },
  {
    id: "18",
    size: '18"',
    fit: "Classic Everyday",
    note: "The most popular women's length. Rests just below the collarbone.",
    path: "M145 115 Q180 186 215 115",
    lineY: 156,
    labelY: 160,
    shortLabel: "Classic",
  },
  {
    id: "20",
    size: '20"',
    fit: "Upper Chest",
    note: "Comfortable pendant drop for women and the most common everyday men's chain length.",
    path: "M143 116 Q180 222 217 116",
    lineY: 182,
    labelY: 186,
    shortLabel: "Upper chest",
  },
  {
    id: "22",
    size: '22"',
    fit: "Mid Chest",
    note: "Relaxed drop for larger pendants, heavier men's chains, or layered styles.",
    path: "M141 117 Q180 264 219 117",
    lineY: 210,
    labelY: 214,
    shortLabel: "Mid chest",
  },
  {
    id: "24",
    size: '24"',
    fit: "Lower Chest",
    note: "Long, easy drape that slips over the head on many styles and frames bold pendants.",
    path: "M139 118 Q180 310 221 118",
    lineY: 238,
    labelY: 242,
    shortLabel: "Lower chest",
  },
] as const;

const BRACELET_LENGTHS = [
  {
    size: '6.5"',
    fit: "Petite Wrist",
    note: "Tailored fit for smaller wrists.",
  },
  {
    size: '7"',
    fit: "Standard Women's",
    note: "Most common women's length with comfortable movement.",
  },
  {
    size: '7.5"',
    fit: "Relaxed / Slim Men's",
    note: "Looser drape for women or a closer fit for slimmer men's wrists.",
  },
  {
    size: '8"+',
    fit: "Standard Men's",
    note: "The go-to length for men's link, curb, and box chains.",
  },
] as const;

const METAL_TYPES = [
  {
    name: "10K Gold",
    swatch: "#d4af37",
    summary:
      "The hardest and most budget-friendly gold option. Great for everyday chains, rings, and pieces that see heavy daily wear.",
  },
  {
    name: "14K Gold",
    swatch: "#e5c158",
    summary:
      "The most popular choice for engagement rings, wedding bands, and daily wear, balancing warm color with lasting strength.",
  },
  {
    name: "18K Gold",
    swatch: "#f0c850",
    summary:
      "Deeper, richer gold tone with a noticeably luxurious feel. Slightly softer than 14K and lovely for heirloom pieces.",
  },
  {
    name: "Yellow, White & Rose Gold",
    swatch: "#e6b8a2",
    summary:
      "All real gold blended for color. White gold is finished with bright rhodium plating that can be refreshed every few years to keep its crisp shine.",
  },
  {
    name: "Platinum",
    swatch: "#d8dce0",
    summary:
      "Naturally white, noticeably weighty, and hypoallergenic. A great pick for sensitive skin that never needs replating.",
  },
  {
    name: "Sterling Silver",
    swatch: "#e5e7eb",
    summary:
      "Bright, lightweight, and approachable for everyday chains, bracelets, and fashion rings. Wipe occasionally with a soft polishing cloth.",
  },
] as const;

const STONE_SHAPES = [
  { name: "Round", note: "Maximum sparkle and timeless appeal." },
  { name: "Oval", note: "Soft silhouette that flatters and elongates the finger." },
  { name: "Emerald", note: "Clean step-cut facets with a sleek hall-of-mirrors look." },
  { name: "Pear", note: "Graceful teardrop shape for rings and pendants." },
  { name: "Cushion", note: "Rounded pillow corners with romantic brilliance." },
  { name: "Princess", note: "Crisp square corners with modern fire." },
] as const;

export function JewelryGuideClient() {
  const [highlightedLength, setHighlightedLength] = useState<string>("18");
  const phoneHref = getPhoneHref();

  return (
    <div className="w-full bg-[#f2ede4] text-obsidian">
      {/* 1. Welcoming Hero Header */}
      <section
        aria-labelledby="guide-heading"
        className="border-b border-obsidian/10 bg-[#faf7f1]"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <h1
              id="guide-heading"
              className="font-display text-4xl font-bold leading-[1.1] tracking-normal text-obsidian sm:text-5xl lg:text-6xl"
            >
              A simple guide to choosing jewelry.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-secondary sm:text-lg">
              You do not need to be a jewelry expert to find the right piece.
              Here is a plain-English walkthrough of sizing, band widths, chain
              lengths, and metals so you can browse comfortably at your own
              pace.
            </p>
          </motion.div>

          {/* Quick-Jump Section Pills */}
          <nav
            aria-label="Guide sections"
            className="mt-8 flex flex-wrap gap-2.5"
          >
            {QUICK_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-pill border border-obsidian/15 bg-[#f2ede4] px-4 py-2 text-xs font-semibold tracking-wide text-obsidian transition-colors hover:border-obsidian hover:bg-obsidian hover:text-canvas"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* 2. How This Site Works (Dark Editorial Accent Band) */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        className="scroll-mt-24 border-b border-gold/20 bg-[#1a1816] py-16 text-canvas sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2
              id="how-it-works-heading"
              className="font-display text-3xl font-bold tracking-normal text-canvas sm:text-4xl"
            >
              How browsing our catalogue works
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-canvas/80 sm:text-base">
              Think of our website as a relaxed window-shopping shelf you can
              explore from home before talking with a real person.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.45,
                  delay: idx * 0.08,
                  ease: "easeOut",
                }}
                className="rounded-card border border-canvas/15 bg-canvas/5 p-6"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/60 font-mono text-xs font-semibold text-gold-light">
                  {item.step}
                </span>
                <h3 className="mt-4 font-serif text-2xl font-semibold text-canvas">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-canvas/80">
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Ring Sizing & What Can / Can't Be Resized */}
      <section
        id="ring-sizing"
        aria-labelledby="ring-sizing-heading"
        className="scroll-mt-24 border-b border-obsidian/10 bg-[#f2ede4] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h2
              id="ring-sizing-heading"
              className="font-display text-3xl font-bold tracking-normal text-obsidian sm:text-4xl"
            >
              Ring Sizing &amp; Resizing
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-secondary">
              Most women wear between size 6 and 7, and most men wear between
              size 9 and 10. Not sure of your size? Stop by anytime and we can
              size your finger or an existing ring in seconds.
            </p>
          </motion.div>

          {/* Can vs. Can't Be Resized Comparison */}
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-6 shadow-xs sm:p-8"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-status-success-bg text-status-success">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="font-serif text-2xl font-semibold text-obsidian">
                  Can Usually Be Resized
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Look for the{" "}
                <strong className="font-semibold text-obsidian">Sizable</strong>{" "}
                filter in our catalogue if you are buying a surprise or want
                flexibility later.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-obsidian/90">
                {CAN_RESIZE.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-status-success"
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
              className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-6 shadow-xs sm:p-8"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-status-error-bg text-status-error">
                  <X className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="font-serif text-2xl font-semibold text-obsidian">
                  Limited or Cannot Be Resized
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                These styles are ordered to your exact finger size instead of
                being adjusted after the fact.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-obsidian/90">
                {CANNOT_RESIZE.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <X
                      className="mt-0.5 h-4 w-4 shrink-0 text-status-error"
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. Band Widths, Fit & Profile (Visual Millimeter Scale) */}
      <section
        id="band-widths"
        aria-labelledby="band-widths-heading"
        className="scroll-mt-24 border-b border-obsidian/10 bg-[#e4dccf] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h2
              id="band-widths-heading"
              className="font-display text-3xl font-bold tracking-normal text-obsidian sm:text-4xl"
            >
              Band Widths &amp; Inside Fit
            </h2>
            <p className="mt-3 text-base leading-relaxed text-obsidian/80">
              Band width is measured in millimeters across the top of the ring.
              Even a 1 mm difference noticeably changes how bold a band looks on
              the hand.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BAND_WIDTHS.map((band, idx) => (
              <motion.div
                key={band.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.45,
                  delay: idx * 0.06,
                  ease: "easeOut",
                }}
                className="flex flex-col rounded-card border border-obsidian/12 bg-[#faf7f1] p-6 shadow-xs"
              >
                {/* Visual Proportional Band Strip */}
                <div className="flex h-12 items-center">
                  <span
                    aria-hidden="true"
                    style={{ height: `${band.barPx}px` }}
                    className="w-full rounded-full bg-gradient-to-r from-[#b88930] via-[#e5c470] to-[#b88930] shadow-xs"
                  />
                </div>
                <span className="mt-3 font-mono text-xs font-semibold text-gold-deep">
                  {band.mm}
                </span>
                <h3 className="mt-1 font-serif text-2xl font-semibold text-obsidian">
                  {band.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {band.feel}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Comfort-Fit vs Standard Fit + Profiles */}
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-6">
              <h3 className="font-serif text-xl font-semibold text-obsidian">
                Comfort-Fit vs. Standard Fit
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                <strong className="text-obsidian">Comfort-Fit</strong> bands are
                gently rounded on the inside so they glide smoothly over the
                knuckle, which is especially nice on wider 5 mm to 8 mm bands.{" "}
                <strong className="text-obsidian">Standard Fit</strong> bands
                sit flat against the finger and feel light on slimmer rings.
              </p>
            </div>
            <div className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-6">
              <h3 className="font-serif text-xl font-semibold text-obsidian">
                Common Band Shapes
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                <strong className="text-obsidian">Half Round (Domed)</strong> is
                the traditional curved look,{" "}
                <strong className="text-obsidian">Flat</strong> gives a crisp
                modern edge, and{" "}
                <strong className="text-obsidian">Knife Edge</strong> rises to a
                subtle ridge in the center to catch extra light.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Necklace & Bracelet Lengths (Interactive Chain Diagram Kept!) */}
      <section
        id="chains-bracelets"
        aria-labelledby="chains-heading"
        className="scroll-mt-24 border-b border-obsidian/10 bg-[#f2ede4] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h2
              id="chains-heading"
              className="font-display text-3xl font-bold tracking-normal text-obsidian sm:text-4xl"
            >
              Where Chains Hit &amp; Bracelet Sizing
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-secondary">
              Hover or tap any length below to see where it typically rests on
              the neckline.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Preserved Visual Chain-Length Diagram (Now Interactive!) */}
            <figure className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-6 shadow-xs sm:p-8 lg:col-span-6">
              <div className="mx-auto max-w-md">
                <svg
                  viewBox="0 0 360 300"
                  role="img"
                  aria-labelledby="necklace-diagram-title necklace-diagram-desc"
                  className="h-auto w-full"
                >
                  <title id="necklace-diagram-title">
                    Visual guide to necklace chain lengths on the neck and chest
                  </title>
                  <desc id="necklace-diagram-desc">
                    Minimalist neck and shoulder silhouette showing where 16
                    inch, 18 inch, 20 inch, 22 inch, and 24 inch chains drape on
                    the body.
                  </desc>

                  <path
                    d="M142 18 C142 52 152 72 152 92 C152 106 136 116 96 126 C64 134 40 152 34 186 L34 288 L326 288 L326 186 C320 152 296 134 264 126 C224 116 208 106 208 92 C208 72 218 52 218 18"
                    fill="#fcfaf5"
                    stroke="#d4bc84"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M116 142 Q156 150 176 144 M244 142 Q204 150 184 144"
                    fill="none"
                    stroke="#e6cf98"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />

                  {NECKLACE_LENGTHS.map((len) => {
                    const active = highlightedLength === len.id;
                    return (
                      <g
                        key={len.id}
                        onMouseEnter={() => setHighlightedLength(len.id)}
                        onClick={() => setHighlightedLength(len.id)}
                        className="cursor-pointer"
                      >
                        <path
                          d={len.path}
                          fill="none"
                          stroke={active ? "#785314" : "#111111"}
                          strokeOpacity={active ? 1 : 0.35}
                          strokeWidth={active ? 2.8 : 1.5}
                          className="transition-all duration-200"
                        />
                        <line
                          x1="180"
                          y1={len.lineY}
                          x2="262"
                          y2={len.lineY}
                          stroke={active ? "#785314" : "#d4bc84"}
                          strokeDasharray="3 3"
                          strokeWidth={active ? 1.4 : 1}
                        />
                        <text
                          x="268"
                          y={len.labelY}
                          fontSize="11"
                          fontWeight={active ? "700" : "600"}
                          fill={active ? "#785314" : "#111111"}
                          fontFamily="var(--font-mono)"
                        >
                          {len.size}
                        </text>
                        <text
                          x="292"
                          y={len.labelY}
                          fontSize="10"
                          fontWeight={active ? "600" : "400"}
                          fill={active ? "#785314" : "#696052"}
                        >
                          {len.shortLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <figcaption className="mt-4 text-center text-xs text-ink-muted">
                Approximate drape on an average frame. Actual fit varies
                slightly by neck size and pendant height.
              </figcaption>
            </figure>

            {/* Interactive Length Cards */}
            <div className="space-y-3 lg:col-span-6">
              {NECKLACE_LENGTHS.map((len) => {
                const active = highlightedLength === len.id;
                return (
                  <button
                    key={len.id}
                    type="button"
                    onMouseEnter={() => setHighlightedLength(len.id)}
                    onFocus={() => setHighlightedLength(len.id)}
                    onClick={() => setHighlightedLength(len.id)}
                    className={`flex w-full items-start gap-4 rounded-card border p-4 text-left transition-all duration-200 ${
                      active
                        ? "border-gold bg-[#faf7f1] shadow-sm"
                        : "border-obsidian/10 bg-[#faf7f1]/60 hover:border-obsidian/30"
                    }`}
                  >
                    <span
                      className={`w-10 shrink-0 font-mono text-base font-bold ${
                        active ? "text-gold-deep" : "text-obsidian"
                      }`}
                    >
                      {len.size}
                    </span>
                    <div>
                      <span className="font-serif text-lg font-semibold text-obsidian">
                        {len.fit}
                      </span>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
                        {len.note}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bracelet Lengths Row */}
          <div className="mt-12 border-t border-obsidian/10 pt-10">
            <h3 className="font-serif text-2xl font-semibold text-obsidian">
              Bracelet Lengths at a Glance
            </h3>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Buying a gift without knowing their wrist size? Use the{" "}
              <strong className="text-obsidian">Adjustable Length</strong>{" "}
              filter in our catalogue for an easy fit.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BRACELET_LENGTHS.map((b) => (
                <div
                  key={b.size}
                  className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-5"
                >
                  <span className="font-mono text-sm font-bold text-gold-deep">
                    {b.size}
                  </span>
                  <h4 className="mt-1 font-serif text-lg font-semibold text-obsidian">
                    {b.fit}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                    {b.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Metals Made Simple (No "pure gold / pure platinum" percentages) */}
      <section
        id="metals"
        aria-labelledby="metals-heading"
        className="scroll-mt-24 border-b border-obsidian/10 bg-[#e4dccf] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h2
              id="metals-heading"
              className="font-display text-3xl font-bold tracking-normal text-obsidian sm:text-4xl"
            >
              Choosing a Metal
            </h2>
            <p className="mt-3 text-base leading-relaxed text-obsidian/80">
              Metal choice shapes color, weight, skin comfort, and how well a
              piece handles daily life.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {METAL_TYPES.map((metal, idx) => (
              <motion.div
                key={metal.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.45,
                  delay: idx * 0.05,
                  ease: "easeOut",
                }}
                className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-6 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: metal.swatch }}
                    className="h-4 w-4 shrink-0 rounded-full border border-obsidian/20"
                  />
                  <h3 className="font-serif text-xl font-semibold text-obsidian">
                    {metal.name}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                  {metal.summary}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Diamonds & Gemstones Made Simple */}
      <section
        id="stones"
        aria-labelledby="stones-heading"
        className="scroll-mt-24 border-b border-obsidian/10 bg-[#f2ede4] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h2
              id="stones-heading"
              className="font-display text-3xl font-bold tracking-normal text-obsidian sm:text-4xl"
            >
              Diamonds &amp; Gemstones Made Simple
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-secondary">
              A quick cheat sheet on natural vs. lab-grown stones and the most
              popular cuts you will see in our catalogue.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-6">
              <h3 className="font-serif text-2xl font-semibold text-obsidian">
                Natural vs. Lab-Grown Diamonds
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-secondary">
                Both are real diamonds with the exact same brilliance and
                durability. Natural diamonds formed underground over billions of
                years, while lab-grown diamonds are grown in a controlled
                environment and often allow a larger stone for your budget. You
                can filter by either inside our catalogue.
              </p>
            </div>
            <div className="rounded-card border border-obsidian/12 bg-[#faf7f1] p-6">
              <h3 className="font-serif text-2xl font-semibold text-obsidian">
                Complete Ring vs. Mounting Only
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-secondary">
                Some engagement rings are shown ready to wear, while others are
                semi-mounts or mountings so you can hand-pick your exact center
                diamond or gemstone with us at the counter.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STONE_SHAPES.map((shape) => (
              <div
                key={shape.name}
                className="rounded-card border border-obsidian/10 bg-[#faf7f1] p-5"
              >
                <h3 className="font-serif text-lg font-semibold text-obsidian">
                  {shape.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                  {shape.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Warm Closing CTA */}
      <section className="bg-[#1a1816] py-16 text-canvas sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-bold tracking-normal text-canvas sm:text-4xl">
                Ready to explore?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-canvas/80 sm:text-base">
                Browse the catalogue whenever you are ready, or call or stop by
                with any questions. We are always happy to help.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-canvas/80">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-gold-light" aria-hidden="true" />
                  {SITE_CONFIG.address}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold-light" aria-hidden="true" />
                  {SITE_CONFIG.hours}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/catalogue"
                className="inline-flex items-center gap-2 rounded-pill bg-gold px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-obsidian transition-colors hover:bg-gold-light"
              >
                <span>Browse Catalogue</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href={phoneHref}
                className="inline-flex items-center gap-2 rounded-pill border border-canvas/30 bg-canvas/10 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-canvas transition-colors hover:border-gold hover:text-gold-light"
              >
                <Phone className="h-3.5 w-3.5 text-gold-light" aria-hidden="true" />
                <span>{SITE_CONFIG.phone}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
