import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/utils/db";
import { requireAdmin } from "@/utils/api-auth";
import { fetchCompletion, parseJsonFromCompletion } from "@/lib/ai-completion";

const ENRICH_SYSTEM = `You are a scholarship data specialist. Given raw scholarship information, return a structured JSON object with enriched, accurate details.

IMPORTANT: respond with ONLY valid JSON, no markdown fences, no explanation.

Required JSON shape:
{
  "eligibility_summary": "2-3 sentences on who qualifies (CGPA, degree, nationality, etc.)",
  "competitiveness": "High" | "Medium" | "Low",
  "tips": "3-5 concise bullet points (use • as bullet char) on how to apply successfully",
  "tags": ["tag1", "tag2", ...],
  "ai_summary": "1-2 paragraph engaging summary of the scholarship for Bangladeshi students",
  "university_name": "The primary university or institution name only (e.g. 'University of Oxford')"
}`;

async function enrichOne(id: string): Promise<{ id: string; ok: boolean; error?: string }> {
  const rows = await sql`SELECT * FROM scholarships WHERE id = ${id} LIMIT 1`;
  const s = rows[0];
  if (!s) return { id, ok: false, error: "Not found" };

  const userPrompt = `
Title: ${s.title}
Country: ${s.country}
Degree: ${s.degree_level}
Funding: ${s.funding_type}
Deadline: ${s.deadline ?? "Not specified"}
URL: ${s.official_url ?? "Not specified"}
Description: ${s.raw_description ?? "Not provided"}
`.trim();

  try {
    const { content } = await fetchCompletion({
      model: "deepseek",
      system: ENRICH_SYSTEM,
      user: userPrompt,
      maxTokens: 900,
      temperature: 0.4,
    });

    const enriched = parseJsonFromCompletion<Record<string, unknown>>(content);

    await sql`
      UPDATE scholarships SET
        eligibility_summary = ${enriched.eligibility_summary as string},
        competitiveness     = ${enriched.competitiveness as string},
        tips                = ${enriched.tips as string},
        tags                = ${JSON.stringify(enriched.tags)}::jsonb,
        ai_summary          = ${enriched.ai_summary as string},
        thumbnail_prompt    = ${(enriched.university_name ?? "") as string},
        updated_at          = NOW()
      WHERE id = ${id}
    `;

    return { id, ok: true };
  } catch (err) {
    return { id, ok: false, error: String(err) };
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
  }

  // Process sequentially to respect OpenRouter rate limits
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of ids) {
    results.push(await enrichOne(id));
  }

  const succeeded = results.filter((r) => r.ok).length;
  return NextResponse.json({ enriched: succeeded, failed: results.length - succeeded, results });
}
