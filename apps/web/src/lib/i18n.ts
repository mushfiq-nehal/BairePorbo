/**
 * Single source of truth for the site's international-SEO wiring.
 *
 * Strategy (SEO-safe, zero-migration):
 *   • English is the default locale and lives at the UNPREFIXED paths that are
 *     already indexed (e.g. /, /scholarships/xyz). Nothing moves, so no
 *     existing ranking is put at risk.
 *   • Bangla lives under the /bn prefix, and ONLY for pages whose *main* content
 *     is genuinely translated (currently the homepage). We deliberately do NOT
 *     mirror DB-content pages (scholarship/guide details) in /bn, because their
 *     body text is English in the database — duplicating them would create
 *     cross-locale duplicate content that suppresses site-wide quality signals.
 *
 * To localize another page later: translate its content, create the /bn route,
 * and add its logical path to `localizedPaths`. hreflang, the language toggle,
 * and the sitemap all read from here, so they stay in sync automatically.
 */

export const locales = ["en", "bn"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const BASE_URL = "https://baireporbo.app";

/**
 * Logical (locale-agnostic) paths that have a real, translated Bangla version.
 * "/" is the homepage. Keep leading slash, no /bn prefix, no trailing slash.
 */
export const localizedPaths: readonly string[] = ["/"];

export function enUrl(path: string): string {
  return path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`;
}

export function bnUrl(path: string): string {
  return path === "/" ? `${BASE_URL}/bn` : `${BASE_URL}/bn${path}`;
}

/**
 * hreflang set for a localizable path. Includes a self-referencing entry for
 * each locale plus x-default → English (all reciprocal, per Google's rules).
 * Note: Next's `alternates.languages` does not auto-add the current locale, so
 * we list every locale explicitly.
 */
export function languageAlternates(path: string): Record<string, string> {
  return {
    en: enUrl(path),
    bn: bnUrl(path),
    "x-default": enUrl(path),
  };
}

/** Metadata `alternates` for a page: self-canonical per locale + hreflang set. */
export function alternatesFor(path: string, locale: Locale) {
  return {
    canonical: locale === "bn" ? bnUrl(path) : enUrl(path),
    languages: languageAlternates(path),
  };
}

/**
 * Given the current pathname, return where the language toggle should send the
 * user and which locale that is — or null when the page has no localized
 * counterpart (in which case the toggle falls back to a client-side chrome
 * switch, keeping the same URL).
 */
export function toggleTarget(pathname: string): { href: string; locale: Locale } | null {
  // On a /bn page → back to the English (unprefixed) equivalent.
  if (pathname === "/bn" || pathname === "/bn/") return { href: "/", locale: "en" };
  if (pathname.startsWith("/bn/")) return { href: pathname.slice(3) || "/", locale: "en" };

  // On an English page → to /bn, but only if that page is actually localized.
  const logical = pathname || "/";
  if (localizedPaths.includes(logical)) {
    return { href: logical === "/" ? "/bn" : `/bn${logical}`, locale: "bn" };
  }
  return null;
}
