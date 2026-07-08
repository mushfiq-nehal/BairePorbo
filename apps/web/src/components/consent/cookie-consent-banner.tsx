"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  getStoredConsent,
  setStoredConsent,
  type ConsentChoice,
} from "@/lib/consent";
import styles from "./cookie-consent-banner.module.css";

const META_PIXEL_ID = "1567668045069288";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: unknown;
    };
    _fbq?: Window["fbq"];
  }
}

/** Tells Google Consent Mode v2 whether ad/analytics storage is allowed. */
function updateGoogleConsent(choice: ConsentChoice) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const state = choice === "accepted" ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: state,
    analytics_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  });
}

let metaPixelLoaded = false;

/** Loads the Meta Pixel only after the visitor has accepted cookies. */
function loadMetaPixel() {
  if (metaPixelLoaded || typeof window === "undefined") return;
  metaPixelLoaded = true;

  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue!.push(args);
      }
    } as NonNullable<Window["fbq"]>;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored === "accepted") {
      loadMetaPixel();
    } else if (stored === null) {
      setVisible(true);
    }

    const handleReopen = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleReopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleReopen);
  }, []);

  const handleChoice = (choice: ConsentChoice) => {
    setStoredConsent(choice);
    updateGoogleConsent(choice);
    if (choice === "accepted") loadMetaPixel();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.wrapper} role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className={styles.card}>
        <p className={styles.text}>
          We use essential cookies to run BairePorbo. With your permission, we also use
          cookies from Google AdSense and Meta to measure traffic and show relevant ads.
          See our <Link href="/legal/cookies">Cookie Policy</Link> for details.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.rejectBtn}
            onClick={() => handleChoice("rejected")}
          >
            Reject
          </button>
          <button
            type="button"
            className={styles.acceptBtn}
            onClick={() => handleChoice("accepted")}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
