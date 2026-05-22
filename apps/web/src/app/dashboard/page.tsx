"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth";
import AppNavbar from "@/components/layout/app-navbar";
import styles from "./dashboard.module.css";

type Scholarship = {
  id: string;
  title: string;
  country: string;
  deadline: string;
  funding_type: string;
  competitiveness: string;
  thumbnail_url: string;
};

type Task = {
  id: string;
  title: string;
  due_date: string;
  status: "Now" | "Soon" | "Planned" | "Done";
};

type DashboardData = {
  stats: {
    readiness: number;
    bookmarksCount: number;
    tasksCount: number;
  };
  bookmarks: Scholarship[];
  tasks: Task[];
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Scholarship[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState("");

  const daysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const end = new Date(deadline);
    if (isNaN(end.getTime())) return null;
    const diffMs = end.getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(json => {
        if (!json.error) {
          setData(json);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleAiMatch = async () => {
    setIsMatching(true);
    setMatchError("");
    setMatches([]);
    
    try {
      const res = await fetch("/api/profile/match");
      const data = await res.json();
      
      if (!res.ok) {
        setMatchError(data.error || "Failed to find matches.");
      } else {
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error(err);
      setMatchError("Error connecting to AI Match.");
    }
    setIsMatching(false);
  };
  return (
    <AuthGuard>
      <div className={styles.page}>
        <AppNavbar actions={[{ label: "Sign out", onClick: signOut }]} />

        <main className={styles.main}>
          <section id="overview" className={styles.hero}>
            <div>
              <p className={styles.kicker}>Welcome, {user?.email}</p>
              <h1>Your scholarship mission control</h1>
              <p className={styles.subtitle}>
                Track deadlines, get AI explanations, and move from eligibility to application with
                confidence.
              </p>
              <div className={styles.heroActions}>
                <Link href="/profile" className={styles.secondaryButton}>Update profile</Link>
              </div>
            </div>
            <div className={styles.heroPanel}>
              <h3>Your Progress</h3>
              <p>Keep your profile updated and tackle your upcoming tasks.</p>
              <div className={styles.focusRow}>
                <div>
                  <span className={styles.focusLabel}>Profile Readiness</span>
                  <span className={styles.focusValue}>{loading ? "..." : `${data?.stats?.readiness ?? 0}%`}</span>
                </div>
                <div>
                  <span className={styles.focusLabel}>Active Tasks</span>
                  <span className={styles.focusValue}>{loading ? "..." : data?.stats?.tasksCount ?? 0}</span>
                </div>
              </div>
            </div>
          </section>

        <section className={styles.stats}>
          <div>
            <span className={styles.statValue}>{loading ? "-" : data?.stats?.bookmarksCount ?? 0}</span>
            <span className={styles.statLabel}>Scholarships Bookmarked</span>
          </div>
          <div>
            <span className={styles.statValue}>{loading ? "-" : data?.stats?.tasksCount ?? 0}</span>
            <span className={styles.statLabel}>Tasks In Progress</span>
          </div>
          <div>
            <span className={styles.statValue}>{loading ? "-" : `${data?.stats?.readiness ?? 0}%`}</span>
            <span className={styles.statLabel}>Profile Completeness</span>
          </div>
        </section>

        <section className={styles.columns}>
          <div className={styles.columnMain}>
            <div id="shortlist" className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Bookmarked scholarships</h2>
              </div>
              <div className={styles.scholarshipList}>
                {loading ? (
                  <p>Loading bookmarks...</p>
                ) : data?.bookmarks && data.bookmarks.length > 0 ? (
                  data.bookmarks.map((scholarship) => (
                    <Link key={scholarship.id} href={`/scholarships/${scholarship.id}`} className={styles.scholarshipCard} style={{ textDecoration: "none", color: "inherit", display: "block", cursor: "pointer" }}>
                      <div>
                        <h3>{scholarship.title}</h3>
                        <p>
                          {scholarship.country} - {scholarship.funding_type}
                        </p>
                      </div>
                      <div className={styles.scholarshipMeta}>
                        {scholarship.deadline && <span>Deadline: {scholarship.deadline}</span>}
                        {scholarship.competitiveness && <span className={styles.matchTag}>{scholarship.competitiveness}</span>}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p style={{ color: "var(--ink-500)", fontSize: "14px" }}>No scholarships bookmarked yet.</p>
                )}
              </div>
            </div>

            <div id="roadmap" className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Roadmap tasks</h2>
              </div>
              <div className={styles.taskList}>
                {loading ? (
                  <p>Loading tasks...</p>
                ) : data?.tasks && data.tasks.length > 0 ? (
                  data.tasks.map((task) => (
                    <div key={task.id} className={styles.taskRow}>
                      <div>
                        <h4>{task.title}</h4>
                        <p>Due: {task.due_date}</p>
                      </div>
                      <span className={styles[`task${task.status}`]}>{task.status}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--ink-500)", fontSize: "14px" }}>No upcoming tasks.</p>
                )}
              </div>
            </div>
          </div>

          <aside className={styles.columnSide}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Scholarship calendar</h2>
              </div>
              <div className={styles.calendarList}>
                {loading ? (
                  <p style={{ color: "var(--ink-500)", fontSize: "13px" }}>Loading deadlines...</p>
                ) : data?.bookmarks && data.bookmarks.length > 0 ? (
                  data.bookmarks.map((item) => {
                    const remaining = daysRemaining(item.deadline ?? null);
                    const isUrgent = remaining !== null && remaining <= 14;
                    return (
                      <Link
                        key={item.id}
                        href={`/scholarships/${item.id}`}
                        className={styles.calendarItem}
                      >
                        <div>
                          <h3>{item.title}</h3>
                          <span className={styles.calendarMeta}>{item.country}</span>
                        </div>
                        <span
                          className={`${styles.daysBadge} ${isUrgent ? styles.daysUrgent : ""}`.trim()}
                        >
                          {remaining === null
                            ? "Open"
                            : remaining < 0
                              ? "Closed"
                              : `${remaining}d`}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <p style={{ color: "var(--ink-500)", fontSize: "13px" }}>
                    No bookmarked scholarships yet.
                  </p>
                )}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>AI Match</h2>
              </div>
              <p className={styles.summaryText}>
                Find the best scholarships tailored to your exact profile constraints.
              </p>
              
              {matches.length === 0 && !isMatching && (
                <button 
                  className={styles.secondaryButton} 
                  onClick={handleAiMatch}
                  style={{ width: "100%", marginTop: "12px" }}
                >
                  Find my matches
                </button>
              )}

              {isMatching && (
                <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--ink-500)" }}>
                  Analyzing your profile... ✨
                </p>
              )}

              {matchError && (
                <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--coral-500)" }}>
                  {matchError}
                </p>
              )}

              {matches.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                  {matches.slice(0, 3).map(m => (
                    <Link 
                      key={m.id} 
                      href={`/scholarships/${m.id}`}
                      style={{ 
                        display: "flex", 
                        gap: "12px", 
                        padding: "12px", 
                        border: "1px solid var(--sand-200)", 
                        borderRadius: "12px",
                        textDecoration: "none",
                        color: "inherit"
                      }}
                    >
                      {m.thumbnail_url && (
                        <img 
                          src={m.thumbnail_url} 
                          alt="" 
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} 
                        />
                      )}
                      <div>
                        <h4 style={{ fontSize: "14px", margin: "0 0 4px" }}>{m.title}</h4>
                        <p style={{ fontSize: "12px", color: "var(--ink-500)", margin: 0 }}>
                          {m.country} • {m.funding_type}
                        </p>
                      </div>
                    </Link>
                  ))}
                  
                  <button 
                    className={styles.ghostButton} 
                    onClick={handleAiMatch}
                    style={{ width: "100%", marginTop: "8px" }}
                  >
                    Refresh matches
                  </button>
                </div>
              )}
            </div>
            
            <div className={styles.panel} style={{ marginTop: "24px" }}>
              <h2>Need guidance?</h2>
              <p className={styles.summaryText}>
                Ask the AI mentor about eligibility, timelines, and document strategy.
              </p>
              <Link className={styles.secondaryButton} href="/chat">
                Open AI mentor
              </Link>
            </div>
          </aside>
        </section>
        </main>
      </div>
    </AuthGuard>
  );
}
