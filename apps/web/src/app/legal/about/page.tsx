import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "../legal-layout";

const SUPPORT_EMAIL = "support@baireporbo.app";
const FACEBOOK_URL = "https://www.facebook.com/baireporbo/";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about BairePorbo — AI-powered scholarship guidance built for Bangladeshi students pursuing study abroad.",
};

const sections: LegalSection[] = [
  {
    id: "mission",
    title: "Our mission",
    body: (
      <>
        <p>
          BairePorbo exists to make scholarship discovery less overwhelming for
          Bangladeshi students. Finding the right funding for a master&apos;s or PhD
          abroad often means digging through dozens of university pages, outdated
          blog posts, and scattered Facebook groups — with no clear sense of what
          actually fits your profile.
        </p>
        <p>
          We built BairePorbo to bring that process into one place: searchable
          scholarships, AI-powered matching based on your background, and an
          always-available mentor to answer questions in plain language — in
          English or Bengali.
        </p>
      </>
    ),
  },
  {
    id: "what-we-offer",
    title: "What we offer",
    body: (
      <>
        <ul>
          <li>
            <strong>Scholarship search</strong> — Browse and filter opportunities by
            country, degree level, field, and deadline.
          </li>
          <li>
            <strong>AI mentor</strong> — Ask questions about eligibility, application
            timelines, required documents, and how to strengthen your profile.
          </li>
          <li>
            <strong>Personalized matching</strong> — When you fill in your profile,
            we surface scholarships that align with your CGPA, test scores, and
            target countries.
          </li>
          <li>
            <strong>Study guides</strong> — Practical guides on GRE, IELTS, SOP
            writing, and the application process.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "who-we-serve",
    title: "Who we serve",
    body: (
      <>
        <p>
          BairePorbo is built for Bangladeshi students — whether you are in your
          final year of undergrad, already working, or preparing for a second
          degree. Our focus is on scholarships for study abroad, particularly
          master&apos;s and PhD programmes in countries like the United States,
          United Kingdom, Germany, Australia, and Canada.
        </p>
        <p>
          You do not need a perfect profile to use BairePorbo. Many scholarships
          exist for a wide range of backgrounds, and our goal is to help you find
          the ones worth your time.
        </p>
      </>
    ),
  },
  {
    id: "how-we-work",
    title: "How we work",
    body: (
      <>
        <p>
          BairePorbo is a small, independent product. We are not affiliated with
          any university, government agency, or scholarship provider. Scholarship
          listings are compiled from public sources and verified where possible,
          but deadlines and requirements can change — always confirm details on
          the official programme website before applying.
        </p>
        <p>
          We use AI to power matching and the mentor chat. AI responses are meant
          to guide your research, not replace official advice from universities or
          immigration authorities. See our{" "}
          <a href="/legal/terms">Terms of service</a> for more on how the product
          works.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Your data",
    body: (
      <>
        <p>
          We collect only what we need to run the product. We do not sell your
          data or use it for advertising. You can read the full details in our{" "}
          <a href="/legal/privacy">Privacy policy</a>, or request account
          deletion anytime by emailing us.
        </p>
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <LegalLayout
      kicker="Company"
      title="About BairePorbo"
      intro={
        <p>
          <strong>BairePorbo</strong> is AI-powered scholarship guidance, built
          for Bangladeshi students. This page explains who we are, what we do, and
          why we built it.
        </p>
      }
      sections={sections}
      contact={
        <p>
          Have a question or suggestion?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or message us on{" "}
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
          . We typically reply within 24 hours.
        </p>
      }
    />
  );
}
