import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { generateEmbedding, logRequest } from "@/lib/nim";

async function requireAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const auth = await requireAdmin(cookieStore);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NIM API key not configured" }, { status: 500 });

  const { id } = await params;
  const { data: scholarship, error } = await auth.supabase
    .from("scholarships")
    .select("id, title, country, degree_level, funding_type, deadline, official_url, raw_description, ai_summary, eligibility_summary, tips, tags")
    .eq("id", id)
    .single();

  if (error || !scholarship) {
    return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });
  }

  const record = scholarship as ScholarshipRecord;

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
    record.tags && record.tags.length ? `Tags: ${record.tags.join(", ")}` : null,
  ].filter(Boolean) as string[];

  const content = [header, ...sections].join("\n\n");
  const chunks = chunkText(content);

  const service = createServiceClient();
  const db = service ?? auth.supabase;

  const { error: deleteError } = await db
    .from("ScholarshipDoc")
    .delete()
    .eq("scholarship_id", record.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const embeddings: { content: string; embedding: number[] }[] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk, apiKey);
    embeddings.push({ content: chunk, embedding });
  }

  const payload = embeddings.map((item, index) => ({
    content: item.content,
    embedding: item.embedding,
    scholarship_id: record.id,
    metadata: {
      index,
      title: record.title,
      country: record.country,
    },
  }));

  const { error: insertError } = await db
    .from("ScholarshipDoc")
    .insert(payload);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  logRequest("rag.ingest.complete", { scholarshipId: record.id, chunks: chunks.length });
  return NextResponse.json({ chunks: chunks.length });
}
