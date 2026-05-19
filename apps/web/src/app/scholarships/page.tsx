"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/lib/auth";
import AppNavbar, { NavAction } from "@/components/layout/app-navbar";
import styles from "./scholarships.module.css";

type Scholarship = {
  id: string;
  title: string;
  country: string;
  funding_type: string;
  deadline: string | null;
  degree_level: string;
  tags: string[] | null;
  thumbnail_url: string | null;
  competitiveness: string | null;
};

const FUNDING_MAP: Record<string, string> = {
  full: "Full",
  partial: "Partial",
  tuition_only: "Tuition",
  stipend: "Stipend",
  other: "Other",
};

const LEVEL_MAP: Record<string, string> = {
  bachelors: "Bachelors",
  masters: "Masters",
  phd: "PhD",
  postdoc: "Postdoc",
  any: "Any",
};

const FUNDING_PRIORITY: Record<string, number> = {
  Full: 1, Partial: 2, Tuition: 3, Stipend: 4,
};

const toggleSelection = (value: string, current: string[]) =>
  current.includes(value) ? current.filter((i) => i !== value) : [...current, value];

export default function ScholarshipsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Best match");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("scholarships")
      .select("id, title, country, funding_type, deadline, degree_level, tags, thumbnail_url, competitiveness")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setScholarships(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setBookmarkedIds([]);
      return;
    }
    fetch("/api/bookmarks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { bookmarks?: { scholarship_id: string }[] } | null) => {
        const ids = data?.bookmarks?.map((b) => b.scholarship_id) ?? [];
        setBookmarkedIds(ids);
      })
      .catch(() => setBookmarkedIds([]));
  }, [user]);

  // Derive filter options from real data
  const countries = useMemo(() => [...new Set(scholarships.map((s) => s.country))].sort(), [scholarships]);
  const fundingOptions = useMemo(() => [...new Set(scholarships.map((s) => FUNDING_MAP[s.funding_type] ?? s.funding_type))].sort(), [scholarships]);
  const levelOptions = useMemo(() => [...new Set(scholarships.map((s) => LEVEL_MAP[s.degree_level] ?? s.degree_level))].sort(), [scholarships]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let result = scholarships.filter((s) => {
      if (selectedCountries.length && !selectedCountries.includes(s.country)) return false;
      const fundLabel = FUNDING_MAP[s.funding_type] ?? s.funding_type;
      if (selectedFunding.length && !selectedFunding.includes(fundLabel)) return false;
      const levelLabel = LEVEL_MAP[s.degree_level] ?? s.degree_level;
      if (selectedLevels.length && !selectedLevels.includes(levelLabel)) return false;
      if (!q) return true;
      const haystack = [s.title, s.country, fundLabel, levelLabel, ...(s.tags ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });

    if (sortBy === "Deadline") {
      result = [...result].sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    }
    if (sortBy === "Funding") {
      result = [...result].sort((a, b) => {
        const pa = FUNDING_PRIORITY[FUNDING_MAP[a.funding_type]] ?? 99;
        const pb = FUNDING_PRIORITY[FUNDING_MAP[b.funding_type]] ?? 99;
        return pa - pb;
      });
    }
    return result;
  }, [scholarships, searchTerm, selectedCountries, selectedFunding, selectedLevels, sortBy]);

  const clearFilters = () => {
    setSearchTerm(""); setSelectedCountries([]); setSelectedFunding([]); setSelectedLevels([]); setSortBy("Best match");
  };

  const formatDeadline = (d: string | null) => {
    if (!d) return "Open";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isClosingSoon = (d: string | null) => {
    if (!d) return false;
    return (new Date(d).getTime() - Date.now()) < 60 * 24 * 60 * 60 * 1000; // 60 days
  };

  const toggleBookmark = async (id: string) => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setBookmarkingId(id);
    const isBookmarked = bookmarkedIds.includes(id);
    try {
      const res = await fetch("/api/bookmarks", {
        method: isBookmarked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholarship_id: id }),
      });
      if (res.ok) {
        setBookmarkedIds((prev) =>
          isBookmarked ? prev.filter((item) => item !== id) : [...prev, id]
        );
      }
    } finally {
      setBookmarkingId(null);
    }
  };

  const actions: NavAction[] = user
    ? [{ label: "Sign out", onClick: signOut }]
    : [{ label: "Sign in", href: "/auth/login" }];

  return (
    <div className={styles.page}>
      <AppNavbar actions={actions} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Curated and explained</p>
            <h1>Scholarships filtered for Bangladeshi applicants</h1>
            <p className={styles.subtitle}>
              Use smart filters to surface opportunities that match your GPA, degree level, and funding expectations.
            </p>
          </div>
          <div className={styles.heroPanel}>
            <h3>Search snapshot</h3>
            <p>
              {loading
                ? "Loading scholarships…"
                : `${scholarships.length} published scholarship${scholarships.length !== 1 ? "s" : ""}, ${filtered.length} matching your filters.`}
            </p>
            {!loading && scholarships.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 8 }}>
                No scholarships published yet. Check back soon!
              </p>
            )}
          </div>
        </section>

        <section className={styles.filters}>
          <div className={styles.searchBox}>
            <label>
              Search
              <input
                type="text"
                placeholder="Try: data science, Germany, DAAD"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.filterGrid}>
            {countries.length > 0 && (
              <div>
                <h4>Country</h4>
                <div className={styles.filterGroup}>
                  {countries.map((c) => (
                    <label key={c} className={styles.filterItem}>
                      <input type="checkbox" checked={selectedCountries.includes(c)}
                        onChange={() => setSelectedCountries((cur) => toggleSelection(c, cur))} />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {fundingOptions.length > 0 && (
              <div>
                <h4>Funding</h4>
                <div className={styles.filterGroup}>
                  {fundingOptions.map((f) => (
                    <label key={f} className={styles.filterItem}>
                      <input type="checkbox" checked={selectedFunding.includes(f)}
                        onChange={() => setSelectedFunding((cur) => toggleSelection(f, cur))} />
                      <span>{f}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {levelOptions.length > 0 && (
              <div>
                <h4>Level</h4>
                <div className={styles.filterGroup}>
                  {levelOptions.map((l) => (
                    <label key={l} className={styles.filterItem}>
                      <input type="checkbox" checked={selectedLevels.includes(l)}
                        onChange={() => setSelectedLevels((cur) => toggleSelection(l, cur))} />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.filterFooter}>
            <span className={styles.resultsMeta}>{filtered.length} match{filtered.length !== 1 ? "es" : ""}</span>
            <button className={styles.ghostButton} type="button" onClick={clearFilters}>Clear all</button>
          </div>
        </section>

        <section className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2>Results</h2>
            <div className={styles.sortRow}>
              <label>
                Sort by
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option>Best match</option>
                  <option>Deadline</option>
                  <option>Funding</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className={styles.emptyState}><p>Loading scholarships…</p></div>
          ) : filtered.length ? (
            <div className={styles.cardGrid}>
              {filtered.map((s) => (
                <article key={s.id} className={styles.card}>
                  {s.thumbnail_url && (
                    <img src={s.thumbnail_url} alt={s.title} className={styles.cardThumb} />
                  )}
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.cardLabel}>{s.country}</p>
                      <h3>{s.title}</h3>
                      <p className={styles.cardMeta}>
                        {LEVEL_MAP[s.degree_level] ?? s.degree_level} · {FUNDING_MAP[s.funding_type] ?? s.funding_type} funding
                      </p>
                    </div>
                    <span className={`${styles.deadline} ${isClosingSoon(s.deadline) ? styles.deadlineSoon : ""}`}>
                      {isClosingSoon(s.deadline) ? "⚡ " : ""}Deadline {formatDeadline(s.deadline)}
                    </span>
                  </div>
                  {s.tags && s.tags.length > 0 && (
                    <div className={styles.tagRow}>
                      {s.tags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  )}
                  <div className={styles.cardActions}>
                    <Link className={styles.primaryButton} href={`/scholarships/${s.id}`}>
                      View details
                    </Link>
                    <button
                      className={`${styles.secondaryButton} ${
                        bookmarkedIds.includes(s.id) ? styles.bookmarkActive : ""
                      }`}
                      type="button"
                      onClick={() => toggleBookmark(s.id)}
                      disabled={bookmarkingId === s.id}
                    >
                      {bookmarkedIds.includes(s.id) ? "Bookmarked" : "Bookmark"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No scholarships match those filters yet.</p>
              <button className={styles.primaryButton} type="button" onClick={clearFilters}>Reset filters</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
