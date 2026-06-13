import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/utils/db";
import { requireAdmin } from "@/utils/api-auth";
import { uploadToR2, getPublicUrl } from "@/utils/r2";
import sharp from "sharp";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const compressed = await sharp(Buffer.from(arrayBuffer))
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const key = `guide-covers/${id}/cover.webp`;

  try {
    await uploadToR2(key, compressed, "image/webp");
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const publicUrl = getPublicUrl(key);

  await sql`
    UPDATE guides SET cover_image_url = ${publicUrl}, updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ cover_image_url: publicUrl });
}
