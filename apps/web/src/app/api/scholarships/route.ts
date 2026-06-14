import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/utils/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "published";

  const rows = await sql`
    SELECT id, title, country, funding_type, deadline, degree_level,
           tags, thumbnail_url, competitiveness, is_flagship, updated_at, slug,
           is_live, opening_note
    FROM scholarships
    WHERE status = ${status}
    ORDER BY is_flagship DESC, created_at DESC
  `;

  return NextResponse.json({ scholarships: rows }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
