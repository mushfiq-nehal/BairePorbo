"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
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

// ── Dropdown filter component ────────────────────────────────────────────────
function DropdownFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const displayLabel = selected.length > 0 ? `${label} (${selected.length})` : label;

  return (
    <div ref={ref} className={styles.dropdown}>
      <button
        type="button"
        className={`${styles.dropdownTrigger} ${selected.length > 0 ? styles.dropdownTriggerActive : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {displayLabel}
        <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true" aria-label={label}>
          {options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.dropdownOption} ${isSelected ? styles.dropdownOptionSelected : ""}`}
                onClick={() => onChange(toggleSelection(opt, selected))}
              >
                <span className={styles.optionCheck}>
                  {isSelected && (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                      <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function ScholarshipsContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Best match");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(0);

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
    const shouldFocus = searchParams.get("focus") === "1";
    if (shouldFocus) {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

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
        const getTime = (d: string | null) => {
          if (!d) return Infinity;
          const t = new Date(d).getTime();
          return isNaN(t) ? Infinity : t;
        };
        return getTime(a.deadline) - getTime(b.deadline);
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

  const emptySuggestions = useMemo(() => {
    const picks = new Set<string>();
    for (const country of countries.slice(0, 2)) picks.add(country);
    if (levelOptions.includes("Masters")) picks.add("Masters");
    if (levelOptions.includes("PhD")) picks.add("PhD");
    if (fundingOptions.includes("Full")) picks.add("Full funding");
    if (fundingOptions.includes("Partial")) picks.add("Partial funding");
    return Array.from(picks).slice(0, 4);
  }, [countries, levelOptions, fundingOptions]);

  const clearFilters = () => {
    setSearchTerm(""); setSelectedCountries([]); setSelectedFunding([]); setSelectedLevels([]); setSortBy("Best match");
  };

  const hasActiveFilters = searchTerm || selectedCountries.length || selectedFunding.length || selectedLevels.length || sortBy !== "Best match";

  const formatDeadline = (d: string | null) => {
    if (!d) return "Open";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isClosingSoon = (d: string | null) => {
    if (!d) return false;
    const date = new Date(d);
    if (isNaN(date.getTime())) return false;
    const diff = date.getTime() - Date.now();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000;
  };

  const closingSoonCount = useMemo(
    () => filtered.filter((s) => isClosingSoon(s.deadline)).length,
    [filtered],
  );

  // Animated count-up for the snapshot number
  useEffect(() => {
    const target = filtered.length;
    if (target === displayCount) return;
    const step = Math.max(1, Math.ceil(Math.abs(target - displayCount) / 18));
    const id = window.setInterval(() => {
      setDisplayCount((cur) => {
        if (cur === target) return cur;
        if (cur < target) return Math.min(target, cur + step);
        return Math.max(target, cur - step);
      });
    }, 24);
    return () => window.clearInterval(id);
  }, [filtered.length, displayCount]);

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

  const actions: NavAction[] = [
    user
      ? { label: "Sign out", onClick: signOut }
      : { label: "Sign in", href: "/auth/login", variant: "ghost" },
    !user ? { label: "Get started", href: "/auth/signup" } : null,
  ].filter(Boolean) as NavAction[];

  return (
    <div className={styles.page}>
      <AppNavbar actions={actions} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Curated and explained</p>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleFull}>Scholarships filtered for Bangladeshi applicants</span>
              <span className={styles.heroTitleShort} aria-hidden="true">Scholarships</span>
            </h1>
            <p className={styles.subtitle}>
              Use smart filters to surface opportunities that match your GPA, degree level, and funding expectations.
            </p>
          </div>
          <div className={styles.heroPanel}>
            <div className={styles.snapshotHeader}>
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} />
                LIVE
              </span>
              <h3>Search snapshot</h3>
            </div>

            {loading ? (
              <p className={styles.snapshotLine}>
                <span className={styles.shimmerBar} aria-hidden="true" />
                <span className={styles.srOnly}>Loading scholarships…</span>
              </p>
            ) : filtered.length === 0 ? (
              <p className={styles.snapshotLine}>No live scholarships to apply yet.</p>
            ) : (
              <>
                <div className={styles.snapshotCount} aria-live="polite">
                  <span className={styles.countNumber}>{displayCount}</span>
                  <span className={styles.countLabel}>
                    <span>live scholarship{filtered.length !== 1 ? "s" : ""}</span>
                    <em>ready to apply</em>
                  </span>
                </div>
                <div className={styles.snapshotProgress} aria-hidden="true">
                  <span className={styles.snapshotProgressFill} />
                </div>
                {closingSoonCount > 0 && (
                  <p className={styles.urgencyLine}>
                    <span className={styles.urgencyPulse} aria-hidden="true">⚡</span>
                    {closingSoonCount} closing within 60 days — don&apos;t miss out
                  </p>
                )}
              </>
            )}

            {!loading && scholarships.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 8 }}>
                No scholarships published yet. Check back soon!
              </p>
            )}
          </div>
        </section>

        {/* ── Compact filter bar ── */}
        <section className={styles.filterBar}>
          {/* Search */}
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search scholarships…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search scholarships"
              ref={searchInputRef}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className={styles.barDivider} />

          {/* Dropdown filters */}
          {countries.length > 0 && (
            <DropdownFilter
              label="Country"
              options={countries}
              selected={selectedCountries}
              onChange={setSelectedCountries}
            />
          )}
          {fundingOptions.length > 0 && (
            <DropdownFilter
              label="Funding"
              options={fundingOptions}
              selected={selectedFunding}
              onChange={setSelectedFunding}
            />
          )}
          {levelOptions.length > 0 && (
            <DropdownFilter
              label="Level"
              options={levelOptions}
              selected={selectedLevels}
              onChange={setSelectedLevels}
            />
          )}

          {/* Divider */}
          <div className={styles.barDivider} />

          {/* Sort */}
          <div className={styles.sortWrap}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={{ color: "var(--ink-500)", flexShrink: 0 }}>
              <path d="M1 3h11M3 6.5h7M5 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort results"
            >
              <option>Best match</option>
              <option>Deadline</option>
              <option>Funding</option>
            </select>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              Clear
            </button>
          )}
        </section>

        {/* Active filter chips */}
        {(selectedCountries.length > 0 || selectedFunding.length > 0 || selectedLevels.length > 0) && (
          <div className={styles.activeChips}>
            {selectedCountries.map((c) => (
              <span key={c} className={styles.activeChip}>
                {c}
                <button type="button" onClick={() => setSelectedCountries((cur) => cur.filter((v) => v !== c))} aria-label={`Remove ${c}`} className={styles.chipRemove}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </span>
            ))}
            {selectedFunding.map((f) => (
              <span key={f} className={styles.activeChip}>
                {f}
                <button type="button" onClick={() => setSelectedFunding((cur) => cur.filter((v) => v !== f))} aria-label={`Remove ${f}`} className={styles.chipRemove}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </span>
            ))}
            {selectedLevels.map((l) => (
              <span key={l} className={styles.activeChip}>
                {l}
                <button type="button" onClick={() => setSelectedLevels((cur) => cur.filter((v) => v !== l))} aria-label={`Remove ${l}`} className={styles.chipRemove}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </span>
            ))}
            <span className={styles.matchCount}>{filtered.length} match{filtered.length !== 1 ? "es" : ""}</span>
          </div>
        )}

        <section className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2>Results <span className={styles.resultsCount}>{filtered.length}</span></h2>
          </div>

          {loading ? (
            <div className={styles.emptyState}><p>Loading scholarships…</p></div>
          ) : filtered.length ? (
            <div className={styles.cardGrid}>
              {filtered.map((s) => (
                <article key={s.id} className={styles.card}>
                  <Link
                    href={`/scholarships/${s.id}`}
                    className={styles.cardLink}
                    aria-label={`View ${s.title}`}
                  />

                  {s.thumbnail_url && (
                    <img src={s.thumbnail_url} alt="" className={styles.cardThumb} />
                  )}

                  {/* Mobile-only bookmark icon, top-right corner */}
                  <button
                    className={`${styles.bookmarkIcon} ${
                      bookmarkedIds.includes(s.id) ? styles.bookmarkIconActive : ""
                    }`}
                    type="button"
                    onClick={() => toggleBookmark(s.id)}
                    disabled={bookmarkingId === s.id}
                    aria-label={
                      bookmarkedIds.includes(s.id)
                        ? `Remove bookmark for ${s.title}`
                        : `Bookmark ${s.title}`
                    }
                    aria-pressed={bookmarkedIds.includes(s.id)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill={bookmarkedIds.includes(s.id) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>

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
              <p className={styles.emptyHint}>Scholarships you might like:</p>
              {emptySuggestions.length > 0 && (
                <div className={styles.emptySuggestions}>
                  {emptySuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={styles.suggestionPill}
                      onClick={() => setSearchTerm(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <button className={styles.primaryButton} type="button" onClick={clearFilters}>Reset filters</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function ScholarshipsPage() {
  return (
    <Suspense>
      <ScholarshipsContent />
    </Suspense>
  );
}
