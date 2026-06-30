import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/utils/db";
import { requireAdmin } from "@/utils/api-auth";
import { checkRateLimit, getClientIp, logRequest } from "@/lib/nim";
import { fetchCompletion, parseJsonFromCompletion, type ModelChoice } from "@/lib/ai-completion";
import { resolveShortlink } from "@/lib/resolve-shortlink";
import { scrapeUrl } from "@/lib/scrape";
import { findSimilarScholarships, type ScholarshipRow } from "@/lib/dedupe";
import { generateScholarshipSlug, makeSlugUnique } from "@/lib/slug";

// Vercel route-segment config: web search + scraping can take a while.
export const maxDuration = 60;

const VALID_MODELS: ModelChoice[] = ["deepseek-pro", "minimax-m3"];

const BULK_SYNTHESIS_SYSTEM = `You are a scholarship research and data-extraction specialist. You have access to
real-time web search results (appended to this conversation by the platform) plus, optionally, text scraped
directly from a source page. Your job: produce ONE complete, accurate, English-language structured record for
the named scholarship.

Priority order for information: (1) any "SCRAPED CONTENT" block given below, (2) the web search results
available to you — search for the scholarship's official page, not just the one link you were given, since
that link may be unreachable, (3) your own knowledge, but ONLY for very well-known, stable programs (DAAD,
Erasmus Mundus, Chevening, Fulbright, Commonwealth, MEXT, etc.).

CRITICAL ACCURACY RULES:
- NEVER invent a specific deadline date. If no source clearly states it, set "deadline" to null.
- NEVER fabricate an official_url. Prefer an authoritative source (university domain, government/program
  domain) found via search over a random aggregator/blog. If you cannot find one you trust, set it to null.
- If sources conflict or you are not confident, leave the field null rather than guess, and explain briefly
  in "confidence_note".
- "raw_description_english" must be a real description (roughly 3-5 sentences / a short paragraph) covering
  what the scholarship is, who funds it, what it covers, and the host country/university — not a one-liner.

Respond with ONLY valid JSON, no markdown fences, no explanation. Required JSON shape:
{
  "title": "Full scholarship name in English",
  "country": "Host country in English",
  "degree_level": "one of: bachelors | masters | phd | postdoc | any",
  "funding_type": "one of: full | partial | tuition_only | stipend | other",
  "deadline": "Deadline as text (e.g. '31 August 2027', 'Rolling') or null",
  "official_url": "URL string or null",
  "raw_description_english": "A clear, fairly detailed English description (3-5 sentences)",
  "eligibility_summary": "2-3 sentences on who qualifies (CGPA, degree, nationality, etc.)",
  "competitiveness": "High" | "Medium" | "Low",
  "tips": "3-5 concise bullet points (use \u2022 as bullet char) on how to apply successfully",
  "tags": ["tag1", "tag2", "..."],
  "ai_summary": "1-2 paragraph engaging summary of the scholarship for Bangladeshi students",
  "university_name": "The primary university or institution administering this scholarship, name only",
  "confidence_note": "1-2 short sentences on source quality and which fields, if any, are uncertain"
}`;

