import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/utils/db";
import { requireAdmin } from "@/utils/api-auth";
import { generateScholarshipSlug, makeSlugUnique } from "@/lib/slug";

type ImportScholarship = {
  title: string;
  country: string;
  degree_level: string;
  funding_type: string;
  deadline: string | null;
  official_url: string | null;
  raw_description_english: string;
  is_live?: boolean;
  opening_note?: string | null;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { scholarships?: ImportScholarship[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scholarships = body.scholarships;
  if (!Array.isArray(scholarships) || scholarships.length === 0) {
    return NextResponse.json({ error: "scholarships[] is required" }, { status: 400 });
  }
  if (scholarships.length > 50) {
    return NextResponse.json({ error: "Maximum 50 per import" }, { status: 400 });
  }

  // Fetch existing slugs for uniqueness
  const existingRows = await sql`SELECT slug FROM scholarships WHERE slug IS NOT NULL`;
  const existingSlugs = new Set(existingRows.map((r) => r.slug as string));

  const ids: string[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < scholarships.length; i++) {
    const s = scholarships[i];
    try {
      const slugBase = generateScholarshipSlug(s.title, s.country);
      const slug = slugBase ? makeSlugUnique(slugBase, existingSlugs) : null;
      if (slug) existingSlugs.add(slug);

      const rows = await sql`
        INSERT INTO scholarships (
          created_by, title, country, degree_level, funding_type,
          deadline, official_url, raw_description, status, slug,
          is_live, opening_note
        ) VALUES (
          ${auth.userId},
          ${s.title},
          ${s.country},
          ${s.degree_level ?? "any"},
          ${s.funding_type ?? "other"},
          ${s.deadline ?? null},
          ${s.official_url ?? null},
          ${s.raw_description_english ?? ""},
          'draft',
          ${slug},
          ${s.is_live ?? true},
          ${s.opening_note ?? null}
        )
        RETURNING id
      `;
      ids.push(rows[0].id as string);
    } catch (err) {
      errors.push({ index: i, error: String(err) });
    }
  }

  // All scholarships are saved as drafts — human review + thumbnail upload required before publish.
  return NextResponse.json({
    imported: ids.length,
    ids,
    errors,
  }, { status: 201 });
}
