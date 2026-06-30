import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/api-auth";
import { checkRateLimit, getClientIp, logRequest } from "@/lib/nim";
import { fetchCompletion, parseJsonFromCompletion, type ModelChoice } from "@/lib/ai-completion";
import { scrapeUrl } from "@/lib/scrape";

const PARSE_SYSTEM = `You are a scholarship research and data-extraction specialist.

You will be given some information about a scholarship. It may be very minimal
(just a name and country) or more detailed. It may be in Bengali, English, or
mixed. You may also be given the text content scraped from the scholarship's
official web page.

Your job: produce a complete, accurate structured record in English. Use the
provided text first. For well-known scholarships (Chevening, Fulbright, DAAD,
Erasmus Mundus, Commonwealth, etc.) you may also use your own knowledge to fill
gaps.

CRITICAL ACCURACY RULES:
- NEVER invent a specific deadline date. If you are not certain of the exact
  deadline from the provided text or solid knowledge, set "deadline" to null.
- NEVER fabricate an official_url. Only use a URL that appears in the input or
  the scraped text. If none is given, set it to null.
- Prefer leaving a field null over guessing. An admin will review everything.

Respond with ONLY valid JSON, no markdown, no explanation.

Required JSON shape:
{
  "title": "Full scholarship name in English",
  "country": "Host country in English",
  "degree_level": "one of: bachelors | masters | phd | postdoc | any",
  "funding_type": "one of: full | partial | tuition_only | stipend | other",
  "deadline": "Deadline as text (e.g., '31 August 2026', 'Rolling') or null",
  "official_url": "URL string or null",
  "raw_description_english": "A clear English description with all key details",
  "confidence_note": "1 short sentence on which fields came from knowledge vs source"
}`;

const VALID_MODELS: ModelChoice[] = ["nim", "kimi", "deepseek", "mistral", "deepseek-pro", "minimax-m3"];

const extractUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/[^\s"'<>)）]+/i);
  return match ? match[0].replace(/[.,;]+$/, "") : null;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rate = await checkRateLimit(`admin:${auth.userId}:parse`, { limit: 15, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil(rate.resetMs / 1000).toString() } }
    );
  }

  let body: { raw_description?: string; model?: string; scrape?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawDescription = body.raw_description?.trim();
  if (!rawDescription) {
    return NextResponse.json({ error: "raw_description is required" }, { status: 400 });
  }

  const model: ModelChoice = VALID_MODELS.includes(body.model as ModelChoice)
    ? (body.model as ModelChoice)
    : "deepseek";

  let scrapedBlock = "";
  let scrapeInfo: { attempted: boolean; ok: boolean; url?: string; error?: string } = { attempted: false, ok: false };

  if (body.scrape !== false) {
    const url = extractUrl(rawDescription);
    if (url) {
      scrapeInfo = { attempted: true, ok: false, url };
      const result = await scrapeUrl(url);
      if (result.ok && result.text) {
        scrapedBlock = `\n\n--- SCRAPED CONTENT FROM ${url} ---\n${result.text}\n--- END SCRAPED CONTENT ---`;
        scrapeInfo.ok = true;
      } else {
        scrapeInfo.error = result.error;
      }
      logRequest("admin.parse.scrape", { ip, url, ok: scrapeInfo.ok });
    }
  }

  const userPrompt = `Scholarship information provided by the admin:\n\n${rawDescription}${scrapedBlock}`;

  let content: string;
  let modelUsed: string;
  try {
    const result = await fetchCompletion({
      model,
      system: PARSE_SYSTEM,
      user: userPrompt,
      maxTokens: 900,
      temperature: 0.2,
    });
    content = result.content;
    modelUsed = result.modelUsed;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  logRequest("admin.parse.complete", { ip, model: modelUsed });

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonFromCompletion(content);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw: content }, { status: 422 });
  }

  return NextResponse.json({ parsed, meta: { modelUsed, scrape: scrapeInfo } });
}
