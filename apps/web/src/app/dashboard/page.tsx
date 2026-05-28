"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth";
import AppNavbar from "@/components/layout/app-navbar";
import styles from "./dashboard.module.css";

type Scholarship = {
  id: string;
  title: string;
  country: string;
  deadline: string | null;
  funding_type: string;
  competitiveness: string | null;
  thumbnail_url: string | null;
  degree_level: string | null;
};

type DashboardData = {
  user: { name: string; email: string };
  stats: {
    readiness: number;
    bookmarksCount: number;
    missingFields: string[];
    newScholarshipsCount: number;
  };
  bookmarks: Scholarship[];
  bookmarksClosingSoon: Scholarship[];
  lastSession: {
    id: string;
    title: string;
    updated_at: string;
    preview: string | null;
  } | null;
};

const MATCH_CACHE_KEY = "bp_dashboard_matches";
const MATCH_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

const greetingFor = (date = new Date()) => {
  const h = date.getHours();
  if (h < 5) return "Hello";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const daysRemaining = (deadline: string | null): number | null => {
  if (!deadline) return null;
  const t = new Date(deadline).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
};

const formatDeadlineShort = (deadline: string | null) => {
  if (!deadline) return "Open";
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const relative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function DashboardPage() {
  const { signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [matches, setMatches] = useState<Scholarship[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Mobile-only segmented tab — desktop ignores this.
  type MobileTab = "today" | "bookmarks" | "profile";
  const [mobileTab, setMobileTab] = useState<MobileTab>("today");

  // ── Load dashboard data ──
  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json: DashboardData | { error: string }) => {
        if ("error" in json) {
          setLoading(false);
          return;
        }
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Auto-run AI Match (cached for 1h client-side) ──
  useEffect(() => {
    if (!data) return;
    if (data.stats.readiness < 20) return; // don't bother on near-empty profiles

    // Try local cache first
    try {
      const raw = localStorage.getItem(MATCH_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; matches: Scholarship[] };
        if (parsed.at && Date.now() - parsed.at < MATCH_CACHE_TTL_MS) {
          setMatches(parsed.matches);
          return;
        }
      }
    } catch {
      // ignore
    }

    let cancelled = false;
    setMatchesLoading(true);
    fetch("/api/profile/match")
      .then(async (res) => {
        const json = (await res.json()) as { matches?: Scholarship[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setMatchError(json.error ?? "Couldn't fetch matches.");
          setMatches([]);
        } else {
          const top = (json.matches ?? []).slice(0, 6);
          setMatches(top);
          try {
            localStorage.setItem(
              MATCH_CACHE_KEY,
              JSON.stringify({ at: Date.now(), matches: top }),
            );
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMatchError("Couldn't fetch matches.");
      })
      .finally(() => {
        if (!cancelled) setMatchesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  const refreshMatches = async () => {
    setMatchesLoading(true);
    setMatchError(null);
    try {
      const res = await fetch("/api/profile/match");
      const json = (await res.json()) as { matches?: Scholarship[]; error?: string };
      if (!res.ok) {
        setMatchError(json.error ?? "Couldn't fetch matches.");
      } else {
        const top = (json.matches ?? []).slice(0, 6);
        setMatches(top);
        try {
          localStorage.setItem(
            MATCH_CACHE_KEY,
            JSON.stringify({ at: Date.now(), matches: top }),
          );
        } catch {
          // ignore
        }
      }
    } catch {
      setMatchError("Couldn't fetch matches.");
    } finally {
      setMatchesLoading(false);
    }
  };

  // ── Hero "next action" priority ──
  const nextAction = useMemo(() => {
    if (!data) return null;

    const closingThisWeek = data.bookmarksClosingSoon.filter((s) => {
      const d = daysRemaining(s.deadline);
      return d !== null && d >= 0 && d <= 7;
    });

    if (closingThisWeek.length > 0) {
      return {
        kind: "urgent" as const,
        title:
          closingThisWeek.length === 1
            ? "1 bookmarked scholarship closes this week"
            : `${closingThisWeek.length} bookmarked scholarships close this week`,
        description: "Time to finalise your applications. Open them and check what's left.",
        ctaLabel: "Review now",
        ctaHref: `/scholarships/${closingThisWeek[0].id}`,
      };
    }

    if (data.stats.readiness < 50) {
      return {
        kind: "profile" as const,
        title: "Complete your profile to unlock better matches",
        description: `You're ${data.stats.readiness}% there. The more we know, the more accurate the AI matches.`,
        ctaLabel: "Update profile",
        ctaHref: "/profile",
      };
    }

    if (data.stats.bookmarksCount === 0) {
      return {
        kind: "explore" as const,
        title: "Find your first scholarship match",
        description: "Browse the catalog or chat with the mentor to discover where you'd qualify.",
        ctaLabel: "Browse scholarships",
        ctaHref: "/scholarships",
      };
    }

    if (data.stats.newScholarshipsCount > 0) {
      return {
        kind: "fresh" as const,
        title:
          data.stats.newScholarshipsCount === 1
            ? "1 new scholarship added this week"
            : `${data.stats.newScholarshipsCount} new scholarships added this week`,
        description: "Worth a quick look — they might fit your profile.",
        ctaLabel: "See what's new",
        ctaHref: "/scholarships",
      };
    }

    return {
      kind: "default" as const,
      title: "You're all caught up",
      description: "Keep refining your profile and ask the mentor when something comes to mind.",
      ctaLabel: "Open mentor",
      ctaHref: "/chat",
    };
  }, [data]);

  if (loading || !data) {
    return (
      <AuthGuard>
        <div className={styles.page}>
          <AppNavbar actions={[{ label: "Sign out", onClick: signOut }]} />
          <main className={styles.main}>
            <div className={styles.skeletonHero}>
              <div className={styles.skeletonLine} style={{ width: "60px", height: "12px" }} />
              <div className={styles.skeletonLine} style={{ width: "200px", height: "36px" }} />
            </div>
            <div className={styles.skeletonCard} style={{ height: "110px" }} />
            <div className={styles.row}>
              <div className={styles.skeletonCard} style={{ height: "260px" }} />
              <div className={styles.skeletonCard} style={{ height: "260px" }} />
            </div>
            <div className={styles.row}>
              <div className={styles.skeletonCard} style={{ height: "130px" }} />
              <div className={styles.skeletonCard} style={{ height: "130px" }} />
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className={styles.page}>
        <AppNavbar actions={[{ label: "Sign out", onClick: signOut }]} />

        <main className={styles.main} data-mobile-tab={mobileTab}>
          {/* ── Hero: greeting + next action ── */}
          <section className={styles.heroStrip}>
            <div className={styles.heroIntro}>
              <p className={styles.kicker}>{greetingFor()}</p>
              <h1>{data.user.name}</h1>
            </div>

            {nextAction && (
              <div className={`${styles.actionCard} ${styles[`action_${nextAction.kind}`]}`}>
                <div className={styles.actionBody}>
                  <p className={styles.actionLabel}>What to do next</p>
                  <h2>{nextAction.title}</h2>
                  <p>{nextAction.description}</p>
                </div>
                <Link href={nextAction.ctaHref} className={styles.actionCta}>
                  {nextAction.ctaLabel} →
                </Link>
              </div>
            )}
          </section>

          {/* Mobile-only segmented control — desktop hides this and shows all sections */}
          <nav
            className={styles.mobileTabs}
            role="tablist"
            aria-label="Dashboard sections"
          >
            {(
              [
                { id: "today" as const, label: "Today" },
                { id: "bookmarks" as const, label: "Bookmarks" },
                { id: "profile" as const, label: "Profile" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={mobileTab === t.id}
                className={`${styles.mobileTabsButton} ${
                  mobileTab === t.id ? styles.mobileTabsButtonActive : ""
                }`}
                onClick={() => setMobileTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* ── AI picks + bookmarks closing soon ── */}
          <section className={styles.row} data-mobile-section="today">
            {/* AI Match */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kickerLight}>For you</p>
                  <h3>AI scholarship picks</h3>
                </div>
                <button
                  type="button"
                  onClick={refreshMatches}
                  className={styles.linkButton}
                  disabled={matchesLoading}
                >
                  {matchesLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {matchesLoading && matches.length === 0 ? (
                <p className={styles.muted}>Analysing your profile…</p>
              ) : matchError ? (
                <div className={styles.matchEmpty}>
                  <p>{matchError}</p>
                  {data.stats.readiness < 30 && (
                    <Link href="/profile" className={styles.linkInline}>
                      Update your profile to improve matches →
                    </Link>
                  )}
                </div>
              ) : matches.length === 0 ? (
                <div className={styles.matchEmpty}>
                  <p>No matches yet. A more complete profile gives better suggestions.</p>
                  <Link href="/profile" className={styles.linkInline}>
                    Update profile →
                  </Link>
                </div>
              ) : (
                <ul className={styles.matchList}>
                  {matches.slice(0, 4).map((m) => (
                    <li key={m.id}>
                      <Link href={`/scholarships/${m.id}`} className={styles.matchItem}>
                        <div className={styles.matchThumb}>
                          {m.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.thumbnail_url} alt="" />
                          ) : (
                            <span aria-hidden="true">🎓</span>
                          )}
                        </div>
                        <div className={styles.matchBody}>
                          <h4>{m.title}</h4>
                          <p>
                            {m.country}
                            {m.funding_type ? ` · ${m.funding_type}` : ""}
                            {m.deadline ? ` · Deadline ${formatDeadlineShort(m.deadline)}` : ""}
                          </p>
                        </div>
                        <span className={styles.matchArrow} aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Closing soon (from bookmarks) */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kickerLight}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    Closing soon
                  </p>
                  <h3>Bookmarks with deadlines</h3>
                </div>
                <Link href="/scholarships?sort=deadline" className={styles.linkButton}>
                  See all
                </Link>
              </div>

              {data.bookmarksClosingSoon.length === 0 ? (
                <div className={styles.matchEmpty}>
                  <p>
                    Nothing closing in the next 30 days from your bookmarks. Bookmark a few
                    on the{" "}
                    <Link href="/scholarships" className={styles.linkInline}>
                      scholarships page
                    </Link>{" "}
                    to track deadlines here.
                  </p>
                </div>
              ) : (
                <ul className={styles.deadlineList}>
                  {data.bookmarksClosingSoon.map((s) => {
                    const d = daysRemaining(s.deadline);
                    const urgent = d !== null && d >= 0 && d <= 7;
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/scholarships/${s.id}`}
                          className={`${styles.deadlineItem} ${urgent ? styles.deadlineItemUrgent : ""}`}
                        >
                          <div>
                            <h4>{s.title}</h4>
                            <p>
                              {s.country}
                              {s.degree_level ? ` · ${s.degree_level}` : ""}
                            </p>
                          </div>
                          <span className={styles.deadlineBadge}>
                            {d === null ? "Open" : d < 0 ? "Closed" : `${d}d left`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* ── Profile completeness + Resume chat ── */}
          <section className={styles.row} data-mobile-section="profile">
            {/* Profile completeness */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kickerLight}>Your profile</p>
                  <h3>{data.stats.readiness}% complete</h3>
                </div>
              </div>
              <div className={styles.progressTrack} aria-hidden="true">
                <span
                  className={styles.progressFill}
                  style={{ width: `${Math.max(4, data.stats.readiness)}%` }}
                />
              </div>
              {data.stats.missingFields.length > 0 ? (
                <p className={styles.muted}>
                  Still missing:{" "}
                  <strong>{data.stats.missingFields.slice(0, 3).join(", ")}</strong>
                  {data.stats.missingFields.length > 3
                    ? ` (+${data.stats.missingFields.length - 3} more)`
                    : ""}
                </p>
              ) : (
                <p className={styles.muted}>All set. Refresh AI matches to see new picks.</p>
              )}
              <Link href="/profile" className={styles.profileCta}>
                {data.stats.readiness === 100
                  ? "Edit profile"
                  : data.stats.readiness === 0
                    ? "Set up your profile →"
                    : "Complete your profile →"}
              </Link>
            </div>

            {/* Continue chat */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kickerLight}>Mentor</p>
                  <h3>Continue chatting</h3>
                </div>
                <Link href="/chat" className={styles.linkButton}>
                  Open
                </Link>
              </div>

              {data.lastSession ? (
                <Link
                  href={`/chat?session=${data.lastSession.id}`}
                  className={styles.lastSessionItem}
                >
                  <div>
                    <h4>{data.lastSession.title || "Untitled chat"}</h4>
                    {data.lastSession.preview && (
                      <p className={styles.lastSessionPreview}>
                        {data.lastSession.preview}
                        {data.lastSession.preview.length >= 120 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <span className={styles.muted}>
                    {relative(data.lastSession.updated_at)}
                  </span>
                </Link>
              ) : (
                <div className={styles.matchEmpty}>
                  <p>No chats yet. Ask the mentor anything about scholarships.</p>
                  <Link href="/chat" className={styles.linkInline}>
                    Start chatting →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ── All bookmarks (collapsed) ── */}
          {data.bookmarks.length > 0 && (
            <section className={styles.panel} data-mobile-section="bookmarks">
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kickerLight}>Saved</p>
                  <h3>All bookmarks ({data.bookmarks.length})</h3>
                </div>
              </div>

              <ul className={styles.bookmarkGrid}>
                {data.bookmarks.map((s) => (
                  <li key={s.id}>
                    <Link href={`/scholarships/${s.id}`} className={styles.bookmarkCard}>
                      <h4>{s.title}</h4>
                      <p className={styles.bookmarkMeta}>
                        <span>{s.country}</span>
                        {s.deadline && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Deadline {formatDeadlineShort(s.deadline)}</span>
                          </>
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
