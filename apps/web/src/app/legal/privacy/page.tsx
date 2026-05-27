import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "../legal-layout";

const LAST_UPDATED = "May 27, 2026";
const SUPPORT_EMAIL = "support@baireporbo.app";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How BairePorbo collects, uses, and protects information you share when using our scholarship guidance product.",
};

const sections: LegalSection[] = [
  {
    id: "summary",
    title: "Summary",
    body: (
      <>
        <p>
          BairePorbo is a small product built for Bangladeshi students looking for
          scholarships. We try to collect as little as possible. Here&apos;s the short
          version:
        </p>
        <ul>
          <li>We only collect what you give us (account info, profile fields, chat questions).</li>
          <li>We use that data to operate the product — finding scholarships, generating AI summaries, and improving matching.</li>
          <li>We don&apos;t sell your data. We don&apos;t use it for advertising.</li>
          <li>You can delete your account and data at any time by emailing us.</li>
        </ul>
        <p>
          The sections below explain the details. If anything is unclear, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    body: (
      <>
        <h3>Account information</h3>
        <p>
          When you sign up, we store your email address and a password hash via our
          authentication provider, Supabase. If you sign in with Google, we receive your
          email and basic profile information from Google.
        </p>

        <h3>Profile information</h3>
        <p>
          You may optionally fill in fields like your CGPA, university, target degree
          level, preferred countries, IELTS / TOEFL score, research interests, and goals.
          These improve the accuracy of AI-powered scholarship matching. Filling these
          fields is entirely optional.
        </p>

        <h3>Mentor chat content</h3>
        <p>
          The questions you ask the AI mentor and the answers it generates are stored
          on your account so you can return to past conversations. Anonymous (logged
          out) chats are not stored on our servers.
        </p>

        <h3>Bookmarks and activity</h3>
        <p>
          Scholarships you bookmark are linked to your account so you can find them
          later. We log basic request metadata (timestamps, IP address, model used) for
          rate limiting and debugging — these logs are kept for up to 30 days.
        </p>

        <h3>What we don&apos;t collect</h3>
        <ul>
          <li>We do not use third-party advertising trackers or analytics that share data with advertisers.</li>
          <li>We do not collect biometric data, location data, or device sensor data.</li>
          <li>We do not require you to upload identity documents or transcripts.</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your data",
    body: (
      <>
        <p>We use the information you provide to:</p>
        <ul>
          <li>Authenticate your account and keep it secure.</li>
          <li>Match you with scholarships using AI based on your profile.</li>
          <li>Generate plain-language summaries and answers via large language models.</li>
          <li>Show you bookmarks, chat history, and personalised dashboard content.</li>
          <li>Enforce rate limits to keep the service available and prevent abuse.</li>
          <li>Communicate operational messages such as email confirmation and password resets.</li>
        </ul>
        <p>
          We do <strong>not</strong> use your personal data for advertising, profiling
          for third parties, or any commercial purpose beyond running BairePorbo.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services we use",
    body: (
      <>
        <p>
          BairePorbo is powered by a small set of trusted infrastructure providers.
          Each receives only the data needed for its specific function:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> hosts our database and handles authentication.
            All your account, profile, bookmark, and chat data is stored here.
          </li>
          <li>
            <strong>Vercel</strong> hosts the application. They process requests and
            standard server logs.
          </li>
          <li>
            <strong>OpenRouter</strong> routes your AI mentor questions to models like
            DeepSeek and Mistral. The contents of your messages are sent to these
            providers solely to generate a response. We do not include identifying
            information (your name or email) in the prompt.
          </li>
          <li>
            <strong>NVIDIA NIM</strong> generates the embeddings used to search our
            scholarship database. Profile snippets used for AI matching are sent here.
          </li>
          <li>
            <strong>Email delivery</strong> (Supabase or our SMTP provider) sends
            confirmation, password reset, and operational emails.
          </li>
        </ul>
        <p>
          Each provider has its own privacy practices. We pick providers that publish
          clear policies and don&apos;t retain user prompts to train their models.
        </p>
      </>
    ),
  },
  {
    id: "ai-prompts",
    title: "AI prompt caching",
    body: (
      <>
        <p>
          To reduce cost and improve response time, we cache anonymised AI responses
          for popular questions (for example, &ldquo;What is Chevening?&rdquo;) for up
          to 24 hours. The cache is keyed by question content only — never by your
          identity. If two users ask an identical question, they may receive the same
          cached answer.
        </p>
        <p>
          If you ask a personal or specific question (one that includes your CGPA or
          background details), it is treated as a follow-up and is <strong>not</strong>{" "}
          eligible for caching.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>
            <strong>Access</strong> the data we hold about you. Most of it is visible
            on your profile and dashboard pages already.
          </li>
          <li>
            <strong>Correct</strong> any inaccurate information by editing your profile.
          </li>
          <li>
            <strong>Delete</strong> your account, chat history, bookmarks, and profile
            at any time. Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email on
            your account and we will remove everything within 14 days.
          </li>
          <li>
            <strong>Export</strong> your data in a machine-readable format on request.
          </li>
          <li>
            <strong>Withdraw consent</strong> by deleting your account.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "data-security",
    title: "Data security",
    body: (
      <>
        <p>
          We use HTTPS for all traffic. Database access is restricted to authenticated
          users via row-level security policies. Passwords are never stored in
          plaintext — they are hashed by our authentication provider.
        </p>
        <p>
          BairePorbo is a small project. We do our best to keep your data safe, but no
          system is perfectly secure. If we ever discover a breach affecting your
          account, we will notify you within 72 hours of confirming it.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        BairePorbo is intended for students of higher-education age. We do not
        knowingly collect data from children under 13. If you believe a child has
        provided us with personal data, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will delete it.
      </p>
    ),
  },
  {
    id: "data-location",
    title: "Where your data is stored",
    body: (
      <p>
        Our database and authentication services are hosted on Supabase. The
        application itself runs on Vercel. AI providers process requests on their own
        infrastructure. Some of these services may store data outside Bangladesh.
        By using BairePorbo, you consent to this cross-border processing.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we materially change this policy, we will update the &ldquo;last
        updated&rdquo; date at the top and, where appropriate, notify you by email.
        Continued use of BairePorbo after changes means you accept the updated policy.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      kicker="Legal"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <strong>The short version:</strong> we collect only what you give us, use it
          to run BairePorbo, never sell it, and let you delete it whenever you want.
          Full details below.
        </>
      }
      sections={sections}
      contact={
        <p>
          Questions about your data? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We typically reply
          within 24 hours.
        </p>
      }
    />
  );
}
