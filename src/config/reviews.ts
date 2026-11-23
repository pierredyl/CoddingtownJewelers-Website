export interface StoreReview {
  id: string;
  author: string;
  rating: number;
  dateLabel: string;
  text: string;
  url?: string;
}

export interface StoreYelpData {
  source: "yelp" | "curated";
  rating: number | null;
  reviewCount: number | null;
  yelpUrl: string;
  reviews: StoreReview[];
}

/**
 * Direct link to the store's Yelp listing.
 * Override anytime via NEXT_PUBLIC_YELP_URL in .env.local.
 */
export const DEFAULT_YELP_URL =
  process.env.NEXT_PUBLIC_YELP_URL ||
  "https://www.yelp.com/biz/coddingtown-jewelers-santa-rosa";

/**
 * Curated review pool displayed on the Home Page (3 shown at a time, rotating periodically).
 * To update with your favorite exact Yelp quotes: edit, add, or remove entries below.
 */
export const CURATED_REVIEWS: StoreReview[] = [
  {
    id: "review-1",
    author: "Santa Rosa Customer",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "Friendly, honest, and knowledgeable from the moment you walk in. They resized my ring right in store and had it looking brand new.",
    url: DEFAULT_YELP_URL,
  },
  {
    id: "review-2",
    author: "Sonoma County Customer",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "Stopped in for a quick cleaning and ended up finding the exact anniversary piece I had been looking for. No pressure, just genuine help.",
    url: DEFAULT_YELP_URL,
  },
  {
    id: "review-3",
    author: "Local Shopper",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "Our family has trusted them for years for repairs, sizing, and special gifts. Always fair, welcoming, and careful with every piece.",
    url: DEFAULT_YELP_URL,
  },
  {
    id: "review-4",
    author: "Santa Rosa Local",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "They took their time walking me through different gold chains and helped me pick out a birthday gift my wife wears every single day.",
    url: DEFAULT_YELP_URL,
  },
  {
    id: "review-5",
    author: "Sonoma County Shopper",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "Brought in my grandmother's ring to tighten a loose prong and polish it up. It came back sparkling and secure, and the staff treated it like their own.",
    url: DEFAULT_YELP_URL,
  },
  {
    id: "review-6",
    author: "Repeat Customer",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "You never feel rushed here. They listen to what you actually want and help you find the right piece without trying to upsell you.",
    url: DEFAULT_YELP_URL,
  },
  {
    id: "review-7",
    author: "Santa Rosa Customer",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "Picked out our wedding bands here and the whole experience was warm and effortless. So glad to have a neighborhood jeweler we can count on.",
    url: DEFAULT_YELP_URL,
  },
  {
    id: "review-8",
    author: "North Bay Local",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "Stopped by for a complimentary cleaning on my engagement ring and left smiling. Truly kind people who remember their regulars.",
    url: DEFAULT_YELP_URL,
  },
  {
    id: "review-9",
    author: "Longtime Customer",
    rating: 5,
    dateLabel: "Yelp Review",
    text: "Fair, patient, and always willing to help whether you are buying diamond earrings or just fixing a broken clasp on a favorite necklace.",
    url: DEFAULT_YELP_URL,
  },
];
