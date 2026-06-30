/**
 * Lightweight trigram-based similarity matching for scholarships, shared by
 * the manual "check similar" lookup and the bulk-import duplicate guard.
 */

export type ScholarshipRow = {
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

export function trigramSimilarity(a: string, b: string): number {
  const ta = getTrigrams(a);
  const tb = getTrigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared++;
  }
  return shared / Math.max(ta.size, tb.size);
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Finds scholarships similar to the candidate, sorted by relevance (best first). */
export function findSimilarScholarships(
  rows: ScholarshipRow[],
  candidate: { title: string; country?: string; official_url?: string },
): SimilarMatch[] {
  const candidateTitle = candidate.title.trim();
  const candidateCountry = candidate.country?.trim() ?? "";
  const candidateUrl = candidate.official_url?.trim() ?? "";

  const matches: SimilarMatch[] = [];

  for (const row of rows) {
    if (candidateUrl && row.official_url) {
      if (normalizeUrl(candidateUrl) === normalizeUrl(row.official_url)) {
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

    const titleSim = trigramSimilarity(candidateTitle, row.title);
    const countrySim = candidateCountry ? trigramSimilarity(candidateCountry, row.country) : 0;
    const combinedSim = candidateCountry ? titleSim * 0.75 + countrySim * 0.25 : titleSim;

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

  matches.sort((a, b) => {
    if (a.match_type === "exact_url") return -1;
    if (b.match_type === "exact_url") return 1;
    return b.similarity - a.similarity;
  });

  return matches;
}