type SynthesizedFields = {
  title?: string;
  country?: string;
  degree_level?: string;
  funding_type?: string;
  deadline?: string | null;
  official_url?: string | null;
  raw_description_english?: string;
  eligibility_summary?: string;
  competitiveness?: string;
  tips?: string;
  tags?: string[];
  ai_summary?: string;
  university_name?: string;
  confidence_note?: string;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rate = await checkRateLimit(`admin:${auth.userId}:bulk-item`, { limit: 40, windowMs: 30 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for bulk import. Please retry shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil(rate.resetMs / 1000).toString() } }
    );
  }

  let body: { title?: string; link?: string | null; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const model: ModelChoice = VALID_MODELS.includes(body.model as ModelChoice)
    ? (body.model as ModelChoice)
    : "deepseek-pro";

  // ── Resolve the shortlink to a real destination, then best-effort scrape it ──
  const sourceLink = body.link?.trim() || null;
  let resolvedUrl: string | null = null;
  let resolveError: string | undefined;
  if (sourceLink) {
    let resolved = await resolveShortlink(sourceLink);
    // LinkedIn's interstitial occasionally rate-limits rapid successive lookups
    // (HTTP 403) — one short-backoff retry clears most of these transient hits.
    if (!resolved.ok && resolved.error?.includes("403")) {
      await new Promise((r) => setTimeout(r, 1500));
      resolved = await resolveShortlink(sourceLink);
    }
    resolvedUrl = resolved.url;
    resolveError = resolved.error;
    logRequest("admin.bulk.resolve", { ip, title, ok: resolved.ok, via: resolved.via });
  }

  let scrapedBlock = "";
  let scrapeOk = false;
  let scrapeError: string | undefined;
  const scrapeTarget = resolvedUrl ?? sourceLink;
  if (scrapeTarget) {
    const result = await scrapeUrl(scrapeTarget);
    scrapeOk = result.ok;
    scrapeError = result.error;
    if (result.ok && result.text) {
      scrapedBlock = `\n\n--- SCRAPED CONTENT FROM ${scrapeTarget} ---\n${result.text}\n--- END SCRAPED CONTENT ---`;
    }
  }

  // ── Duplicate guard: skip AI + insert entirely if this clearly already exists ──
  const existingRows = (await sql`
    SELECT id, title, country, status, slug, official_url
    FROM scholarships
    WHERE status != 'archived'
    ORDER BY created_at DESC
  `) as ScholarshipRow[];
  const dupMatches = findSimilarScholarships(existingRows, {
    title,
    official_url: resolvedUrl ?? sourceLink ?? undefined,
  });
  const strongDup = dupMatches.find((m) => m.match_type === "exact_url" || m.similarity >= 0.65);
  if (strongDup) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "duplicate",
      existing: strongDup,
    });
  }

  // ── AI synthesis (web-search grounded) ──
  const userPrompt = `Scholarship to research: "${title}"
${sourceLink ? `A source link was provided in the original post: ${sourceLink}` : ""}
${resolvedUrl && resolvedUrl !== sourceLink ? `It resolves to: ${resolvedUrl}` : ""}
${!scrapeOk ? `(That page could not be fetched directly${scrapeError ? ` — ${scrapeError}` : ""}; rely on web search and your knowledge instead, and prefer the most official source you can find.)` : ""}
Use web search to confirm the official program page, funding type, eligibility, and deadline before answering.${scrapedBlock}`.trim();

  let raw: string;
  let modelUsed: string;
  let citations: { url: string; title?: string }[] | undefined;
  try {
    const result = await fetchCompletion({
      model,
      system: BULK_SYNTHESIS_SYSTEM,
      user: userPrompt,
      maxTokens: 1800,
      temperature: 0.3,
      webSearch: true,
      webSearchMaxResults: 5,
    });
    raw = result.content;
    modelUsed = result.modelUsed;
    citations = result.citations;
  } catch (err) {
    return NextResponse.json({ error: `AI request failed: ${String(err)}` }, { status: 502 });
  }

  logRequest("admin.bulk.synthesize", { ip, title, model: modelUsed });

  let parsed: SynthesizedFields;
  try {
    parsed = parseJsonFromCompletion<SynthesizedFields>(raw);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 422 });
  }

  const finalTitle = parsed.title?.trim() || title;
  const finalCountry = parsed.country?.trim() || "Unknown";

  const slugBase = generateScholarshipSlug(finalTitle, finalCountry);
  const slugRows = await sql`SELECT slug FROM scholarships WHERE slug IS NOT NULL`;
  const existingSlugs = new Set(slugRows.map((r) => r.slug as string));
  const slug = slugBase ? makeSlugUnique(slugBase, existingSlugs) : null;

  let inserted: Record<string, unknown>;
  try {
    const rows = await sql`
      INSERT INTO scholarships (
        created_by, title, country, degree_level, funding_type, deadline, official_url,
        raw_description, status, slug, is_live,
        eligibility_summary, competitiveness, tips, tags, ai_summary, thumbnail_prompt,
        updated_at
      )
      VALUES (
        ${auth.userId},
        ${finalTitle},
        ${finalCountry},
        ${parsed.degree_level ?? "masters"},
        ${parsed.funding_type ?? "full"},
        ${parsed.deadline ?? null},
        ${parsed.official_url ?? resolvedUrl ?? null},
        ${parsed.raw_description_english ?? ""},
        'draft',
        ${slug},
        true,
        ${parsed.eligibility_summary ?? null},
        ${parsed.competitiveness ?? null},
        ${parsed.tips ?? null},
        ${JSON.stringify(parsed.tags ?? [])}::jsonb,
        ${parsed.ai_summary ?? null},
        ${parsed.university_name ?? null},
        NOW()
      )
      RETURNING *
    `;
    inserted = rows[0];
  } catch (err) {
    console.error("bulk process-item DB insert error:", err);
    return NextResponse.json({ error: `Failed to save draft: ${String(err)}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    scholarship: inserted,
    meta: {
      modelUsed,
      confidenceNote: parsed.confidence_note ?? null,
      citations: citations ?? [],
      resolvedUrl,
      resolveError,
      scrape: { attempted: Boolean(scrapeTarget), ok: scrapeOk, error: scrapeOk ? undefined : scrapeError },
      dupWarnings: dupMatches.filter((m) => m.match_type === "possible"),
    },
  });
}
