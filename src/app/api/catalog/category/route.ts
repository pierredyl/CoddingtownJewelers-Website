import { NextResponse } from "next/server";
import {
  getCategoryListingsPage,
  type CatalogAudience,
} from "@/lib/supabase/queries";

function getMultiParam(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      searchParams
        .getAll(key)
        .map((v) => v.trim())
        .filter(Boolean)
    )
  ).slice(0, 15);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const categorySlugs = getMultiParam(searchParams, "category");
  const audiences = getMultiParam(searchParams, "audience")
    .map((a) => a.toLowerCase())
    .filter((a): a is CatalogAudience => a === "men" || a === "women");
  const styles = getMultiParam(searchParams, "style");
  const chainStyles = getMultiParam(searchParams, "chainStyle");
  const widths = getMultiParam(searchParams, "width");
  const bandFits = getMultiParam(searchParams, "fit");
  const bandProfiles = getMultiParam(searchParams, "profile");
  const edgeDetails = getMultiParam(searchParams, "edge");
  const stoneShapes = getMultiParam(searchParams, "shape");
  const settingStates = getMultiParam(searchParams, "state");
  const stoneOrigins = getMultiParam(searchParams, "origin");
  const caratTiers = getMultiParam(searchParams, "carat");
  const jewelryTypes = getMultiParam(searchParams, "jewelryType");
  const finishes = getMultiParam(searchParams, "finish");
  const earringSizes = getMultiParam(searchParams, "earringSize");
  const pendantChains = getMultiParam(searchParams, "pendantChain");
  const adjustableOnly =
    searchParams.get("adjustable") === "1" ||
    searchParams.get("adjustable") === "true";
  const metalTypes = getMultiParam(searchParams, "metal");
  const primaryStones = getMultiParam(searchParams, "stone");
  const lengths = getMultiParam(searchParams, "length");
  const closures = getMultiParam(searchParams, "closure");
  const ringSizes = getMultiParam(searchParams, "ringSize");
  const sizableOnly =
    searchParams.get("sizable") === "1" ||
    searchParams.get("sizable") === "true";
  const rawSearch = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const search = rawSearch || undefined;
  const safeOffset =
    Number.isFinite(offset) && offset >= 0 ? Math.min(offset, 100000) : 0;

  let page = null;
  try {
    page = await getCategoryListingsPage({
      categorySlug: slug,
      categorySlugs,
      offset: safeOffset,
      batchSize: 400,
      audiences,
      styles,
      chainStyles,
      widths,
      bandFits,
      bandProfiles,
      edgeDetails,
      stoneShapes,
      settingStates,
      stoneOrigins,
      caratTiers,
      jewelryTypes,
      finishes,
      earringSizes,
      pendantChains,
      adjustableOnly,
      metalTypes,
      primaryStones,
      lengths,
      closures,
      ringSizes,
      sizableOnly,
      search,
    });
  } catch (err) {
    console.error("[GET /api/catalog/category] unexpected error:", err);
    return NextResponse.json(
      { error: "Unable to load category listings" },
      { status: 503 }
    );
  }

  if (!page) {
    return NextResponse.json(
      { error: "Unable to load category listings" },
      { status: 503 }
    );
  }

  return NextResponse.json(page, {
    headers: {
      "Cache-Control":
        "public, max-age=30, s-maxage=120, stale-while-revalidate=86400",
    },
  });
}
