import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/utils/db";
import { requireAdmin } from "@/utils/api-auth";
import { generateEmbedding, logRequest } from "@/lib/nim";

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

async function ingestOne(record: ScholarshipRecord, apiKey: string): Promise<{ id: string; chunks: number; error?: string }> {
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

  await sql`DELETE FROM "ScholarshipDoc" WHERE scholarship_id = ${record.id}`;

  const embeddings: { content: string; embedding: number[] }[] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk, apiKey);
    embeddings.push({ content: chunk, embedding });
  }

  try {
    for (let i = 0; i < embeddings.length; i++) {
      await sql`
        INSERT INTO "ScholarshipDoc" (content, embedding, scholarship_id, metadata)
        VALUES (
          ${embeddings[i].content},
          ${JSON.stringify(embeddings[i].embedding)}::vector,
          ${record.id},
          ${JSON.stringify({ index: i, title: record.title, country: record.country })}::jsonb
        )
      `;
    }
  } catch (err) {
    return { id: record.id, chunks: 0, error: String(err) };
  }

  return { id: record.id, chunks: chunks.length };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NIM API key not configured" }, { status: 500 });

  let ids: string[] | null = null;
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) ids = body.ids;
  } catch { /* no body is fine */ }

  const scholarships = ids && ids.length > 0
    ? await sql`
        SELECT id, title, country, degree_level, funding_type, deadline, official_url,
               raw_description, ai_summary, eligibility_summary, tips, tags
        FROM scholarships
        WHERE status = 'published' AND id = ANY(${ids}::uuid[])
      `
    : await sql`
        SELECT id, title, country, degree_level, funding_type, deadline, official_url,
               raw_description, ai_summary, eligibility_summary, tips, tags
        FROM scholarships
        WHERE status = 'published'
      `;

  if (!scholarships.length) {
    return NextResponse.json({ message: "No published scholarships to ingest", results: [] });
  }

  const results: { id: string; title: string; chunks: number; error?: string }[] = [];

  for (const s of scholarships as ScholarshipRecord[]) {
    logRequest("rag.ingest.batch.start", { scholarshipId: s.id, title: s.title });
    const result = await ingestOne(s, apiKey);
    results.push({ ...result, title: s.title });
    logRequest("rag.ingest.batch.done", { scholarshipId: s.id, chunks: result.chunks });
  }

  const succeeded = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;

  return NextResponse.json({ succeeded, failed, results });
}
