import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// Verify caller is an admin
async function requireAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

// GET /api/admin/scholarships — list all (admin)
export async function GET() {
  const cookieStore = await cookies();
  const auth = await requireAdmin(cookieStore);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("scholarships")
    .select("id, title, country, status, created_at, updated_at, thumbnail_url, degree_level, funding_type, deadline, is_flagship")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scholarships: data });
}

// POST /api/admin/scholarships — create draft
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = await requireAdmin(cookieStore);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("scholarships")
    .insert({
      created_by: auth.user.id,
      title: body.title,
      country: body.country,
      degree_level: body.degree_level,
      funding_type: body.funding_type,
      deadline: body.deadline ?? null,
      official_url: body.official_url ?? null,
      raw_description: body.raw_description ?? null,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scholarship: data }, { status: 201 });
}
