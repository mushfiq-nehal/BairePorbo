import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout, { LegalSection } from "../legal-layout";

const LAST_UPDATED = "May 27, 2026";
const SUPPORT_EMAIL = "support@baireporbo.app";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of BairePorbo's scholarship guidance and AI mentor services.",
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    body: (
      <p>
        By creating an account or using BairePorbo, you agree to these Terms of
        Service. If you do not agree, please do not use the service. These terms apply
        to both signed-in users and anonymous visitors using the limited free preview
        of the AI mentor.
      </p>
    ),
  },
  {
    id: "what-bp-is",
    title: "What BairePorbo is",
    body: (
      <>
        <p>BairePorbo provides:</p>
        <ul>
          <li>A searchable catalog of international scholarships curated for Bangladeshi students.</li>
          <li>An AI mentor that answers questions about scholarships, eligibility, and applications.</li>
          <li>AI-powered matching that suggests scholarships based on your profile.</li>
          <li>Personal tools (bookmarks, chat history, dashboard) tied to your account.</li>
        </ul>
        <p>
          BairePorbo is an <strong>information and guidance tool</strong>. We do not
          submit applications on your behalf, guarantee admission, guarantee funding,
          or act as an agent of any university or scholarship body.
        </p>
      </>
    ),
  },
  {
    id: "ai-disclaimer",
    title: "AI-generated content disclaimer",
    body: (
      <>
        <p>
          The AI mentor uses large language models that can be incorrect or out of
          date. Scholarship deadlines, eligibility requirements, and program details
          change frequently. We strongly recommend you:
        </p>
        <ul>
          <li>
            Verify any AI-generated information against the official scholarship or
            university website before applying.
          </li>
          <li>Treat the mentor as a research starting point, not the final word.</li>
          <li>
            Contact official scholarship offices directly for binding eligibility
            decisions.
          </li>
        </ul>
        <p>
          BairePorbo is not liable for application decisions you make based on AI
          responses. If you find inaccurate information, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> so we can fix it.
        </p>
      </>
    ),
  },
  {
    id: "your-account",
    title: "Your account",
    body: (
      <>
        <p>You are responsible for:</p>
        <ul>
          <li>Providing a real email address you control.</li>
          <li>Keeping your password confidential.</li>
          <li>All activity that happens under your account.</li>
          <li>
            Notifying us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if
            you suspect unauthorised access.
          </li>
        </ul>
        <p>
          One person, one account. Don&apos;t create multiple accounts to circumvent
          rate limits or other restrictions.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>
          BairePorbo is meant to help students. To keep the service available for
          everyone, you agree not to:
        </p>
        <ul>
          <li>
            Use the AI mentor for purposes unrelated to education, scholarships, or
            study abroad.
          </li>
          <li>
            Attempt to extract training data, system prompts, or proprietary
            information from the AI.
          </li>
          <li>Reverse-engineer, scrape, or automate the service at scale.</li>
          <li>Submit requests intended to overload, disrupt, or abuse the system.</li>
          <li>Send harmful, illegal, harassing, or hateful content through any feature.</li>
          <li>
            Resell, redistribute, or commercially exploit BairePorbo&apos;s content
            without written permission.
          </li>
          <li>
            Misrepresent your identity or impersonate someone else when seeking
            advice.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these rules, with or
          without notice. We may also enforce per-user, per-hour, and per-day request
          limits to keep the service running for everyone.
        </p>
      </>
    ),
  },
  {
    id: "free-and-paid",
    title: "Free and paid features",
    body: (
      <>
        <p>
          BairePorbo is currently free to use. Anonymous visitors get a limited number
          of mentor messages per day; signed-in users get higher limits. Specific
          quotas are subject to change.
        </p>
        <p>
          We may introduce paid features in the future (such as transcript review or
          extended chat memory). Any paid feature will be clearly labelled and you
          will not be charged without explicit consent.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <>
        <p>
          You retain ownership of the information you submit — your profile fields,
          chat questions, bookmarks, and notes. By using the service, you grant us a
          limited licence to store and process this content for the sole purpose of
          operating BairePorbo for you.
        </p>
        <p>
          We do <strong>not</strong> use your private content to train AI models. We
          do <strong>not</strong> share it publicly or with other users.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    body: (
      <>
        <p>
          BairePorbo&apos;s name, logo, design, code, and curated scholarship summaries
          are owned by us. The underlying scholarship details (deadlines, eligibility,
          funding amounts) belong to the respective scholarship providers and
          universities. We summarise and reorganise them for educational purposes
          under fair use.
        </p>
        <p>
          You may share scholarship pages with a link, but please don&apos;t copy
          large portions of our AI-generated summaries to other sites without
          attribution.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    body: (
      <>
        <p>
          You can stop using BairePorbo at any time. Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you want your
          account and data deleted permanently.
        </p>
        <p>
          We may suspend or terminate your account if you violate these terms, abuse
          the service, or for legal reasons. Where reasonable, we will explain why.
        </p>
      </>
    ),
  },
  {
    id: "warranties",
    title: "No warranties",
    body: (
      <>
        <p>
          BairePorbo is provided <strong>as-is</strong> and <strong>as available</strong>.
          We don&apos;t guarantee:
        </p>
        <ul>
          <li>That the service will be available without interruption.</li>
          <li>That AI responses will be accurate, complete, or current.</li>
          <li>That you will be admitted to any program or receive any scholarship.</li>
          <li>That the catalog includes every scholarship that may be relevant to you.</li>
        </ul>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p>
        To the extent permitted by law, BairePorbo and its operators are not liable
        for any indirect, incidental, or consequential damages — including lost
        opportunities, missed deadlines, or rejected applications — arising from your
        use of the service. Your sole remedy is to stop using the service.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the People&apos;s Republic of
        Bangladesh. Any disputes will be resolved in the courts of Dhaka, Bangladesh.
        If any clause is found unenforceable, the rest remain in effect.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms occasionally. The &ldquo;last updated&rdquo; date at
        the top of this page tells you when. Continued use after changes means you
        accept the new terms. If a change materially affects your rights, we&apos;ll
        notify you by email.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      kicker="Legal"
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <strong>The short version:</strong> use BairePorbo to find scholarships and
          ask questions, but always verify AI answers against official sources before
          applying. We&apos;re a tool, not a guarantee. See also our{" "}
          <Link href="/legal/privacy">privacy policy</Link>.
        </>
      }
      sections={sections}
      contact={
        <p>
          Questions about these terms? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      }
    />
  );
}
