"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "./translations";

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

const LangContext = createContext<LangContextType>({
  lang: "bn",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
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
      localStorage.setItem("bp_lang", l);
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
