import {
  CURATED_REVIEWS,
  DEFAULT_YELP_URL,
  type StoreReview,
  type StoreYelpData,
} from "@/config/reviews";

interface YelpBusinessResponse {
  rating?: number;
  review_count?: number;
  url?: string;
}

interface YelpReviewsResponse {
  reviews?: Array<{
    id: string;
    rating: number;
    text: string;
    time_created?: string;
    url?: string;
    user?: {
      name?: string;
    };
  }>;
}

function formatYelpDate(timeCreated?: string): string {
  if (!timeCreated) return "Yelp";
  const parsed = new Date(timeCreated.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "Yelp";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/**
 * Fetches live store rating & reviews from the official Yelp Fusion API v3
 * when `YELP_API_KEY` and `YELP_BUSINESS_ID` are set in `.env.local`.
 * Cached server-side for 24 hours; gracefully falls back to `CURATED_REVIEWS`.
 */
export async function getStoreYelpReviews(): Promise<StoreYelpData> {
  const apiKey = process.env.YELP_API_KEY?.trim();
  const businessId =
    process.env.YELP_BUSINESS_ID?.trim() || "coddingtown-jewelers-santa-rosa";

  if (!apiKey) {
    return {
      source: "curated",
      rating: null,
      reviewCount: null,
      yelpUrl: DEFAULT_YELP_URL,
      reviews: CURATED_REVIEWS,
    };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  try {
    const encodedId = encodeURIComponent(businessId);
    const [bizRes, reviewsRes] = await Promise.all([
      fetch(`https://api.yelp.com/v3/businesses/${encodedId}`, {
        headers,
        next: { revalidate: 86400 },
      }),
      fetch(
        `https://api.yelp.com/v3/businesses/${encodedId}/reviews?limit=3&sort_by=yelp_sort`,
        {
          headers,
          next: { revalidate: 86400 },
        }
      ),
    ]);

    if (!bizRes.ok || !reviewsRes.ok) {
      return {
        source: "curated",
        rating: null,
        reviewCount: null,
        yelpUrl: DEFAULT_YELP_URL,
        reviews: CURATED_REVIEWS,
      };
    }

    const bizData = (await bizRes.json()) as YelpBusinessResponse;
    const reviewsData = (await reviewsRes.json()) as YelpReviewsResponse;

    const mappedReviews: StoreReview[] = (reviewsData.reviews ?? [])
      .filter((r) => Boolean(r.text?.trim()))
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        author: r.user?.name?.trim() || "Yelp Reviewer",
        rating: Math.max(1, Math.min(5, Math.round(r.rating || 5))),
        dateLabel: formatYelpDate(r.time_created),
        text: r.text.trim(),
        url: r.url || bizData.url || DEFAULT_YELP_URL,
      }));

    if (mappedReviews.length === 0) {
      return {
        source: "curated",
        rating: bizData.rating ?? null,
        reviewCount: bizData.review_count ?? null,
        yelpUrl: bizData.url || DEFAULT_YELP_URL,
        reviews: CURATED_REVIEWS,
      };
    }

    return {
      source: "yelp",
      rating: bizData.rating ?? null,
      reviewCount: bizData.review_count ?? null,
      yelpUrl: bizData.url || DEFAULT_YELP_URL,
      reviews: mappedReviews,
    };
  } catch {
    return {
      source: "curated",
      rating: null,
      reviewCount: null,
      yelpUrl: DEFAULT_YELP_URL,
      reviews: CURATED_REVIEWS,
    };
  }
}
