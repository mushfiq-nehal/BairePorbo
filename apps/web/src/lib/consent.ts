/**
 * Cookie consent state, shared between the consent banner, the footer's
 * "Cookie settings" link, and the legal pages. We keep this deliberately
 * simple (accept / reject) rather than a full preference center, since the
 * only non-essential cookies on BairePorbo are advertising (Google AdSense)
 * and marketing measurement (Meta Pixel).
 */

export type ConsentChoice = "accepted" | "rejected";

const STORAGE_KEY = "bp_cookie_consent";

/** Fired on `window` when the footer's "Cookie settings" link is clicked. */
export const OPEN_COOKIE_SETTINGS_EVENT = "bp:open-cookie-settings";

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function setStoredConsent(choice: ConsentChoice) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage may be unavailable (private browsing) — the choice still
    // applies to the current session via in-memory state.
  }
}

/** Reopens the cookie banner so the visitor can change an earlier choice. */
export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
  }
}
