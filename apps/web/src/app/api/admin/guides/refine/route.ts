import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIp, logRequest } from "@/lib/nim";
import { fetchCompletion, parseJsonFromCompletion } from "@/lib/ai-completion";

const GUIDE_REFINE_SYSTEM = `You are an expert content editor for BairePorbo, a study-abroad guidance platform for Bangladeshi students.

The admin will give you a rough draft — notes, bullet points, or prose — about a higher study topic (scholarships, IELTS, SOP, visa, specific countries, etc.).

Your job: turn it into a polished, SEO-optimised guide with TWO distinct sections:
  1. A full blog post / article body (the "content" field) — narrative and informative
  2. A structured FAQ section (the "faqs" field) — question-and-answer format

LANGUAGE: Write ALL content (title, description, intro, content body, all FAQ questions and answers) in Bengali (বাংলা). Only the slug and tags should remain in English (lowercase, URL-safe).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — ARTICLE / BLOG POST BODY ("content" field)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Write a well-structured, informative article in Bengali — 5–7 paragraphs total
- Use Markdown headings (## শিরোনাম) to organise the article into clear sections
- Cover the topic in depth: background/overview, eligibility, process/steps, key tips, deadlines, important details and warnings
- Each paragraph should be 3–5 sentences — thorough but readable
- Write like a knowledgeable senior explaining to a Bangladeshi Masters/PhD aspirant — warm, specific, practical
- Do NOT just list bullets — write real prose paragraphs under each heading
- Suggested section structure (adapt to the topic):
    ## বৃত্তির পরিচিতি  (or topic overview)
    ## যোগ্যতার শর্তাবলী
    ## আবেদন প্রক্রিয়া
    ## প্রয়োজনীয় কাগজপত্র
    ## গুরুত্বপূর্ণ টিপস
    ## সাধারণ ভুলসমূহ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — FAQ ("faqs" field)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Generate 8–14 FAQ items that complement the article body
- Cover questions students commonly ask that need a direct, concise answer
- Each answer must be 2–5 sentences minimum — never one-liners
- Write in conversational Bengali — like a knowledgeable senior answering directly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OTHER FIELDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- title: A clear, SEO-optimised title in Bengali
- description: One sentence in Bengali, ≤ 155 chars — used as the meta description
- intro: 2–3 sentences in Bengali introducing what the guide covers (shown just below the title)
- slug: URL-safe English slug — lowercase with hyphens, no spaces or special chars
- category: exactly one of: Scholarships | Applications | Tests | Destinations | Visa
- tags: 5–8 short English keyword strings (scholarship names, countries, test names, etc.)

CRITICAL: Respond with ONLY valid JSON, no markdown fences, no explanation.

Required JSON shape:
{
  "slug": "url-safe-slug",
  "title": "Full SEO title in Bengali",
  "description": "Meta description in Bengali (≤ 155 chars)",
  "category": "Scholarships | Applications | Tests | Destinations | Visa",
  "tags": ["tag1", "tag2"],
  "intro": "2–3 sentence intro in Bengali.",
  "content": "Full article body in Bengali with Markdown headings (## Section). 5–7 paragraphs of real prose.",
  "faqs": [
    { "question": "Question in Bengali?", "answer": "Full answer in Bengali." }
  ]
}`;

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rate = await checkRateLimit(`admin:${admin.id}:guide-refine`, {
    limit: 10,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil(rate.resetMs / 1000).toString() } }
    );
  }

  let body: { draft?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const draft = body.draft?.trim();
  if (!draft || draft.length < 30) {
    return NextResponse.json({ error: "draft must be at least 30 characters" }, { status: 400 });
  }

  let content: string;
  let modelUsed: string;
  try {
    const result = await fetchCompletion({
      model: "deepseek",
      system: GUIDE_REFINE_SYSTEM,
      user: `Admin's rough draft:\n\n${draft}`,
      maxTokens: 5000,
      temperature: 0.4,
    });
    content = result.content;
    modelUsed = result.modelUsed;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  logRequest("admin.guide.refine.complete", { ip, model: modelUsed });

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonFromCompletion(content);
  } catch {
    return NextResponse.json(
      { error: "AI returned invalid JSON", raw: content },
      { status: 422 }
    );
  }

  // Validate the key fields exist
  if (!parsed.slug || !parsed.title || !parsed.content || !Array.isArray(parsed.faqs)) {
    return NextResponse.json(
      { error: "AI response missing required fields", raw: parsed },
      { status: 422 }
    );
  }

  // Enforce unique slug — append -2, -3 etc. if needed
  const db = createServiceClient();
  const baseSlug = String(parsed.slug);
  let finalSlug = baseSlug;
  let attempt = 1;
  while (true) {
    const { data } = await db.from("guides").select("id").eq("slug", finalSlug).maybeSingle();
    if (!data) break;
    attempt++;
    finalSlug = `${baseSlug}-${attempt}`;
  }
  parsed.slug = finalSlug;

  return NextResponse.json({ parsed, meta: { modelUsed } });
}
