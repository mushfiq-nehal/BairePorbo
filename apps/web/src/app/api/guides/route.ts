import { NextResponse } from "next/server";
import { sql } from "@/utils/db";

export async function GET() {
  const rows = await sql`
    SELECT slug, title, description, category, tags, intro, content, faqs,
           published_at, updated_at, cover_image_url, is_pinned
    FROM guides
    WHERE status = 'published'
    ORDER BY is_pinned DESC, published_at DESC
  `;

  return NextResponse.json({ guides: rows }, {
    // s-maxage: fresh for 5 min. stale-while-revalidate: for up to 1 day after that,
    // serve the cached copy INSTANTLY while refreshing in the background — so a sleeping
    // Neon DB never makes a visitor wait on a cold start.
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" },
  });
}
