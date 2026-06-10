import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidateGuidePages } from "@/lib/revalidate-guides";

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

interface RouteParams { params: Promise<{ id: string }> }

/** GET /api/admin/guides/[id] — fetch a single guide for editing */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = createServiceClient();
  const { data, error } = await db.from("guides").select("*").eq("id", id).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  return NextResponse.json({ guide: data });
}

/** PATCH /api/admin/guides/[id] — update fields */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // If publishing, set published_at if not already set
  if (body.status === "published") {
    body.published_at = body.published_at ?? new Date().toISOString();
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("guides")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  revalidateGuidePages(data.slug);

  return NextResponse.json({ guide: data });
}

/** DELETE /api/admin/guides/[id] */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = createServiceClient();

  const { data: existing } = await db.from("guides").select("slug").eq("id", id).maybeSingle();

  const { error } = await db.from("guides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.slug) revalidateGuidePages(existing.slug);

  return NextResponse.json({ ok: true });
}
