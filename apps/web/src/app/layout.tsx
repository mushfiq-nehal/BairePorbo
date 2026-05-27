import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Providers from "./providers";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const BASE_URL = "https://baireporbo.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "BairePorbo — AI Scholarship Guidance for Bangladeshi Students",
    template: "%s | BairePorbo",
  },
  description:
    "BairePorbo helps Bangladeshi students find international scholarships with AI-powered summaries, eligibility breakdowns, and personalised prep timelines. Discover Masters, PhD, and Bachelor scholarships across USA, UK, Europe, and more.",
  keywords: [
    "scholarship Bangladesh",
    "study abroad Bangladesh",
    "international scholarship",
    "PhD scholarship Bangladesh",
    "Masters scholarship",
    "IELTS scholarship",
    "AI scholarship guidance",
    "higher study abroad",
    "BairePorbo",
  ],
  authors: [{ name: "BairePorbo" }],
  creator: "BairePorbo",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: ["/logo.png"],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "BairePorbo",
    title: "BairePorbo — AI Scholarship Guidance for Bangladeshi Students",
    description:
      "Find international scholarships with AI summaries and personalised prep timelines. Built for students from Bangladesh.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BairePorbo — AI Scholarship Guidance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BairePorbo — AI Scholarship Guidance",
    description:
      "Find international scholarships with AI summaries and personalised prep timelines. Built for students from Bangladesh.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
