"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../admin.module.css";

type Step = 1 | 2 | 3;
type Enriched = {
  eligibility_summary: string;
  competitiveness: string;
  tips: string;
  tags: string[];
  ai_summary: string;
  thumbnail_prompt: string;
};
type ParsedFields = {
  title: string;
  country: string;
  degree_level: string;
  funding_type: string;
  deadline: string;
  official_url: string;
  raw_description_english: string;
};

export default function NewScholarshipPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [rawInput, setRawInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedFields | null>(null);
  const [form, setForm] = useState({
    title: "", country: "", degree_level: "masters", funding_type: "full",
    deadline: "", official_url: "", raw_description: "",
  });

  // Step 2 state
  const [scholarshipId, setScholarshipId] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<Enriched | null>(null);
  const [enriching, setEnriching] = useState(false);

  // Step 3 state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // ── Parse raw text with AI ────────────────────────────────────────────────
  const parseWithAI = async () => {
    if (!rawInput.trim()) { setError("Please paste some scholarship text first."); return; }
    setError(null); setParsing(true);
    try {
      const res = await fetch("/api/admin/scholarships/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_description: rawInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      const p: ParsedFields = data.parsed;
      setParsed(p);
      setForm({
        title: p.title ?? "",
        country: p.country ?? "",
        degree_level: p.degree_level ?? "masters",
        funding_type: p.funding_type ?? "full",
        deadline: p.deadline ?? "",
        official_url: p.official_url ?? "",
        raw_description: p.raw_description_english ?? rawInput,
      });
    } catch (err) { setError(String(err)); }
    finally { setParsing(false); }
  };

  // ── Save draft ────────────────────────────────────────────────────────────
  const saveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/scholarships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setScholarshipId(data.scholarship.id);
      setStep(2);
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  // ── AI enrichment ─────────────────────────────────────────────────────────
  const enrich = async () => {
    if (!scholarshipId) return;
    setError(null); setEnriching(true);
    try {
      const res = await fetch(`/api/admin/scholarships/${scholarshipId}/enrich`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enrichment failed");
      setEnriched(data.enriched);
    } catch (err) { setError(String(err)); }
    finally { setEnriching(false); }
  };

  const copyPrompt = async () => {
    if (!enriched?.thumbnail_prompt) return;
    await navigator.clipboard.writeText(enriched.thumbnail_prompt);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── Thumbnail + publish ───────────────────────────────────────────────────
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setThumbnailFile(f); setThumbnailPreview(URL.createObjectURL(f));
  };

  const publish = async (asDraft = false) => {
    if (!scholarshipId) return;
    setError(null); setLoading(true);
    try {
      if (thumbnailFile) {
        const fd = new FormData(); fd.append("file", thumbnailFile);
        const upRes = await fetch(`/api/admin/scholarships/${scholarshipId}/thumbnail`, { method: "POST", body: fd });
        if (!upRes.ok) { const d = await upRes.json(); throw new Error(d.error ?? "Upload failed"); }
      }
      const pubRes = await fetch(`/api/admin/scholarships/${scholarshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: asDraft ? "draft" : "published" }),
      });
      if (!pubRes.ok) { const d = await pubRes.json(); throw new Error(d.error ?? "Publish failed"); }
      router.push("/admin/scholarships");
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><p className={styles.kicker}>Admin · New Scholarship</p><h1>Add scholarship</h1></div>
      </header>

      {/* Stepper */}
      <div className={styles.stepper}>
        {["1. Paste & Parse", "2. AI Enrichment", "3. Thumbnail & Publish"].map((label, i) => (
          <div key={label} className={`${styles.stepItem} ${step > i + 1 ? styles.stepDone : ""} ${step === i + 1 ? styles.stepActive : ""}`}>
            <span className={styles.stepDot}>{step > i + 1 ? "✓" : i + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && <p className={styles.error}>⚠ {error}</p>}

      {/* ── Step 1: Paste & AI Parse ── */}
      {step === 1 && (
        <form onSubmit={saveDraft} className={styles.formCard}>
          {/* Paste area */}
          <div className={styles.pasteSection}>
            <div className={styles.pasteLabelRow}>
              <div>
                <label className={styles.pasteLabel}>Paste scholarship info</label>
                <p className={styles.pasteHint}>Bengali, English, or mixed — AI will translate and extract all fields automatically.</p>
              </div>
              <button
                type="button"
                className={styles.parseBtn}
                onClick={parseWithAI}
                disabled={parsing || !rawInput.trim()}
              >
                {parsing
                  ? <><span className={styles.spinner} /> Parsing…</>
                  : "🤖 Parse with AI"}
              </button>
            </div>
            <textarea
              rows={8}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={`Paste scholarship text here, for example:\n\n🎓 Bond University Transformer Scholarship 2026 in Australia 🇦🇺\n📍 বিশ্ববিদ্যালয়: Bond University\n🎯 ডিগ্রি স্তর: Bachelor's & Master's\n💰 স্কলারশিপ কাভারেজ: 50% Tuition Fee Waiver\n📅 শেষ তারিখ: 31 August 2026\n🔗 apply.bond.edu.au`}
              className={styles.pasteArea}
            />
          </div>

          {/* Parsed / editable fields */}
          {(parsed || rawInput) && (
            <div className={styles.parsedSection}>
              {parsed && (
                <div className={styles.parsedBadge}>
                  ✓ Fields auto-filled — review and edit if needed
                </div>
              )}
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label>Title *</label>
                  <input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Bond University Transformer Scholarship 2026" />
                </div>
                <div className={styles.field}>
                  <label>Country *</label>
                  <input required value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="e.g. Australia" />
                </div>
                <div className={styles.field}>
                  <label>Degree level</label>
                  <select value={form.degree_level} onChange={(e) => set("degree_level", e.target.value)}>
                    <option value="bachelors">Bachelor&apos;s</option>
                    <option value="masters">Master&apos;s</option>
                    <option value="phd">PhD</option>
                    <option value="postdoc">Postdoc</option>
                    <option value="any">Any</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Funding type</label>
                  <select value={form.funding_type} onChange={(e) => set("funding_type", e.target.value)}>
                    <option value="full">Full funding</option>
                    <option value="partial">Partial</option>
                    <option value="tuition_only">Tuition only</option>
                    <option value="stipend">Stipend only</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label>Official URL</label>
                  <input type="url" value={form.official_url} onChange={(e) => set("official_url", e.target.value)} placeholder="https://…" />
                </div>
              </div>
              <div className={styles.field}>
                <label>Description (English)</label>
                <textarea rows={5} value={form.raw_description} onChange={(e) => set("raw_description", e.target.value)} />
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            {!parsed && !form.title && (
              <p className={styles.parsePrompt}>← Paste text above and click <strong>Parse with AI</strong> to auto-fill fields, or fill them manually.</p>
            )}
            <button type="submit" className={styles.primaryBtn} disabled={loading || !form.title || !form.country}>
              {loading ? "Saving…" : "Save & continue →"}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2: AI Enrichment ── */}
      {step === 2 && (
        <div className={styles.formCard}>
          <p className={styles.sub}>Click <strong>Enrich with AI</strong> to auto-fill eligibility, tips, tags, summary, and generate a thumbnail image prompt.</p>
          {!enriched ? (
            <button className={styles.enrichBtn} onClick={enrich} disabled={enriching}>
              {enriching ? <><span className={styles.spinner} /> Enriching with AI…</> : "✨ Enrich with AI"}
            </button>
          ) : (
            <div className={styles.enrichedResult}>
              <div className={styles.enrichedField}><span className={styles.enrichedLabel}>Eligibility</span><p>{enriched.eligibility_summary}</p></div>
              <div className={styles.enrichedField}>
                <span className={styles.enrichedLabel}>Competitiveness</span>
                <span className={`${styles.badge} ${styles[`badge_comp_${enriched.competitiveness?.toLowerCase()}`]}`}>{enriched.competitiveness}</span>
              </div>
              <div className={styles.enrichedField}><span className={styles.enrichedLabel}>Tips</span><p style={{ whiteSpace: "pre-line" }}>{enriched.tips}</p></div>
              <div className={styles.enrichedField}><span className={styles.enrichedLabel}>Tags</span><div className={styles.tagRow}>{enriched.tags?.map((t) => <span key={t} className={styles.tag}>{t}</span>)}</div></div>
              <div className={styles.enrichedField}><span className={styles.enrichedLabel}>AI Summary</span><p>{enriched.ai_summary}</p></div>
              <div className={styles.thumbnailPromptBox}>
                <div className={styles.thumbnailPromptHeader}>
                  <span className={styles.enrichedLabel}>🎨 Thumbnail image prompt</span>
                  <button className={styles.copyBtn} onClick={copyPrompt}>{copied ? "✓ Copied!" : "Copy prompt"}</button>
                </div>
                <p className={styles.promptText}>{enriched.thumbnail_prompt}</p>
                <p className={styles.promptHint}>Use this in ChatGPT, Midjourney, or DALL·E to generate the thumbnail. Upload it in the next step.</p>
              </div>
            </div>
          )}
          <div className={styles.formActions}>
            <button className={styles.ghostBtn} onClick={() => setStep(1)} disabled={enriching}>← Back</button>
            <button className={styles.primaryBtn} onClick={() => setStep(3)} disabled={enriching || !enriched}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Thumbnail + Publish ── */}
      {step === 3 && (
        <div className={styles.formCard}>
          <p className={styles.sub}>Upload the thumbnail you generated, then publish.</p>
          <div className={styles.uploadArea}>
            {thumbnailPreview
              ? <img src={thumbnailPreview} alt="Thumbnail preview" className={styles.thumbPreview} />
              : <div className={styles.uploadPlaceholder}><span>🖼</span><span>No image selected</span></div>}
            <label className={styles.uploadLabel}>
              Choose image
              <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
            </label>
            <p className={styles.uploadHint}>PNG, JPG, WebP — recommended 1200×630px</p>
          </div>
          <div className={styles.formActions}>
            <button className={styles.ghostBtn} onClick={() => setStep(2)} disabled={loading}>← Back</button>
            <button className={styles.ghostBtn} onClick={() => publish(true)} disabled={loading}>Save as draft</button>
            <button className={styles.primaryBtn} onClick={() => publish(false)} disabled={loading}>{loading ? "Publishing…" : "🚀 Publish"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
