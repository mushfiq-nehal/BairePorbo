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

type DeadlineTone = "urgent" | "soon" | "normal" | "closed" | "none";

const DEADLINE_TONE_CLASS: Record<DeadlineTone, string> = {
  urgent: styles.deadlineUrgent,
  soon: styles.deadlineSoon,
  normal: styles.deadlineNormal,
  closed: styles.deadlineClosed,
  none: styles.deadlineNone,
};

function parseEligibilityItems(summary: string | null): string[] {
  return (summary ?? "")
    .split(/(?<=\.)\s+(?=[A-Z•])|[•\n]/)
    .map((item) => item.replace(/\.\s*$/, "").trim())
    .filter(Boolean);
}

function parseTipItems(tips: string | null): string[] {
  return (tips ?? "")
    .split(/[•\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDeadlineInfo(d: string | null): { label: string; tone: DeadlineTone } {
  if (!d) return { label: "Open deadline — apply anytime", tone: "none" };

  const date = new Date(d);
  if (isNaN(date.getTime())) return { label: d, tone: "normal" };

  const formatted = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDeadline = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfDeadline.getTime() - startOfToday.getTime()) / 86_400_000
  );

  if (diffDays < 0) return { label: `Closed · ${formatted}`, tone: "closed" };
  if (diffDays === 0) return { label: "Closes today", tone: "urgent" };
  if (diffDays === 1) return { label: "Closes tomorrow", tone: "urgent" };
  if (diffDays <= 7) return { label: `Closes in ${diffDays} days`, tone: "urgent" };
  if (diffDays <= 30)
    return { label: `Closes in ${diffDays} days — ${formatted}`, tone: "soon" };
  return { label: `Deadline: ${formatted}`, tone: "normal" };
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

  const deadlineInfo = getDeadlineInfo(s.deadline);
  const eligibilityItems = parseEligibilityItems(s.eligibility_summary);
  const tipItems = parseTipItems(s.tips);

  return (
    <div className={styles.page}>
      <NavbarWithAuth />

      <main className={styles.main}>
        {/* ── Hero ─────────────────────────────────────────────────────────────
            Top row: image (60%) + quick-facts panel (40%).
            Bottom row: title block spans the full hero width so the H1 gets
            maximum room instead of being squeezed into one column.
            H1 and meta are always server-rendered so Google indexes the
            scholarship title on the first crawl. The panel is a client island
            for bookmark / apply buttons.
        ─────────────────────────────────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroMedia}>
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
          </div>

          {/* Quick-facts panel — bookmark / apply — client only */}
          <ScholarshipHeroPanelClient
            scholarship={{
              id: s.id,
              official_url: s.official_url,
              competitiveness: s.competitiveness,
              tags: s.tags,
            }}
          />

          {/* Title block — full hero width, own row below image + panel */}
          <div className={styles.heroContent}>
            <p className={styles.kicker}>Scholarship detail</p>
            {/* H1 server-rendered — Googlebot sees this on first request */}
            <h1>{s.title}</h1>
            <p className={styles.subtitle}>
              {s.country} · {LEVEL_MAP[s.degree_level] ?? s.degree_level} ·{" "}
              {FUNDING_MAP[s.funding_type] ?? s.funding_type}
            </p>

            <span
              className={`${styles.deadlineBadge} ${DEADLINE_TONE_CLASS[deadlineInfo.tone]}`}
            >
              {deadlineInfo.label}
            </span>
          </div>
        </section>

        {/* ── AI summary + AI chat panel (client island) ─────────────── */}
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

        {/* ── Eligibility checklist + Application tips — permanent, always
            visible (not tucked behind a tab) since they're what students
            most need to act on. Server-rendered for SEO. ─────────────── */}
        <section className={styles.columns}>
          <div className={`${styles.panel} ${styles.panelEligibility}`}>
            <div className={styles.panelHeader}>
              <h2>Eligibility checklist</h2>
            </div>
            {eligibilityItems.length > 0 ? (
              <ul className={styles.requirementsList}>
                {eligibilityItems.map((item, i) => (
                  <li key={i}>
                    <span className={styles.checkIcon} aria-hidden="true">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.markdownBody}>Eligibility details coming soon.</p>
            )}
          </div>

          <div className={`${styles.panel} ${styles.panelTips}`}>
            <div className={styles.panelHeader}>
              <h2>Application tips</h2>
            </div>
            {tipItems.length > 0 ? (
              <div className={styles.actionList}>
                {tipItems.map((tip, i) => (
                  <div key={i} className={styles.actionItem}>
                    <span className={styles.actionNumber}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p>{tip}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.markdownBody}>Application tips not yet available.</p>
            )}
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
            <div className={`${styles.docsCard} ${styles.docsCardCore}`}>
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

            <div className={`${styles.docsCard} ${styles.docsCardAdditional}`}>
              <h3>
                <span
                  className={styles.docsBadge}
                  style={{
                    background: "rgba(224,110,72,0.12)",
                    color: "var(--coral-700)",
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
                      style={{ background: "var(--coral-400)" }}
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
