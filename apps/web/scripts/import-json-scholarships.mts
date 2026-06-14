/**
 * One-shot import script for cleaned_scholarships.json
 * Runs: pnpm exec tsx scripts/import-json-scholarships.mts
 *
 * Pipeline:
 *   1. Read + normalize JSON fields locally (funding, degree, deadline, url)
 *   2. Batch-translate Bengali titles + summaries → English via deepseek (15/call)
 *   3. Dedup against existing DB (exact + fuzzy title + url match)
 *   4. Insert non-duplicates as drafts
 */

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

// ── Load env ──────────────────────────────────────────────────────────────────

function loadEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const lines = readFileSync(path, "utf-8").split("\n");
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
      if (m) env[m[1]] = m[2].trim().replace(/\s*#.*$/, "").trim();
    }
  } catch { /* ignore */ }
  return env;
}

const env = loadEnv(".env.local");
const DATABASE_URL = env.DATABASE_URL;
const OPENROUTER_KEY = env.OPENROUTER_API_KEY?.replace(/\s/g, "");

if (!DATABASE_URL) { console.error("DATABASE_URL missing"); process.exit(1); }
if (!OPENROUTER_KEY) { console.error("OPENROUTER_API_KEY missing"); process.exit(1); }

const sql = neon(DATABASE_URL);

// ── Raw JSON type ─────────────────────────────────────────────────────────────

type RawItem = {
  title: string;
  country: string;
  university?: string;
  degree: string[];
  funding: string;
  deadline: string;
  official_link: string;
  summary: string;
};

// ── Normalise helpers ─────────────────────────────────────────────────────────

function normDegree(degrees: string[]): string {
  if (!degrees || degrees.length === 0) return "any";
  if (degrees.length > 1) return "any";
  const d = degrees[0].toLowerCase();
  if (d.includes("bachelor") || d.includes("undergrad")) return "bachelors";
  if (d.includes("master") || d.includes("mba") || d.includes("msc")) return "masters";
  if (d.includes("phd") || d.includes("doctor")) return "phd";
  if (d.includes("postdoc")) return "postdoc";
  return "any";
}

function normFunding(f: string): string {
  const s = (f ?? "").toLowerCase();
  if (s.includes("fully") || s.includes("full fund")) return "full";
  if (s.includes("partial")) return "partial";
  if (s.includes("tuition")) return "tuition_only";
  if (s.includes("stipend")) return "stipend";
  return "other";
}

function normDeadline(d: string): string | null {
  if (!d || d.trim() === "") return null;
  // Already ISO yyyy-mm-dd — convert to readable
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const date = new Date(`${m[1]}-${m[2]}-${m[3]}`);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
    }
  }
  return d.trim() || null;
}

// ── Slug helpers ──────────────────────────────────────────────────────────────

function generateSlug(title: string, country: string): string {
  return `${title} ${country}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function makeSlugUnique(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// ── OpenRouter batch translate ────────────────────────────────────────────────

type TranslateResult = {
  index: number;
  title_english: string;
  description_english: string;
};

async function translateBatch(
  items: { index: number; title: string; summary: string; country: string; university?: string }[]
): Promise<TranslateResult[]> {
  const prompt = `You are a scholarship data specialist. The items below have Bengali titles and summaries.

For each item return a JSON array with:
- index: same index from input
- title_english: Clean English scholarship name. Remove year markers (2025, 2026). Keep the institution/scholarship name only.
- description_english: 2-3 sentence English summary of the scholarship.

If title already contains an English name, keep it. Use the summary + university + country to infer description.
Do NOT include Bengali text in output.

Respond with ONLY a valid JSON array. No markdown, no explanation.

Input:
${JSON.stringify(items, null, 2)}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw = data?.choices?.[0]?.message?.content ?? "[]";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned) as TranslateResult[];
}

// ── Dedup helpers ─────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/\b(20\d{2}|19\d{2})\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigramSim(a: string, b: string): number {
  if (!a || !b) return 0;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(a), bb = bigrams(b);
  let shared = 0;
  for (const bg of ba) if (bb.has(bg)) shared++;
  return (2 * shared) / (ba.size + bb.size);
}

