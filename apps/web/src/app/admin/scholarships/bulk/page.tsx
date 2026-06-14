"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "../../admin.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedScholarship = {
  title: string;
  country: string;
  degree_level: string;
  funding_type: string;
  deadline: string | null;
  official_url: string | null;
  raw_description_english: string;
  confidence_note?: string;
};

type VerifyResult = {
  index: number;
  verified: ParsedScholarship;
  confidence: "high" | "medium" | "low";
  conflicts: string[];
};

type DedupResult = {
  index: number;
  isDuplicate: boolean;
  similarity: number;
  matchType: "url" | "exact" | "fuzzy" | null;
  matchedTitle?: string;
};

type RowState = {
  index: number;
  raw: string;
  parsed: ParsedScholarship | null;
  parseError?: string;
  verified?: ParsedScholarship;
  confidence?: "high" | "medium" | "low";
  conflicts?: string[];
  dedup?: DedupResult;
  approved: boolean;
  editing: boolean;
  title: string;
  country: string;
  degree_level: string;
  funding_type: string;
  deadline: string;
  official_url: string;
  is_live: boolean;
};

type Step = 1 | 2 | 3 | 4;
type InputMode = "json" | "text" | "urls" | "csv";

// ── JSON normalisation ────────────────────────────────────────────────────────
// Accepts many possible JSON shapes and maps them to ParsedScholarship.

const DEGREE_VALUES = ["bachelors", "masters", "phd", "postdoc", "any"];
const FUNDING_VALUES = ["full", "partial", "tuition_only", "stipend", "other"];

function normDegree(v: unknown): string {
  const s = String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (s.includes("bachelor") || s.includes("undergrad")) return "bachelors";
  if (s.includes("master") || s.includes("msc") || s.includes("mba")) return "masters";
  if (s.includes("phd") || s.includes("doctor")) return "phd";
  if (s.includes("postdoc")) return "postdoc";
  if (DEGREE_VALUES.includes(s)) return s;
  return "any";
}

function normFunding(v: unknown): string {
  const s = String(v ?? "").toLowerCase().replace(/[^a-z_]/g, "");
  if (s.includes("full") || s.includes("fully")) return "full";
  if (s.includes("partial")) return "partial";
  if (s.includes("tuition")) return "tuition_only";
  if (s.includes("stipend")) return "stipend";
  if (FUNDING_VALUES.includes(s)) return s;
  return "other";
}

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const val = obj[k] ?? obj[k.toLowerCase()] ?? obj[k.toUpperCase()];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
}

function normaliseJsonItem(item: unknown): ParsedScholarship | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;

  const title = String(pick(obj, "title", "name", "scholarship_name", "scholarship", "Title", "Name") ?? "").trim();
  const country = String(pick(obj, "country", "host_country", "location", "Country", "Host Country") ?? "").trim();
  if (!title || !country) return null;

  const description = String(
    pick(obj, "raw_description_english", "description", "raw_description", "details", "about", "summary", "Description") ?? ""
  ).trim();

  return {
    title,
    country,
    degree_level: normDegree(pick(obj, "degree_level", "degree", "level", "program_level", "Degree Level")),
    funding_type: normFunding(pick(obj, "funding_type", "funding", "fund_type", "Funding Type", "Funding")),
    deadline: String(pick(obj, "deadline", "application_deadline", "closing_date", "due_date", "Deadline") ?? "").trim() || null,
    official_url: String(pick(obj, "official_url", "url", "link", "website", "application_url", "Official URL") ?? "").trim() || null,
    raw_description_english: description || `${title} — ${country}`,
  };
}

function parseJsonInput(text: string): { items: ParsedScholarship[]; errors: string[] } {
  const errors: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { items: [], errors: [`Invalid JSON: ${String(e)}`] };
  }

  const arr: unknown[] = Array.isArray(raw) ? raw : [raw];
  const items: ParsedScholarship[] = [];

  arr.forEach((entry, i) => {
    const normalised = normaliseJsonItem(entry);
    if (normalised) {
      items.push(normalised);
    } else {
      errors.push(`Item ${i + 1}: missing title or country — skipped`);
    }
  });

  return { items, errors };
}

