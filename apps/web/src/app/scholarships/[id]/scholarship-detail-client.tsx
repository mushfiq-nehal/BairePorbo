"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDialog } from "@/components/ui/dialog-provider";
import ScholarshipAiPanel from "@/components/scholarship-ai-panel/scholarship-ai-panel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./detail.module.css";

type SummaryTab = "Overview" | "Eligibility" | "Competitiveness" | "Tips";

export type ScholarshipForClient = {
  id: string;
  title: string;
  country: string;
  degree_level: string;
  funding_type: string;
  deadline: string | null;
  official_url: string | null;
  eligibility_summary: string | null;
  competitiveness: string | null;
  tips: string | null;
  tags: string[] | null;
  ai_summary: string | null;
};

const TABS: SummaryTab[] = ["Overview", "Eligibility", "Competitiveness", "Tips"];

interface Props {
  scholarship: ScholarshipForClient;
}

/**
 * Client island for the scholarship detail page.
 * Handles: AI summary tab switching, the AI chat panel, and the mobile sticky bar.
 * Receives all scholarship data as props — no client-side data fetch needed.
 */
export default function ScholarshipDetailClient({ scholarship }: Props) {
  const { userId } = useAuth();
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<SummaryTab>("Overview");
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  // Sync bookmark state for the mobile sticky bar
  useEffect(() => {
    if (!userId) {
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
  }, [userId, scholarship.id]);

  // Profile context for the AI panel
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { profile?: Record<string, unknown> } | null) => {
        setProfile(data?.profile ?? null);
      })
      .catch(() => setProfile(null));
  }, [userId]);

  // On mobile, Tips tab is hidden — fall back to Overview if somehow active
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 640px)");
    const sync = () => {
      if (mql.matches && activeTab === "Tips") setActiveTab("Overview");
    };
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [activeTab]);

  const handleBookmark = async () => {
    if (!userId) {
      await dialog.alert({
        title: "Sign in required",
        description: "Please sign in to save scholarships.",
      });
      return;
    }
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
        await dialog.alert({
          title: data.already ? "Already bookmarked" : "Success",
          description: data.already
            ? "This scholarship is already in your bookmarks!"
            : "Saved to bookmarks!",
        });
      } else {
        await dialog.alert({ title: "Error", description: "Failed to bookmark." });
      }
    } catch {
      await dialog.alert({ title: "Error", description: "Error saving bookmark." });
    }
    setIsBookmarking(false);
  };

  const tabContent: Record<SummaryTab, string> = {
    Overview: scholarship.ai_summary ?? "No summary available yet.",
    Eligibility:
      scholarship.eligibility_summary ?? "Eligibility details not yet available.",
    Competitiveness: scholarship.competitiveness
      ? `Competitiveness: ${scholarship.competitiveness}\n\n${scholarship.tips ?? ""}`
      : "Competitiveness analysis not yet available.",
    Tips: scholarship.tips ?? "Application tips not yet available.",
  };

  const contextText = [
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
    ...(profile
      ? [
          "",
          "---",
          "Student Profile:",
          `BSc Major: ${profile.bsc_major ?? "Not provided"}`,
          `University: ${profile.university ?? "Not provided"}`,
          `Graduation Year: ${profile.graduation_year ?? "Not provided"}`,
          `IELTS Score: ${profile.ielts_score ?? "Not provided"}`,
          `GRE/GMAT Score: ${profile.gre_gmat_score ?? "Not provided"}`,
          `Research Interests: ${profile.research_interests ?? "Not provided"}`,
          `Published Papers: ${profile.published_papers ?? "Not provided"}`,
          `Internships: ${profile.internships ?? "Not provided"}`,
        ]
      : []),
  ].join("\n");

  return (
    <>
      {/* ── AI summary tabs ── */}
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
              {scholarship.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── AI contextual chat panel ── */}
      <ScholarshipAiPanel
        scholarshipTitle={scholarship.title}
        contextText={contextText}
      />

      {/* ── Mobile-only sticky action bar ── */}
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
    </>
  );
}
