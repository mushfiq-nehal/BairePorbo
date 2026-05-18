import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

async function requireAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "google/gemma-4-31b-it";

const PARSE_SYSTEM = `You are a scholarship data extraction specialist.

Given raw text about a scholarship (which may be in Bengali, mixed Bengali-English, or any language), extract and translate the structured fields into English.

IMPORTANT: Respond with ONLY valid JSON, no markdown, no explanation.

Required JSON shape:
{
  "title": "Full scholarship name in English",
  "country": "Host country in English (e.g. Australia, Germany)",
  "degree_level": "one of: bachelors | masters | phd | postdoc | any",
  "funding_type": "one of: full | partial | tuition_only | stipend | other",
  "deadline": "ISO date string YYYY-MM-DD or null if not found",
  "official_url": "URL string or null",
  "raw_description_english": "Full translated description in English (keep all key details)"
}

Rules:
- degree_level: if text says Bachelor's or স্নাতক → "bachelors", Master's or স্নাতকোত্তর → "masters", PhD → "phd"
- funding_type: 50% tuition waiver → "partial", full funding/সম্পূর্ণ → "full", tuition only → "tuition_only"
- deadline: convert "31 August 2026" → "2026-08-31"
- official_url: extract from apply links, 👉 markers, or লিংক sections
- If a field cannot be determined, use null`;

// POST /api/admin/scholarships/parse — parse raw text into structured fields
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = await requireAdmin(cookieStore);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NIM API key not configured" }, { status: 500 });

  let body: { raw_description: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.raw_description?.trim()) {
    return NextResponse.json({ error: "raw_description is required" }, { status: 400 });
  }

  let nimRes: Response;
  try {
    nimRes = await fetch(NIM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: PARSE_SYSTEM },
          { role: "user", content: `Parse this scholarship text:\n\n${body.raw_description}` },
        ],
        max_tokens: 512,
        temperature: 0.2,
        stream: false,
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: `NIM network error: ${String(err)}` }, { status: 502 });
  }

  if (!nimRes.ok) {
    const text = await nimRes.text();
    return NextResponse.json({ error: `NIM error: ${text}` }, { status: nimRes.status });
  }

  const nimData = await nimRes.json();
  const raw = nimData?.choices?.[0]?.message?.content ?? "";

  let parsed: Record<string, unknown>;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 422 });
  }

  return NextResponse.json({ parsed });
}
