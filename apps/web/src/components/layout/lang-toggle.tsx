"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import { toggleTarget } from "@/lib/i18n";
import styles from "./lang-toggle.module.css";

export default function LangToggle() {
  const { lang, setLang } = useLang();
  const pathname = usePathname();
  const router = useRouter();

  // If this page has a localized counterpart (e.g. / ↔ /bn), the toggle
  // NAVIGATES between the real locale URLs (better UX + reinforces the
  // indexable localized URL). Otherwise it falls back to a client-side chrome
  // switch on the same URL (for pages we intentionally don't mirror in /bn).
  const target = toggleTarget(pathname ?? "/");
  const effectiveLang = target ? (target.locale === "en" ? "bn" : "en") : lang;

  const handleClick = () => {
    if (target) {
      setLang(target.locale); // persist preference for non-localized pages too
      router.push(target.href);
    } else {
      setLang(lang === "en" ? "bn" : "en");
    }
  };

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={handleClick}
      aria-label={effectiveLang === "en" ? "বাংলায় পড়ুন" : "Switch to English"}
      title={effectiveLang === "en" ? "Switch to Bangla" : "Switch to English"}
    >
      {effectiveLang === "en" ? "বাংলা" : "English"}
    </button>
  );
}
