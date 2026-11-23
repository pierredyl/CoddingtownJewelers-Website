/**
 * Central Editorial Image Asset Registry (Non-Catalogue Images)
 *
 * Tracks every editorial photograph in `public/images/` so no two sections
 * accidentally reuse the same image. All active banners and showcase photos
 * are upscaled to 2560px wide (2K QHD) for crisp rendering on high-DPI displays.
 */

export interface SiteImageRecord {
  path: string;
  status: "used" | "unused";
  slot: string | null;
  subject: string;
}

/**
 * 1-to-1 unique image assignments for every non-catalogue section on the site.
 * Import from `SITE_IMAGES` instead of hardcoding `/images/...` paths.
 */
export const SITE_IMAGES = {
  // Home Page (`/`)
  homeHero: "/images/hero-home-dark.jpg",
  serviceRepairs: "/images/service-repairs-bench.jpg",
  serviceCleaning: "/images/service-cleaning.jpg",
  servicePersonalize: "/images/service-personalize.jpg",
  homeHeritage: "/images/heritage-vintage-bw.jpg",
  homeContact: "/images/gallery-showcase.jpg",

  // Catalogue Landing (`/catalogue`)
  catalogRingsBanner: "/images/gallery-bridal.jpg",
  catalogNecklacesBanner: "/images/cat-womens-necklaces.jpg",
  catalogBraceletsBanner: "/images/cat-womens-bracelets.jpg",
  catalogEarringsBanner: "/images/banner-earrings-diamond-showcase.jpg",
  catalogGemstoneBanner: "/images/cat-gemstone-jewelry.jpg",
} as const;

export const SITE_LOGO_OPTIONS = {
  classicSerif: "/images/logo-classic-serif.png",
  monogramCrest: "/images/logo-monogram-crest.png",
  artisanalScript: "/images/logo-artisanal-script.png",
} as const;

/**
 * Complete inventory of `public/images/` — used slots vs. available reserve pool.
 */
export const SITE_IMAGE_REGISTRY: SiteImageRecord[] = [
  // Active (Used) — 11 unique 2K editorial slots
  {
    path: SITE_IMAGES.homeHero,
    status: "used",
    slot: "Home — Hero Banner",
    subject: "Diamond engagement ring, 18K gold band, tennis bracelet & gold chain",
  },
  {
    path: SITE_IMAGES.serviceRepairs,
    status: "used",
    slot: "Home — Services: Repairs & Sizing",
    subject: "18K gold diamond ring in wooden bench clamp with loose diamonds, pliers & gold chain (no hands)",
  },
  {
    path: SITE_IMAGES.serviceCleaning,
    status: "used",
    slot: "Home — Services: Complimentary Cleaning",
    subject: "Sparkling diamond studs, pavé band & silver/gold chain on ivory linen",
  },
  {
    path: SITE_IMAGES.servicePersonalize,
    status: "used",
    slot: "Home — Services: Personalize & Order",
    subject: "Loose sapphire, emerald & diamond beside 18K gold mounting & calipers",
  },
  {
    path: SITE_IMAGES.homeHeritage,
    status: "used",
    slot: "Home — 1974 Family Heritage (B&W)",
    subject: "Archival black-and-white jeweler's bench, loupe, ring mandrel & bands",
  },
  {
    path: SITE_IMAGES.homeContact,
    status: "used",
    slot: "Home — Reach Coddingtown Jewelers Background",
    subject: "Warm oak jewelry display case with classic forest green velvet necklace stands, ring blocks, and bracelet pads",
  },
  {
    path: SITE_IMAGES.catalogRingsBanner,
    status: "used",
    slot: "Catalogue — Rings Banner",
    subject: "Bridal diamond engagement ring & wedding band macro showcase",
  },
  {
    path: SITE_IMAGES.catalogNecklacesBanner,
    status: "used",
    slot: "Catalogue — Necklaces & Chains Banner",
    subject: "Gold chains and diamond pendant necklaces editorial arrangement",
  },
  {
    path: SITE_IMAGES.catalogBraceletsBanner,
    status: "used",
    slot: "Catalogue — Bracelets Banner",
    subject: "Diamond tennis bracelet, gold chain & bangle editorial showcase",
  },
  {
    path: SITE_IMAGES.catalogEarringsBanner,
    status: "used",
    slot: "Catalogue — Earrings Banner",
    subject: "18K gold hoops, diamond drops & sterling silver huggies on dark slate",
  },
  {
    path: SITE_IMAGES.catalogGemstoneBanner,
    status: "used",
    slot: "Catalogue — Gemstone Jewelry Banner",
    subject: "Emerald, royal blue sapphire & ruby diamond halo rings on stone",
  },

  // Reserve Pool (Unused — ready for future sections or swaps)
  {
    path: "/images/gallery-craftsmanship.jpg",
    status: "unused",
    slot: null,
    subject: "Bench jeweler hands inspecting an 18K gold diamond ring under warm light",
  },
  {
    path: "/images/hero-editorial.jpg",
    status: "unused",
    slot: null,
    subject: "Sunlit editorial hero jewelry arrangement on warm stone",
  },
  {
    path: "/images/banner-earrings-diamonds-dark.jpg",
    status: "unused",
    slot: null,
    subject: "Diamond drops, halo studs & pavé hoops on dark obsidian slate",
  },
  {
    path: "/images/banner-earrings-editorial.jpg",
    status: "unused",
    slot: null,
    subject: "Gold hoops, diamond drops & silver huggies on slate and travertine",
  },
  {
    path: "/images/cat-womens-engagement.jpg",
    status: "unused",
    slot: null,
    subject: "Women's diamond engagement ring editorial close-up",
  },
  {
    path: "/images/cat-womens-wedding-bands.jpg",
    status: "unused",
    slot: null,
    subject: "Women's diamond & gold wedding bands",
  },
  {
    path: "/images/cat-womens-fashion-rings.jpg",
    status: "unused",
    slot: null,
    subject: "Women's stackable & fashion gold rings",
  },
  {
    path: "/images/cat-mens-wedding-bands.jpg",
    status: "unused",
    slot: null,
    subject: "Men's gold & platinum wedding bands",
  },
  {
    path: "/images/cat-mens-rings.jpg",
    status: "unused",
    slot: null,
    subject: "Men's signet & statement rings",
  },
  {
    path: "/images/cat-mens-earrings.jpg",
    status: "unused",
    slot: null,
    subject: "18K gold diamond solitaire studs on obsidian stone",
  },
];
