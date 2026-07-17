/**
 * Bilingual strings for the mobile app. Values are taken verbatim from the web
 * app's copy (apps/web/src/lib/translations.ts) wherever an equivalent exists,
 * so the two clients read identically. A few mobile-only functional strings are
 * faithful translations in the same voice. Note: the brand is always written
 * "BairePorbo" — never transliterated — matching the web.
 */
export type Lang = "en" | "bn";

export const translations = {
  // ── Common ──
  "app.name": { en: "BairePorbo", bn: "BairePorbo" },
  "common.retry": { en: "Try again", bn: "আবার চেষ্টা করুন" },
  "common.cancel": { en: "Cancel", bn: "বাতিল করুন" },
  "common.close": { en: "Close", bn: "বন্ধ" },
  "common.featured": { en: "Featured", bn: "Featured" },

  // ── Tabs ──
  "tab.home": { en: "Home", bn: "হোম" },
  "tab.discover": { en: "Scholarships", bn: "স্কলারশিপ" },
  "tab.mentor": { en: "Mentor", bn: "মেন্টর" },
  "tab.profile": { en: "Profile", bn: "Profile" },

  // ── Auth (from login.* / signup.*) ──
  "auth.welcomeBack": { en: "Welcome back", bn: "স্বাগতম" },
  "auth.signInSubtitle": {
    en: "Sign in to continue to your account",
    bn: "আপনার একাউন্টে প্রবেশ করতে সাইন ইন করুন",
  },
  "auth.email": { en: "Email", bn: "Email" },
  "auth.password": { en: "Password", bn: "Password" },
  "auth.signIn": { en: "Sign in", bn: "সাইন ইন" },
  "auth.signInFailed": {
    en: "Sign in failed. Check your email and password.",
    bn: "সাইন ইন ব্যর্থ। আপনার Email ও Password যাচাই করুন।",
  },
  "auth.noAccount": { en: "Don't have an account? ", bn: "একাউন্ট নেই? " },
  "auth.signUp": { en: "Create one", bn: "তৈরি করুন" },
  "auth.createAccount": { en: "Create your account", bn: "আপনার একাউন্ট তৈরি করুন" },
  "auth.createAccountButton": { en: "Create account", bn: "একাউন্ট তৈরি করুন" },
  "auth.haveAccount": { en: "Already have an account? ", bn: "ইতিমধ্যে একাউন্ট আছে? " },
  "auth.continue": { en: "Create account", bn: "একাউন্ট তৈরি করুন" },
  "auth.orDivider": { en: "or", bn: "অথবা" },
  "auth.google": { en: "Continue with Google", bn: "Google দিয়ে চালিয়ে যান" },
  "auth.verifyPrompt": { en: "We sent a 6-digit code to", bn: "আমরা একটি ৬-সংখ্যার কোড পাঠিয়েছি" },
  "auth.verifyCode": { en: "Verification code", bn: "ভেরিফিকেশন কোড" },
  "auth.verify": { en: "Verify & create account", bn: "ভেরিফাই করে একাউন্ট তৈরি করুন" },
  "auth.signUpFailed": {
    en: "Sign up failed. Try a different email.",
    bn: "সাইন আপ ব্যর্থ। অন্য Email চেষ্টা করুন।",
  },
  "auth.twoFactorUnsupported": {
    en: "This account uses two-factor authentication, which the app doesn't support yet. Sign in with Google, or disable 2FA on the web.",
    bn: "এই একাউন্টে টু-ফ্যাক্টর অথেন্টিকেশন আছে, যা app-এ এখনো সমর্থিত নয়। Google দিয়ে সাইন ইন করুন, অথবা ওয়েবে 2FA বন্ধ করুন।",
  },

  // ── Home (from home.* hero) ──
  "home.kicker": {
    en: "AI scholarship compass for Bangladesh",
    bn: "বাংলাদেশের শিক্ষার্থীদের জন্য AI ভিত্তিক স্কলারশিপ প্ল্যাটফর্ম",
  },
  "home.welcomeTitle": {
    en: "Find scholarships that fit your story, not just your grades.",
    bn: "এমন স্কলারশিপ খুঁজুন যা আপনার গল্পের সাথে মানানসই, CGPA এর সাথে নয়।",
  },
  "home.welcomeSubtitle": {
    en: "BairePorbo guides students through higher-study decisions with explainable AI, localized advice, and a curated scholarship map.",
    bn: "BairePorbo — এর Advanced AI Model সমৃদ্ধ AI Mentor, Expert দের গাইডলাইন আর curated scholarship তোমার Higher Study র যাত্রা কে করবে সহজ।",
  },
  "home.exploreTitle": { en: "Browse all scholarships", bn: "সব scholarship দেখুন" },
  "home.exploreSubtitle": { en: "scholarships across 30+ countries", bn: "৩০+ দেশের scholarships" },
  "home.mentorTitle": { en: "Ask BairePorbo Mentor", bn: "BairePorbo Mentor-কে জিজ্ঞেস করুন" },
  "home.mentorSubtitle": { en: "AI guidance", bn: "AI সহায়তা" },

  // ── Discover / Scholarships (from scholarships.*) ──
  "discover.loadError": { en: "Couldn't load scholarships.", bn: "Scholarship লোড করা যায়নি।" },
  "discover.empty": {
    en: "No scholarships match those filters yet.",
    bn: "এই filter-এ কোনো scholarship পাওয়া যাচ্ছে না।",
  },
  "discover.filters": { en: "Filters", bn: "ফিল্টার" },
  "discover.filterCountry": { en: "Country", bn: "দেশ" },
  "discover.filterDegree": { en: "Level", bn: "Level" },
  "discover.filterFunding": { en: "Funding", bn: "Funding" },
  "discover.apply": { en: "Show results", bn: "ফলাফল দেখুন" },
  "discover.clear": { en: "Clear", bn: "মুছুন" },
  "discover.resultsCount": { en: "scholarships", bn: "scholarship" },

  // ── Scholarship detail ──
  "detail.about": { en: "About", bn: "সম্পর্কে" },
  "detail.eligibility": { en: "Eligibility", bn: "যোগ্যতা" },
  "detail.benefits": { en: "Benefits", bn: "সুবিধা" },
  "detail.requiredDocuments": { en: "Required documents", bn: "প্রয়োজনীয় ডকুমেন্ট" },
  "detail.coreDocuments": { en: "Essential", bn: "অপরিহার্য" },
  "detail.additionalDocuments": { en: "Sometimes required", bn: "কখনো কখনো প্রয়োজন" },
  "detail.generateDocs": { en: "Show document checklist", bn: "ডকুমেন্ট চেকলিস্ট দেখুন" },
  "detail.docsError": { en: "Couldn't load documents.", bn: "ডকুমেন্ট লোড করা যায়নি।" },
  "detail.applyNow": { en: "Apply on official site", bn: "অফিসিয়াল সাইটে আবেদন করুন" },
  "detail.notFound": { en: "Scholarship not found.", bn: "Scholarship পাওয়া যায়নি।" },

  // ── Chat (from chat.*) ──
  "chat.placeholder": { en: "Ask anything…", bn: "যেকোনো কিছু জিজ্ঞেস করুন…" },
  "chat.emptyHint": {
    en: "Ask about scholarships, IELTS, SOP writing, and more.",
    bn: "Scholarship, IELTS, SOP writing ও আরো নিয়ে জিজ্ঞেস করুন।",
  },
  "chat.error": { en: "Something went wrong. Please try again.", bn: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।" },
  "chat.history": { en: "History", bn: "ইতিহাস" },
  "chat.newChat": { en: "New chat", bn: "নতুন Chat" },
  "chat.noSessions": { en: "No past conversations yet.", bn: "এখনো কোনো পুরনো কথোপকথন নেই।" },
  "chat.delete": { en: "Delete", bn: "মুছুন" },

  // ── Profile (from profile.* / dashboard.*) ──
  "profile.signedIn": { en: "Signed in", bn: "সাইন ইন করা আছে" },
  "profile.authChecking": { en: "Connecting…", bn: "সংযোগ হচ্ছে…" },
  "profile.authOk": { en: "Your account is connected.", bn: "আপনার একাউন্ট সংযুক্ত।" },
  "profile.authFail": { en: "Connection problem", bn: "সংযোগ সমস্যা" },
  "profile.noProfile": {
    en: "Complete your profile on the web to see it here.",
    bn: "এখানে দেখতে ওয়েবে আপনার profile সম্পূর্ণ করুন।",
  },
  "profile.name": { en: "Full name", bn: "পূর্ণ নাম" },
  "profile.university": { en: "University", bn: "University" },
  "profile.targetDegree": { en: "Target degree", bn: "Target Degree" },
  "profile.cgpa": { en: "CGPA", bn: "CGPA" },
  "profile.ielts": { en: "IELTS / TOEFL", bn: "IELTS / TOEFL" },
  "profile.language": { en: "Language", bn: "ভাষা" },
  "profile.signOut": { en: "Sign out", bn: "সাইন আউট" },
} as const;

export type TranslationKey = keyof typeof translations;
