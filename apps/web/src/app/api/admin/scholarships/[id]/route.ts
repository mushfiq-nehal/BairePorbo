import { NextRequest, NextResponse } from "next/server";
import { sql, sqlQuery } from "@/utils/db";
import { requireAdmin } from "@/utils/api-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await sql`SELECT * FROM scholarships WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ scholarship: rows[0] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Build SET clause dynamically from allowed fields
  const allowed = [
    "title", "country", "degree_level", "funding_type", "deadline",
    "official_url", "raw_description", "status", "is_flagship",
    "ai_summary", "eligibility_summary", "competitiveness", "tips",
    "tags", "thumbnail_url", "thumbnail_prompt",
  ];

  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Build parameterised SET pairs
  const setClauses = Object.keys(updates)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(", ");

  const values = [id, ...Object.values(updates)];
  let rows: Record<string, unknown>[];
  try {
    rows = await sqlQuery(
      `UPDATE scholarships SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values,
    );
  } catch (err) {
    console.error("PATCH /scholarships/[id] DB error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  if (!rows[0]) return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });
  return NextResponse.json({ scholarship: rows[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await sql`UPDATE scholarships SET status = 'archived', updated_at = NOW() WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
