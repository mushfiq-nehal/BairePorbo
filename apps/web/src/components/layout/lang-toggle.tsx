"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import { toggleTarget } from "@/lib/i18n";
import styles from "./lang-toggle.module.css";

export default function LangToggle() {
  const { lang, setLang } = useLang();
  const pathname = usePathname();

  // If this page has a localized counterpart (e.g. / ↔ /bn), the toggle
  // NAVIGATES between the real locale URLs (better UX + reinforces the
  // indexable localized URL). Otherwise it falls back to a client-side chrome
  // switch on the same URL (for pages we intentionally don't mirror in /bn).
  const target = toggleTarget(pathname ?? "/");
  const effectiveLang = target ? (target.locale === "en" ? "bn" : "en") : lang;
  const label = effectiveLang === "en" ? "বাংলা" : "English";
  const aria = effectiveLang === "en" ? "বাংলায় পড়ুন" : "Switch to English";
  const title = effectiveLang === "en" ? "Switch to Bangla" : "Switch to English";

  if (target) {
    return (
      <Link
        href={target.href}
        className={styles.toggle}
        hrefLang={target.locale}
        onClick={() => setLang(target.locale)}
        aria-label={aria}
        title={title}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      aria-label={aria}
      title={title}
    >
      {label}
    </button>
  );
}
