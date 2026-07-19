import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout, { LegalSection } from "../legal-layout";

const LAST_UPDATED = "July 19, 2026";
const SUPPORT_EMAIL = "support@baireporbo.app";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description:
    "How to delete your BairePorbo account and the data we remove when you do.",
  alternates: { canonical: "https://baireporbo.app/legal/delete-account" },
};

const sections: LegalSection[] = [
  {
    id: "in-app",
    title: "Delete from the app",
    body: (
      <>
        <p>
          If you use the <strong>BairePorbo</strong> Android app (published by
          BairePorbo), you can delete your account directly in the app:
        </p>
        <ol>
          <li>Open the app and go to the <strong>Profile</strong> tab.</li>
          <li>Scroll to the bottom and tap <strong>Delete account</strong>.</li>
          <li>Confirm the deletion when prompted.</li>
        </ol>
        <p>
          Your account is deleted immediately and you are signed out on all
          devices.
        </p>
      </>
    ),
  },
  {
    id: "by-email",
    title: "Delete by email",
    body: (
      <>
        <p>
          If you can no longer access the app, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email
          address on your account with the subject &ldquo;Delete my
          account&rdquo;. We verify that the request comes from the account
          owner and complete the deletion within 7 days.
        </p>
      </>
    ),
  },
  {
    id: "what-is-deleted",
    title: "What gets deleted",
    body: (
      <>
        <p>Deleting your account permanently removes:</p>
        <ul>
          <li>Your sign-in credentials and account (including Google sign-in linkage).</li>
          <li>Your profile (name, education details, preferences).</li>
          <li>Saved bookmarks and tasks.</li>
          <li>CV drafts and CV analyses.</li>
          <li>AI mentor chat sessions and messages.</li>
        </ul>
        <p>
          This applies to the same account whether you used BairePorbo on the
          web or in the Android app — they share one account.
        </p>
      </>
    ),
  },
  {
    id: "what-is-kept",
    title: "What we keep, and for how long",
    body: (
      <>
        <p>
          Nothing tied to your identity is kept after deletion. Aggregated,
          anonymous usage statistics (for example, page view counts) contain no
          personal data and cannot be linked back to you. Standard server logs
          expire automatically within 30 days.
        </p>
        <p>
          If you only want some data removed (for example, chat history but not
          your account), email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we&apos;ll
          handle it without deleting the whole account.
        </p>
        <p>
          For details on what we collect in the first place, see our{" "}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
];

export default function DeleteAccountPage() {
  return (
    <LegalLayout
      kicker="Legal"
      title="Delete Your Account"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <strong>The short version:</strong> delete your account in the app
          (Profile → Delete account) or by emailing us — everything we hold
          about you is permanently removed.
        </>
      }
      sections={sections}
      contact={
        <p>
          Need help with deletion? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We typically
          reply within 24 hours.
        </p>
      }
    />
  );
}
