"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/lib/auth";
import PrimaryNav from "@/components/layout/primary-nav";
import styles from "./detail.module.css";

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
  const [scholarship, setScholarship] = useState<ScholarshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SummaryTab>("Overview");

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
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <div>
            <p className={styles.brandName}>BairePorbo</p>
            <span className={styles.brandTag}>Scholarship detail</span>
          </div>
        </div>
        <PrimaryNav className={styles.nav} />
        <div className={styles.headerActions}>
          {user ? (
            <button className={styles.ghostButton} onClick={signOut}>Sign out</button>
          ) : (
            <Link className={styles.ghostButton} href="/auth/login">Sign in</Link>
          )}
          <Link className={styles.ghostButton} href="/scholarships">Back to list</Link>
          {scholarship.official_url && (
            <a className={styles.primaryButton} href={scholarship.official_url} target="_blank" rel="noopener noreferrer">
              Apply now ↗
            </a>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            {scholarship.thumbnail_url && (
              <img
                src={scholarship.thumbnail_url}
                alt={scholarship.title}
                style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 16, marginBottom: 16 }}
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
          </div>
          <div className={styles.heroPanel}>
            <h3>Quick facts</h3>
            {scholarship.competitiveness && (
              <p>Competitiveness: <strong>{scholarship.competitiveness}</strong></p>
            )}
            {scholarship.tags && scholarship.tags.length > 0 && (
              <div className={styles.tagRow} style={{ marginTop: 10 }}>
                {scholarship.tags.map((t) => <span key={t}>{t}</span>)}
              </div>
            )}
            {scholarship.official_url && (
              <a className={styles.secondaryButton} href={scholarship.official_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", marginTop: 14 }}>
                Official page ↗
              </a>
            )}
          </div>
        </section>

        <section className={styles.summarySection}>
          <div className={styles.summaryHeader}>
            <h2>AI summary</h2>
            <div className={styles.tabRow}>
              {TABS.map((tab) => (
                <button
                  key={tab}
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
            <p style={{ whiteSpace: "pre-line" }}>{tabContent[activeTab]}</p>
            {scholarship.tags && (
              <div className={styles.tagRow}>
                {scholarship.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            )}
          </div>
        </section>

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
      </main>
    </div>
  );
}
