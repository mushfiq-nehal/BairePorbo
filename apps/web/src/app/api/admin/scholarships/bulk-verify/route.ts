import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/api-auth";
import { fetchCompletion, parseJsonFromCompletion } from "@/lib/ai-completion";

export type ParsedScholarship = {
  title: string;
  country: string;
  degree_level: string;
  funding_type: string;
  deadline: string | null;
  official_url: string | null;
  raw_description_english: string;
};

export type VerifyResult = {
  index: number;
  verified: ParsedScholarship;
  confidence: "high" | "medium" | "low";
  conflicts: string[];
  minimax_raw?: ParsedScholarship;
  qwen_raw?: ParsedScholarship;
  error?: string;
};

const VERIFY_SYSTEM = `You are a scholarship data verification specialist.

You will receive a pre-parsed scholarship record. Verify each field and correct any errors
using your knowledge. For well-known scholarships, check key details (title, country, 
degree level, funding) against what you know.

RULES:
- Only correct if you are highly confident the parsed value is wrong.
- NEVER invent deadline dates — keep null if uncertain.
- Keep official_url only if you recognise it as legitimately associated with this scholarship.
- Respond with ONLY valid JSON, same shape as input.

Required JSON shape:
{
  "title": "string",
  "country": "string",
  "degree_level": "bachelors | masters | phd | postdoc | any",
  "funding_type": "full | partial | tuition_only | stipend | other",
  "deadline": "string or null",
  "official_url": "string or null",
  "raw_description_english": "string"
}`;

const KEY_FIELDS: (keyof ParsedScholarship)[] = [
  "title", "country", "degree_level", "funding_type",
];

function normalise(v: unknown): string {
  return String(v ?? "").toLowerCase().trim();
}

function fieldMatches(a: unknown, b: unknown): boolean {
  return normalise(a) === normalise(b);
}

function scoreConfidence(
  original: ParsedScholarship,
  minimax: ParsedScholarship | null,
  qwen: ParsedScholarship | null,
): { confidence: "high" | "medium" | "low"; conflicts: string[] } {
  if (!minimax && !qwen) return { confidence: "low", conflicts: ["both verifiers failed"] };

  const conflicts: string[] = [];

  for (const field of KEY_FIELDS) {
    const vals = [minimax?.[field], qwen?.[field]].filter(Boolean);
    if (vals.length === 0) continue;

    const origMatch = vals.filter((v) => fieldMatches(v, original[field])).length;
    const allAgree = vals.every((v) => fieldMatches(v, vals[0]));

    if (!allAgree || origMatch === 0) {
      const details = [minimax?.[field], qwen?.[field]]
        .map((v, i) => v ? `${i === 0 ? "minimax" : "qwen"}: "${v}"` : null)
        .filter(Boolean)
        .join(", ");
      conflicts.push(`${field} (parsed: "${original[field]}" → ${details})`);
    }
  }

  let confidence: "high" | "medium" | "low";
  if (conflicts.length === 0) confidence = "high";
  else if (conflicts.length <= 1) confidence = "medium";
  else confidence = "low";

  return { confidence, conflicts };
}

function mergeVerified(
  original: ParsedScholarship,
  minimax: ParsedScholarship | null,
  qwen: ParsedScholarship | null,
): ParsedScholarship {
  // When both verifiers agree on a corrected value, prefer that over original.
  // For description, keep original unless both verifiers substantially differ.
  const merged = { ...original };

  for (const field of KEY_FIELDS) {
    const mv = minimax?.[field];
    const qv = qwen?.[field];
    if (mv && qv && fieldMatches(mv, qv) && !fieldMatches(mv, original[field])) {
      (merged as Record<string, unknown>)[field] = mv;
    }
  }

  return merged;
}

async function verifyOne(
  index: number,
  scholarship: ParsedScholarship,
): Promise<VerifyResult> {
  const userPrompt = `Verify this parsed scholarship record:\n${JSON.stringify(scholarship, null, 2)}`;

  const [minimaxResult, qwenResult] = await Promise.allSettled([
    fetchCompletion({ model: "minimax", system: VERIFY_SYSTEM, user: userPrompt, maxTokens: 700, temperature: 0.1 }),
    fetchCompletion({ model: "qwen",    system: VERIFY_SYSTEM, user: userPrompt, maxTokens: 700, temperature: 0.1 }),
  ]);

  let minimax: ParsedScholarship | null = null;
  let qwen: ParsedScholarship | null = null;

  if (minimaxResult.status === "fulfilled") {
    try { minimax = parseJsonFromCompletion<ParsedScholarship>(minimaxResult.value.content); } catch { /* keep null */ }
  }
  if (qwenResult.status === "fulfilled") {
    try { qwen = parseJsonFromCompletion<ParsedScholarship>(qwenResult.value.content); } catch { /* keep null */ }
  }

  const { confidence, conflicts } = scoreConfidence(scholarship, minimax, qwen);
  const verified = mergeVerified(scholarship, minimax, qwen);

  return { index, verified, confidence, conflicts, minimax_raw: minimax ?? undefined, qwen_raw: qwen ?? undefined };
}

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
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

  let body: { scholarships?: ParsedScholarship[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scholarships = body.scholarships;
  if (!Array.isArray(scholarships) || scholarships.length === 0) {
    return NextResponse.json({ error: "scholarships[] is required" }, { status: 400 });
  }
  if (scholarships.length > 50) {
    return NextResponse.json({ error: "Maximum 50 per batch" }, { status: 400 });
  }

  // Verify 3 at a time (each verification fires 2 model calls in parallel)
  const tasks = scholarships.map((s, i) => () => verifyOne(i, s));
  const results = await pLimit(tasks, 3);

  return NextResponse.json({ results });
}
