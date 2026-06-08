"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDialog } from "@/components/ui/dialog-provider";
import AppNavbar, { NavAction } from "@/components/layout/app-navbar";
import ScholarshipAiPanel from "@/components/scholarship-ai-panel/scholarship-ai-panel";
import styles from "./detail.module.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type SummaryTab = "Overview" | "Eligibility" | "Competitiveness" | "Tips";

type ScholarshipDetail = {
  id: string;
  title: string;
  country: string;
  funding_type: string;
  deadline: string | null;
  degree_level: string;
  official_url: string | null;
  raw_description: string | null;
  eligibility_summary: string | null;
  competitiveness: string | null;
  tips: string | null;
  tags: string[] | null;
  ai_summary: string | null;
  thumbnail_url: string | null;
};

const FUNDING_MAP: Record<string, string> = {
  full: "Full funding", partial: "Partial funding",
  tuition_only: "Tuition only", stipend: "Stipend only", other: "Other",
};
const LEVEL_MAP: Record<string, string> = {
  bachelors: "Bachelor's", masters: "Master's", phd: "PhD", postdoc: "Postdoc", any: "Any level",
};

const TABS: SummaryTab[] = ["Overview", "Eligibility", "Competitiveness", "Tips"];

export default function ScholarshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut } = useAuth();
  const dialog = useDialog();
  const [scholarship, setScholarship] = useState<ScholarshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SummaryTab>("Overview");
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from("scholarships")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .single()
      .then(({ data }) => {
        setScholarship(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!user || !scholarship?.id) {
      setIsBookmarked(false);
      return;
    }
    fetch("/api/bookmarks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { bookmarks?: { scholarship_id: string }[] } | null) => {
        const ids = data?.bookmarks?.map((b) => b.scholarship_id) ?? [];
        setIsBookmarked(ids.includes(scholarship.id));
      })
      .catch(() => setIsBookmarked(false));
  }, [user, scholarship?.id]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
      });
  }, [user]);

  // On mobile the Tips tab is hidden (its content has a dedicated card below).
  // If a user shrinks the viewport while on Tips, fall back to Overview so the
  // body isn't pointing at an inaccessible tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 640px)");
    const sync = () => {
      if (mql.matches && activeTab === "Tips") {
        setActiveTab("Overview");
      }
    };
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [activeTab]);

  const tabContent: Record<SummaryTab, string> = {
    Overview: scholarship?.ai_summary ?? scholarship?.raw_description ?? "No summary available yet.",
    Eligibility: scholarship?.eligibility_summary ?? "Eligibility details not yet available.",
    Competitiveness: scholarship?.competitiveness
      ? `Competitiveness: ${scholarship.competitiveness}\n\n${scholarship?.tips ?? ""}`
      : "Competitiveness analysis not yet available.",
    Tips: scholarship?.tips ?? "Application tips not yet available.",
  };

  const formatDeadline = (d: string | null) => {
    if (!d) return "Open deadline";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const handleBookmark = async () => {
    if (!user) {
      await dialog.alert({ title: "Sign in required", description: "Please sign in to save scholarships." });
      return;
    }
    if (!scholarship?.id) return;
    setIsBookmarking(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholarship_id: scholarship.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsBookmarked(true);
        if (data.already) {
          await dialog.alert({ title: "Already bookmarked", description: "This scholarship is already in your bookmarks!" });
        } else {
          await dialog.alert({ title: "Success", description: "Saved to bookmarks!" });
        }
      } else {
        await dialog.alert({ title: "Error", description: "Failed to bookmark." });
      }
    } catch (err) {
      console.error(err);
      await dialog.alert({ title: "Error", description: "Error saving bookmark." });
    }
    setIsBookmarking(false);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ padding: "60px", textAlign: "center", color: "var(--ink-500)" }}>
          Loading scholarship…
        </div>
      </div>
    );
  }

  if (!scholarship) {
    return (
      <div className={styles.page}>
        <div style={{ padding: "60px", textAlign: "center" }}>
          <h2>Scholarship not found</h2>
          <Link href="/scholarships" className={styles.primaryButton} style={{ display: "inline-block", marginTop: 16 }}>
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const actions: NavAction[] = user
    ? [{ label: "Sign out", onClick: signOut }]
    : [{ label: "Sign in", href: "/auth/login" }];

  return (
    <div className={styles.page}>
      <AppNavbar actions={actions} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            {/* Mobile-only back link — the hero panel is hidden on mobile */}
            <Link href="/scholarships" className={styles.mobileBackLink}>
              ← Scholarships
            </Link>

            {scholarship.thumbnail_url && (
              <img
                src={scholarship.thumbnail_url}
                alt=""
                className={styles.heroImage}
              />
            )}
            <p className={styles.kicker}>Scholarship detail</p>
            <h1>{scholarship.title}</h1>
            <p className={styles.subtitle}>{scholarship.country}</p>
            <div className={styles.metaRow}>
              <span>{scholarship.country}</span>
              <span>{LEVEL_MAP[scholarship.degree_level] ?? scholarship.degree_level}</span>
              <span>{FUNDING_MAP[scholarship.funding_type] ?? scholarship.funding_type}</span>
              <span>Deadline: {formatDeadline(scholarship.deadline)}</span>
            </div>
            {/* Mobile-only compact meta line */}
            <p className={styles.metaInline} aria-hidden="true">
              {scholarship.country} · {LEVEL_MAP[scholarship.degree_level] ?? scholarship.degree_level} ·{" "}
              {FUNDING_MAP[scholarship.funding_type] ?? scholarship.funding_type}
            </p>
            <p className={styles.deadlineInline} aria-hidden="true">
              Deadline {formatDeadline(scholarship.deadline)}
            </p>
          </div>
          <div className={styles.heroPanel}>
            <div className={styles.heroActions}>
              <Link className={styles.ghostButton} href="/scholarships">Back to list</Link>
              {scholarship.official_url && (
                <a
                  className={styles.primaryButton}
                  href={scholarship.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apply now ↗
                </a>
              )}
            </div>
            <h3>Quick facts</h3>
            {scholarship.competitiveness && (
              <p>Competitiveness: <strong>{scholarship.competitiveness}</strong></p>
            )}
            {scholarship.tags && scholarship.tags.length > 0 && (
              <div className={styles.tagRow} style={{ marginTop: 10 }}>
                {scholarship.tags.map((t) => <span key={t}>{t}</span>)}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: 14 }}>
              {isBookmarked ? (
                <button
                  className={styles.secondaryButton}
                  disabled
                  style={{ flex: 1, textAlign: "center", opacity: 0.7, cursor: "default" }}
                >
                  Bookmarked
                </button>
              ) : (
                <button
                  className={styles.secondaryButton}
                  onClick={handleBookmark}
                  disabled={isBookmarking}
                  style={{ flex: 1, textAlign: "center" }}
                >
                  {isBookmarking ? "Saving..." : "Save to Bookmarks"}
                </button>
              )}
              {scholarship.official_url && (
                <a className={styles.primaryButton} href={scholarship.official_url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: "center" }}>
                  Official page ↗
                </a>
              )}
            </div>
          </div>
        </section>

        <section className={styles.summarySection}>
          <div className={styles.summaryHeader}>
            <h2>AI summary</h2>
            <div className={styles.tabRow}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  data-tab={tab}
                  className={tab === activeTab ? styles.tabActive : styles.tabButton}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.summaryBody}>
            <div className={styles.markdownBody}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {tabContent[activeTab]}
              </ReactMarkdown>
            </div>
            {scholarship.tags && (
              <div className={styles.tagRow}>
                {scholarship.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            )}
          </div>
        </section>

        <ScholarshipAiPanel
          scholarshipTitle={scholarship.title}
          contextText={[
            `Title: ${scholarship.title}`,
            `Country: ${scholarship.country}`,
            `Degree level: ${scholarship.degree_level}`,
            `Funding: ${scholarship.funding_type}`,
            `Deadline: ${scholarship.deadline ?? "Open"}`,
            `Tags: ${scholarship.tags?.join(", ") ?? "None"}`,
            "",
            `AI Summary: ${scholarship.ai_summary ?? "None"}`,
            `Eligibility: ${scholarship.eligibility_summary ?? "None"}`,
            `Tips: ${scholarship.tips ?? "None"}`,
            ...(profile ? [
              "",
              "---",
              "Student Profile Information:",
              `BSc Major: ${profile.bsc_major ?? "Not provided"}`,
              `University: ${profile.university ?? "Not provided"}`,
              `Graduation Year: ${profile.graduation_year ?? "Not provided"}`,
              `IELTS Score: ${profile.ielts_score ?? "Not provided"}`,
              `GRE/GMAT Score: ${profile.gre_gmat_score ?? "Not provided"}`,
              `Research Interests: ${profile.research_interests ?? "Not provided"}`,
              `Published Papers: ${profile.published_papers ?? "Not provided"}`,
              `Internships: ${profile.internships ?? "Not provided"}`
            ] : [])
          ].join("\n")}
        />

        <section className={styles.columns}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Eligibility checklist</h2>
            </div>
            <ul className={styles.requirementsList}>
              {(scholarship.eligibility_summary ?? "Details coming soon.")
                .split(/[.•\n]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((item, i) => (
                  <li key={i}>
                    <span className={styles.checkDot} />
                    {item}
                  </li>
                ))}
            </ul>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Application tips</h2>
            </div>
            <div className={styles.actionList}>
              {(scholarship.tips ?? "Tips coming soon.")
                .split(/[•\n]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((tip, i) => (
                  <div key={i}>
                    <h3>Tip {i + 1}</h3>
                    <p>{tip}</p>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* Required Documents Guide */}
        <section className={styles.docsGuide}>
          <div className={styles.docsGuideHeader}>
            <div className={styles.docsGuideIcon} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <h2>Documents Required for International Scholarships</h2>
              <p>A general guide to documents commonly needed when applying for scholarships abroad.</p>
            </div>
          </div>

          <div className={styles.docsColumns}>
            <div className={styles.docsCard}>
              <h3>
                <span className={styles.docsBadge} style={{ background: "rgba(15,143,141,0.12)", color: "var(--teal-700)" }}>Core</span>
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
                <span className={styles.docsBadge} style={{ background: "rgba(99,102,241,0.1)", color: "#4338ca" }}>Additional</span>
                Sometimes Required
              </h3>
              <ul className={styles.docsList}>
                {[
                  "Medical Certificate",
                  "Research Proposal (especially for Master's & PhD)",
                  "Work Experience Certificate or Professional Portfolio",
                ].map((doc) => (
                  <li key={doc}>
                    <span className={styles.docsDot} style={{ background: "#818cf8" }} />
                    {doc}
                  </li>
                ))}
              </ul>

              <div className={styles.docsTip}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>
                  <strong>Pro tip:</strong> A valid passport, academic transcripts, a strong CV, and a well-crafted SOP are usually enough to start applying to most scholarships at the initial stage.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.aiDisclaimer}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>
            The summary, eligibility details, and tips on this page are AI-generated and may contain inaccuracies.
            Always verify information on the <strong>official scholarship website</strong> before applying.
          </p>
        </div>
      </main>

      {/* Mobile-only sticky action bar — Apply / Bookmark always reachable */}
      <div className={styles.mobileStickyBar}>
        <button
          type="button"
          className={`${styles.mobileStickyBookmark} ${
            isBookmarked ? styles.mobileStickyBookmarkActive : ""
          }`}
          onClick={handleBookmark}
          disabled={isBookmarking || isBookmarked}
          aria-label={isBookmarked ? "Bookmarked" : "Save to bookmarks"}
          aria-pressed={isBookmarked}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isBookmarked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {scholarship.official_url ? (
          <a
            className={styles.mobileStickyApply}
            href={scholarship.official_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply now ↗
          </a>
        ) : (
          <button
            type="button"
            className={styles.mobileStickyApply}
            disabled
            aria-disabled="true"
            style={{ opacity: 0.6 }}
          >
            No official link yet
          </button>
        )}
      </div>
    </div>
  );
}
