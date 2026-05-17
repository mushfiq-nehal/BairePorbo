import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Manrope } from "next/font/google";
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

export const metadata: Metadata = {
  title: "BairePorbo — Scholarship guidance",
  description:
    "AI-powered scholarship and higher study guidance for South Asian students.",
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
          <Link
            className="aiFaqButton"
            href="/chat?question=What%20scholarships%20match%20a%20CGPA%203.1%20for%20Masters%3F"
          >
            AI Mentor
          </Link>
        </Providers>
      </body>
    </html>
  );
}
