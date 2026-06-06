import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Fraunces, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Providers from "./providers";
import MobileTabBar from "@/components/layout/mobile-tab-bar";

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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f8f8d" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BairePorbo" />
        <link rel="apple-touch-icon" href="/logo.png" />
        {/* Meta Pixel noscript fallback */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1567668045069288&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body>
        <Providers>
          {children}
          <MobileTabBar />
        </Providers>
        <Analytics />
        {/* Meta Pixel */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1567668045069288');
              fbq('track', 'PageView');
            `,
          }}
        />
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
