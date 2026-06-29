import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/utils/db";
import { requireAdmin } from "@/utils/api-auth";

type ScholarshipRow = {
  id: string;
  title: string;
  country: string;
  status: string;
  slug: string | null;
  official_url: string | null;
};

export type SimilarMatch = {
  id: string;
  title: string;
  country: string;
  status: string;
  slug: string | null;
  similarity: number;
  match_type: "exact_url" | "likely" | "possible";
};

function getTrigrams(s: string): Set<string> {
  const normalized = `  ${s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()}  `;
  const trigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 2; i++) {
    trigrams.add(normalized.slice(i, i + 3));
  }
  return trigrams;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = getTrigrams(a);
  const tb = getTrigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared++;
  }
  return shared / Math.max(ta.size, tb.size);
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; country?: string; official_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, country, official_url } = body;
  if (!title?.trim()) {
    return NextResponse.json({ matches: [] });
  }

  const rows = (await sql`
    SELECT id, title, country, status, slug, official_url
    FROM scholarships
    WHERE status != 'archived'
    ORDER BY created_at DESC
  `) as ScholarshipRow[];

  const candidateTitle = title.trim();
  const candidateCountry = country?.trim() ?? "";
  const candidateUrl = official_url?.trim() ?? "";

  const matches: SimilarMatch[] = [];

  for (const row of rows) {
    // Exact URL match (normalize to ignore trailing slashes, protocol differences)
    if (candidateUrl && row.official_url) {
      const normCandidate = normalizeUrl(candidateUrl);
      const normRow = normalizeUrl(row.official_url);
      if (normCandidate === normRow) {
        matches.push({
          id: row.id,
          title: row.title,
          country: row.country,
          status: row.status,
          slug: row.slug,
          similarity: 1.0,
          match_type: "exact_url",
        });
        continue;
      }
    }

    // Title trigram similarity (optionally weighted with country)
    const titleSim = trigramSimilarity(candidateTitle, row.title);

    // Boost score if countries also match
    const countrySim = candidateCountry
      ? trigramSimilarity(candidateCountry, row.country)
      : 0;
    const combinedSim =
      candidateCountry
        ? titleSim * 0.75 + countrySim * 0.25
        : titleSim;

    if (combinedSim >= 0.35) {
      matches.push({
        id: row.id,
        title: row.title,
        country: row.country,
        status: row.status,
        slug: row.slug,
        similarity: combinedSim,
        match_type: combinedSim >= 0.65 ? "likely" : "possible",
      });
    }
  }

  // Sort: exact_url first, then by similarity descending
  matches.sort((a, b) => {
    if (a.match_type === "exact_url") return -1;
    if (b.match_type === "exact_url") return 1;
    return b.similarity - a.similarity;
  });

  return NextResponse.json({ matches: matches.slice(0, 5) });
}
