import { NextResponse } from "next/server";
import { MOCK_CATALOG_GROUPS } from "@/data/mockCatalog";
import { parseCatalogSearchQuery } from "@/lib/search/queryParser";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { smartSearchCatalog } from "@/lib/supabase/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const rawOffset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "36", 10);
  const safeOffset =
    Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 20000) : 0;
  const safeLimit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 48) : 36;

  if (query.length < 2) {
    return NextResponse.json({
      groups: [],
      hasMore: false,
      nextOffset: 0,
      parsed: parseCatalogSearchQuery(query),
      relaxedReason: null,
      source: "empty",
    });
  }

  const result = await smartSearchCatalog(query, {
    offset: safeOffset,
    limit: safeLimit,
  });
  if (result !== null) {
    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=30, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  }

  if (isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Search temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }

  // Fallback to mock catalog only when Supabase is unconfigured
  const parsed = parseCatalogSearchQuery(query);
  const lower = query.toLowerCase();
  const mockMatches = MOCK_CATALOG_GROUPS.filter((group) => {
    if (
      group.variants.some((v) => v.supplierSku.toLowerCase().includes(lower))
    ) {
      return true;
    }
    const haystack = [
      group.title,
      group.categoryName,
      ...group.variants.flatMap((v) => [v.metalType, v.primaryStone]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(lower);
  });

  return NextResponse.json({
    groups: mockMatches.slice(0, 36),
    hasMore: false,
    nextOffset: mockMatches.length,
    parsed,
    relaxedReason: null,
    source: "demo",
  });
}
