/**
 * AI-powered academic CV analysis.
 *
 * Uses OpenRouter's `deepseek/deepseek-v4-pro` (the "deepseek-pro" model
 * choice) to review an uploaded CV and return structured, actionable
 * feedback. The result is designed to gently push students toward building
 * a fresh, well-structured CV with our builder.
 */

import { fetchCompletion, parseJsonFromCompletion, extractJsonObject } from "@/lib/ai-completion";

export type SectionFeedback = {
  name: string;
  rating: "strong" | "adequate" | "needs-work" | "missing";
  feedback: string;
  suggestions: string[];
};

export type CVAnalysis = {
  overallScore: number; // 0–100
  summary: string;
  strengths: string[];
  weaknesses: string[];
  sections: SectionFeedback[];
  missingSections: string[];
  actionItems: string[];
};

const SYSTEM_PROMPT = `You are an expert academic career advisor and admissions consultant who has reviewed thousands of CVs for graduate school (Masters/PhD), scholarships, and research positions. You specialise in helping Bangladeshi and international students craft competitive academic CVs.

You will be given the raw extracted text of a student's current CV. Analyse it critically but constructively for use in academic and scholarship applications.

Judge it against the standards of a strong ACADEMIC CV, which typically includes: Contact information, Research Interests / Objective, Education, Research Experience, Publications, Teaching Experience, Awards & Honours, Conference Presentations, Technical/Language Skills, and References.

Return ONLY a single JSON object (no markdown, no prose, no code fences) with EXACTLY this shape:
{
  "overallScore": <integer 0-100>,
  "summary": "<2-3 sentence overall verdict>",
  "strengths": ["<concrete strength>", ...],
  "weaknesses": ["<concrete weakness>", ...],
  "sections": [
    {
      "name": "<section name, e.g. Education>",
      "rating": "strong" | "adequate" | "needs-work" | "missing",
      "feedback": "<1-2 sentence assessment>",
      "suggestions": ["<specific, actionable improvement>", ...]
    }
  ],
  "missingSections": ["<section that should be added>", ...],
  "actionItems": ["<prioritised, specific next step>", ...]
}

Rules:
- Be specific and reference the actual content where possible; avoid generic filler.
- Score strictly: a typical student CV that lacks research framing should score 40-65.
- Provide 3-6 strengths, 3-6 weaknesses, 4-8 actionItems.
- Cover the main academic-CV sections in "sections" (rate ones that are absent as "missing").
- Keep every string concise. Output valid JSON only.`;

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function normalizeAnalysis(raw: Record<string, unknown>): CVAnalysis {
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const sections = Array.isArray(raw.sections)
    ? (raw.sections as Record<string, unknown>[]).map((s) => {
        const rating = String(s.rating ?? "adequate");
        const allowed = ["strong", "adequate", "needs-work", "missing"];
        return {
          name: String(s.name ?? "Section"),
          rating: (allowed.includes(rating) ? rating : "adequate") as SectionFeedback["rating"],
          feedback: String(s.feedback ?? ""),
          suggestions: strArr(s.suggestions),
        };
      })
    : [];

  return {
    overallScore: clampScore(raw.overallScore),
    summary: String(raw.summary ?? ""),
    strengths: strArr(raw.strengths),
    weaknesses: strArr(raw.weaknesses),
    sections,
    missingSections: strArr(raw.missingSections),
    actionItems: strArr(raw.actionItems),
  };
}

/** Analyse extracted CV text and return structured feedback. */
export async function analyzeCVText(
  cvText: string,
): Promise<{ analysis: CVAnalysis; modelUsed: string }> {
  const trimmed = cvText.slice(0, 16000); // keep prompt within budget

  const { content, modelUsed } = await fetchCompletion({
    model: "deepseek-pro",
    system: SYSTEM_PROMPT,
    user: `Here is the extracted text of the CV to analyse:\n\n"""\n${trimmed}\n"""`,
    // deepseek-v4-pro is a reasoning model that defaults to "high" effort,
    // which spends ~80% of maxTokens on invisible thinking tokens before
    // writing the actual answer. 2600 left almost nothing for the JSON
    // itself, so the response was getting truncated mid-object and failing
    // to parse. Budget generously so the visible answer always has room,
    // and exclude the reasoning trace from `content` so parsing never has
    // to skip over it.
    maxTokens: 16_000,
    temperature: 0.3,
    timeoutMs: 55_000,
    reasoning: { exclude: true },
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonFromCompletion<Record<string, unknown>>(content);
  } catch {
    try {
      parsed = extractJsonObject<Record<string, unknown>>(content);
    } catch (err) {
      // Surface a preview so failures are debuggable from logs instead of
      // just "analysis failed" — most commonly caused by the response
      // getting cut off before the model finished writing the JSON.
      const preview = content.slice(0, 300);
      throw new Error(
        `Failed to parse CV analysis JSON from ${modelUsed} (content length ${content.length}): ${
          (err as Error).message
        }. Preview: ${preview}`,
      );
    }
  }

  return { analysis: normalizeAnalysis(parsed), modelUsed };
}
