import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/api-auth";
import { fetchCompletion, parseJsonFromCompletion } from "@/lib/ai-completion";
import { scrapeUrl } from "@/lib/scrape";

const PARSE_SYSTEM = `You are a scholarship research and data-extraction specialist.

Given information about a single scholarship, produce a structured JSON record in English.
Use the provided text first. For well-known scholarships you may use your own knowledge to fill gaps.

CRITICAL ACCURACY RULES:
- NEVER invent a specific deadline date. If uncertain, set "deadline" to null.
- NEVER fabricate an official_url. Only use URLs from the input or scraped text. If none, null.
- Prefer null over guessing. An admin will review everything.

Respond with ONLY valid JSON, no markdown, no explanation.

Required JSON shape:
{
  "title": "Full scholarship name in English",
  "country": "Host country in English",
  "degree_level": "one of: bachelors | masters | phd | postdoc | any",
  "funding_type": "one of: full | partial | tuition_only | stipend | other",
  "deadline": "Deadline as text (e.g. '31 August 2026', 'Rolling') or null",
  "official_url": "URL string or null",
  "raw_description_english": "Clear English description with all key details",
  "confidence_note": "1 short sentence on confidence level"
}`;

const extractUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/[^\s"'<>)）]+/i);
  return match ? match[0].replace(/[.,;]+$/, "") : null;
};

async function parseOne(
  raw: string,
  scrape: boolean,
): Promise<{ parsed: Record<string, unknown> | null; error?: string; scrapeInfo?: object }> {
  let scrapedBlock = "";
  let scrapeInfo = {};

  if (scrape) {
    const url = extractUrl(raw);
    if (url) {
      const result = await scrapeUrl(url);
      if (result.ok && result.text) {
        scrapedBlock = `\n\n--- SCRAPED FROM ${url} ---\n${result.text}\n--- END ---`;
        scrapeInfo = { url, ok: true };
      } else {
        scrapeInfo = { url, ok: false, error: result.error };
      }
    }
  }

  try {
    const { content } = await fetchCompletion({
      model: "deepseek",
      system: PARSE_SYSTEM,
      user: `Scholarship info:\n\n${raw}${scrapedBlock}`,
      maxTokens: 900,
      temperature: 0.15,
    });
    const parsed = parseJsonFromCompletion<Record<string, unknown>>(content);
    return { parsed, scrapeInfo };
  } catch (err) {
    return { parsed: null, error: String(err) };
  }
}

/** Run tasks in parallel with a concurrency ceiling. */
async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { items?: string[]; scrape?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items[] is required" }, { status: 400 });
  }
  if (items.length > 1000) {
    return NextResponse.json({ error: "Maximum 1000 scholarships per batch" }, { status: 400 });
  }

  const scrape = body.scrape !== false;
  const tasks = items.map((raw, i) => async () => {
    const result = await parseOne(raw.trim(), scrape);
    return { index: i, ...result };
  });

  // Parse up to 5 scholarships in parallel to stay within rate limits
  const results = await pLimit(tasks, 5);

  return NextResponse.json({ results });
}
