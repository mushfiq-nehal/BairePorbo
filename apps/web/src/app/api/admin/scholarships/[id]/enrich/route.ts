import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { checkRateLimit, fetchNimWithFallback, getClientIp, logRequest } from "@/lib/nim";

async function requireAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

const ENRICH_SYSTEM = `You are a scholarship data specialist. Given raw scholarship information, you will return a structured JSON object with enriched, accurate details.

IMPORTANT: respond with ONLY valid JSON, no markdown fences, no explanation.

Required JSON shape:
{
  "eligibility_summary": "2-3 sentences on who qualifies (CGPA, degree, nationality, etc.)",
  "competitiveness": "High" | "Medium" | "Low",
  "tips": "3-5 concise bullet points (use • as bullet char) on how to apply successfully",
  "tags": ["tag1", "tag2", ...],  // 4-8 short tags (country, field, funding type, etc.)
  "ai_summary": "1-2 paragraph engaging summary of the scholarship for Bangladeshi students",
  "thumbnail_prompt": "A photorealistic image prompt for generating a thumbnail: describe the university architecture or landmark in the host country, time of day, mood, colors matching the scholarship prestige. Make it specific and vivid. Do not include text or people."
}`;

// POST /api/admin/scholarships/[id]/enrich — AI enrichment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const auth = await requireAdmin(cookieStore);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rate = await checkRateLimit(`admin:${auth.user.id}:enrich`, { limit: 6, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil(rate.resetMs / 1000).toString() } }
    );
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NIM API key not configured" }, { status: 500 });

  const { id } = await params;

  // Fetch the scholarship to enrich
  const { data: scholarship, error: fetchErr } = await auth.supabase
    .from("scholarships")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !scholarship) {
    return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });
  }

  const userPrompt = `
Scholarship details to enrich:
Title: ${scholarship.title}
Country: ${scholarship.country}
Degree Level: ${scholarship.degree_level ?? "Not specified"}
Funding Type: ${scholarship.funding_type ?? "Not specified"}
Deadline: ${scholarship.deadline ?? "Not specified"}
Official URL: ${scholarship.official_url ?? "Not specified"}
Raw Description:
${scholarship.raw_description ?? "No description provided"}
`.trim();

  let nimData: { choices?: { message?: { content?: string } }[] };
  let nimModel = "";
  try {
    const result = await fetchNimWithFallback(
      {
        messages: [
          { role: "system", content: ENRICH_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.4,
        top_p: 0.9,
        stream: false,
      },
      { apiKey, accept: "application/json" }
    );
    nimModel = result.model;
    nimData = (await result.response.json()) as Record<string, unknown>;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  logRequest("admin.enrich.complete", { ip, model: nimModel });
  const raw = nimData?.choices?.[0]?.message?.content ?? "";

  let enriched: Record<string, unknown>;
  try {
    // Strip potential markdown fences
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    enriched = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "AI returned invalid JSON", raw },
      { status: 422 }
    );
  }

  // Persist enriched fields
  const { data: updated, error: updateErr } = await auth.supabase
    .from("scholarships")
    .update({
      eligibility_summary: enriched.eligibility_summary,
      competitiveness: enriched.competitiveness,
      tips: enriched.tips,
      tags: enriched.tags,
      ai_summary: enriched.ai_summary,
      thumbnail_prompt: enriched.thumbnail_prompt,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ scholarship: updated, enriched });
}
