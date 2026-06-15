"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "./translations";

export type { Lang };

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

const LangContext = createContext<LangContextType>({
  lang: "bn",
  setLang: () => {},
});

export function LangProvider({
  children,
  defaultLang = "bn",
}: {
  children: ReactNode;
  defaultLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  useEffect(() => {
    // Explicit user preference (localStorage) overrides the geo-based default
    try {
      const stored = localStorage.getItem("bp_lang") as Lang | null;
      if (stored === "bn" || stored === "en") {
        setLangState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      // Persist to localStorage for client-side reads
      localStorage.setItem("bp_lang", l);
      // Persist to cookie so future server renders respect the explicit choice
      document.cookie = `bp_lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch {
      // ignore
    }
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

/** Returns a translate function scoped to the current language. */
export function useT() {
  const { lang } = useLang();
  return (key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key as string;
    return (entry as Record<Lang, string>)[lang] ?? (entry as Record<Lang, string>).en ?? (key as string);
  };
}
