"use client";

import Link from "next/link";
import { useT } from "@/lib/lang-context";
import type { Guide } from "./data/types";
import styles from "./page.module.css";

const CATEGORY_COLORS: Record<string, string> = {
  Scholarships: "teal",
  Applications: "coral",
  Tests: "sky",
  Destinations: "sand",
  Visa: "purple",
};

// Stable gradient per guide for the fallback thumbnail (when no cover image)
const THUMB_GRADIENTS = [
  "linear-gradient(145deg, #0f3460 0%, #16213e 100%)",
  "linear-gradient(145deg, #1a472a 0%, #0d2b18 100%)",
  "linear-gradient(145deg, #7b2d8b 0%, #4a1460 100%)",
  "linear-gradient(145deg, #7c2929 0%, #4a1414 100%)",
  "linear-gradient(145deg, #0a3d62 0%, #0c2461 100%)",
];

function gradientFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = key.charCodeAt(i) + ((h << 5) - h);
  return THUMB_GRADIENTS[Math.abs(h) % THUMB_GRADIENTS.length];
}

export default function GuidePageClient({ guides }: { guides: Guide[] }) {
  const t = useT();

  return (
    <main className={styles.main}>
      {/* Header */}
      <section className={styles.header}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">{t("guide.home")}</Link>
          <span aria-hidden="true">›</span>
          <span>{t("guide.breadcrumbGuide")}</span>
        </nav>
        <p className={styles.kicker}>{t("guide.kicker")}</p>
        <h1 className={styles.title}>{t("guide.title")}</h1>
        <p className={styles.subtitle}>{t("guide.subtitle")}</p>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <span>
            <strong>{guides.length}</strong> {t("guide.guidesPublished")}
          </span>
          <span className={styles.statsDivider} aria-hidden="true">·</span>
          <span>{t("guide.freeToRead")}</span>
          <span className={styles.statsDivider} aria-hidden="true">·</span>
          <span>{t("guide.updatedRegularly")}</span>
        </div>
      </section>

      {/* Guide grid */}
      <section className={styles.gridSection} aria-label="All guides">
        <div className={styles.grid}>
          {guides.map((guide) => {
            const colorKey = CATEGORY_COLORS[guide.category] ?? "teal";
            return (
              <Link
                key={guide.slug}
                href={`/guide/${guide.slug}`}
                className={styles.card}
                aria-label={`${t("guide.readGuide")} ${guide.title}`}
              >
                <div className={styles.cardThumb}>
                  {guide.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={guide.coverImageUrl}
                      alt=""
                      className={styles.cardThumbImg}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={styles.cardThumbFallback}
                      style={{ background: gradientFor(guide.slug) }}
                      aria-hidden="true"
                    >
                      <span>{guide.category}</span>
                    </div>
                  )}
                </div>
                <div className={styles.cardTop}>
                  <span
                    className={styles.categoryBadge}
                    data-color={colorKey}
                  >
                    {guide.category}
                  </span>
                  <span className={styles.faqCount}>
                    {guide.faqs.length} {t("guide.faqs")}
                  </span>
                </div>
                <h2 className={styles.cardTitle}>{guide.title}</h2>
                <p className={styles.cardExcerpt}>{guide.description}</p>
                <div className={styles.cardFooter}>
                  <div className={styles.tagList}>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className={styles.readMore}>
                    {t("guide.read")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA banner */}
      <section className={styles.ctaBanner} aria-label="AI Mentor CTA">
        <div className={styles.ctaInner}>
          <p className={styles.ctaKicker}>{t("guide.ctaKicker")}</p>
          <h2 className={styles.ctaTitle}>{t("guide.ctaTitle")}</h2>
          <p className={styles.ctaText}>{t("guide.ctaText")}</p>
          <Link href="/chat" className={styles.ctaButton}>
            {t("guide.talkToMentor")}
          </Link>
        </div>
      </section>
    </main>
  );
}
