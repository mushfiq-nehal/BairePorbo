import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const label =
    process.env.NIM_MODEL_LABEL ??
    process.env.NIM_MODEL ??
    process.env.NEXT_PUBLIC_NIM_MODEL_LABEL ??
    process.env.NEXT_PUBLIC_NIM_MODEL ??
    "google/gemma-4-31b-it";

  return NextResponse.json({ chatModelLabel: label });
}
