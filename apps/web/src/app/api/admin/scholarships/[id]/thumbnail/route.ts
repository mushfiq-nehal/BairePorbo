import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import sharp from "sharp";

async function requireAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

// POST /api/admin/scholarships/[id]/thumbnail — upload image to Supabase Storage
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

  const path = `${id}/thumbnail.webp`;

  const arrayBuffer = await file.arrayBuffer();
  const compressed = await sharp(Buffer.from(arrayBuffer))
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const { error: uploadErr } = await auth.supabase.storage
    .from("scholarship-thumbnails")
    .upload(path, compressed, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data } = auth.supabase.storage
    .from("scholarship-thumbnails")
    .getPublicUrl(path);

  const publicUrl = data.publicUrl;

  // Save thumbnail URL to scholarship record
  const { error: updateErr } = await auth.supabase
    .from("scholarships")
    .update({ thumbnail_url: publicUrl })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ thumbnail_url: publicUrl });
}
