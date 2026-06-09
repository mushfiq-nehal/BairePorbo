import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIp, logRequest } from "@/lib/nim";
import { fetchCompletion, parseJsonFromCompletion } from "@/lib/ai-completion";

const GUIDE_REFINE_SYSTEM = `You are an expert content editor for BairePorbo, a study-abroad guidance platform for Bangladeshi students.

The admin will give you a rough draft — notes, bullet points, or prose — about a higher study topic (scholarships, IELTS, SOP, visa, specific countries, etc.).

Your job: turn it into a polished, SEO-optimised guide in a structured FAQ format.

Rules:
- Write for Bangladeshi students seeking higher study abroad (Masters, PhD, Bachelor's).
- The FAQ answers should be thorough but conversational — like a knowledgeable senior explaining clearly.
- Each FAQ answer should be 2–5 sentences minimum (not one-liners).
- Generate 8–14 FAQ items from the draft. More is better for SEO.
- The slug must be URL-safe lowercase with hyphens (no spaces, no special chars).
- Category must be exactly one of: Scholarships | Applications | Tests | Destinations | Visa
- Tags: 5–8 short keyword strings (scholarship names, countries, test names, etc.)
- Description: one sentence, ~150 chars max — used as the meta description.
- Intro: 2–3 sentences introducing what the guide covers.

CRITICAL: Respond with ONLY valid JSON, no markdown fences, no explanation.

Required JSON shape:
{
  "slug": "url-safe-slug",
  "title": "Full SEO title string",
  "description": "Meta description (≤ 155 chars)",
  "category": "Scholarships | Applications | Tests | Destinations | Visa",
  "tags": ["tag1", "tag2"],
  "intro": "2–3 sentence intro paragraph.",
  "faqs": [
    { "question": "Question text?", "answer": "Full answer text." }
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
      maxTokens: 3000,
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
  if (!parsed.slug || !parsed.title || !Array.isArray(parsed.faqs)) {
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
