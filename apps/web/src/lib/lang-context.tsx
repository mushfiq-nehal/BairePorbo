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
  defaultLang = "en",
  forced = false,
}: {
  children: ReactNode;
  defaultLang?: Lang;
  /**
   * When true, the locale is dictated by the route (e.g. the /bn subtree) and
   * must NOT be overridden by localStorage/navigator. This keeps the SSR output
   * deterministic and identical to what crawlers index — no client-side flash.
   */
  forced?: boolean;
}) {
  // Start from English so the server-rendered (crawlable) markup matches the
  // <html lang="en"> attribute — this keeps hydration deterministic and lets
  // every page render statically (no headers()/cookies() on the server).
  const [lang, setLangState] = useState<Lang>(defaultLang);

  useEffect(() => {
    if (forced) return; // route-driven locale — never auto-switch
    try {
      // 1) Explicit user preference always wins.
      const stored = localStorage.getItem("bp_lang") as Lang | null;
      if (stored === "bn" || stored === "en") {
        setLangState(stored);
        return;
      }
      // 2) No stored preference → infer from the browser locale. This replaces
      //    the old server-side geo detection while keeping the app static:
      //    Bangla-locale visitors (e.g. bn-BD) still get Bangla automatically.
      if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("bn")) {
        setLangState("bn");
      }
    } catch {
      // ignore
    }
  }, [forced]);

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
