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
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
  });
}
