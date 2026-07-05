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
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const key = `scholarship-thumbnails/${id}/thumbnail.webp`;

  try {
    // Long-lived + immutable is safe here because each upload gets a
    // unique `?v=` query string below, so the URL itself changes whenever
    // the underlying file changes — no stale-cache risk.
    await uploadToR2(key, compressed, "image/webp", "public, max-age=31536000, immutable");
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // Append a cache-busting version so browsers/CDNs never keep serving the
  // previous image after it's replaced at the same object key.
  const publicUrl = `${getPublicUrl(key)}?v=${Date.now()}`;

  try {
    await sql`
      UPDATE scholarships SET thumbnail_url = ${publicUrl}, updated_at = NOW()
      WHERE id = ${id}
    `;
  } catch (err) {
    console.error("Thumbnail DB update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ thumbnail_url: publicUrl });
}
