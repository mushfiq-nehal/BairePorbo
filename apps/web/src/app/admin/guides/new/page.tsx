"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../admin.module.css";

type FAQ = { question: string; answer: string };

type RefinedGuide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  intro: string;
  faqs: FAQ[];
  cover_image_url: string;
};

type Step = "draft" | "review" | "done";

const CATEGORIES = ["Scholarships", "Applications", "Tests", "Destinations", "Visa"];

export default function NewGuidePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("draft");

  // Step 1: draft
  const [draft, setDraft] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState("");

  // Step 2: review / edit
  const [guide, setGuide] = useState<RefinedGuide | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // FAQ inline editing
  const [editingFaq, setEditingFaq] = useState<number | null>(null);

  const handleRefine = async () => {
    if (draft.trim().length < 30) {
      setRefineError("Please write at least a few sentences as a draft.");
      return;
    }
    setRefining(true);
    setRefineError("");
    try {
      const res = await fetch("/api/admin/guides/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRefineError(json.error ?? "AI refinement failed.");
        return;
      }
      setGuide({ ...json.parsed as RefinedGuide, cover_image_url: "" });
      setStep("review");
    } catch (err) {
      setRefineError(String(err));
    } finally {
      setRefining(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!guide) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/admin/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...guide,
          status: publish ? "published" : "draft",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error ?? "Failed to save guide.");
        return;
      }
      setStep("done");
      if (publish) {
        // redirect to the live page after a short delay
        setTimeout(() => router.push(`/guide/${guide.slug}`), 1200);
      } else {
        setTimeout(() => router.push("/admin/guides"), 1200);
      }
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    if (!guide) return;
    const updated = [...guide.faqs];
    updated[index] = { ...updated[index], [field]: value };
    setGuide({ ...guide, faqs: updated });
  };

  const removeFaq = (index: number) => {
    if (!guide) return;
    setGuide({ ...guide, faqs: guide.faqs.filter((_, i) => i !== index) });
  };

  const addFaq = () => {
    if (!guide) return;
    setGuide({
      ...guide,
      faqs: [...guide.faqs, { question: "", answer: "" }],
    });
    setEditingFaq(guide.faqs.length);
  };

  // ── Step: Done ──
  if (step === "done") {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <span style={{ fontSize: 48 }}>✅</span>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Guide saved successfully!</p>
          <p style={{ color: "var(--ink-500)", fontSize: 14 }}>Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Admin → Guides</p>
          <h1>New Guide</h1>
          <p className={styles.sub}>Paste a draft — AI will structure it into an SEO-ready FAQ guide</p>
        </div>
        <Link href="/admin/guides" className={styles.ghostBtn}>
          ← Back
        </Link>
      </header>

      {/* Stepper */}
      <div className={styles.stepper}>
        <div className={`${styles.stepItem} ${step === "draft" ? styles.stepActive : styles.stepDone}`}>
          <span className={styles.stepDot}>{step !== "draft" ? "✓" : "1"}</span>
          Draft
        </div>
        <div className={`${styles.stepItem} ${(step as string) === "review" ? styles.stepActive : (step as string) === "done" ? styles.stepDone : ""}`}>
          <span className={styles.stepDot}>{(step as string) === "done" ? "✓" : "2"}</span>
          Review & Edit
        </div>
        <div className={`${styles.stepItem} ${(step as string) === "done" ? styles.stepActive : ""}`}>
          <span className={styles.stepDot}>3</span>
          Publish
        </div>
      </div>

      {/* ── Step 1: Draft ── */}
      {step === "draft" && (
        <div className={styles.formCard}>
          <div className={styles.pasteSection}>
            <div className={styles.pasteLabelRow}>
              <div>
                <p className={styles.pasteLabel}>Your rough draft</p>
                <p className={styles.pasteHint}>
                  Write notes, bullet points, or prose. The AI will expand it into 8–14 FAQs.
                  Include the topic, key questions students ask, and any specific facts you know.
                </p>
              </div>
            </div>
            <textarea
              className={styles.pasteArea}
              rows={16}
              placeholder={`Example:

Topic: Erasmus Mundus scholarships for Bangladeshi students

- Fully funded by EU
- For Masters degrees only (usually 1–2 years)
- You must apply to a consortium of universities, not a single one
- Stipend is around €1,000–€1,400/month depending on the consortium
- No GRE required
- IELTS 6.5 usually needed
- Deadline is usually January for the following October intake
- Very competitive — about 1% acceptance rate
- No age limit
- Bangladesh students are categorised as "Partner Country"
- Can apply to multiple consortiums in the same year
- Common fields: CS, data science, sustainability, public policy, law`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>

          {refineError && <p className={styles.error}>{refineError}</p>}

          <div className={styles.formActions}>
            <p className={styles.parsePrompt}>
              {draft.length > 0
                ? `${draft.length} chars — ready to refine`
                : "Write your draft above, then click Refine"}
            </p>
            <button
              type="button"
              className={styles.parseBtn}
              onClick={handleRefine}
              disabled={refining || draft.trim().length < 30}
            >
              {refining ? (
                <>
                  <span className={styles.spinner} />
                  Refining…
                </>
              ) : (
                <>✨ Refine with AI</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review & Edit ── */}
      {step === "review" && guide && (
        <>
          <div className={styles.formCard}>
            <div className={styles.parsedBadge}>
              ✨ AI-refined — review and edit before publishing
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <label>Title</label>
                <input
                  type="text"
                  value={guide.title}
                  onChange={(e) => setGuide({ ...guide, title: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Slug (URL path)</label>
                <input
                  type="text"
                  value={guide.slug}
                  onChange={(e) =>
                    setGuide({
                      ...guide,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                />
              </div>
              <div className={styles.field}>
                <label>Category</label>
                <select
                  value={guide.category}
                  onChange={(e) => setGuide({ ...guide, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <label>Meta description (≤155 chars)</label>
                <input
                  type="text"
                  value={guide.description}
                  maxLength={160}
                  onChange={(e) => setGuide({ ...guide, description: e.target.value })}
                />
                <span style={{ fontSize: 11, color: "var(--ink-500)" }}>
                  {guide.description.length} / 155 chars
                </span>
              </div>
              <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={guide.tags.join(", ")}
                  onChange={(e) =>
                    setGuide({
                      ...guide,
                      tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <label>Intro paragraph</label>
                <textarea
                  rows={3}
                  value={guide.intro}
                  onChange={(e) => setGuide({ ...guide, intro: e.target.value })}
                />
              </div>
              <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <label>Cover image URL <span style={{ fontWeight: 400, color: "var(--ink-500)" }}>(optional — shown on detail page only)</span></label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={guide.cover_image_url}
                  onChange={(e) => setGuide({ ...guide, cover_image_url: e.target.value })}
                />
                {guide.cover_image_url && (
                  <div style={{ marginTop: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={guide.cover_image_url}
                      alt="Cover preview"
                      style={{
                        width: "100%",
                        maxHeight: 200,
                        objectFit: "cover",
                        borderRadius: 10,
                        border: "1px solid var(--sand-200)",
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FAQ Editor */}
          <div className={styles.formCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 700, fontSize: 15 }}>
                FAQs ({guide.faqs.length})
              </p>
              <button type="button" className={styles.ghostBtn} onClick={addFaq}>
                + Add FAQ
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {guide.faqs.map((faq, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--sand-200)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: editingFaq === i ? "var(--sand-100)" : "#fafafa",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      fontFamily: "inherit",
                    }}
                    onClick={() => setEditingFaq(editingFaq === i ? null : i)}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                      {faq.question || <em style={{ color: "var(--ink-500)", fontStyle: "normal" }}>New question…</em>}
                    </span>
                    <span style={{ fontSize: 18, color: "var(--teal-500)", flexShrink: 0 }}>
                      {editingFaq === i ? "−" : "+"}
                    </span>
                  </button>
                  {editingFaq === i && (
                    <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className={styles.field}>
                        <label>Question</label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFaq(i, "question", e.target.value)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Answer</label>
                        <textarea
                          rows={4}
                          value={faq.answer}
                          onChange={(e) => updateFaq(i, "answer", e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className={styles.archiveBtn}
                        style={{
                          alignSelf: "flex-end",
                          fontSize: 12,
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(220,53,69,0.3)",
                          color: "#c0392b",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => { removeFaq(i); setEditingFaq(null); }}
                      >
                        Remove FAQ
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {saveError && <p className={styles.error}>{saveError}</p>}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setStep("draft")}
              disabled={saving}
            >
              ← Re-draft
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save as draft"}
            </button>
            <button
              type="button"
              className={styles.enrichBtn}
              onClick={() => handleSave(true)}
              disabled={saving || !guide.title || !guide.slug}
            >
              {saving ? (
                <>
                  <span className={styles.spinner} />
                  Publishing…
                </>
              ) : (
                "🚀 Publish guide"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
