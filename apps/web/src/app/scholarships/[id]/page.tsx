import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import NavbarWithAuth from "@/components/layout/navbar-with-auth";
import { sql } from "@/utils/db";
import ScholarshipHeroPanelClient from "./scholarship-hero-panel-client";
import ScholarshipDetailClient from "./scholarship-detail-client";
import styles from "./detail.module.css";

// UUID pattern — detects legacy UUID-based URLs so we can 301 to slug
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FUNDING_MAP: Record<string, string> = {
  full: "Full funding",
  partial: "Partial funding",
  tuition_only: "Tuition only",
  stipend: "Stipend only",
  other: "Other",
};

const LEVEL_MAP: Record<string, string> = {
  bachelors: "Bachelor's",
  masters: "Master's",
  phd: "PhD",
  postdoc: "Postdoc",
  any: "Any level",
};

function formatDeadline(d: string | null): string {
  if (!d) return "Open deadline";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScholarshipDetailPage({ params }: Props) {
  const { id } = await params;

  // Accept both slug and UUID — old UUID links keep working
  const rows = await sql`
    SELECT
      id, title, country, degree_level, funding_type, deadline,
      official_url, eligibility_summary, competitiveness, tips,
      tags, ai_summary, thumbnail_url, slug
    FROM scholarships
    WHERE (slug = ${id} OR id::text = ${id})
      AND status = 'published'
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) notFound();

  // 301 redirect UUID → slug URL once slug exists
  if (UUID_RE.test(id) && row.slug) {
    redirect(`/scholarships/${row.slug as string}`);
  }

  const s = {
    id: row.id as string,
    title: row.title as string,
    country: row.country as string,
    degree_level: row.degree_level as string,
    funding_type: row.funding_type as string,
    deadline: row.deadline as string | null,
    official_url: row.official_url as string | null,
    eligibility_summary: row.eligibility_summary as string | null,
    competitiveness: row.competitiveness as string | null,
    tips: row.tips as string | null,
    tags: row.tags as string[] | null,
    ai_summary: row.ai_summary as string | null,
    thumbnail_url: row.thumbnail_url as string | null,
    slug: row.slug as string | null,
  };

  const eligibilityItems = (s.eligibility_summary ?? "")
    .split(/(?<=\.)\s+(?=[A-Z•])|[•\n]/)
    .map((item) => item.replace(/\.\s*$/, "").trim())
    .filter(Boolean);

  const tipItems = (s.tips ?? "")
    .split(/[•\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className={styles.page}>
      <NavbarWithAuth />

      <main className={styles.main}>
        {/* ── Hero ─────────────────────────────────────────────────────────────
            Left column: server-rendered.  H1 and meta are always in the HTML
            so Google indexes the scholarship title on the first crawl.
            Right column: client island for bookmark / apply buttons.
        ─────────────────────────────────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div>
            <Link href="/scholarships" className={styles.mobileBackLink}>
              ← Scholarships
            </Link>

            {s.thumbnail_url && (
              <Image
                src={s.thumbnail_url}
                alt={`${s.title} — ${s.country} scholarship`}
                className={styles.heroImage}
                width={640}
                height={360}
                priority
                sizes="(max-width: 768px) 100vw, 640px"
              />
            )}

            <p className={styles.kicker}>Scholarship detail</p>
            {/* H1 server-rendered — Googlebot sees this on first request */}
            <h1>{s.title}</h1>
            <p className={styles.subtitle}>{s.country}</p>

            <div className={styles.metaRow}>
              <span>{s.country}</span>
              <span>{LEVEL_MAP[s.degree_level] ?? s.degree_level}</span>
              <span>{FUNDING_MAP[s.funding_type] ?? s.funding_type}</span>
              <span>Deadline: {formatDeadline(s.deadline)}</span>
            </div>
            {/* Mobile inline meta (hidden from accessibility tree) */}
            <p className={styles.metaInline} aria-hidden="true">
              {s.country} · {LEVEL_MAP[s.degree_level] ?? s.degree_level} ·{" "}
              {FUNDING_MAP[s.funding_type] ?? s.funding_type}
            </p>
            <p className={styles.deadlineInline} aria-hidden="true">
              Deadline {formatDeadline(s.deadline)}
            </p>
          </div>

          {/* Right column: bookmark / apply / quick-facts — client only */}
          <ScholarshipHeroPanelClient
            scholarship={{
              id: s.id,
              official_url: s.official_url,
              competitiveness: s.competitiveness,
              tags: s.tags,
            }}
          />
        </section>

        {/* ── AI summary tabs + AI chat panel (client island) ─────────────── */}
        <ScholarshipDetailClient
          scholarship={{
            id: s.id,
            title: s.title,
            country: s.country,
            degree_level: s.degree_level,
            funding_type: s.funding_type,
            deadline: s.deadline,
            official_url: s.official_url,
            eligibility_summary: s.eligibility_summary,
            competitiveness: s.competitiveness,
            tips: s.tips,
            tags: s.tags,
            ai_summary: s.ai_summary,
          }}
        />

        {/* ── Eligibility + Tips — server-rendered for Google ─────────────── */}
        <section className={styles.columns}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Eligibility checklist</h2>
            </div>
            {eligibilityItems.length > 0 ? (
              <ul className={styles.requirementsList}>
                {eligibilityItems.map((item, i) => (
                  <li key={i}>
                    <span className={styles.checkDot} />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Eligibility details coming soon.</p>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Application tips</h2>
            </div>
            <div className={styles.actionList}>
              {tipItems.length > 0 ? (
                tipItems.map((tip, i) => (
                  <div key={i}>
                    <h3>Tip {i + 1}</h3>
                    <p>{tip}</p>
                  </div>
                ))
              ) : (
                <p>Application tips coming soon.</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Documents guide — fully static, server-rendered ─────────────── */}
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
              <h2>Documents Required for International Scholarships</h2>
              <p>
                A general guide to documents commonly needed when applying for
                scholarships abroad.
              </p>
            </div>
          </div>

          <div className={styles.docsColumns}>
            <div className={styles.docsCard}>
              <h3>
                <span
                  className={styles.docsBadge}
                  style={{
                    background: "rgba(15,143,141,0.12)",
                    color: "var(--teal-700)",
                  }}
                >
                  Core
                </span>
                Core Documents
              </h3>
              <ul className={styles.docsList}>
                {[
                  "Valid Passport",
                  "Academic Certificates & Transcripts (SSC, HSC, Bachelor's)",
                  "Curriculum Vitae (CV) or Resume",
                  "Statement of Purpose (SOP) or Motivation Letter",
                  "Letters of Recommendation (LOR)",
                  "English Proficiency Certificate — IELTS, TOEFL, or PTE",
                  "Recent Passport-Sized Photograph",
                ].map((doc) => (
                  <li key={doc}>
                    <span className={styles.docsDot} />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.docsCard}>
              <h3>
                <span
                  className={styles.docsBadge}
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "#4338ca",
                  }}
                >
                  Additional
                </span>
                Sometimes Required
              </h3>
              <ul className={styles.docsList}>
                {[
                  "Medical Certificate",
                  "Research Proposal (especially for Master's & PhD)",
                  "Work Experience Certificate or Professional Portfolio",
                ].map((doc) => (
                  <li key={doc}>
                    <span
                      className={styles.docsDot}
                      style={{ background: "#818cf8" }}
                    />
                    {doc}
                  </li>
                ))}
              </ul>

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
                  <strong>Pro tip:</strong> A valid passport, academic transcripts,
                  a strong CV, and a well-crafted SOP are usually enough to start
                  applying to most scholarships at the initial stage.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.aiDisclaimer}>
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
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p>
            The summary, eligibility details, and tips on this page are
            AI-generated and may contain inaccuracies. Always verify information
            on the <strong>official scholarship website</strong> before applying.
          </p>
        </div>
      </main>
    </div>
  );
}
