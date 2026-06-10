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

/** GET /api/admin/guides — list all guides */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data, error } = await db
    .from("guides")
    .select("id, slug, title, category, status, faqs, published_at, updated_at, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guides: data ?? [] });
}

/** POST /api/admin/guides — create a new guide (draft) */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, title, description, category, tags, intro, faqs, status, cover_image_url } = body as Record<string, unknown>;

  if (!slug || !title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("guides")
    .insert({
      slug,
      title,
      description: description ?? "",
      category: category ?? "Scholarships",
      tags: tags ?? [],
      intro: intro ?? "",
      faqs: faqs ?? [],
      status: status ?? "draft",
      cover_image_url: cover_image_url ?? null,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status === "published" && data?.slug) {
    revalidateGuidePages(data.slug);
  }

  return NextResponse.json({ guide: data }, { status: 201 });
}