function normUrl(u: string): string {
  try { const p = new URL(u); return (p.hostname + p.pathname).replace(/\/+$/, "").toLowerCase(); }
  catch { return u.toLowerCase(); }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const raw: RawItem[] = JSON.parse(readFileSync("cleaned_scholarships.json", "utf-8"));
  console.log(`\n📦 Loaded ${raw.length} scholarships from JSON\n`);

  // Filter out items with no country
  const valid = raw.filter((r) => r.country && r.country.trim());
  console.log(`✓ ${valid.length} have a country (${raw.length - valid.length} skipped — no country)\n`);

  // ── Phase 1: Translate titles + summaries in batches of 15 ──────────────────
  console.log("🤖 Phase 1: Translating Bengali titles + summaries with Deepseek V4 Flash…");

  const BATCH = 15;
  const translated = new Map<number, TranslateResult>();

  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH).map((item, j) => ({
      index: i + j,
      title: item.title,
      summary: item.summary,
      country: item.country,
      university: item.university,
    }));

    process.stdout.write(`   Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(valid.length / BATCH)} (items ${i + 1}–${Math.min(i + BATCH, valid.length)})… `);

    try {
      const results = await translateBatch(batch);
      for (const r of results) translated.set(r.index, r);
      console.log(`✓ (${results.length} translated)`);
    } catch (err) {
      console.log(`⚠ failed (${String(err).slice(0, 80)}) — will use raw data`);
    }

    // Brief pause between batches
    if (i + BATCH < valid.length) await new Promise((r) => setTimeout(r, 500));
  }

  // ── Phase 2: Dedup against existing DB ─────────────────────────────────────
  console.log("\n🔍 Phase 2: Fetching existing scholarships for dedup check…");

  const existing = await sql`
    SELECT id, title, country, official_url FROM scholarships WHERE status != 'archived'
  ` as { id: string; title: string; country: string; official_url: string | null }[];

  console.log(`   Found ${existing.length} existing scholarships in DB\n`);

  // ── Phase 3: Normalise + dedup + collect inserts ────────────────────────────
  console.log("📋 Phase 3: Normalising fields and checking duplicates…");

  const toInsert: {
    title: string; country: string; degree_level: string; funding_type: string;
    deadline: string | null; official_url: string | null; raw_description: string;
  }[] = [];

  const skipped: { title: string; reason: string }[] = [];

  for (let i = 0; i < valid.length; i++) {
    const item = valid[i];
    const t = translated.get(i);

    const titleEn = t?.title_english?.trim() || item.title.trim();
    const descEn  = t?.description_english?.trim() || item.summary.trim();
    const country = item.country.trim();

    if (!titleEn) { skipped.push({ title: item.title, reason: "empty title after translation" }); continue; }

    // Dedup check
    const inTitle  = norm(titleEn);
    const inCountry = norm(country);
    const inUrl    = item.official_link ? normUrl(item.official_link) : null;

    let isDup = false;
    let dupOf = "";

    for (const ex of existing) {
      if (inUrl && ex.official_url && normUrl(ex.official_url) === inUrl) {
        isDup = true; dupOf = ex.title; break;
      }
      const exTitle = norm(ex.title);
      if (inTitle === exTitle && norm(ex.country) === inCountry) {
        isDup = true; dupOf = ex.title; break;
      }
      const sim = bigramSim(inTitle, exTitle) * 0.7 + bigramSim(inCountry, norm(ex.country)) * 0.3;
      if (sim >= 0.82) { isDup = true; dupOf = ex.title; break; }
    }

    if (isDup) { skipped.push({ title: titleEn, reason: `duplicate of "${dupOf}"` }); continue; }

    toInsert.push({
      title: titleEn,
      country,
      degree_level: normDegree(item.degree),
      funding_type: normFunding(item.funding),
      deadline: normDeadline(item.deadline),
      official_url: item.official_link?.trim() || null,
      raw_description: descEn,
    });
  }

  console.log(`   ✓ ${toInsert.length} to insert  |  ${skipped.length} skipped\n`);

  if (skipped.length > 0) {
    console.log("   Skipped reasons:");
    const dupCount = skipped.filter((s) => s.reason.startsWith("duplicate")).length;
    const otherCount = skipped.length - dupCount;
    if (dupCount) console.log(`     • ${dupCount} duplicates`);
    if (otherCount) console.log(`     • ${otherCount} other (empty title, no country)`);
  }

  if (toInsert.length === 0) { console.log("\n✅ Nothing new to import."); return; }

  // ── Phase 4: Insert as drafts ───────────────────────────────────────────────
  console.log(`\n💾 Phase 4: Inserting ${toInsert.length} scholarships as drafts…`);

  // Fetch existing slugs
  const slugRows = await sql`SELECT slug FROM scholarships WHERE slug IS NOT NULL` as { slug: string }[];
  const existingSlugs = new Set(slugRows.map((r) => r.slug));

  let inserted = 0;
  const insertErrors: string[] = [];

  for (const s of toInsert) {
    try {
      const slugBase = generateSlug(s.title, s.country);
      const slug = slugBase ? makeSlugUnique(slugBase, existingSlugs) : null;
      if (slug) existingSlugs.add(slug);

      await sql`
        INSERT INTO scholarships (
          title, country, degree_level, funding_type,
          deadline, official_url, raw_description,
          status, slug, is_live
        ) VALUES (
          ${s.title}, ${s.country}, ${s.degree_level}, ${s.funding_type},
          ${s.deadline}, ${s.official_url}, ${s.raw_description},
          'draft', ${slug}, true
        )
      `;
      inserted++;
      if (inserted % 20 === 0) console.log(`   … ${inserted}/${toInsert.length} inserted`);
    } catch (err) {
      insertErrors.push(`"${s.title}": ${String(err).slice(0, 80)}`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Import complete!
   ${inserted} scholarships saved as drafts
   ${skipped.length} skipped (${skipped.filter((s) => s.reason.startsWith("dup")).length} duplicates)
   ${insertErrors.length} insert errors
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. Open Admin → Scholarships
  2. For each draft: Add thumbnail → AI Enrich → Publish
`);

  if (insertErrors.length > 0) {
    console.log("Insert errors:");
    insertErrors.forEach((e) => console.log("  •", e));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
