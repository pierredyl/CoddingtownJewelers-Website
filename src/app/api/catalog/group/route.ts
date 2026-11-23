import { NextResponse } from "next/server";
import { getCatalogGroupDetail } from "@/lib/supabase/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupCode = searchParams.get("groupCode");
  const primaryStone = searchParams.get("stone");
  const sku = searchParams.get("sku");

  if (!groupCode && !sku) {
    return NextResponse.json(
      { error: "Missing groupCode or sku" },
      { status: 400 }
    );
  }

  const group = await getCatalogGroupDetail({ groupCode, primaryStone, sku });
  if (!group) {
    return NextResponse.json({ group: null }, { status: 404 });
  }

  return NextResponse.json(
    { group },
    {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=600, stale-while-revalidate=86400",
      },
    }
  );
}
