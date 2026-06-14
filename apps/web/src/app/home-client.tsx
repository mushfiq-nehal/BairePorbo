"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/lang-context";
import AppNavbar, { NavAction } from "@/components/layout/app-navbar";
import SharedFooter from "@/components/layout/shared-footer";
import { guides as staticGuides } from "./guide/data/index";
import type { Guide } from "./guide/data/types";
import styles from "./page.module.css";

type ClosingScholarship = {
  id: string;
  slug: string | null;
  title: string;
  country: string;
  deadline: string | null;
};

export default function HomeClient() {
  const { userId, loading, signOut } = useAuth();
  const router = useRouter();
  const t = useT();

  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ scholarships: 0, countries: 0 });
  const [closingSoon, setClosingSoon] = useState<ClosingScholarship[]>([]);
  const [quickTags, setQuickTags] = useState<string[]>([]);
  const [featuredGuides, setFeaturedGuides] = useState<Guide[]>(staticGuides.slice(0, 3));

  useEffect(() => {
    fetch("/api/guides")
      .then((r) => r.json())
      .then(({ guides: dbGuideRows }: { guides: Record<string, unknown>[] }) => {
        if (!dbGuideRows?.length) return;
        const dbGuides: Guide[] = dbGuideRows.map((g) => ({
          slug: g.slug as string,
          title: g.title as string,
          description: g.description as string,
          category: g.category as Guide["category"],
          tags: (g.tags as string[]) ?? [],
          intro: g.intro as string,
          faqs: Array.isArray(g.faqs) ? g.faqs as Guide["faqs"] : [],
          publishedAt: (g.published_at as string) ?? (g.updated_at as string) ?? "",
          updatedAt: (g.updated_at as string) ?? "",
        }));
        const dbSlugs = new Set(dbGuides.map((g) => g.slug));
        setFeaturedGuides([...dbGuides, ...staticGuides.filter((g) => !dbSlugs.has(g.slug))].slice(0, 3));
      })
      .catch(() => {});

    fetch("/api/scholarships")
      .then((r) => r.json())
      .then(({ scholarships: data }: { scholarships: Record<string, unknown>[] }) => {
        if (!data) return;
        const uniqueCountries = [...new Set(data.map((d) => d.country as string))].filter(Boolean);
        setStats({ scholarships: data.length, countries: uniqueCountries.length });
        setQuickTags(uniqueCountries.slice(0, 4));

        const now = Date.now();
        const horizon = now + 30 * 24 * 60 * 60 * 1000;
        const closing = data
          .filter((s) => {
            if (!s.deadline) return false;
            const t = new Date(s.deadline as string).getTime();
            return !isNaN(t) && t > now && t < horizon;
          })
          .sort((a, b) => new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime())
          .slice(0, 4)
          .map((s) => ({ id: s.id as string, slug: (s.slug as string | null) ?? null, title: s.title as string, country: s.country as string, deadline: s.deadline as string | null }));
        setClosingSoon(closing);
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchQuery.trim();
    const query = term ? `?q=${encodeURIComponent(term)}` : "";
    router.push(`/scholarships${query}`);
  };

  const actions: NavAction[] = loading
    ? []
    : [
        userId
          ? { label: t("nav.signOut"), onClick: signOut }
          : { label: t("nav.signIn"), href: "/auth/login", variant: "ghost" },
        !userId ? { label: t("nav.getStarted"), href: "/auth/signup" } : null,
      ].filter(Boolean) as NavAction[];

  const formatDaysLeft = (deadline: string | null) => {
    if (!deadline) return t("label.open");
    const diff = new Date(deadline).getTime() - Date.now();
    if (isNaN(diff) || diff <= 0) return t("label.closed");
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    return `${days} ${t("label.daysLeft")}`;
  };

  const formatDeadlineShort = (deadline: string | null) => {
    if (!deadline) return "—";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) return "—";
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // ── Render ──
  return (
    <div className={styles.page}>
      <AndroidBanner />
      <AppNavbar actions={actions} />

      <main className={styles.main}>
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <p className={styles.kicker}>{t("home.kicker")}</p>
            <h1>{t("home.heroTitle")}</h1>
            <p className={styles.lede}>{t("home.heroCopy")}</p>

            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <div className={styles.searchInputWrap}>
                <svg
                  className={styles.searchIcon}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className={styles.searchInput}
                  aria-label={t("home.searchAriaLabel")}
                  autoComplete="off"
                />
              </div>
              <button type="submit" className={styles.searchButton}>
                {t("home.searchButton")}
              </button>
            </form>

            <div className={styles.heroBrowseRow}>
              <Link
                href="/scholarships"
                className={styles.browseAllCta}
                aria-label={t("home.browseAll")}
              >
                <span className={styles.browseAllLabel}>{t("home.browseAll")}</span>
                {stats.scholarships > 0 && (
                  <span className={styles.browseAllCount}>{stats.scholarships}</span>
                )}
                <span aria-hidden="true" className={styles.browseAllArrow}>→</span>
              </Link>
            </div>

            {quickTags.length > 0 && (
              <div className={styles.quickTags}>
                <span>{t("home.popular")}</span>
                {quickTags.map((tag) => (
                  <Link key={tag} href={`/scholarships?q=${encodeURIComponent(tag)}`}>
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <div className={styles.heroAlternative}>
              <p>
                {t("home.notSure")} <Link href="/chat">{t("home.talkToMentor")}</Link>
              </p>
            </div>

            <div className={styles.stats}>
              <div>
                <span className={styles.statValue}>
                  {stats.scholarships > 0 ? stats.scholarships : "—"}
                </span>
                <span className={styles.statLabel}>{t("home.scholarshipsTracked")}</span>
              </div>
              <div>
                <span className={styles.statValue}>
                  {stats.countries > 0 ? stats.countries : "—"}
                </span>
                <span className={styles.statLabel}>{t("home.countriesCovered")}</span>
              </div>
              <div className={styles.statTertiary}>
                <span className={styles.statValue}>24/7</span>
                <span className={styles.statLabel}>{t("home.aiGuidance")}</span>
              </div>
            </div>
          </div>

          {/* Visual: live-styled product preview, built inline so it stays
              perfectly in sync with the real product styling. */}
          <ProductPreview />
        </section>

        {/* ── Workflow (single tight row) ── */}
        <section className={styles.workflowRow} aria-label="How it works">
          <div className={styles.workflowItem}>
            <span className={styles.workflowDot}>1</span>
            <strong>{t("home.step1Label")}</strong>
            <span>{t("home.step1Desc")}</span>
          </div>
          <div className={styles.workflowArrow} aria-hidden="true">
            →
          </div>
          <div className={styles.workflowItem}>
            <span className={styles.workflowDot}>2</span>
            <strong>{t("home.step2Label")}</strong>
            <span>{t("home.step2Desc")}</span>
          </div>
          <div className={styles.workflowArrow} aria-hidden="true">
            →
          </div>
          <div className={styles.workflowItem}>
            <span className={styles.workflowDot}>3</span>
            <strong>{t("home.step3Label")}</strong>
            <span>{t("home.step3Desc")}</span>
          </div>
        </section>

        {/* ── Mentor showcase ── */}
        {/* ── Closing this week (live data) — placed above the mentor showcase
            so visitors see real scholarships before the marketing pitch ── */}
        <section className={styles.closingSection} aria-label="Scholarships closing soon">
          <div className={styles.closingHeader}>
            <div>
              <p className={styles.kicker}>
                <span className={styles.liveDot} aria-hidden="true" />
                {t("home.closingSoon")}
              </p>
              <h2>{t("home.dontMissDeadlines")}</h2>
            </div>
            <Link href="/scholarships?sort=deadline" className={styles.closingMore}>
              {t("home.seeAllScholarships")}
            </Link>
          </div>

          {closingSoon.length === 0 ? (
            <div className={styles.closingEmpty}>
              <p>
                {t("home.nothingClosingPre")}{" "}
                <Link href="/scholarships">{t("home.fullList")}</Link>{" "}
                {t("home.upcomingOpportunities")}
              </p>
            </div>
          ) : (
            <div className={styles.closingGrid}>
              {closingSoon.map((s) => (
                <Link
                  key={s.id}
                  href={`/scholarships/${s.slug ?? s.id}`}
                  className={styles.closingCard}
                >
                  <span className={styles.closingBadge}>{formatDaysLeft(s.deadline)}</span>
                  <h3>{s.title}</h3>
                  <p className={styles.closingMeta}>
                    <span>{s.country}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t("home.deadlinePrefix")} {formatDeadlineShort(s.deadline)}</span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Mentor showcase ── */}
        <section className={styles.mentorShowcase}>
          <div className={styles.mentorCopy}>
            <p className={styles.kicker}>{t("home.mentorKicker")}</p>
            <h2>{t("home.mentorTitle")}</h2>
            <p className={styles.sectionSubtext}>{t("home.mentorDesc")}</p>
            <Link href="/chat" className={styles.mentorCta}>
              {t("home.tryMentor")}
            </Link>
          </div>

          <MentorMock />
        </section>

        {/* ── From the Guide ── */}
        <section className={styles.guideTeaser} aria-label="Study abroad guides">
          <div className={styles.guideTeaserHeader}>
            <div>
              <p className={styles.kicker}>{t("home.knowledgeHub")}</p>
              <h2>{t("home.guidesTitle")}</h2>
              <p className={styles.sectionSubtext}>{t("home.guidesDesc")}</p>
            </div>
            <Link href="/guide" className={styles.guideTeaserSeeAll}>
              {t("home.allGuides")}
            </Link>
          </div>
          <div className={styles.guideTeaserGrid}>
            {featuredGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guide/${guide.slug}`}
                className={styles.guideTeaserCard}
              >
                <span className={styles.guideTeaserCategory}>{guide.category}</span>
                <h3 className={styles.guideTeaserTitle}>{guide.title}</h3>
                <p className={styles.guideTeaserExcerpt}>{guide.description}</p>
                <span className={styles.guideTeaserCount}>{guide.faqs.length} {t("home.faqsCount")}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SharedFooter />
    </div>
  );
}

// ── Android install banner ────────────────────────────────────────────────────
function AndroidBanner() {
  const [visible, setVisible] = useState(false);
  const t = useT();

  useEffect(() => {
    // Only show on Android browsers, and only if not already dismissed
    const isAndroid = /android/i.test(navigator.userAgent);
    const dismissed = sessionStorage.getItem("bp_apk_banner_dismissed");
    // Also hide if already running as a TWA / standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isAndroid && !dismissed && !isStandalone) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.androidBanner} role="banner">
      <div className={styles.androidBannerLeft}>
        <img src="/logo.png" alt="" className={styles.androidBannerIcon} />
        <div>
          <p className={styles.androidBannerTitle}>{t("banner.title")}</p>
          <p className={styles.androidBannerSub}>{t("banner.sub")}</p>
        </div>
      </div>
      <div className={styles.androidBannerActions}>
        <a
          href="/BairePorbo.apk"
          className={styles.androidBannerInstall}
          download
        >
          {t("banner.install")}
        </a>
        <button
          type="button"
          className={styles.androidBannerDismiss}
          onClick={() => {
            sessionStorage.setItem("bp_apk_banner_dismissed", "1");
            setVisible(false);
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Inline visual: chat preview shown beside the hero ─────────────────────────
function ProductPreview() {
  return (
    <div className={styles.previewWrap} aria-hidden="true">
      <div className={styles.previewCard}>
        <div className={styles.previewHeader}>
          <div className={styles.previewDots}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.previewStatus}>
            <span className={styles.previewLiveDot} />
            BairePorbo Mentor · Online
          </div>
        </div>

        <div className={styles.previewBody}>
          <div className={styles.previewBubbleUser}>
            I have a 3.4 CGPA from BRAC. Can I get into Chevening?
          </div>
          <div className={styles.previewBubbleAi}>
            <strong>Short answer: yes, you&apos;re competitive.</strong>
            <br />
            Chevening doesn&apos;t set a minimum CGPA — they prioritise{" "}
            <em>leadership and impact</em>. Your 3.4 is fine.
            <ul>
              <li>2+ years of experience needed</li>
              <li>Apply before <strong>5 Nov</strong></li>
              <li>3 distinct UK programs</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.previewBadge}>
        <span className={styles.previewBadgePulse} />
        Powered by Deepseek V4
      </div>
    </div>
  );
}

// ── Annotated chat mockup for the showcase section ────────────────────────────
function MentorMock() {
  return (
    <div className={styles.mentorMock} aria-hidden="true">
      <div className={styles.mentorMockBubbleUser}>What is Chevening?</div>

      <div className={styles.mentorMockBubbleAi}>
        <p>
          <strong>Chevening</strong> is the UK government&apos;s global scholarship for one-year
          Master&apos;s programmes — fully funded, including tuition, stipend, and flights.
        </p>
        <p className={styles.mentorMockKey}>For Bangladeshi applicants:</p>
        <ul>
          <li>Bangladeshi citizenship (not dual UK)</li>
          <li>2+ years of work experience</li>
          <li>IELTS 6.5+ for UKVI</li>
          <li>Return to Bangladesh for 2 years</li>
        </ul>
      </div>

      <div className={styles.mentorMockAnnotation} data-position="top-right">
        <span className={styles.mentorMockTag}>Plain English</span>
        <p>No jargon. The mentor explains eligibility the way a senior would.</p>
      </div>
      <div className={styles.mentorMockAnnotation} data-position="bottom-left">
        <span className={styles.mentorMockTag}>BD context</span>
        <p>Knows local universities, IELTS centers, and visa quirks.</p>
      </div>
    </div>
  );
}
