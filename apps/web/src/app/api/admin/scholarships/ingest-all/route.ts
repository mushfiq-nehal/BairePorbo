import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { generateEmbedding, logRequest } from "@/lib/nim";

async function requireAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

type ScholarshipRecord = {
  id: string;
  title: string;
  country: string;
  degree_level: string | null;
  funding_type: string | null;
  deadline: string | null;
  official_url: string | null;
  raw_description: string | null;
  ai_summary: string | null;
  eligibility_summary: string | null;
  tips: string | null;
  tags: string[] | null;
};

const chunkText = (text: string, chunkSize = 900, overlap = 120) => {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const slice = text.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end === text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
};

async function ingestOne(
  record: ScholarshipRecord,
  apiKey: string,
  db: ReturnType<typeof createServiceClient>
): Promise<{ id: string; chunks: number; error?: string }> {
  const header = [
    `Title: ${record.title}`,
    `Country: ${record.country}`,
    `Degree level: ${record.degree_level ?? "Not specified"}`,
    `Funding type: ${record.funding_type ?? "Not specified"}`,
    `Deadline: ${record.deadline ?? "Open"}`,
    `Official URL: ${record.official_url ?? "Not specified"}`,
  ].join("\n");

  const sections = [
    record.raw_description ? `Description:\n${record.raw_description}` : null,
    record.ai_summary ? `AI Summary:\n${record.ai_summary}` : null,
    record.eligibility_summary ? `Eligibility:\n${record.eligibility_summary}` : null,
    record.tips ? `Tips:\n${record.tips}` : null,
    record.tags?.length ? `Tags: ${record.tags.join(", ")}` : null,
  ].filter(Boolean) as string[];

  const content = [header, ...sections].join("\n\n");
  const chunks = chunkText(content);

  // Delete existing docs for this scholarship
  await db.from("ScholarshipDoc").delete().eq("scholarship_id", record.id);

  const embeddings: { content: string; embedding: number[] }[] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk, apiKey);
    embeddings.push({ content: chunk, embedding });
  }

  const payload = embeddings.map((item, index) => ({
    content: item.content,
    embedding: item.embedding,
    scholarship_id: record.id,
    metadata: { index, title: record.title, country: record.country },
  }));

  const { error: insertError } = await db.from("ScholarshipDoc").insert(payload);
  if (insertError) return { id: record.id, chunks: 0, error: insertError.message };

  return { id: record.id, chunks: chunks.length };
}

// POST /api/admin/scholarships/ingest-all
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = await requireAdmin(cookieStore);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NIM API key not configured" }, { status: 500 });

  // Parse optional body for filtering
  let ids: string[] | null = null;
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) ids = body.ids;
  } catch { /* no body is fine */ }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Service key not configured" }, { status: 500 });
  }

  // Fetch all published scholarships (or only specified IDs)
  let query = service
    .from("scholarships")
    .select("id, title, country, degree_level, funding_type, deadline, official_url, raw_description, ai_summary, eligibility_summary, tips, tags")
    .eq("status", "published");

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { data: scholarships, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!scholarships || scholarships.length === 0) {
    return NextResponse.json({ message: "No published scholarships to ingest", results: [] });
  }

  const results: { id: string; title: string; chunks: number; error?: string }[] = [];

  for (const s of scholarships as ScholarshipRecord[]) {
    logRequest("rag.ingest.batch.start", { scholarshipId: s.id, title: s.title });
    const result = await ingestOne(s, apiKey, service);
    results.push({ ...result, title: s.title });
    logRequest("rag.ingest.batch.done", { scholarshipId: s.id, chunks: result.chunks });
  }

  const succeeded = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;

  return NextResponse.json({ succeeded, failed, results });
}
