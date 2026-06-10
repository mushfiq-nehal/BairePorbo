import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "../legal-layout";

const SUPPORT_EMAIL = "support@baireporbo.app";
const FACEBOOK_URL = "https://www.facebook.com/baireporbo/";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the BairePorbo team for support, feedback, or partnership inquiries.",
};

const sections: LegalSection[] = [
  {
    id: "email",
    title: "Email",
    body: (
      <>
        <p>
          The fastest way to reach us is by email. Send your message to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will
          get back to you as soon as we can.
        </p>
        <p>
          Please include enough detail so we can help — for example, the page you
          were on, what you were trying to do, and any error messages you saw.
          Screenshots are welcome.
        </p>
      </>
    ),
  },
  {
    id: "social",
    title: "Facebook",
    body: (
      <>
        <p>
          Follow and message us on{" "}
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
            Facebook
          </a>{" "}
          for updates, tips, and community discussion. We check messages there
          regularly, though email is usually quicker for account or technical
          issues.
        </p>
      </>
    ),
  },
  {
    id: "what-to-contact",
    title: "What you can contact us about",
    body: (
      <>
        <ul>
          <li>
            <strong>Account help</strong> — Login issues, password resets, or
            questions about your profile.
          </li>
          <li>
            <strong>Scholarship listings</strong> — Report outdated deadlines,
            broken links, or opportunities we should add.
          </li>
          <li>
            <strong>Privacy &amp; data</strong> — Request account deletion or
            ask how your data is handled. See our{" "}
            <a href="/legal/privacy">Privacy policy</a> for details.
          </li>
          <li>
            <strong>Feedback</strong> — Feature ideas, bug reports, or anything
            that would make BairePorbo more useful for you.
          </li>
          <li>
            <strong>Partnerships</strong> — Universities, NGOs, or organisations
            interested in listing scholarships or collaborating.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "response-time",
    title: "Response time",
    body: (
      <>
        <p>
          We are a small team and read every message ourselves. We typically
          reply within <strong>24 hours</strong> on weekdays. Messages sent on
          weekends or public holidays may take a little longer.
        </p>
        <p>
          If your issue is urgent — for example, a scholarship deadline is
          tomorrow — mention that in the subject line so we can prioritise it.
        </p>
      </>
    ),
  },
];

export default function ContactPage() {
  return (
    <LegalLayout
      kicker="Support"
      title="Contact us"
      intro={
        <p>
          We&apos;re here to help. Whether you have a technical question, spotted
          something wrong with a scholarship listing, or just want to say hello —
          reach out using any of the channels below.
        </p>
      }
      sections={sections}
      contact={
        <p>
          Ready to write? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> — we&apos;d
          love to hear from you.
        </p>
      }
    />
  );
}
