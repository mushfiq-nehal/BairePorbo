"use client";

import { useEffect, useRef, useState } from "react";
import type { RequiredDocuments } from "@/lib/scholarships-db";
import styles from "./detail.module.css";

/** Generic fallback shown when no AI-tailored list is cached yet (or if
 * generation fails). Kept identical to the original static section. */
const FALLBACK: RequiredDocuments = {
  core: [
    "Valid Passport",
    "Academic Certificates & Transcripts (SSC, HSC, Bachelor's)",
    "Curriculum Vitae (CV) or Resume",
    "Statement of Purpose (SOP) or Motivation Letter",
    "Letters of Recommendation (LOR)",
    "English Proficiency Certificate — IELTS, TOEFL, or PTE",
    "Recent Passport-Sized Photograph",
  ],
  additional: [
    "Medical Certificate",
    "Research Proposal (especially for Master's & PhD)",
    "Work Experience Certificate or Professional Portfolio",
  ],
  note: "A valid passport, academic transcripts, a strong CV, and a well-crafted SOP are usually enough to start applying to most scholarships at the initial stage.",
};

interface Props {
  /** slug or UUID used in the page URL — accepted by the documents API. */
  apiId: string;
  title: string;
  /** DB-cached, AI-generated docs. When null we lazily generate on mount. */
  initial: RequiredDocuments | null;
}

export default function ScholarshipDocuments({ apiId, title, initial }: Props) {
  const [docs, setDocs] = useState<RequiredDocuments | null>(initial);
  const [generating, setGenerating] = useState(false);
  const triggered = useRef(false);

  const isTailored = docs !== null;
  const data = docs ?? FALLBACK;

  useEffect(() => {
    if (initial || triggered.current) return; // already cached, or already asked
    triggered.current = true;
    setGenerating(true);

    const controller = new AbortController();
    fetch(`/api/scholarships/${encodeURIComponent(apiId)}/documents`, {
      method: "POST",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { documents?: RequiredDocuments | null } | null) => {
        if (body?.documents && body.documents.core?.length) {
          setDocs(body.documents);
        }
      })
      .catch(() => {
        /* keep fallback on any error/abort */
      })
      .finally(() => setGenerating(false));

    return () => controller.abort();
  }, [apiId, initial]);

  return (
    <section className={styles.docsGuide}>
      <div className={styles.docsGuideHeader}>
        <div className={styles.docsGuideIcon} aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div>
          <h2>Documents required for {title}</h2>
          <p>
            {isTailored
              ? "AI-tailored to this scholarship's level, field, and country. Always confirm the exact list on the official website."
              : generating
                ? "Preparing a list tailored to this scholarship…"
                : "A general guide to documents commonly needed when applying for scholarships abroad."}
          </p>
        </div>
      </div>

      <div className={styles.docsColumns}>
        <div className={`${styles.docsCard} ${styles.docsCardCore}`}>
          <h3>
            <span
              className={styles.docsBadge}
              style={{ background: "rgba(15,143,141,0.12)", color: "var(--teal-700)" }}
            >
              Core
            </span>
            Core Documents
          </h3>
          <ul className={styles.docsList}>
            {data.core.map((doc) => (
              <li key={doc}>
                <span className={styles.docsDot} />
                {doc}
              </li>
            ))}
          </ul>
        </div>

        {data.additional.length > 0 && (
          <div className={`${styles.docsCard} ${styles.docsCardAdditional}`}>
            <h3>
              <span
                className={styles.docsBadge}
                style={{ background: "rgba(224,110,72,0.12)", color: "var(--coral-700)" }}
              >
                Additional
              </span>
              Sometimes Required
            </h3>
            <ul className={styles.docsList}>
              {data.additional.map((doc) => (
                <li key={doc}>
                  <span className={styles.docsDot} style={{ background: "var(--coral-400)" }} />
                  {doc}
                </li>
              ))}
            </ul>

            {data.note && (
              <div className={styles.docsTip}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: 1 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p>
                  <strong>Pro tip:</strong> {data.note}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
