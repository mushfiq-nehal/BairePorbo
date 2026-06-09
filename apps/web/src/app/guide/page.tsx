import type { Metadata } from "next";
import Link from "next/link";
import NavbarWithAuth from "@/components/layout/navbar-with-auth";
import { guides as staticGuides } from "./data/index";
import { createServiceClient } from "@/utils/supabase/server";
import type { Guide } from "./data/types";
import styles from "./page.module.css";

export const revalidate = 3600; // ISR: regenerate once per hour

export const metadata: Metadata = {
  title: "Study Abroad Guides & FAQs for Bangladeshi Students",
  description:
    "Free guides and expert FAQs on scholarships, IELTS, SOP writing, and studying in Germany, UK, USA — tailored for students from Bangladesh.",
  alternates: {
    canonical: "https://baireporbo.app/guide",
  },
  openGraph: {
    title: "Study Abroad Guides & FAQs | BairePorbo",
    description:
      "Expert guides on Chevening, IELTS, SOP writing, GRE waivers, and studying in Europe — for Bangladeshi students.",
    url: "https://baireporbo.app/guide",
    type: "website",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Scholarships: "teal",
  Applications: "coral",
  Tests: "sky",
  Destinations: "sand",
  Visa: "purple",
};

export default async function GuidePage() {
  // Fetch published guides from DB (admin-created ones)
  let dbGuides: Guide[] = [];
  try {
    const db = createServiceClient();
    const { data } = await db
      .from("guides")
      .select("slug, title, description, category, tags, intro, faqs, published_at, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (data) {
      dbGuides = data.map((g) => ({
        slug: g.slug,
        title: g.title,
        description: g.description,
        category: g.category as Guide["category"],
        tags: g.tags ?? [],
        intro: g.intro,
        faqs: Array.isArray(g.faqs) ? g.faqs : [],
        publishedAt: g.published_at ?? g.updated_at ?? "",
        updatedAt: g.updated_at ?? "",
      }));
    }
  } catch {
    // DB unavailable — fall back to static only
  }

  // Merge: DB guides first, then static guides not already in DB
  const dbSlugs = new Set(dbGuides.map((g) => g.slug));
  const allGuides: Guide[] = [
    ...dbGuides,
    ...staticGuides.filter((g) => !dbSlugs.has(g.slug)),
  ];

  return (
    <div className={styles.page}>
      <NavbarWithAuth />

      <main className={styles.main}>
        {/* Header */}
        <section className={styles.header}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span>Guide</span>
          </nav>
          <p className={styles.kicker}>Knowledge hub</p>
          <h1 className={styles.title}>Study Abroad Guides</h1>
          <p className={styles.subtitle}>
            Expert answers to the questions Bangladeshi students ask most —
            scholarships, language tests, applications, and destinations.
          </p>

          {/* Stats bar */}
          <div className={styles.statsBar}>
            <span>
              <strong>{allGuides.length}</strong> guides published
            </span>
            <span className={styles.statsDivider} aria-hidden="true">·</span>
            <span>Free to read</span>
            <span className={styles.statsDivider} aria-hidden="true">·</span>
            <span>Updated regularly</span>
          </div>
        </section>

        {/* Guide grid */}
        <section className={styles.gridSection} aria-label="All guides">
          <div className={styles.grid}>
            {allGuides.map((guide) => {
              const colorKey = CATEGORY_COLORS[guide.category] ?? "teal";
              return (
                <Link
                  key={guide.slug}
                  href={`/guide/${guide.slug}`}
                  className={styles.card}
                  aria-label={`Read guide: ${guide.title}`}
                >
                  <div className={styles.cardTop}>
                    <span
                      className={styles.categoryBadge}
                      data-color={colorKey}
                    >
                      {guide.category}
                    </span>
                    <span className={styles.faqCount}>
                      {guide.faqs.length} FAQs
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
                      Read →
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
            <p className={styles.ctaKicker}>Still have questions?</p>
            <h2 className={styles.ctaTitle}>Ask our AI Mentor anything</h2>
            <p className={styles.ctaText}>
              The guides cover common questions, but every student&apos;s situation
              is unique. Get personalised answers in seconds.
            </p>
            <Link href="/chat" className={styles.ctaButton}>
              Talk to the Mentor →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
