"use client";

import { useLang } from "@/lib/lang-context";
import styles from "./lang-toggle.module.css";

export default function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      aria-label={lang === "en" ? "বাংলায় পড়ুন" : "Switch to English"}
      title={lang === "en" ? "Switch to Bangla" : "Switch to English"}
    >
      {lang === "en" ? "বাংলা" : "English"}
    </button>
  );
}
