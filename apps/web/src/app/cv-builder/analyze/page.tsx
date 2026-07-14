"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import NavbarWithAuth from "@/components/layout/navbar-with-auth";
import type { CVAnalysis, SectionFeedback } from "@/lib/cv-analyze";
import styles from "./analyze.module.css";

const RATING_LABEL: Record<SectionFeedback["rating"], string> = {
  strong: "Strong",
  adequate: "Adequate",
  "needs-work": "Needs work",
  missing: "Missing",
};

export default function CVAnalyzePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [creatingCV, setCreatingCV] = useState(false);

  // Load the most recent analysis so returning users see their last result.
  useEffect(() => {
    fetch("/api/cv/analyze")
      .then((res) => res.json())
      .then((data) => {
        if (data.analysis?.result) {
          setAnalysis(data.analysis.result as CVAnalysis);
          setSourceName(data.analysis.source_name || "");
          setStatus("done");
        }
      })
      .catch(() => {});
  }, []);

  const runAnalysis = async () => {
    setStatus("loading");
    setError("");
    try {
      let res: Response;
      if (mode === "upload") {
        if (!file) {
          setError("Please choose a file first.");
          setStatus("error");
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch("/api/cv/analyze", { method: "POST", body: fd });
      } else {
        if (pastedText.trim().length < 80) {
          setError("Please paste at least a few lines of your CV.");
          setStatus("error");
          return;
        }
        res = await fetch("/api/cv/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pastedText }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed. Please try again.");
        setStatus("error");
        return;
      }
      setAnalysis(data.analysis as CVAnalysis);
      setSourceName(data.sourceName || "");
      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const buildFromScratch = async () => {
    setCreatingCV(true);
    try {
      const res = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "classic", title: "My Academic CV" }),
      });
      const data = await res.json();
      if (res.ok && data.cv?.id) {
        router.push(`/cv-builder/${data.cv.id}`);
        return;
      }
    } catch {
      // fall through
    }
    setCreatingCV(false);
    router.push("/cv-builder");
  };

  const scoreTone = analysis
    ? analysis.overallScore >= 75
      ? "high"
      : analysis.overallScore >= 50
        ? "mid"
        : "low"
    : "mid";

  return (
    <AuthGuard>
      <div className={styles.page}>
        <NavbarWithAuth />

        <main className={styles.main}>
          <Link href="/cv-builder" className={styles.back}>
            ← Back to CV Builder
          </Link>

          <header className={styles.header}>
            <h1>Analyze your CV</h1>
            <p>
              Upload your existing CV and DeepSeek V4 Pro will score it and suggest concrete
              improvements for academic and scholarship applications.
            </p>
          </header>

          {/* ── Input card ── */}
          <section className={styles.inputCard}>
            <div className={styles.tabs} role="tablist">
              <button
                role="tab"
                aria-selected={mode === "upload"}
                className={mode === "upload" ? styles.tabActive : styles.tab}
                onClick={() => setMode("upload")}
              >
                Upload file
              </button>
              <button
                role="tab"
                aria-selected={mode === "paste"}
                className={mode === "paste" ? styles.tabActive : styles.tab}
                onClick={() => setMode("paste")}
              >
                Paste text
              </button>
            </div>

            {mode === "upload" ? (
              <div>
                <button
                  type="button"
                  className={styles.dropzone}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    hidden
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <span className={styles.dropIcon} aria-hidden="true">↑</span>
                  <span className={styles.dropText}>
                    {file ? file.name : "Click to choose a PDF, DOCX, or TXT file"}
                  </span>
                  <span className={styles.dropHint}>Max 8 MB</span>
                </button>
              </div>
            ) : (
              <textarea
                className={styles.textarea}
                placeholder="Paste the full text of your CV here…"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={10}
              />
            )}

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="button"
              className={styles.analyzeBtn}
              onClick={runAnalysis}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Analyzing… this can take up to a minute" : "Analyze my CV"}
            </button>
          </section>

          {status === "loading" && (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} aria-hidden="true" />
              <p>Reading your CV and comparing it to strong academic CVs…</p>
            </div>
          )}

          {/* ── Results ── */}
          {status === "done" && analysis && (
            <section className={styles.results}>
              {sourceName && <p className={styles.sourceName}>Analysis of: {sourceName}</p>}

              <div className={styles.scoreCard} data-tone={scoreTone}>
                <div className={styles.scoreCircle}>
                  <span className={styles.scoreNum}>{analysis.overallScore}</span>
                  <span className={styles.scoreOutOf}>/ 100</span>
                </div>
                <div className={styles.scoreBody}>
                  <h2>Overall assessment</h2>
                  <p>{analysis.summary}</p>
                </div>
              </div>

              <div className={styles.twoCol}>
                {analysis.strengths.length > 0 && (
                  <div className={`${styles.listCard} ${styles.strengths}`}>
                    <h3>Strengths</h3>
                    <ul>
                      {analysis.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.weaknesses.length > 0 && (
                  <div className={`${styles.listCard} ${styles.weaknesses}`}>
                    <h3>Areas to improve</h3>
                    <ul>
                      {analysis.weaknesses.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {analysis.sections.length > 0 && (
                <div className={styles.sections}>
                  <h3 className={styles.blockTitle}>Section-by-section review</h3>
                  {analysis.sections.map((sec, i) => (
                    <div key={i} className={styles.sectionRow}>
                      <div className={styles.sectionHead}>
                        <span className={styles.sectionName}>{sec.name}</span>
                        <span className={styles.ratingPill} data-rating={sec.rating}>
                          {RATING_LABEL[sec.rating]}
                        </span>
                      </div>
                      {sec.feedback && <p className={styles.sectionFeedback}>{sec.feedback}</p>}
                      {sec.suggestions.length > 0 && (
                        <ul className={styles.sectionSuggestions}>
                          {sec.suggestions.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {analysis.missingSections.length > 0 && (
                <div className={styles.missingCard}>
                  <h3>Consider adding these sections</h3>
                  <div className={styles.chips}>
                    {analysis.missingSections.map((s, i) => (
                      <span key={i} className={styles.chip}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.actionItems.length > 0 && (
                <div className={styles.actionCard}>
                  <h3>Your action plan</h3>
                  <ol>
                    {analysis.actionItems.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* ── CTA: build a fresh CV ── */}
              <div className={styles.ctaBanner}>
                <div>
                  <h3>Ready to build a stronger CV?</h3>
                  <p>
                    Apply this feedback in our guided builder and get a clean, print-ready
                    academic CV in minutes.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.ctaBtn}
                  onClick={buildFromScratch}
                  disabled={creatingCV}
                >
                  {creatingCV ? "Opening…" : "Build a new CV"}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
