"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DemoGuard from "@/app/demo-guard";
import DemoSignOutButton from "@/app/demo-signout-button";
import PrimaryNav from "@/components/layout/primary-nav";
import styles from "./detail.module.css";

type SummaryTab = "Overview" | "Eligibility" | "Competitiveness" | "Strategy";

type ScholarshipDetail = {
  title: string;
  country: string;
  funding: string;
  deadline: string;
  level: string;
  university: string;
  summary: Record<SummaryTab, string>;
  requirements: string[];
  tags: string[];
};

const MOCK_DETAIL: ScholarshipDetail = {
  title: "DAAD EPOS Scholarship",
  country: "Germany",
  funding: "Full funding",
  deadline: "Jun 30, 2026",
  level: "Masters",
  university: "Multiple public universities",
  summary: {
    Overview:
      "DAAD EPOS funds development-related Masters programs in Germany for early-career professionals. It covers tuition, monthly stipend, travel, and insurance.",
    Eligibility:
      "You need a strong academic record, at least two years of relevant work experience, and a clear development-focused motivation aligned with your chosen program.",
    Competitiveness:
      "Highly competitive. Stand out with measurable impact in your work experience and a tailored SOP connecting your goals to the program curriculum.",
    Strategy:
      "Focus on a concise SOP, secure strong recommendations, and align your CV with leadership impact. Shortlist 2 backup programs with similar funding.",
  },
  requirements: [
    "Minimum 2 years of relevant work experience",
    "Bachelor degree completed before the deadline",
    "Proof of English proficiency (IELTS/TOEFL)",
    "Motivation letter and CV",
  ],
  tags: ["Development", "Public Policy", "Engineering", "2+ yrs experience"],
};

const TABS: SummaryTab[] = ["Overview", "Eligibility", "Competitiveness", "Strategy"];

export default function ScholarshipDetailPage() {
  const [activeTab, setActiveTab] = useState<SummaryTab>("Overview");

  const summaryText = useMemo(() => MOCK_DETAIL.summary[activeTab], [activeTab]);

  return (
    <DemoGuard>
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
            <DemoSignOutButton className={styles.ghostButton} />
            <Link className={styles.ghostButton} href="/scholarships">
              Back to list
            </Link>
            <button className={styles.primaryButton}>Bookmark</button>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}>Scholarship detail</p>
              <h1>{MOCK_DETAIL.title}</h1>
              <p className={styles.subtitle}>{MOCK_DETAIL.university}</p>
              <div className={styles.metaRow}>
                <span>{MOCK_DETAIL.country}</span>
                <span>{MOCK_DETAIL.level}</span>
                <span>{MOCK_DETAIL.funding}</span>
                <span>Deadline: {MOCK_DETAIL.deadline}</span>
              </div>
            </div>
            <div className={styles.heroPanel}>
              <h3>Quick match</h3>
              <p>Strong fit for 3.1+ CGPA with 2 years experience in development-related roles.</p>
              <button className={styles.secondaryButton}>See AI match score</button>
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
              <p>{summaryText}</p>
              <div className={styles.tagRow}>
                {MOCK_DETAIL.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.columns}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Requirements checklist</h2>
                <button className={styles.linkButton}>Download PDF</button>
              </div>
              <ul className={styles.requirementsList}>
                {MOCK_DETAIL.requirements.map((item) => (
                  <li key={item}>
                    <span className={styles.checkDot} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Action plan</h2>
                <button className={styles.linkButton}>Add to roadmap</button>
              </div>
              <div className={styles.actionList}>
                <div>
                  <h3>Week 1</h3>
                  <p>Draft SOP, identify 2 recommenders, shortlist programs.</p>
                </div>
                <div>
                  <h3>Week 2-3</h3>
                  <p>Finalize CV, gather transcripts, book IELTS if needed.</p>
                </div>
                <div>
                  <h3>Week 4</h3>
                  <p>Submit applications and upload references.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </DemoGuard>
  );
}
