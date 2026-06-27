import type { Metadata } from "next";
import ScholarshipsClient from "./scholarships-client";

const BASE_URL = "https://baireporbo.app";

export const metadata: Metadata = {
  title: "International Scholarships for Bangladeshi Students",
  description:
    "Browse 300+ international scholarships for students from Bangladesh. Filter by country, degree level, funding type, and deadline. Includes fully funded, no-IELTS, Masters, PhD, and Bachelors opportunities.",
  alternates: {
    canonical: `${BASE_URL}/scholarships`,
  },
  openGraph: {
    title: "International Scholarships for Bangladeshi Students | BairePorbo",
    description:
      "Find Masters, PhD, and Bachelors scholarships in the UK, USA, Germany, Canada, and more — curated and AI-summarised for students from Bangladesh.",
    url: `${BASE_URL}/scholarships`,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BairePorbo — Scholarships for Bangladeshi Students",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "International Scholarships for Bangladeshi Students",
    description:
      "Browse 300+ international scholarships with AI-powered eligibility summaries. Built for students from Bangladesh.",
    images: ["/og-image.png"],
  },
};

export default function ScholarshipsPage() {
  return <ScholarshipsClient />;
}
