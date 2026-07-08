import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Fraunces, Manrope, Hind_Siliguri } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { headers, cookies } from "next/headers";
import "./globals.css";
import Providers from "./providers";
import MobileTabBar from "@/components/layout/mobile-tab-bar";
import CookieConsentBanner from "@/components/consent/cookie-consent-banner";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const bengaliFont = Hind_Siliguri({
  variable: "--font-bengali",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
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
    locale: "bn_BD",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);

  // Respect an explicit user preference set via the language toggle
  const storedLang = cookieStore.get("bp_lang")?.value;
  const preferredLang =
    storedLang === "bn" || storedLang === "en" ? storedLang : undefined;

  // Fall back to geo-based default: Bangla for Bangladesh, English everywhere else
  const country = headersList.get("x-vercel-ip-country");
  const defaultLang: "bn" | "en" = preferredLang ?? (country === "BD" ? "bn" : "en");

  return (
    <html lang={defaultLang} className={`${displayFont.variable} ${bodyFont.variable} ${bengaliFont.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f8f8d" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BairePorbo" />
        <link rel="apple-touch-icon" href="/logo.png" />
        {/*
          Google Consent Mode v2 — must be defined before the AdSense tag
          loads. Ad/analytics storage default to "denied" until the visitor
          accepts the cookie banner; if they already accepted on a previous
          visit, grant immediately so returning visitors don't get downgraded
          ads on every page load.
        */}
        <Script id="consent-mode-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            var storedConsent = null;
            try { storedConsent = window.localStorage.getItem('bp_cookie_consent'); } catch (e) {}
            var granted = storedConsent === 'accepted' ? 'granted' : 'denied';
            gtag('consent', 'default', {
              ad_storage: granted,
              analytics_storage: granted,
              ad_user_data: granted,
              ad_personalization: granted,
              wait_for_update: 500
            });
          `}
        </Script>
        <Script
          id="adsbygoogle-init"
          strategy="beforeInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1817502704498215"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "BairePorbo",
              url: BASE_URL,
              logo: `${BASE_URL}/logo.png`,
              description:
                "AI-powered scholarship guidance for Bangladeshi students seeking international scholarships.",
              email: "support@baireporbo.app",
              sameAs: ["https://www.facebook.com/baireporbo/"],
              address: {
                "@type": "PostalAddress",
                addressLocality: "Dhaka",
                addressCountry: "BD",
              },
              founder: {
                "@type": "Person",
                name: "Md. Mushfiqur Rahman",
                url: "https://www.mushfiqnehal.dev/",
                sameAs: [
                  "https://www.mushfiqnehal.dev/",
                  "https://www.linkedin.com/in/mushfiq-nehal/",
                ],
              },
              contactPoint: {
                "@type": "ContactPoint",
                email: "support@baireporbo.app",
                contactType: "customer support",
                areaServed: "BD",
                availableLanguage: ["English", "Bengali"],
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Md. Mushfiqur Rahman",
              url: "https://www.mushfiqnehal.dev/",
              email: "hello@mushfiqnehal.dev",
              jobTitle: "Founder & Developer",
              sameAs: [
                "https://www.mushfiqnehal.dev/",
                "https://www.linkedin.com/in/mushfiq-nehal/",
              ],
              worksFor: {
                "@type": "Organization",
                name: "BairePorbo",
                url: BASE_URL,
              },
              homeLocation: {
                "@type": "Place",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Dhaka",
                  addressCountry: "BD",
                },
              },
            }),
          }}
        />
      </head>
      <body>
        <Providers defaultLang={defaultLang}>
          {children}
          <MobileTabBar />
          <CookieConsentBanner />
        </Providers>
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
