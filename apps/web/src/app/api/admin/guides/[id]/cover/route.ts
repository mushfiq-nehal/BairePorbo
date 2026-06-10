import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

async function requireAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

/** POST /api/admin/guides/[id]/cover — upload cover image to Supabase Storage */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const auth = await requireAdmin(cookieStore);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${id}/cover.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadErr } = await auth.supabase.storage
    .from("guide-covers")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data } = auth.supabase.storage.from("guide-covers").getPublicUrl(path);

  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await auth.supabase
    .from("guides")
    .update({ cover_image_url: publicUrl })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ cover_image_url: publicUrl });
}
