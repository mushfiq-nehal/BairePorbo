import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, Manrope, Hind_Siliguri } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/icon-32.png"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    // The server-rendered (crawlable) content is English; Bangla is applied
    // client-side. Declare English as primary with Bangla as an alternate so
    // the OG locale matches what crawlers actually see.
    locale: "en_US",
    alternateLocale: ["bn_BD"],
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

// Next 16 wants viewport / theme-color declared via the `viewport` export
// rather than inside `metadata`.
export const viewport: Viewport = {
  themeColor: "#0f8f8d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // NOTE: This layout is intentionally NOT async and does NOT read headers()/
  // cookies(). Doing so would opt the entire app into dynamic rendering and
  // disable SSG/ISR everywhere. Locale detection now happens client-side in
  // LangProvider (localStorage preference → navigator.language heuristic).
  // `lang="en"` is the crawlable default (Googlebot crawls the English SSR).
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${bengaliFont.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BairePorbo" />
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
        {/*
          WebSite + SearchAction — powers the Google sitelinks search box and
          gives search engines / AI assistants a machine-readable way to query
          the scholarship catalog. inLanguage declares bilingual coverage.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "BairePorbo",
              alternateName: "BairePorbo — AI Scholarship Guidance",
              url: BASE_URL,
              inLanguage: ["en", "bn"],
              publisher: { "@type": "Organization", name: "BairePorbo", url: BASE_URL },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${BASE_URL}/scholarships?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
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
        <Providers>
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
