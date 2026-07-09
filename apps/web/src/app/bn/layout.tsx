"use client";

import { useEffect } from "react";
import { LangProvider } from "@/lib/lang-context";

/**
 * Layout for the Bangla (/bn) locale subtree. It re-provides the language
 * context in FORCED Bangla mode so every descendant renders Bangla on the
 * server — the HTML crawlers index matches what users see, with no flash and
 * no headers()/cookies() (the whole subtree stays statically renderable).
 *
 * The root <html lang> is fixed to "en" by the root layout; we correct it to
 * "bn" on the client for accessibility/Bing (a weak, best-effort signal —
 * hreflang + fully-translated visible content are the primary locale signals).
 */
export default function BanglaLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = "bn";
    return () => {
      document.documentElement.lang = prev;
    };
  }, []);

  return (
    <LangProvider defaultLang="bn" forced>
      {children}
    </LangProvider>
  );
}
