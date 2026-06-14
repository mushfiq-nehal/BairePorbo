import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/api-auth";
import { sql } from "@/utils/db";

type InputScholarship = {
  title: string;
  country: string;
  official_url?: string | null;
};

type DedupResult = {
  index: number;
  isDuplicate: boolean;
  similarity: number; // 0–1
  matchType: "url" | "exact" | "fuzzy" | null;
  matchedId?: string;
  matchedTitle?: string;
};

type DBRow = { id: string; title: string; country: string; official_url: string | null };

/** Normalise a string for comparison: lowercase, strip year-like numbers, collapse whitespace */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(20\d{2}|19\d{2})\b/g, "") // strip years like 2026, 2027
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple bigram similarity (Dice coefficient) — good for title matching */
function bigramSim(a: string, b: string): number {
  if (!a || !b) return 0;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(a);
  const bb = bigrams(b);
  let intersection = 0;
  for (const bg of ba) if (bb.has(bg)) intersection++;
  return (2 * intersection) / (ba.size + bb.size);
}

/** Normalise a URL to bare hostname + path for comparison */
function normUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\s/g, "");
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { scholarships?: InputScholarship[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = body.scholarships;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json({ error: "scholarships[] is required" }, { status: 400 });
  }

  // Fetch all non-archived scholarships from DB
  const existing = await sql`
    SELECT id, title, country, official_url
    FROM scholarships
    WHERE status != 'archived'
  ` as DBRow[];

  const results: DedupResult[] = incoming.map((item, index) => {
    const inUrl = item.official_url ? normUrl(item.official_url) : null;
    const inTitle = norm(item.title);
    const inCountry = norm(item.country);

    let best: DedupResult = { index, isDuplicate: false, similarity: 0, matchType: null };

    for (const row of existing) {
      // 1. URL exact match (strongest signal)
      if (inUrl && row.official_url) {
        const rowUrl = normUrl(row.official_url);
        if (inUrl === rowUrl) {
          return { index, isDuplicate: true, similarity: 1, matchType: "url", matchedId: row.id, matchedTitle: row.title };
        }
      }

      // 2. Exact normalised title + same country
      const rowTitle = norm(row.title);
      const rowCountry = norm(row.country);
      if (inTitle === rowTitle && inCountry === rowCountry) {
        return { index, isDuplicate: true, similarity: 1, matchType: "exact", matchedId: row.id, matchedTitle: row.title };
      }

      // 3. Fuzzy bigram similarity on title (country must also partially match)
      const titleSim = bigramSim(inTitle, rowTitle);
      const countrySim = bigramSim(inCountry, rowCountry);
      // Weight: 70% title, 30% country
      const combined = titleSim * 0.7 + countrySim * 0.3;

      if (combined > best.similarity) {
        best = {
          index,
          isDuplicate: combined >= 0.8,
          similarity: combined,
          matchType: combined >= 0.8 ? "fuzzy" : null,
          matchedId: combined >= 0.8 ? row.id : undefined,
          matchedTitle: combined >= 0.8 ? row.title : undefined,
        };
      }
    }

    return best;
  });

  return NextResponse.json({ results });
}
