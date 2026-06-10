import type { Metadata } from "next";
import NavbarWithAuth from "@/components/layout/navbar-with-auth";
import { guides as staticGuides } from "./data/index";
import { createServiceClient } from "@/utils/supabase/server";
import type { Guide } from "./data/types";
import GuidePageClient from "./guide-page-client";
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
      <GuidePageClient guides={allGuides} />
    </div>
  );
}
