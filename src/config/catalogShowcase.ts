import { SITE_IMAGES } from "./siteImages";

export interface ShowcaseCardConfig {
  id: string;
  slug: string;
  title: string;
  genderLabel?: "Women's" | "Men's";
  subtitle: string;
  href: string;
  /**
   * Optional manual SKU override — we fetch this SKU's primary studio image from
   * Supabase automatically. Change this SKU to swap a card's cover photo anytime!
   */
  preferredSku?: string;
  /**
   * Optional direct image URL (e.g. "/images/my-ring.jpg" or an https:// URL).
   * Takes priority over `preferredSku` if set.
   */
  preferredImageUrl?: string;
  /** Built-in high-quality fallback image URL if the preferred SKU isn't in DB */
  fallbackImageUrl?: string;
}

export interface StorePhotoConfig {
  id: string;
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  caption: string;
}

/**
 * Two dedicated store photography slots on the Home Page (`/`).
 * Replace `src` with your own photographs (e.g. "/images/store-1.jpg", "/images/store-2.jpg")
 * whenever you're ready!
 */
export const HOME_STORE_PHOTOS: StorePhotoConfig[] = [
  {
    id: "store-interior",
    src: "/images/gallery-showcase.jpg",
    alt: "Warm walnut and brushed brass display cases filled with fine gold and diamond jewelry",
    eyebrow: "Our Store",
    title: "Inside Coddingtown Center",
    caption:
      "Stop by seven days a week to see diamonds, gold chains, and gemstones in person.",
  },
  {
    id: "store-bench",
    src: "/images/gallery-craftsmanship.jpg",
    alt: "Master bench jeweler inspecting an 18K yellow gold diamond ring under warm bench light",
    eyebrow: "On-Site Craftsmanship",
    title: "In-House Sizing & Care",
    caption:
      "Ring resizing, stone setting, and repairs handled carefully right on premises.",
  },
];

export interface StyleCarouselTileConfig {
  id: string;
  label: string;
  href: string;
  /** Manual Item # (SKU) for full control over this style tile's image */
  preferredSku: string;
  /** Optional direct image URL override (takes priority over preferredSku) */
  preferredImageUrl?: string;
  /** Fallback image URL if preferredSku isn't available */
  fallbackImageUrl?: string;
}

export interface ShowcaseSectionConfig {
  id: string;
  eyebrow: string;
  title: string;
  tagline: string;
  bannerImageUrl: string;
  bannerAlt: string;
  viewAllHref: string;
  sampleSlugs: string[];
  /**
   * Full manual control over the Style / Type carousel tiles in this section.
   * Edit `preferredSku` or `preferredImageUrl` on any tile to swap its photo.
   */
  styleCarouselTiles: StyleCarouselTileConfig[];
  /**
   * Curated Item #s used for the Home Page sample jewelry strip.
   */
  featuredCarouselSkus: string[];
  cards: ShowcaseCardConfig[];
}

/**
 * Organized Catalogue Sections — Women's listed first in every section.
 * Edit `bannerImageUrl` or `styleCarouselTiles` below for full control over imagery & carousels.
 */
