import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "../legal-layout";

const SUPPORT_EMAIL = "support@baireporbo.app";

export const metadata: Metadata = {
  title: "Partner With Us",
  description:
    "Partner with BairePorbo — collaborate with Bangladesh's growing scholarship discovery platform. We welcome universities, scholarship providers, EdTech companies, and student communities.",
  alternates: {
    canonical: "https://baireporbo.app/legal/partner",
  },
  openGraph: {
    title: "Partner With Us | BairePorbo",
    description:
      "Reach thousands of motivated Bangladeshi students. Partner with BairePorbo for sponsorships, scholarship listings, and collaboration opportunities.",
    url: "https://baireporbo.app/legal/partner",
    type: "website",
  },
};

const sections: LegalSection[] = [
  {
    id: "audience",
    title: "Our reach",
    body: (
      <>
        <p>
          BairePorbo serves thousands of motivated Bangladeshi students actively
          exploring international study opportunities. Our platform is where they
          discover scholarships, read eligibility breakdowns, and plan their
          higher education journey abroad.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              background:
                "linear-gradient(135deg, rgba(15,143,141,0.07), rgba(15,143,141,0.03))",
              border: "1px solid rgba(15,143,141,0.18)",
              borderRadius: "14px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
                fontWeight: 700,
                color: "var(--teal-600)",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              2,119
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "var(--ink-500)",
              }}
            >
              Visitors
            </div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "11px",
                color: "var(--ink-400)",
              }}
            >
              Last 30 days
            </div>
          </div>
          <div
            style={{
              padding: "20px 24px",
              background:
                "linear-gradient(135deg, rgba(240,138,104,0.07), rgba(240,138,104,0.03))",
              border: "1px solid rgba(240,138,104,0.2)",
              borderRadius: "14px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
                fontWeight: 700,
                color: "var(--coral-500)",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              10,417
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "var(--ink-500)",
              }}
            >
              Page Views
            </div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "11px",
                color: "var(--ink-400)",
              }}
            >
              Last 30 days
            </div>
          </div>
        </div>
        <p style={{ marginTop: "16px" }}>
          These numbers grow every month as more students discover BairePorbo
          through search, social media, and word of mouth within Bangladesh&apos;s
          higher education community.
        </p>
      </>
    ),
  },
  {
    id: "who-we-work-with",
    title: "Who we collaborate with",
    body: (
      <>
        <p>
          We welcome meaningful collaboration with organisations that share our
          goal of expanding higher education access for students from Bangladesh.
        </p>
        <ul>
          <li>
            <strong>Universities</strong> — List your programmes and scholarships
            directly with students who are actively searching.
          </li>
          <li>
            <strong>Scholarship providers</strong> — Reach motivated, eligible
            applicants and increase the quality of your applicant pool.
          </li>
          <li>
            <strong>Education organisations</strong> — NGOs, foundations, and
            government agencies working on access to higher education.
          </li>
          <li>
            <strong>Student communities</strong> — Alumni networks, study groups,
            and student unions focused on international education.
          </li>
          <li>
            <strong>Study abroad service providers</strong> — Visa consultants,
            test-prep centres, and admissions coaches serving Bangladeshi students.
          </li>
          <li>
            <strong>EdTech companies</strong> — Platforms and tools that help
            students build stronger applications or prepare for study abroad.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "what-we-offer",
    title: "What a partnership looks like",
    body: (
      <>
        <p>
          Every partnership is different. Depending on who you are and what you
          are trying to achieve, we can explore:
        </p>
        <ul>
          <li>
            <strong>Featured scholarship listings</strong> — Prominently placed on
            the scholarships feed and highlighted in AI-powered search results.
          </li>
          <li>
            <strong>Co-created content</strong> — Guides, webinar recaps, and
            resources published under both brands.
          </li>
          <li>
            <strong>Sponsored placements</strong> — Tasteful, clearly labelled
            placement within the platform for tools and services relevant to our
            audience.
          </li>
          <li>
            <strong>Community promotion</strong> — Featuring your opportunity
            across our social channels and student community outreach.
          </li>
          <li>
            <strong>Custom integrations</strong> — For larger partners, we can
            discuss API access or deeper technical collaboration.
          </li>
        </ul>
        <p>
          We are selective about partnerships. We will only promote organisations
          and opportunities that are genuinely useful to students.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Get in touch",
    body: (
      <>
        <p>
          If you represent a university, scholarship body, or organisation
          interested in reaching ambitious Bangladeshi students, we would love to
          hear from you.
        </p>
        <p>
          Email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with a brief
          description of your organisation and what kind of collaboration you have
          in mind. We read every message and typically reply within 24 hours on
          weekdays.
        </p>
      </>
    ),
  },
];

export default function PartnerPage() {
  return (
    <LegalLayout
      kicker="Partnerships"
      title="Partner with us"
      intro={
        <p>
          <strong>BairePorbo</strong> helps students discover scholarships,
          fellowships, and higher education opportunities from around the world. We
          welcome collaboration with universities, scholarship providers, and
          organisations that want to reach motivated students from Bangladesh.
        </p>
      }
      sections={sections}
      contact={
        <p>
          Ready to explore a partnership?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> — tell us about
          your organisation and what you have in mind.
        </p>
      }
    />
  );
}
