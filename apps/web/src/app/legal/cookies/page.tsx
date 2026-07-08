import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout, { LegalSection } from "../legal-layout";
import ManageCookiesButton from "@/components/consent/manage-cookies-button";

const LAST_UPDATED = "July 8, 2026";
const SUPPORT_EMAIL = "support@baireporbo.app";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How BairePorbo uses cookies, including advertising cookies from Google AdSense and Meta, and how to control your preferences.",
  alternates: {
    canonical: "https://baireporbo.app/legal/cookies",
  },
};

const sections: LegalSection[] = [
  {
    id: "what-are-cookies",
    title: "What cookies are",
    body: (
      <p>
        Cookies are small text files stored on your device when you visit a website.
        They let a site remember things — like whether you&apos;re signed in, your
        language preference, or (with your consent) information used to show you more
        relevant ads. This policy explains exactly which cookies BairePorbo uses and
        why. It works alongside our{" "}
        <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "types-of-cookies",
    title: "Cookies we use",
    body: (
      <>
        <h3>Strictly necessary</h3>
        <p>
          Used to keep you signed in, remember your language choice, and protect the
          site against abuse. These are set by our authentication provider (Clerk),
          our database provider (Supabase), and BairePorbo itself. They can&apos;t be
          switched off, because the product doesn&apos;t function without them, and
          they don&apos;t require consent under GDPR/ePrivacy rules.
        </p>

        <h3>Analytics</h3>
        <p>
          <strong>Vercel Analytics</strong> measures page views and performance without
          setting cookies or storing personal identifiers — it&apos;s privacy-friendly
          by design and runs regardless of your cookie choice.
        </p>

        <h3>Advertising &amp; measurement (requires your consent)</h3>
        <p>
          BairePorbo is free to use and partly supported by advertising. If you click
          &ldquo;Accept&rdquo; on our cookie banner, we load:
        </p>
        <ul>
          <li>
            <strong>Google AdSense</strong> — serves the ads you see on BairePorbo and
            may set cookies to measure ad performance and, where permitted, personalise
            ads based on your browsing.
          </li>
          <li>
            <strong>Meta Pixel</strong> — helps us understand which content is useful
            to visitors and, where relevant, deliver better-targeted campaigns on
            Facebook/Instagram.
          </li>
        </ul>
        <p>
          If you click &ldquo;Reject&rdquo;, neither of these loads, and Google serves
          only non-personalised, contextual ads (see below).
        </p>
      </>
    ),
  },
  {
    id: "consent-mode",
    title: "Your consent choice & Google Consent Mode",
    body: (
      <>
        <p>
          On your first visit, a banner asks you to <strong>Accept</strong> or{" "}
          <strong>Reject</strong> non-essential cookies. We remember your choice in
          your browser&apos;s local storage so we don&apos;t ask again — you can change
          it at any time (see &ldquo;Managing your cookies&rdquo; below).
        </p>
        <p>
          Behind the scenes, we implement{" "}
          <strong>Google Consent Mode v2</strong>. Before any advertising script loads,
          we tell Google that <code>ad_storage</code>, <code>analytics_storage</code>,{" "}
          <code>ad_user_data</code>, and <code>ad_personalization</code> are all{" "}
          <strong>denied</strong> by default. Only if you click &ldquo;Accept&rdquo; do
          we update those signals to <strong>granted</strong>. This means Google never
          receives permission to use advertising cookies or personalise ads for you
          unless you&apos;ve explicitly said yes.
        </p>
      </>
    ),
  },
  {
    id: "advertising-disclosure",
    title: "Advertising disclosure",
    body: (
      <>
        <p>
          BairePorbo uses <strong>Google AdSense</strong> to display ads. As part of
          this, Google and its advertising partners (including third-party vendors) may
          use cookies to serve ads based on your prior visits to BairePorbo or other
          websites. This is standard behaviour for ad networks and is what funds free
          access to BairePorbo&apos;s scholarship search and AI mentor.
        </p>
        <p>You can control or opt out of personalised advertising here:</p>
        <ul>
          <li>
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Ads Settings
            </a>{" "}
            — manage how Google personalises ads across its services.
          </li>
          <li>
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Digital Advertising Alliance — WebChoices
            </a>{" "}
            — opt out of interest-based ads from participating companies.
          </li>
          <li>
            <a
              href="https://www.youronlinechoices.eu/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Your Online Choices (EU)
            </a>{" "}
            — the equivalent opt-out tool for visitors in Europe.
          </li>
        </ul>
        <p>
          Rejecting cookies on BairePorbo, or opting out via the tools above, doesn&apos;t
          stop ads from appearing — it means the ads you see are no longer based on your
          browsing history.
        </p>
      </>
    ),
  },
  {
    id: "managing-cookies",
    title: "Managing your cookies",
    body: (
      <>
        <p>
          You can change your mind at any time. Reopen the cookie banner here:
        </p>
        <p>
          <ManageCookiesButton />
        </p>
        <p>
          You can also block or delete cookies directly in your browser settings —
          look for &ldquo;Privacy&rdquo; or &ldquo;Cookies&rdquo; in your browser&apos;s
          preferences. Note that blocking strictly necessary cookies at the browser
          level may prevent you from signing in or using the AI mentor.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we add or remove a cookie provider, we&apos;ll update this page and the
        &ldquo;last updated&rdquo; date above. Significant changes (like adding a new
        advertising partner) will also reset your consent choice so we can ask again.
      </p>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalLayout
      kicker="Legal"
      title="Cookie Policy"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <strong>The short version:</strong> we use essential cookies to run the
          product, and — only if you accept — advertising cookies from Google AdSense
          and Meta to keep BairePorbo free. You can change your choice anytime.
        </>
      }
      sections={sections}
      contact={
        <p>
          Questions about cookies or advertising on BairePorbo? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      }
    />
  );
}