// ── Other input parsers ───────────────────────────────────────────────────────

function splitTextInput(text: string): string[] {
  return text
    .split(/\n---+\n|\n={3,}\n|\n\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

function parseCSV(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("title") || header.includes("name") || header.includes("url");
  return (hasHeader ? lines.slice(1) : lines).map((l) => l.replace(/^["']|["']$/g, ""));
}

// ── Display helpers ───────────────────────────────────────────────────────────

function confidenceColor(c?: "high" | "medium" | "low"): string {
  if (c === "high") return "var(--teal-600, #0a7a79)";
  if (c === "medium") return "var(--amber-600, #d97706)";
  return "var(--red-600, #dc2626)";
}

function confidenceLabel(c?: "high" | "medium" | "low"): string {
  if (c === "high") return "✓ High";
  if (c === "medium") return "⚠ Medium";
  if (c === "low") return "✗ Low";
  return "— Skipped";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BulkImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [inputMode, setInputMode] = useState<InputMode>("json");
  const [rawInput, setRawInput] = useState("");
  const [scrapeEnabled, setScrapeEnabled] = useState(true);
  const [jsonParseErrors, setJsonParseErrors] = useState<string[]>([]);
  const [jsonPreviewCount, setJsonPreviewCount] = useState<number | null>(null);

  const [rows, setRows] = useState<RowState[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState("");
  const [processProgress, setProcessProgress] = useState(0);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: { index: number; error: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── File upload ─────────────────────────────────────────────────────────────

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawInput(text);
      if (file.name.endsWith(".json") || file.name.endsWith(".jsonl")) {
        setInputMode("json");
        const { items, errors } = parseJsonInput(text);
        setJsonParseErrors(errors);
        setJsonPreviewCount(items.length);
      } else if (file.name.endsWith(".csv")) {
        setInputMode("csv");
        setJsonParseErrors([]);
        setJsonPreviewCount(null);
      }
    };
    reader.readAsText(file);
  };

  // Live JSON preview as user types
  const onJsonTextChange = (text: string) => {
    setRawInput(text);
    if (!text.trim()) { setJsonParseErrors([]); setJsonPreviewCount(null); return; }
    try {
      const { items, errors } = parseJsonInput(text);
      setJsonParseErrors(errors);
      setJsonPreviewCount(items.length);
    } catch {
      setJsonParseErrors([]);
      setJsonPreviewCount(null);
    }
  };

  // ── Item count preview ──────────────────────────────────────────────────────

  const itemCountPreview = useCallback((): number => {
    const text = rawInput.trim();
    if (!text) return 0;
    if (inputMode === "json") return jsonPreviewCount ?? 0;
    if (inputMode === "csv") return parseCSV(text).length;
    if (inputMode === "urls") return text.split("\n").filter((l) => l.trim().startsWith("http")).length;
    return splitTextInput(text).length;
  }, [rawInput, inputMode, jsonPreviewCount]);

  // ── Pipeline ────────────────────────────────────────────────────────────────

  const runPipeline = async () => {
    setError(null);
    setProcessing(true);
    setProcessProgress(5);

    let preStructured: ParsedScholarship[] | null = null; // JSON fast-path
    let textItems: string[] = [];

    if (inputMode === "json") {
      const { items, errors } = parseJsonInput(rawInput);
      if (items.length === 0) {
        setError(errors.length > 0 ? errors[0] : "No valid scholarships found in JSON.");
        setProcessing(false);
        return;
      }
      if (items.length > 50) { setError("Maximum 50 scholarships per batch."); setProcessing(false); return; }
      preStructured = items;
    } else {
      if (inputMode === "csv") textItems = parseCSV(rawInput.trim());
      else if (inputMode === "urls") textItems = rawInput.trim().split("\n").map((l) => l.trim()).filter((l) => l.startsWith("http"));
      else textItems = splitTextInput(rawInput.trim());

      if (textItems.length === 0) { setError("No items found. Check your input format."); setProcessing(false); return; }
      if (textItems.length > 50) { setError("Maximum 50 scholarships per batch."); setProcessing(false); return; }
    }

    // ── Phase 1: Parse (skipped for JSON) ──────────────────────────────────
    let parseResults: { index: number; parsed: ParsedScholarship | null; error?: string }[] = [];

    if (preStructured) {
      setProcessStatus(`JSON detected — ${preStructured.length} scholarships pre-structured, skipping AI parse…`);
      setProcessProgress(30);
      await new Promise((r) => setTimeout(r, 600)); // brief pause for UX
      parseResults = preStructured.map((p, i) => ({ index: i, parsed: p }));
    } else {
      setProcessStatus(`Parsing ${textItems.length} scholarships with Deepseek V4 Flash…`);
      try {
        const res = await fetch("/api/admin/scholarships/bulk-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: textItems, scrape: inputMode !== "text" || scrapeEnabled }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Parse failed");
        parseResults = data.results;
      } catch (err) {
        setError(`Parse failed: ${String(err)}`);
        setProcessing(false);
        return;
      }
    }

    setProcessProgress(38);

    // ── Phase 2: Verify ─────────────────────────────────────────────────────
    setProcessStatus("Cross-verifying with MiniMax M3 + Qwen3 235B…");

    const validParsed = parseResults.filter((r) => r.parsed !== null);
    let verifyResults: VerifyResult[] = [];

    if (validParsed.length > 0) {
      try {
        const res = await fetch("/api/admin/scholarships/bulk-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scholarships: validParsed.map((r) => r.parsed) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Verify failed");
        verifyResults = data.results.map((vr: VerifyResult, i: number) => ({
          ...vr,
          index: validParsed[i].index,
        }));
      } catch {
        setProcessStatus("Verification unavailable, continuing with parsed data…");
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setProcessProgress(68);

    // ── Phase 3: Dedup ──────────────────────────────────────────────────────
    setProcessStatus("Checking for duplicates against existing database…");

    const forDedup = validParsed.map((r) => ({
      title: r.parsed!.title,
      country: r.parsed!.country,
      official_url: r.parsed!.official_url,
    }));

    let dedupResults: DedupResult[] = [];
    if (forDedup.length > 0) {
      try {
        const res = await fetch("/api/admin/scholarships/bulk-dedup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scholarships: forDedup }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        dedupResults = data.results.map((dr: DedupResult, i: number) => ({
          ...dr,
          index: validParsed[i].index,
        }));
      } catch { /* non-fatal */ }
    }

    setProcessProgress(92);

    // ── Assemble rows ────────────────────────────────────────────────────────
    const assembled: RowState[] = parseResults.map((pr) => {
      const verify = verifyResults.find((v) => v.index === pr.index);
      const dedup = dedupResults.find((d) => d.index === pr.index);
      const parsed = pr.parsed;
      const display = verify?.verified ?? parsed;

      return {
        index: pr.index,
        raw: preStructured ? JSON.stringify(preStructured[pr.index]) : textItems[pr.index] ?? "",
        parsed,
        parseError: pr.error,
        verified: verify?.verified,
        confidence: verify?.confidence,
        conflicts: verify?.conflicts,
        dedup,
        approved: !!parsed && !(dedup?.isDuplicate),
        editing: false,
        title: display?.title ?? "",
        country: display?.country ?? "",
        degree_level: display?.degree_level ?? "masters",
        funding_type: display?.funding_type ?? "full",
        deadline: display?.deadline ?? "",
        official_url: display?.official_url ?? "",
        is_live: true,
      };
    });

    setRows(assembled);
    setProcessProgress(100);
    setProcessing(false);
    setStep(3);
  };

  // ── Review helpers ─────────────────────────────────────────────────────────

  const toggleApprove = (index: number) =>
    setRows((prev) => prev.map((r) => r.index === index ? { ...r, approved: !r.approved } : r));

  const toggleEdit = (index: number) =>
    setRows((prev) => prev.map((r) => r.index === index ? { ...r, editing: !r.editing } : r));

  const setField = (index: number, field: keyof RowState, value: string | boolean) =>
    setRows((prev) => prev.map((r) => r.index === index ? { ...r, [field]: value } : r));

  const approvedRows = rows.filter((r) => r.approved && r.parsed !== null);
  const duplicateCount = rows.filter((r) => r.dedup?.isDuplicate).length;
  const lowConfCount = rows.filter((r) => r.confidence === "low").length;

  // ── Import ─────────────────────────────────────────────────────────────────

  const runImport = async () => {
    if (approvedRows.length === 0) return;
    setImporting(true);
    setError(null);

    const scholarships = approvedRows.map((r) => ({
      title: r.title,
      country: r.country,
      degree_level: r.degree_level,
      funding_type: r.funding_type,
      deadline: r.deadline || null,
      official_url: r.official_url || null,
      raw_description_english: r.parsed?.raw_description_english ?? r.raw,
      is_live: r.is_live,
    }));

    try {
      const res = await fetch("/api/admin/scholarships/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholarships }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setImportResult(data);
      setStep(4);
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  };

  const previewCount = itemCountPreview();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Admin · Scholarships · Bulk Import</p>
          <h1>Bulk Import</h1>
          <p className={styles.sub}>Import up to 50 scholarships at once. All saved as drafts — add thumbnails and publish manually.</p>
        </div>
        <a href="/admin/scholarships" className={styles.ghostBtn} style={{ textDecoration: "none" }}>← Back to list</a>
      </header>

      {/* Stepper */}
      <div className={styles.stepper}>
        {["1. Input", "2. Processing", "3. Review", "4. Done"].map((label, i) => (
          <div key={label} className={`${styles.stepItem} ${step > i + 1 ? styles.stepDone : ""} ${step === i + 1 ? styles.stepActive : ""}`}>
            <span className={styles.stepDot}>{step > i + 1 ? "✓" : i + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && <p className={styles.error}>⚠ {error}</p>}

      {/* ── Step 1: Input ── */}
      {step === 1 && (
        <div className={styles.formCard}>
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {([
              ["json",  "📦 JSON / File upload", "Fast — skip AI parse"],
              ["text",  "📝 Paste text blocks",   "AI parses each block"],
              ["urls",  "🔗 URL list",             "AI scrapes + parses"],
              ["csv",   "📄 CSV",                  "AI parses each row"],
            ] as [InputMode, string, string][]).map(([m, label, hint]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setInputMode(m); setJsonParseErrors([]); setJsonPreviewCount(null); }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: `1.5px solid ${inputMode === m ? "var(--teal-500)" : "var(--sand-200)"}`,
                  background: inputMode === m ? "rgba(15,143,141,0.08)" : "transparent",
                  color: inputMode === m ? "var(--teal-700)" : "var(--ink-600)",
                  fontWeight: inputMode === m ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                }}
              >
                <span>{label}</span>
                <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>{hint}</span>
              </button>
            ))}
          </div>

          {/* JSON mode */}
          {inputMode === "json" && (
            <>
              {/* File upload drop zone */}
              <div
                style={{ border: "2px dashed var(--teal-400,#2dd4bf)", borderRadius: 14, padding: "20px 24px", marginBottom: 14, display: "flex", alignItems: "center", gap: 16, background: "rgba(15,143,141,0.03)", cursor: "pointer" }}
                onClick={() => fileRef.current?.click()}
              >
                <span style={{ fontSize: 28 }}>📂</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Upload JSON or CSV file</p>
                  <p style={{ fontSize: 12, color: "var(--ink-500)", margin: "2px 0 0" }}>Click to browse — .json, .jsonl, .csv supported</p>
                </div>
                <input ref={fileRef} type="file" accept=".json,.jsonl,.csv" onChange={onFileUpload} style={{ display: "none" }} />
              </div>

              <p style={{ fontSize: 13, color: "var(--ink-500)", margin: "0 0 8px" }}>
                Or paste JSON directly. Expected: an array of objects with <code style={{ background: "var(--sand-100)", padding: "1px 5px", borderRadius: 4 }}>title</code> and <code style={{ background: "var(--sand-100)", padding: "1px 5px", borderRadius: 4 }}>country</code> fields. Extra fields (deadline, url, degree, funding) are auto-mapped.
              </p>

              <textarea
                rows={12}
                value={rawInput}
                onChange={(e) => onJsonTextChange(e.target.value)}
                placeholder={`[\n  {\n    "title": "Chevening Scholarship",\n    "country": "UK",\n    "degree_level": "masters",\n    "funding_type": "full",\n    "deadline": "5 November 2026",\n    "official_url": "https://chevening.org",\n    "description": "Fully funded UK government scholarship..."\n  },\n  { "title": "DAAD Scholarship", "country": "Germany", ... }\n]`}
                className={styles.pasteArea}
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />

              {/* Live parse feedback */}
              {rawInput.trim() && (
                <div style={{ marginTop: 8, fontSize: 13, display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {jsonPreviewCount !== null && (
                    <span style={{ color: "var(--teal-700)", fontWeight: 600 }}>
                      ✓ {jsonPreviewCount} scholarship{jsonPreviewCount !== 1 ? "s" : ""} detected
                    </span>
                  )}
                  {jsonParseErrors.map((e, i) => (
                    <span key={i} style={{ color: "var(--amber-700)" }}>⚠ {e}</span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Text / URL / CSV modes */}
          {inputMode !== "json" && (
            <>
              <div style={{ marginBottom: 10, fontSize: 13, color: "var(--ink-500)", lineHeight: 1.6 }}>
                {inputMode === "text" && <>Paste multiple scholarships separated by <code style={{ background: "var(--sand-100)", padding: "1px 5px", borderRadius: 4 }}>---</code> on its own line. Minimal (name + country) or detailed — AI fills the gaps.</>}
                {inputMode === "urls" && "One official scholarship URL per line. AI scrapes + extracts details from each."}
                {inputMode === "csv" && "One entry per line. Include a header row with 'title', 'country', 'url' columns if present."}
              </div>
              <textarea
                rows={14}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={
                  inputMode === "urls"
                    ? "https://chevening.org/scholarship\nhttps://daad.de/en/study-and-research-in-germany/scholarships"
                    : inputMode === "csv"
                    ? "title,country,url\nChevening Scholarship,UK,https://chevening.org"
                    : "Chevening Scholarship, UK\nFully funded masters.\nhttps://chevening.org\n\n---\n\nDAAD Scholarship 2027, Germany"
                }
                className={styles.pasteArea}
              />
              {inputMode === "text" && (
                <label className={styles.scrapeToggle} style={{ marginTop: 10 }}>
                  <input type="checkbox" checked={scrapeEnabled} onChange={(e) => setScrapeEnabled(e.target.checked)} />
                  Fetch official URLs found in pasted text
                </label>
              )}
            </>
          )}

          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => { setStep(2); runPipeline(); }}
              disabled={previewCount === 0 && inputMode === "json" ? true : !rawInput.trim()}
            >
              {inputMode === "json" ? "Verify & Check Duplicates →" : "Parse & Verify →"}
            </button>
            {previewCount > 0 && (
              <span style={{ fontSize: 13, color: "var(--ink-500)" }}>
                {previewCount} item{previewCount !== 1 ? "s" : ""} ready
                {inputMode === "json" && <strong style={{ color: "var(--teal-700)", marginLeft: 6 }}>· AI parse skipped ⚡</strong>}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Processing ── */}
      {step === 2 && (
        <div className={styles.formCard} style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>
            {processing ? <span className={styles.spinner} style={{ width: 32, height: 32 }} /> : "✓"}
          </div>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{processStatus}</p>
          <div style={{ background: "var(--sand-200)", borderRadius: 999, height: 6, overflow: "hidden", maxWidth: 400, margin: "0 auto" }}>
            <div style={{ background: "var(--teal-500)", height: "100%", width: `${processProgress}%`, transition: "width 0.4s ease", borderRadius: 999 }} />
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-400)" }}>
            {inputMode === "json"
              ? "MiniMax M3 + Qwen3 235B verifying fields · dedup check against DB"
              : "Deepseek V4 Flash → MiniMax M3 + Qwen3 235B · dedup check"}
          </p>
        </div>
      )}

      {/* ── Step 3: Review table ── */}
      {step === 3 && (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            <span style={{ background: "rgba(15,143,141,0.1)", color: "var(--teal-700)", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>
              {approvedRows.length} approved
            </span>
            {duplicateCount > 0 && (
              <span style={{ background: "rgba(220,38,38,0.08)", color: "var(--red-700,#b91c1c)", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>
                {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""} — auto-rejected
              </span>
            )}
            {lowConfCount > 0 && (
              <span style={{ background: "rgba(245,158,11,0.08)", color: "var(--amber-700)", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>
                {lowConfCount} low confidence — check carefully
              </span>
            )}
            <button
              type="button"
              className={styles.ghostBtn}
              style={{ marginLeft: "auto", fontSize: 12 }}
              onClick={() => setRows((prev) => prev.map((r) => ({ ...r, approved: !!r.parsed && !r.dedup?.isDuplicate })))}
            >
              Reset all
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              style={{ fontSize: 12 }}
              onClick={() => setRows((prev) => prev.map((r) => ({ ...r, approved: true })))}
            >
              Approve all
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((row) => (
              <div
                key={row.index}
                style={{
                  background: "#fff",
                  border: `1.5px solid ${
                    row.dedup?.isDuplicate ? "var(--red-200,#fecaca)"
                    : row.approved ? "var(--teal-300,#5eead4)"
                    : "var(--sand-200)"
                  }`,
                  borderRadius: 14,
                  padding: "12px 16px",
                  opacity: row.approved ? 1 : 0.6,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={row.approved}
                    onChange={() => toggleApprove(row.index)}
                    disabled={!row.parsed}
                    style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--teal-500)", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <strong style={{ fontSize: 14 }}>{row.title || <em style={{ color: "var(--ink-400)" }}>No title</em>}</strong>
                      {row.country && (
                        <span style={{ fontSize: 12, color: "var(--ink-500)", background: "var(--sand-100)", padding: "2px 8px", borderRadius: 6 }}>
                          {row.country}
                        </span>
                      )}
                      {row.confidence ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: confidenceColor(row.confidence) }}>
                          {confidenceLabel(row.confidence)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--teal-600)", fontWeight: 600 }}>⚡ JSON import</span>
                      )}
                      {row.dedup?.isDuplicate && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--red-600,#dc2626)", background: "rgba(220,38,38,0.08)", padding: "2px 8px", borderRadius: 6 }}>
                          Duplicate: {row.dedup.matchedTitle}
                        </span>
                      )}
                      {row.dedup && !row.dedup.isDuplicate && row.dedup.similarity > 0.6 && (
                        <span style={{ fontSize: 11, color: "var(--amber-600)" }}>
                          Similar: {row.dedup.matchedTitle} ({Math.round(row.dedup.similarity * 100)}%)
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>{row.degree_level}</span>
                      <span>{row.funding_type}</span>
                      {row.deadline && <span>Deadline: {row.deadline}</span>}
                      {row.official_url && <span style={{ color: "var(--teal-600)" }}>{row.official_url.replace(/^https?:\/\//, "").slice(0, 40)}</span>}
                      {row.conflicts && row.conflicts.length > 0 && (
                        <span style={{ color: "var(--amber-600)" }}>Conflicts: {row.conflicts.join(" · ")}</span>
                      )}
                    </div>
                    {row.parseError && (
                      <p style={{ fontSize: 12, color: "var(--red-600,#dc2626)", marginTop: 4 }}>⚠ {row.parseError}</p>
                    )}
                  </div>

                  {/* Controls */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setField(row.index, "is_live", !row.is_live)}
                      title="Toggle live/opening-soon status"
                      style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 6,
                        border: `1.5px solid ${row.is_live ? "var(--teal-400)" : "var(--amber-400)"}`,
                        background: row.is_live ? "rgba(15,143,141,0.08)" : "rgba(245,158,11,0.08)",
                        color: row.is_live ? "var(--teal-700)" : "var(--amber-700)",
                        cursor: "pointer", fontWeight: 600,
                      }}
                    >
                      {row.is_live ? "Open Now" : "Soon"}
                    </button>
                    {row.parsed && (
                      <button type="button" onClick={() => toggleEdit(row.index)} className={styles.ghostBtn} style={{ fontSize: 12, padding: "3px 10px" }}>
                        {row.editing ? "Done" : "Edit"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline editor */}
                {row.editing && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--sand-200)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([
                      ["title",        "Title",         "text"],
                      ["country",      "Country",       "text"],
                      ["degree_level", "Degree level",  "select:bachelors|masters|phd|postdoc|any"],
                      ["funding_type", "Funding",       "select:full|partial|tuition_only|stipend|other"],
                      ["deadline",     "Deadline",      "text"],
                      ["official_url", "Official URL",  "url"],
                    ] as [keyof RowState, string, string][]).map(([field, label, type]) => (
                      <div key={field} className={styles.field}>
                        <label style={{ fontSize: 12 }}>{label}</label>
                        {type.startsWith("select:") ? (
                          <select value={row[field] as string} onChange={(e) => setField(row.index, field, e.target.value)} style={{ fontSize: 13 }}>
                            {type.replace("select:", "").split("|").map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={type} value={row[field] as string} onChange={(e) => setField(row.index, field, e.target.value)} style={{ fontSize: 13 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.formActions} style={{ marginTop: 20 }}>
            <button type="button" className={styles.ghostBtn} onClick={() => { setStep(1); setRows([]); }}>← Back</button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={runImport}
              disabled={importing || approvedRows.length === 0}
            >
              {importing
                ? <><span className={styles.spinner} /> Saving…</>
                : `Save ${approvedRows.length} as Drafts →`}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 6 }}>
            Saved as drafts — add thumbnails and AI enrich individually, then publish from the admin list.
          </p>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 4 && importResult && (
        <div className={styles.formCard} style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <h2 style={{ marginBottom: 8 }}>{importResult.imported} scholarships saved as drafts</h2>
          <p style={{ color: "var(--ink-500)", marginBottom: 8 }}>
            Each needs a thumbnail upload, AI enrich, and a final review before publishing.
          </p>
          {importResult.errors.length > 0 && (
            <p style={{ color: "var(--red-600,#dc2626)", fontSize: 13 }}>
              {importResult.errors.length} failed to save — they can be added manually.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <button type="button" className={styles.ghostBtn} onClick={() => { setStep(1); setRawInput(""); setRows([]); setImportResult(null); setJsonPreviewCount(null); }}>
              Import another batch
            </button>
            <button type="button" className={styles.primaryBtn} onClick={() => router.push("/admin/scholarships")}>
              Go to scholarship list →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