export const CATALOG_SHOWCASE_SECTIONS: ShowcaseSectionConfig[] = [
  {
    id: "rings",
    eyebrow: "01 · Rings",
    title: "Rings",
    tagline:
      "Diamond engagement rings, classic wedding bands & everyday styles in gold and platinum.",
    bannerImageUrl: SITE_IMAGES.catalogRingsBanner,
    bannerAlt:
      "Platinum diamond engagement ring, diamond eternity band, and natural emerald halo ring on ivory silk",
    viewAllHref: "/catalogue/engagement-rings",
    sampleSlugs: ["engagement-rings", "wedding-bands", "fashion-rings"],
    styleCarouselTiles: [
      {
        id: "ring-solitaires",
        label: "Solitaires",
        href: "/catalogue/engagement-rings?style=solitaire",
        preferredSku: "122054:384:P:18KX1",
      },
      {
        id: "ring-halos",
        label: "Halos",
        href: "/catalogue/engagement-rings?style=halo",
        preferredSku: "123111:60003:P",
      },
      {
        id: "ring-three-stone",
        label: "Three-Stone",
        href: "/catalogue/engagement-rings?style=three-stone",
        preferredSku: "122119:687:P:18PW",
      },
      {
        id: "ring-side-stone",
        label: "Side-Stone",
        href: "/catalogue/engagement-rings?style=accented",
        preferredSku: "120604:265822:P:10KX1",
      },
      {
        id: "ring-classic-bands",
        label: "Classic Bands",
        href: "/catalogue/wedding-bands?style=classic",
        preferredSku: "SQR7:3438:P",
      },
      {
        id: "ring-eternity-bands",
        label: "Eternity & Anniversary",
        href: "/catalogue/wedding-bands?style=eternity",
        preferredSku: "122614:60002:P",
      },
      {
        id: "ring-stackable",
        label: "Stackable",
        href: "/catalogue/fashion-rings?style=stackable",
        preferredSku: "10557:32106:P",
      },
      {
        id: "ring-signet",
        label: "Signet Rings",
        href: "/catalogue/fashion-rings?style=signet",
        preferredSku: "9859:607:P",
      },
    ],
    featuredCarouselSkus: [
      "123111:60003:P",
      "122614:60002:P",
      "SQR7:3438:P",
      "123824:603:P",
      "9859:607:P",
    ],
    cards: [
      {
        id: "womens-engagement-rings",
        slug: "engagement-rings",
        title: "Women's Engagement Rings",
        genderLabel: "Women's",
        subtitle: "Timeless diamond rings crafted for the moment.",
        href: "/catalogue/engagement-rings?audience=women",
        preferredImageUrl: "/images/cat-womens-engagement.jpg",
        preferredSku: "123111:60003:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/73068407?obj=metals&obj=stones/diamonds/g_halo&obj=stones/diamonds/g_center&obj=metals&obj.recipe=white&$standard$",
      },
      {
        id: "womens-wedding-bands",
        slug: "wedding-bands",
        title: "Women's Wedding Bands",
        genderLabel: "Women's",
        subtitle: "Classic gold & sparkling diamond bands for every day.",
        href: "/catalogue/wedding-bands?audience=women",
        preferredImageUrl: "/images/cat-womens-wedding-bands.jpg",
        preferredSku: "122614:60002:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/73399067?obj=metals&obj=stones/diamonds/g_accent&obj=metals&obj.recipe=white&$standard$",
      },
      {
        id: "womens-fashion-rings",
        slug: "fashion-rings",
        title: "Women's Fashion Rings",
        genderLabel: "Women's",
        subtitle: "Everyday favorites, stackable bands & statement styles.",
        href: "/catalogue/fashion-rings?audience=women",
        preferredImageUrl: "/images/cat-womens-fashion-rings.jpg",
        preferredSku: "123824:603:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/73353123?obj=metals&obj=stones/diamonds/g_accent&obj=metals&obj.recipe=white&$standard$",
      },
      {
        id: "mens-wedding-bands",
        slug: "wedding-bands",
        title: "Men's Wedding Bands",
        genderLabel: "Men's",
        subtitle: "Comfortable gold & platinum bands built to last.",
        href: "/catalogue/wedding-bands?audience=men",
        preferredImageUrl: "/images/cat-mens-wedding-bands.jpg",
        preferredSku: "SQR7:3438:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/73665604?obj=metals&obj.recipe=yellow&$standard$",
      },
      {
        id: "mens-rings",
        slug: "fashion-rings",
        title: "Men's Rings",
        genderLabel: "Men's",
        subtitle: "Classic signets & bold gold rings for daily wear.",
        href: "/catalogue/fashion-rings?audience=men",
        preferredImageUrl: "/images/cat-mens-rings.jpg",
        preferredSku: "9859:607:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/112078654?$standard$",
      },
    ],
  },
  {
    id: "necklaces-chains",
    eyebrow: "02 · Necklaces & Chains",
    title: "Necklaces & Chains",
    tagline:
      "Delicate diamond pendants, initials & solid gold chains in every length.",
    bannerImageUrl: SITE_IMAGES.catalogNecklacesBanner,
    bannerAlt:
      "18K yellow gold natural diamond halo pendant necklace draped on cream travertine",
    viewAllHref: "/catalogue/necklaces-pendants",
    sampleSlugs: ["necklaces-pendants"],
    styleCarouselTiles: [
      {
        id: "neck-chains",
        label: "Standalone Chains",
        href: "/catalogue/necklaces-pendants?style=standalone-chains",
        preferredSku: "CH57:60773:P",
      },
      {
        id: "neck-pendants",
        label: "Pendants",
        href: "/catalogue/necklaces-pendants?style=pendants",
        preferredSku: "85982:6013:P",
      },
      {
        id: "neck-solitaire-halo",
        label: "Solitaire & Halo",
        href: "/catalogue/necklaces-pendants?style=solitaire-halo",
        preferredSku: "86242:6013:P",
      },
      {
        id: "neck-bar-station",
        label: "Bar & Station",
        href: "/catalogue/necklaces-pendants?style=bar-station",
        preferredSku: "86991:700:P",
      },
      {
        id: "neck-crosses",
        label: "Crosses & Religious",
        href: "/catalogue/necklaces-pendants?style=crosses-religious",
        preferredSku: "86968:201:P",
      },
      {
        id: "neck-hearts",
        label: "Hearts & Symbols",
        href: "/catalogue/necklaces-pendants?style=hearts-symbols",
        preferredSku: "8301:20573:P",
      },
      {
        id: "neck-pearl",
        label: "Pearl & Beaded",
        href: "/catalogue/necklaces-pendants?style=pearl-beaded",
        preferredSku: "61620:251721:P",
      },
      {
        id: "neck-initials",
        label: "Initials",
        href: "/catalogue/necklaces-pendants?style=initials",
        preferredSku: "8611:34701:P",
      },
    ],
    featuredCarouselSkus: ["86242:6013:P", "CH57:60773:P", "85982:6013:P"],
    cards: [
      {
        id: "womens-necklaces-pendants",
        slug: "necklaces-pendants",
        title: "Women's Necklaces & Pendants",
        genderLabel: "Women's",
        subtitle: "Delicate pendants, initials & everyday layering chains.",
        href: "/catalogue/necklaces-pendants?audience=women",
        preferredImageUrl: "/images/cat-womens-necklaces.jpg",
        preferredSku: "86242:6013:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/30716145?$standard$",
      },
      {
        id: "mens-chains-necklaces",
        slug: "necklaces-pendants",
        title: "Men's Chains & Necklaces",
        genderLabel: "Men's",
        subtitle: "Solid gold & sterling silver chains in every length.",
        href: "/catalogue/necklaces-pendants?audience=men",
        preferredSku: "CH57:60773:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/6519745?$standard$",
      },
    ],
  },
  {
    id: "bracelets",
    eyebrow: "03 · Bracelets",
    title: "Bracelets",
    tagline:
      "Sparkling diamond tennis bracelets, classic gold bangles & everyday link chains.",
    bannerImageUrl: SITE_IMAGES.catalogBraceletsBanner,
    bannerAlt:
      "Natural diamond tennis bracelet and 18K yellow gold hinged bangle on champagne silk",
    viewAllHref: "/catalogue/bracelets",
    sampleSlugs: ["bracelets"],
    styleCarouselTiles: [
      {
        id: "brac-chain-link",
        label: "Chain & Link",
        href: "/catalogue/bracelets?style=chain-link",
        preferredSku: "CH647:287940:P",
      },
      {
        id: "brac-tennis",
        label: "Tennis / Line",
        href: "/catalogue/bracelets?style=tennis-line",
        preferredSku: "67412:60004:P",
      },
      {
        id: "brac-bangles",
        label: "Bangles & Cuffs",
        href: "/catalogue/bracelets?style=bangles-cuffs",
        preferredSku: "67338:102:P",
      },
      {
        id: "brac-id-bar",
        label: "ID & Bar",
        href: "/catalogue/bracelets?style=id-bar",
        preferredSku: "BRC892:106:P",
      },
      {
        id: "brac-charms",
        label: "Charms & Initials",
        href: "/catalogue/bracelets?style=charms-initials",
        preferredSku: "BRC270:295487:P",
      },
      {
        id: "brac-beaded",
        label: "Beaded & Pearl",
        href: "/catalogue/bracelets?style=beaded-pearl",
        preferredSku: "CH227:244573:P",
      },
      {
        id: "brac-crosses",
        label: "Crosses & Religious",
        href: "/catalogue/bracelets?style=crosses-religious",
        preferredSku: "BRC886:100:P",
      },
      {
        id: "brac-bolo",
        label: "Bolo / Adjustable",
        href: "/catalogue/bracelets?style=bolo-adjustable",
        preferredSku: "650121:101:P",
      },
    ],
    featuredCarouselSkus: ["67412:60004:P", "CH647:287940:P", "BRC651:60001:P"],
    cards: [
      {
        id: "womens-bracelets",
        slug: "bracelets",
        title: "Women's Bracelets",
        genderLabel: "Women's",
        subtitle: "Sparkling diamond bracelets, bangles & delicate chains.",
        href: "/catalogue/bracelets?audience=women",
        preferredImageUrl: "/images/cat-womens-bracelets.jpg",
        preferredSku: "67412:60004:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/83820337?$standard$",
      },
      {
        id: "mens-bracelets",
        slug: "bracelets",
        title: "Men's Bracelets",
        genderLabel: "Men's",
        subtitle: "Classic gold & silver link bracelets for everyday wear.",
        href: "/catalogue/bracelets?audience=men",
        preferredSku: "CH647:287940:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/6521127?$standard$",
      },
    ],
  },
  {
    id: "earrings",
    eyebrow: "04 · Earrings",
    title: "Earrings",
    tagline:
      "Everyday diamond studs, classic gold hoops & elegant drop styles.",
    bannerImageUrl: SITE_IMAGES.catalogEarringsBanner,
    bannerAlt:
      "18K yellow gold natural diamond solitaire stud earrings on dark obsidian stone",
    viewAllHref: "/catalogue/earrings",
    sampleSlugs: ["earrings"],
    styleCarouselTiles: [
      {
        id: "ear-studs",
        label: "Studs",
        href: "/catalogue/earrings?style=studs",
        preferredSku: "29762:6113:P",
      },
      {
        id: "ear-hoops",
        label: "Hoops & Huggies",
        href: "/catalogue/earrings?style=hoops-huggies",
        preferredSku: "84933:60004:P",
      },
      {
        id: "ear-halo",
        label: "Halo & Cluster",
        href: "/catalogue/earrings?style=halo-cluster",
        preferredSku: "651147:60003:P",
      },
      {
        id: "ear-drops",
        label: "Drops & Dangles",
        href: "/catalogue/earrings?style=drops-dangles",
        preferredSku: "87335:100:P",
      },
      {
        id: "ear-jackets",
        label: "Ear Jackets",
        href: "/catalogue/earrings?style=ear-jackets",
        preferredSku: "87052:600:P",
      },
      {
        id: "ear-climbers",
        label: "Ear Climbers",
        href: "/catalogue/earrings?style=ear-climbers",
        preferredSku: "83391:104768:P",
      },
      {
        id: "ear-initials",
        label: "Initials",
        href: "/catalogue/earrings?style=initials",
        preferredSku: "653612:695:P",
      },
      {
        id: "ear-pearl",
        label: "Pearl",
        href: "/catalogue/earrings?style=pearl",
        preferredSku: "19108:1243090:P",
      },
    ],
    featuredCarouselSkus: ["84933:60004:P", "29762:6113:P", "651147:60003:P"],
    cards: [
      {
        id: "womens-earrings",
        slug: "earrings",
        title: "Women's Earrings",
        genderLabel: "Women's",
        subtitle: "Everyday studs, classic hoops & elegant drop styles.",
        href: "/catalogue/earrings?audience=women",
        preferredSku: "84933:60004:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/35464757?$standard$",
      },
      {
        id: "mens-earrings",
        slug: "earrings",
        title: "Men's Earrings",
        genderLabel: "Men's",
        subtitle: "Clean diamond studs, gold studs & sleek hoops.",
        href: "/catalogue/earrings?audience=men",
        preferredImageUrl: "/images/cat-mens-earrings.jpg",
        preferredSku: "29762:6113:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/55364700?$standard$",
      },
    ],
  },
  {
    id: "gemstone-jewelry",
    eyebrow: "05 · Colored Stones",
    title: "Gemstone Jewelry",
    tagline:
      "Vibrant natural emeralds, royal blue sapphires, rubies & birthstones.",
    bannerImageUrl: SITE_IMAGES.catalogGemstoneBanner,
    bannerAlt:
      "Colombian emerald, royal blue sapphire, and ruby diamond halo rings on ivory limestone",
    viewAllHref: "/catalogue/gemstone-jewelry",
    sampleSlugs: ["gemstone-jewelry"],
    styleCarouselTiles: [
      {
        id: "gem-emerald",
        label: "Emerald",
        href: "/catalogue/gemstone-jewelry?stone=Natural%20Emerald",
        preferredSku: "71979:628:P",
      },
      {
        id: "gem-sapphire",
        label: "Blue Sapphire",
        href: "/catalogue/gemstone-jewelry?stone=Natural%20Blue%20Sapphire",
        preferredSku: "71861:60012:P",
      },
      {
        id: "gem-ruby",
        label: "Ruby",
        href: "/catalogue/gemstone-jewelry?stone=Natural%20Ruby",
        preferredSku: "72006:645:P",
      },
      {
        id: "gem-amethyst",
        label: "Amethyst",
        href: "/catalogue/gemstone-jewelry?stone=Natural%20Amethyst",
        preferredSku: "72080:620:P",
      },
      {
        id: "gem-aquamarine",
        label: "Aquamarine",
        href: "/catalogue/gemstone-jewelry?stone=Natural%20Aquamarine",
        preferredSku: "72080:625:P",
      },
      {
        id: "gem-peridot",
        label: "Peridot",
        href: "/catalogue/gemstone-jewelry?stone=Natural%20Peridot",
        preferredSku: "72047:630:P",
      },
      {
        id: "gem-halo",
        label: "Halo Styles",
        href: "/catalogue/gemstone-jewelry?style=halo",
        preferredSku: "72070:648:P",
      },
      {
        id: "gem-solitaire",
        label: "Solitaire Stones",
        href: "/catalogue/gemstone-jewelry?style=solitaire",
        preferredSku: "71965:633:P",
      },
    ],
    featuredCarouselSkus: ["71979:628:P", "71861:60012:P", "71965:633:P"],
    cards: [
      {
        id: "gemstone-jewelry",
        slug: "gemstone-jewelry",
        title: "Gemstone Jewelry",
        subtitle: "Vibrant birthstones, sapphires, emeralds & rubies.",
        href: "/catalogue/gemstone-jewelry",
        preferredImageUrl: "/images/cat-gemstone-jewelry.jpg",
        preferredSku: "71979:628:P",
        fallbackImageUrl:
          "https://meteor.stullercloud.com/das/73111569?obj=stones/diamonds/g_accent&obj=metals&obj=stones/faceted/g_center 1&obj.colorRef=83&obj.curves=0,30.140,92.255,255&obj.curves.r=150,0.255,255&obj.curves.g=0,80.60,165.255,255&obj.curves.b=20,0.75,100.255,255&obj=stones/faceted/g_center 2&obj.colorRef=83&obj.curves=0,30.140,92.255,255&obj.curves.r=150,0.255,255&obj.curves.g=0,80.60,165.255,255&obj.curves.b=20,0.75,100.255,255&obj=stones/faceted/g_center 3&obj.colorRef=83&obj.curves=0,30.140,92.255,255&obj.curves.r=150,0.255,255&obj.curves.g=0,80.60,165.255,255&obj.curves.b=20,0.75,100.255,255&obj=metals&obj.recipe=white&$standard$",
      },
    ],
  },
];
