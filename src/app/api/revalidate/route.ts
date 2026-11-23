import crypto from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CATALOG_CACHE_TAG } from "@/lib/cache/catalogCache";

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * On-demand cache invalidation endpoint called after `scripts/sync-catalog.ts`
 * finishes updating Supabase.
 *
 * Usage:
 *   curl -X POST https://your-domain.com/api/revalidate \
 *     -H "Authorization: Bearer $REVALIDATE_SECRET"
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.REVALIDATE_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Revalidation endpoint is not configured (missing REVALIDATE_SECRET)." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token || !constantTimeEquals(token, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(CATALOG_CACHE_TAG);
  revalidatePath("/catalogue");
  revalidatePath("/catalogue/[slug]", "page");

  return NextResponse.json({
    revalidated: true,
    tag: CATALOG_CACHE_TAG,
    timestamp: new Date().toISOString(),
  });
}

