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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NIM API key not configured" }, { status: 500 });

  const { id } = await params;
  const rows = await sql`
    SELECT id, title, country, degree_level, funding_type, deadline, official_url,
           raw_description, ai_summary, eligibility_summary, tips, tags
    FROM scholarships WHERE id = ${id} LIMIT 1
  `;
  const scholarship = rows[0] as ScholarshipRecord | undefined;
  if (!scholarship) return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });

  const header = [
    `Title: ${scholarship.title}`,
    `Country: ${scholarship.country}`,
    `Degree level: ${scholarship.degree_level ?? "Not specified"}`,
    `Funding type: ${scholarship.funding_type ?? "Not specified"}`,
    `Deadline: ${scholarship.deadline ?? "Open"}`,
    `Official URL: ${scholarship.official_url ?? "Not specified"}`,
  ].join("\n");

  const sections = [
    scholarship.raw_description ? `Description:\n${scholarship.raw_description}` : null,
    scholarship.ai_summary ? `AI Summary:\n${scholarship.ai_summary}` : null,
    scholarship.eligibility_summary ? `Eligibility:\n${scholarship.eligibility_summary}` : null,
    scholarship.tips ? `Tips:\n${scholarship.tips}` : null,
    scholarship.tags?.length ? `Tags: ${scholarship.tags.join(", ")}` : null,
  ].filter(Boolean) as string[];

  const content = [header, ...sections].join("\n\n");
  const chunks = chunkText(content);

  await sql`DELETE FROM "ScholarshipDoc" WHERE scholarship_id = ${scholarship.id}`;

  const embeddings: { content: string; embedding: number[] }[] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk, apiKey);
    embeddings.push({ content: chunk, embedding });
  }

  for (let i = 0; i < embeddings.length; i++) {
    await sql`
      INSERT INTO "ScholarshipDoc" (content, embedding, scholarship_id, metadata)
      VALUES (
        ${embeddings[i].content},
        ${JSON.stringify(embeddings[i].embedding)}::vector,
        ${scholarship.id},
        ${JSON.stringify({ index: i, title: scholarship.title, country: scholarship.country })}::jsonb
      )
    `;
  }

  logRequest("rag.ingest.complete", { scholarshipId: scholarship.id, chunks: chunks.length });
  return NextResponse.json({ chunks: chunks.length });
}
