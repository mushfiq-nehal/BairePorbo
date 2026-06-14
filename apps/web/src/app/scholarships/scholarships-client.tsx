"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/lang-context";
import type { TranslationKey } from "@/lib/translations";
import AppNavbar, { NavAction } from "@/components/layout/app-navbar";
import styles from "./scholarships.module.css";

type Scholarship = {
  id: string;
  slug: string | null;
  title: string;
  country: string;
  funding_type: string;
  deadline: string | null;
  degree_level: string;
  tags: string[] | null;
  thumbnail_url: string | null;
  competitiveness: string | null;
  is_flagship: boolean;
  is_live: boolean;
  opening_note: string | null;
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

// ── Deadline parser (shared by sort + display) ───────────────────────────────
function parseDeadlineDate(d: string): Date | null {
  const s = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const date = new Date(s);
    return isNaN(date.getTime()) ? null : date;
  }
  const dmy = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dmy) {
    const date = new Date(`${dmy[2]} ${dmy[1]}, ${dmy[3]}`);
    return isNaN(date.getTime()) ? null : date;
  }
  const mdy = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdy) {
    const date = new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

// ── Scholarship card ─────────────────────────────────────────────────────────
function ScholarshipCard({
  s,
  bookmarkedIds,
  bookmarkingId,
  toggleBookmark,
  isExpired,
  isClosingSoon,
  formatDeadline,
  t,
  isUpcoming = false,
  isClosed = false,
}: {
  s: Scholarship;
  bookmarkedIds: string[];
  bookmarkingId: string | null;
  toggleBookmark: (id: string) => void;
  isExpired: (d: string | null) => boolean;
  isClosingSoon: (d: string | null) => boolean;
  formatDeadline: (d: string | null) => string;
  t: (key: TranslationKey) => string;
  isUpcoming?: boolean;
  isClosed?: boolean;
}) {
  const deadlineBadge = () => {
    if (isUpcoming) {
      if (s.opening_note) return `Opens: ${s.opening_note}`;
      return "Opening Soon";
    }
    if (isClosed || isExpired(s.deadline)) return `Closed ${formatDeadline(s.deadline)}`;
    if (isClosingSoon(s.deadline)) return `⚡ ${t("scholarships.deadline")} ${formatDeadline(s.deadline)}`;
    return `${t("scholarships.deadline")} ${formatDeadline(s.deadline)}`;
  };

  const deadlineClass = () => {
    if (isUpcoming) return styles.deadlineUpcoming;
    if (isClosed || isExpired(s.deadline)) return styles.deadlineClosed;
    if (isClosingSoon(s.deadline)) return styles.deadlineSoon;
    return "";
  };

  return (
    <article className={`${styles.card} ${s.is_flagship ? styles.cardFlagship : ""} ${isUpcoming ? styles.cardUpcoming : ""} ${isClosed ? styles.cardClosed : ""}`}>
      <Link
        href={`/scholarships/${s.slug ?? s.id}`}
        className={styles.cardLink}
        aria-label={`View ${s.title}`}
      />

      {s.thumbnail_url ? (
        <div className={styles.thumbWrap}>
          <Image
            src={s.thumbnail_url}
            alt=""
            className={styles.cardThumb}
            width={640}
            height={360}
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {s.is_flagship && (
            <span className={styles.flagshipBadge} aria-label={t("scholarships.featured")}>
              {t("scholarships.featured")}
            </span>
          )}
          {isUpcoming && (
            <span className={styles.upcomingBadge} aria-label="Opening Soon">Opening Soon</span>
          )}
          {isClosed && (
            <span className={styles.closedBadge} aria-label="Closed">Closed</span>
          )}
        </div>
      ) : s.is_flagship ? (
        <span className={styles.flagshipBadgeCorner} aria-label={t("scholarships.featured")}>
          {t("scholarships.featured")}
        </span>
      ) : null}

      <button
        className={`${styles.bookmarkIcon} ${bookmarkedIds.includes(s.id) ? styles.bookmarkIconActive : ""}`}
        type="button"
        onClick={() => toggleBookmark(s.id)}
        disabled={bookmarkingId === s.id}
        aria-label={bookmarkedIds.includes(s.id) ? `Remove bookmark for ${s.title}` : `Bookmark ${s.title}`}
        aria-pressed={bookmarkedIds.includes(s.id)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarkedIds.includes(s.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardLabel}>{s.country}</p>
          <h3>{s.title}</h3>
          <p className={styles.cardMeta}>
            {LEVEL_MAP[s.degree_level] ?? s.degree_level} · {FUNDING_MAP[s.funding_type] ?? s.funding_type} {t("scholarships.fundingLabel")}
          </p>
        </div>
        <span className={`${styles.deadline} ${deadlineClass()}`}>{deadlineBadge()}</span>
      </div>

      {s.tags && s.tags.length > 0 && (
        <div className={styles.tagRow}>
          {s.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      )}

      <div className={styles.cardActions}>
        <Link className={styles.primaryButton} href={`/scholarships/${s.slug ?? s.id}`}>
          {t("scholarships.viewDetails")}
        </Link>
        <button
          className={`${styles.secondaryButton} ${bookmarkedIds.includes(s.id) ? styles.bookmarkActive : ""}`}
          type="button"
          onClick={() => toggleBookmark(s.id)}
          disabled={bookmarkingId === s.id}
        >
          {bookmarkedIds.includes(s.id) ? t("scholarships.bookmarked") : t("scholarships.bookmark")}
        </button>
      </div>
    </article>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function ScholarshipsContent() {
  const { userId, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Deadline");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    fetch("/api/scholarships")
      .then((r) => r.json())
      .then(({ scholarships: data }: { scholarships: Scholarship[] }) => {
        setScholarships(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const shouldFocus = searchParams.get("focus") === "1";
    if (shouldFocus) {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!userId) {
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
  }, [userId]);

  // Derive filter options from real data
  const countries = useMemo(() => [...new Set(scholarships.map((s) => s.country))].sort(), [scholarships]);
  const fundingOptions = useMemo(() => [...new Set(scholarships.map((s) => FUNDING_MAP[s.funding_type] ?? s.funding_type))].sort(), [scholarships]);
  const levelOptions = useMemo(() => [...new Set(scholarships.map((s) => LEVEL_MAP[s.degree_level] ?? s.degree_level))].sort(), [scholarships]);

  const applyFiltersAndSort = (list: Scholarship[]) => {
    const q = searchTerm.trim().toLowerCase();
    let result = list.filter((s) => {
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
      const now = Date.now();
      const bucket = (d: string | null) => {
        if (!d) return 1;
        const parsed = parseDeadlineDate(d);
        if (!parsed) return 1;
        return parsed.getTime() > now ? 0 : 2;
      };
      result = [...result].sort((a, b) => {
        const ba = bucket(a.deadline), bb = bucket(b.deadline);
        if (ba !== bb) return ba - bb;
        const ta = a.deadline ? (parseDeadlineDate(a.deadline)?.getTime() ?? Infinity) : Infinity;
        const tb = b.deadline ? (parseDeadlineDate(b.deadline)?.getTime() ?? Infinity) : Infinity;
        return ta - tb;
      });
    }
    if (sortBy === "Funding") {
      result = [...result].sort((a, b) => {
        const pa = FUNDING_PRIORITY[FUNDING_MAP[a.funding_type]] ?? 99;
        const pb = FUNDING_PRIORITY[FUNDING_MAP[b.funding_type]] ?? 99;
        return pa - pb;
      });
    }

    result = [...result].sort((a, b) => {
      if (a.is_flagship === b.is_flagship) return 0;
      return a.is_flagship ? -1 : 1;
    });

    return result;
  };

  const filtered = useMemo(() => {
    return applyFiltersAndSort(scholarships);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scholarships, searchTerm, selectedCountries, selectedFunding, selectedLevels, sortBy]);

  // Live = is_live true AND deadline not expired (or no parseable deadline)
  const filteredLive = useMemo(() => applyFiltersAndSort(
    scholarships.filter((s) => s.is_live !== false && !isExpired(s.deadline))
  ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [scholarships, searchTerm, selectedCountries, selectedFunding, selectedLevels, sortBy]);

  const filteredUpcoming = useMemo(() => applyFiltersAndSort(scholarships.filter((s) => s.is_live === false)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [scholarships, searchTerm, selectedCountries, selectedFunding, selectedLevels, sortBy]);

  // Recently closed = is_live true but deadline has passed (within ~90 days)
  const filteredRecentlyClosed = useMemo(() => applyFiltersAndSort(
    scholarships.filter((s) => {
      if (s.is_live === false) return false;
      const date = s.deadline ? parseDeadlineDate(s.deadline) : null;
      if (!date) return false;
      const msSince = Date.now() - date.getTime();
      return msSince > 0 && msSince < 90 * 24 * 60 * 60 * 1000;
    })
  ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [scholarships, searchTerm, selectedCountries, selectedFunding, selectedLevels, sortBy]);

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
    setSearchTerm(""); setSelectedCountries([]); setSelectedFunding([]); setSelectedLevels([]); setSortBy("Deadline");
  };

  const hasActiveFilters = searchTerm || selectedCountries.length || selectedFunding.length || selectedLevels.length || sortBy !== "Deadline";


  const formatDeadline = (d: string | null) => {
    if (!d) return "Open";
    const date = parseDeadlineDate(d);
    if (date) return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return d; // free-text like "early 2027", "1 Aug – 1 Oct"
  };

  const isClosingSoon = (d: string | null) => {
    if (!d) return false;
    const date = parseDeadlineDate(d);
    if (!date) return false;
    const diff = date.getTime() - Date.now();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (d: string | null) => {
    if (!d) return false;
    const date = parseDeadlineDate(d);
    return date ? date.getTime() < Date.now() : false;
  };

  const closingSoonCount = useMemo(
    () => filteredLive.filter((s) => isClosingSoon(s.deadline)).length,
    [filteredLive],
  );

  // Animated count-up for the snapshot number (total tracked, not just live)
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
    if (!userId) {
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
    userId
      ? { label: t("nav.signOut"), onClick: signOut }
      : { label: t("nav.signIn"), href: "/auth/login", variant: "ghost" },
    !userId ? { label: t("nav.getStarted"), href: "/auth/signup" } : null,
  ].filter(Boolean) as NavAction[];

  return (
    <div className={styles.page}>
      <AppNavbar actions={actions} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>{t("scholarships.kicker")}</p>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleFull}>{t("scholarships.heroTitle")}</span>
              <span className={styles.heroTitleShort} aria-hidden="true">Scholarships</span>
            </h1>
            <p className={styles.subtitle}>{t("scholarships.heroSubtitle")}</p>
          </div>
          <div className={styles.heroPanel}>
            <div className={styles.snapshotHeader}>
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} />
                LIVE
              </span>
              <h3>{t("scholarships.searchSnapshot")}</h3>
            </div>

            {loading ? (
              <p className={styles.snapshotLine}>
                <span className={styles.shimmerBar} aria-hidden="true" />
                <span className={styles.srOnly}>{t("scholarships.loading")}</span>
              </p>
            ) : scholarships.length === 0 ? (
              <p className={styles.snapshotLine}>{t("scholarships.nonePublished")}</p>
            ) : (
              <>
                <div className={styles.snapshotCount} aria-live="polite">
                  <span className={styles.countNumber}>{displayCount}</span>
                  <span className={styles.countLabel}>
                    <span>scholarships tracked</span>
                    <em>{filteredLive.length} open now · {filteredUpcoming.length} opening soon</em>
                  </span>
                </div>
                <div className={styles.snapshotProgress} aria-hidden="true">
                  <span className={styles.snapshotProgressFill} />
                </div>
                {closingSoonCount > 0 && (
                  <p className={styles.urgencyLine}>
                    <span className={styles.urgencyPulse} aria-hidden="true">⚡</span>
                    {closingSoonCount} {t("scholarships.closingIn60")}
                  </p>
                )}
              </>
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
              placeholder={t("scholarships.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t("scholarships.searchAriaLabel")}
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
              label={t("scholarships.country")}
              options={countries}
              selected={selectedCountries}
              onChange={setSelectedCountries}
            />
          )}
          {fundingOptions.length > 0 && (
            <DropdownFilter
              label={t("scholarships.funding")}
              options={fundingOptions}
              selected={selectedFunding}
              onChange={setSelectedFunding}
            />
          )}
          {levelOptions.length > 0 && (
            <DropdownFilter
              label={t("scholarships.level")}
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
              aria-label={t("scholarships.sortResults")}
            >
              <option value="Best match">{t("scholarships.bestMatch")}</option>
              <option value="Deadline">{t("scholarships.deadline")}</option>
              <option value="Funding">{t("scholarships.funding")}</option>
            </select>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              {t("scholarships.clear")}
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
            <span className={styles.matchCount}>{filtered.length} {filtered.length !== 1 ? t("scholarships.matches") : t("scholarships.match")}</span>
          </div>
        )}

        {/* ── Live Scholarships Section ── */}
        <section className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2>
              <span className={styles.sectionLiveDot} aria-hidden="true" />
              Open Now
              <span className={styles.resultsCount}>{filteredLive.length}</span>
            </h2>
            <p className={styles.sectionSubtitle}>Applications are currently open — apply before the deadline</p>
          </div>

          {loading ? (
            <div className={styles.emptyState}><p>{t("scholarships.loading")}</p></div>
          ) : filteredLive.length ? (
            <div className={styles.cardGrid}>
              {filteredLive.map((s) => (
                <ScholarshipCard
                  key={s.id}
                  s={s}
                  bookmarkedIds={bookmarkedIds}
                  bookmarkingId={bookmarkingId}
                  toggleBookmark={toggleBookmark}
                  isExpired={isExpired}
                  isClosingSoon={isClosingSoon}
                  formatDeadline={formatDeadline}
                  t={t}
                />
              ))}
            </div>
          ) : !loading && scholarships.length > 0 ? (
            <div className={styles.emptyState}>
              <p>{t("scholarships.noMatch")}</p>
              <p className={styles.emptyHint}>{t("scholarships.youMightLike")}</p>
              {emptySuggestions.length > 0 && (
                <div className={styles.emptySuggestions}>
                  {emptySuggestions.map((sug) => (
                    <button key={sug} type="button" className={styles.suggestionPill} onClick={() => setSearchTerm(sug)}>{sug}</button>
                  ))}
                </div>
              )}
              <button className={styles.primaryButton} type="button" onClick={clearFilters}>{t("scholarships.resetFilters")}</button>
            </div>
          ) : null}
        </section>

        {/* ── Upcoming / Opening Soon Section ── */}
        {!loading && filteredUpcoming.length > 0 && (
          <section className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2>
                <span className={styles.sectionUpcomingDot} aria-hidden="true" />
                Opening Soon
                <span className={styles.resultsCount}>{filteredUpcoming.length}</span>
              </h2>
              <p className={styles.sectionSubtitle}>Not yet open — bookmark now and prepare early</p>
            </div>
            <div className={styles.cardGrid}>
              {filteredUpcoming.map((s) => (
                <ScholarshipCard
                  key={s.id}
                  s={s}
                  bookmarkedIds={bookmarkedIds}
                  bookmarkingId={bookmarkingId}
                  toggleBookmark={toggleBookmark}
                  isExpired={isExpired}
                  isClosingSoon={isClosingSoon}
                  formatDeadline={formatDeadline}
                  t={t}
                  isUpcoming
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Recently Closed Section ── */}
        {!loading && filteredRecentlyClosed.length > 0 && (
          <section className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2>
                <span className={styles.sectionClosedDot} aria-hidden="true" />
                Recently Closed
                <span className={styles.resultsCount}>{filteredRecentlyClosed.length}</span>
              </h2>
              <p className={styles.sectionSubtitle}>Deadline passed — these typically recur annually, bookmark to catch next cycle</p>
            </div>
            <div className={styles.cardGrid}>
              {filteredRecentlyClosed.map((s) => (
                <ScholarshipCard
                  key={s.id}
                  s={s}
                  bookmarkedIds={bookmarkedIds}
                  bookmarkingId={bookmarkingId}
                  toggleBookmark={toggleBookmark}
                  isExpired={isExpired}
                  isClosingSoon={isClosingSoon}
                  formatDeadline={formatDeadline}
                  t={t}
                  isClosed
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state when no results anywhere */}
        {!loading && filteredLive.length === 0 && filteredUpcoming.length === 0 && filteredRecentlyClosed.length === 0 && scholarships.length === 0 && (
          <div className={styles.emptyState}>
            <p>{t("scholarships.nonePublished")}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ScholarshipsClient() {
  return (
    <Suspense>
      <ScholarshipsContent />
    </Suspense>
  );
}
