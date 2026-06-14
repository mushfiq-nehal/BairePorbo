"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSignUp, useSignIn } from "@clerk/nextjs";
import { useT } from "@/lib/lang-context";
import styles from "../auth.module.css";

const BLOCKED_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "guerrillamail.info",
  "guerrillamail.biz", "guerrillamail.de", "guerrillamail.net", "guerrillamail.org",
  "spam4.me", "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
  "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
  "trashmail.at", "trashmail.com", "trashmail.io", "trashmail.me",
  "trashmail.net", "dispostable.com", "fakeinbox.com", "maildrop.cc",
  "mailnull.com", "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "minutemail.com", "mohmal.com", "discard.email", "spamhereplease.com",
  "binkmail.com", "bobmail.info", "chammy.info", "devnullmail.com",
  "dingbone.com", "dump-email.info", "fakemail.fr", "filzmail.com",
  "gowikibooks.com", "gowikicampus.com", "gowikicars.com", "gowikifilms.com",
  "gowikigames.com", "gowikimusic.com", "gowikinetwork.com", "gowikitravel.com",
  "gowikitv.com", "inoutmail.de", "inoutmail.eu", "inoutmail.info",
  "inoutmail.net", "jnxjn.com", "jourrapide.com", "klassmaster.com",
  "put2.net", "spamfree24.org", "spamfree24.de", "spamfree24.eu",
  "spamfree24.info", "spamfree24.net", "tempr.email", "tmail.com",
  "tmailinator.com", "toppmail.com", "trash-mail.at", "trashdevil.com",
  "trashdevil.de", "trashemail.de", "wegwerfmail.de", "wegwerfmail.net",
  "wegwerfmail.org", "wh4f.org", "whyspam.me", "willhackforfood.biz",
  "wuzupmail.net", "xagloo.com", "yuurok.com", "zippymail.info",
]);

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) return "Please enter a valid email address.";
  const domain = trimmed.split("@")[1];
  if (!domain || domain.split(".").pop()!.length < 2) {
    return "Please use a valid email domain (e.g. gmail.com).";
  }
  if (BLOCKED_DOMAINS.has(domain)) {
    return "Disposable email addresses are not allowed. Please use your real email.";
  }
  return null;
}

export default function SignupPage() {
  const t = useT();
  const { signUp, isLoaded: signUpLoaded } = useSignUp() as any;
  const { signIn, isLoaded: signInLoaded } = useSignIn() as any;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleEmailBlur = () => setEmailError(validateEmail(email));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded) return;
    setError(null);

    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: fullName.split(" ")[0] ?? fullName,
        lastName: fullName.split(" ").slice(1).join(" ") || undefined,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (signUp as any).prepareEmailAddressVerification({ strategy: "email_code" });
      setDone(true);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; code?: string }[] };
      const first = clerkErr?.errors?.[0];
      if (first?.code === "form_identifier_exists") {
        setError("An account with this email already exists. Please sign in instead.");
      } else {
        setError(first?.message ?? "Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clerkInstance = (window as any).Clerk;
      if (!clerkInstance?.loaded) {
        setError("Authentication not ready. Please refresh and try again.");
        return;
      }
      await clerkInstance.client.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/auth/callback`,
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: unknown) {
      console.error("Google OAuth error:", err);
      const clerkErr = err as { errors?: { message: string }[]; message?: string };
      setError(clerkErr?.errors?.[0]?.message ?? clerkErr?.message ?? String(err));
    }
  };

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <Image src="/logo.png" alt="BairePorbo Logo" width={28} height={28} className={styles.logoImage} />
            <span className={styles.logoText}>BairePorbo</span>
          </div>
          <h1 className={styles.heading}>{t("signup.successHeading")}</h1>
          <p className={styles.sub}>{t("signup.successSub")}</p>
          <Link href="/auth/login" className={styles.primaryBtn} style={{ display: "block", textAlign: "center", marginTop: 20 }}>
            {t("signup.signInNow")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Image src="/logo.png" alt="BairePorbo Logo" width={28} height={28} className={styles.logoImage} />
          <span className={styles.logoText}>BairePorbo</span>
        </div>
        <h1 className={styles.heading}>{t("signup.heading")}</h1>
        <p className={styles.sub}>{t("signup.sub")}</p>

        <button type="button" onClick={handleGoogleSignIn} className={styles.googleBtn}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t("signup.continueWithGoogle")}
        </button>

        <div className={styles.divider}>OR</div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="fullName">{t("signup.fullName")}</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("signup.fullNamePlaceholder")}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">{t("signup.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
              onBlur={handleEmailBlur}
              placeholder="you@example.com"
              aria-invalid={!!emailError}
            />
            {emailError && <p className={styles.error} style={{ marginTop: 4 }}>{emailError}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="password">{t("signup.password")}</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("signup.passwordPlaceholder")}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.primaryBtn} disabled={loading || !signUpLoaded}>
            {loading ? t("signup.creating") : t("signup.create")}
          </button>

          <p className={styles.consent}>
            {t("signup.consentPre")}{" "}
            <Link href="/legal/terms">{t("signup.terms")}</Link>{" "}
            {t("signup.and")}{" "}
            <Link href="/legal/privacy">{t("signup.privacy")}</Link>
            {t("signup.consentPost")}
          </p>
        </form>

        <p className={styles.switchLink}>
          {t("signup.haveAccount")}{" "}
          <Link href="/auth/login">{t("signup.signIn")}</Link>
        </p>
      </div>
    </div>
  );
}
