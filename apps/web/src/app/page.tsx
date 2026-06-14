import type { Metadata } from "next";
import HomeClient from "./home-client";

const BASE_URL = "https://baireporbo.app";

export const metadata: Metadata = {
  title: "Find International Scholarships for Bangladeshi Students",
  description:
    "Discover 300+ fully funded and partial scholarships for students from Bangladesh. Browse Masters, PhD, and Bachelors opportunities in the UK, USA, Germany, Canada, and more — with AI-powered eligibility summaries.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "Find International Scholarships for Bangladeshi Students | BairePorbo",
    description:
      "AI-powered scholarship discovery for students from Bangladesh. Browse 300+ opportunities across 30+ countries with eligibility breakdowns and application timelines.",
    url: BASE_URL,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BairePorbo — International Scholarships for Bangladeshi Students",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find International Scholarships for Bangladeshi Students",
    description:
      "AI-powered scholarship discovery for students from Bangladesh. Browse 300+ opportunities with eligibility breakdowns.",
    images: ["/og-image.png"],
  },
};

export default function HomePage() {
  return <HomeClient />;
}
