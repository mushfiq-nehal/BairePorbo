import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/utils/db";
import { getUser } from "@/utils/api-auth";

export async function GET() {
  const auth = await getUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`SELECT * FROM profiles WHERE id = ${auth.userId} LIMIT 1`;
  if (!rows[0]) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({ profile: rows[0] });
}

export async function PUT(req: NextRequest) {
  const auth = await getUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    full_name, cgpa, work_experience, target_degree, preferred_countries,
    goals_notes, bsc_major, university, graduation_year, research_interests,
    published_papers, ielts_score, gre_gmat_score, internships, portfolio_url,
  } = body;

  const rows = await sql`
    UPDATE profiles SET
      full_name           = ${full_name as string ?? null},
      cgpa                = ${cgpa ? parseFloat(String(cgpa)) : null},
      work_experience     = ${work_experience as string ?? null},
      target_degree       = ${target_degree ? String(target_degree).toLowerCase() : null},
      preferred_countries = ${preferred_countries as string ?? null},
      goals_notes         = ${goals_notes as string ?? null},
      bsc_major           = ${bsc_major as string ?? null},
      university          = ${university as string ?? null},
      graduation_year     = ${graduation_year ? parseInt(String(graduation_year), 10) : null},
      research_interests  = ${research_interests as string ?? null},
      published_papers    = ${published_papers as string ?? null},
      ielts_score         = ${ielts_score as string ?? null},
      gre_gmat_score      = ${gre_gmat_score as string ?? null},
      internships         = ${internships as string ?? null},
      portfolio_url       = ${portfolio_url as string ?? null},
      updated_at          = NOW()
    WHERE id = ${auth.userId}
    RETURNING *
  `;

  return NextResponse.json({ profile: rows[0] });
}
