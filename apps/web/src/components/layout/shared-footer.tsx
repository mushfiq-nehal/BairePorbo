"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/lang-context";
import styles from "./shared-footer.module.css";

export default function SharedFooter() {
  const { userId } = useAuth();
  const t = useT();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>
            <Image
              src="/logo.png"
              alt="BairePorbo Logo"
              width={24}
              height={24}
              className={styles.footerBrandLogo}
            />
            <strong>BairePorbo</strong>
          </div>
          <p className={styles.footerTagline}>
            {t("footer.tagline").split("\n").map((line, index) => (
              <span key={`${line}-${index}`}>
                {line}
                {index === 0 && <br />}
              </span>
            ))}
          </p>
          <p className={styles.footerCopyright}>
            © {new Date().getFullYear()} BairePorbo. {t("footer.copyright")}
          </p>
        </div>

        <div className={styles.footerColumns}>
          <div className={styles.footerCol}>
            <h4>{t("footer.platform")}</h4>
            <Link href="/scholarships">{t("footer.browseScholarships")}</Link>
            <Link href="/chat">{t("nav.aiMentor")}</Link>
            <Link href="/guide">{t("footer.studyGuides")}</Link>
            <Link href={userId ? "/dashboard" : "/auth/login"}>{t("nav.dashboard")}</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>{t("footer.account")}</h4>
            <Link href="/auth/login">{t("nav.signIn")}</Link>
            <Link href="/auth/signup">{t("footer.createAccount")}</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>{t("footer.legal")}</h4>
            <Link href="/legal/about">{t("footer.aboutUs")}</Link>
            <Link href="/legal/contact">{t("footer.contactUs")}</Link>
            <Link href="/legal/privacy">{t("footer.privacyPolicy")}</Link>
            <Link href="/legal/terms">{t("footer.termsOfService")}</Link>
            <Link href="/legal/partner">{t("footer.partnerWithUs")}</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>{t("footer.connectSupport")}</h4>
            <a href="mailto:support@baireporbo.app" className={styles.footerEmail}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              support@baireporbo.app
            </a>
            <a
              href="https://www.facebook.com/baireporbo/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerEmail}
              aria-label="BairePorbo on Facebook"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
              facebook.com/baireporbo
            </a>
            <p className={styles.footerSupportNote}>{t("footer.replyTime")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
