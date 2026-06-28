import type { Metadata } from "next";
import NavbarWithAuth from "@/components/layout/navbar-with-auth";
import SharedFooter from "@/components/layout/shared-footer";
import { fetchPublishedDbGuides, sortGuides } from "@/lib/guides-db";
import GuidePageClient from "./guide-page-client";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

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
  const allGuides = sortGuides(await fetchPublishedDbGuides());

  return (
    <div className={styles.page}>
      <NavbarWithAuth />
      <GuidePageClient guides={allGuides} />
      <SharedFooter />
    </div>
  );
}
