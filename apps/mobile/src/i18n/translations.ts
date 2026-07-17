/**
 * Bilingual strings for the mobile app. Same shape as the web `translations`
 * map (apps/web/src/lib/translations.ts) — a subset scoped to the mobile
 * screens. Add keys here as screens grow.
 */
export type Lang = "en" | "bn";

export const translations = {
  // ── Common ──
  "app.name": { en: "BairePorbo", bn: "বাইরে পড়" },
  "common.retry": { en: "Retry", bn: "আবার চেষ্টা" },
  "common.loading": { en: "Loading…", bn: "লোড হচ্ছে…" },
  "common.cancel": { en: "Cancel", bn: "বাতিল" },
  "common.close": { en: "Close", bn: "বন্ধ" },
  "common.langLabel": { en: "বাংলা", bn: "English" },

  // ── Tabs ──
  "tab.home": { en: "Home", bn: "হোম" },
  "tab.discover": { en: "Discover", bn: "খুঁজুন" },
  "tab.mentor": { en: "Mentor", bn: "মেন্টর" },
  "tab.profile": { en: "Profile", bn: "প্রোফাইল" },

  // ── Auth ──
  "auth.signInTitle": { en: "BairePorbo", bn: "বাইরে পড়" },
  "auth.signInSubtitle": { en: "Sign in to continue", bn: "চালিয়ে যেতে সাইন ইন করুন" },
  "auth.email": { en: "Email", bn: "ইমেইল" },
  "auth.password": { en: "Password", bn: "পাসওয়ার্ড" },
  "auth.signIn": { en: "Sign in", bn: "সাইন ইন" },
  "auth.signInFailed": {
    en: "Sign in failed. Check your email and password.",
    bn: "সাইন ইন ব্যর্থ। ইমেইল ও পাসওয়ার্ড যাচাই করুন।",
  },
  "auth.noAccount": { en: "No account? ", bn: "অ্যাকাউন্ট নেই? " },
  "auth.signUp": { en: "Sign up", bn: "সাইন আপ" },
  "auth.createAccount": { en: "Create account", bn: "অ্যাকাউন্ট তৈরি করুন" },
  "auth.haveAccount": { en: "Have an account? ", bn: "অ্যাকাউন্ট আছে? " },
  "auth.continue": { en: "Continue", bn: "চালিয়ে যান" },
  "auth.orDivider": { en: "or", bn: "অথবা" },
  "auth.google": { en: "Continue with Google", bn: "Google দিয়ে চালিয়ে যান" },
  "auth.verifyPrompt": { en: "Enter the code sent to", bn: "কোড লিখুন — পাঠানো হয়েছে" },
  "auth.verifyCode": { en: "Verification code", bn: "যাচাই কোড" },
  "auth.verify": { en: "Verify", bn: "যাচাই" },
  "auth.signUpFailed": {
    en: "Sign up failed. Try a different email.",
    bn: "সাইন আপ ব্যর্থ। অন্য ইমেইল চেষ্টা করুন।",
  },
  "auth.twoFactorUnsupported": {
    en: "This account uses two-factor authentication, which the app doesn't support yet. Sign in with Google, or disable 2FA on the web.",
    bn: "এই অ্যাকাউন্টে টু-ফ্যাক্টর অথেন্টিকেশন আছে, যা অ্যাপে এখনো সমর্থিত নয়। Google দিয়ে সাইন ইন করুন, অথবা ওয়েবে 2FA বন্ধ করুন।",
  },

  // ── Home ──
  "home.welcomeTitle": { en: "Welcome to BairePorbo", bn: "বাইরে পড়-এ স্বাগতম" },
  "home.welcomeSubtitle": {
    en: "Your scholarship companion. Browse opportunities and chat with the AI mentor.",
    bn: "আপনার স্কলারশিপ সঙ্গী। সুযোগ দেখুন আর AI মেন্টরের সাথে কথা বলুন।",
  },
  "home.explore": { en: "🎓 Explore scholarships", bn: "🎓 স্কলারশিপ দেখুন" },
  "home.askMentor": { en: "💬 Ask the AI mentor", bn: "💬 AI মেন্টরকে জিজ্ঞাসা করুন" },

  // ── Discover ──
  "discover.loadError": { en: "Couldn't load scholarships.", bn: "স্কলারশিপ লোড করা যায়নি।" },
  "discover.empty": { en: "No scholarships found.", bn: "কোনো স্কলারশিপ পাওয়া যায়নি।" },
  "discover.flagship": { en: "★ Flagship", bn: "★ ফ্ল্যাগশিপ" },
  "discover.filters": { en: "Filters", bn: "ফিল্টার" },
  "discover.filterCountry": { en: "Country", bn: "দেশ" },
  "discover.filterDegree": { en: "Degree level", bn: "ডিগ্রি" },
  "discover.filterFunding": { en: "Funding", bn: "ফান্ডিং" },
  "discover.apply": { en: "Show results", bn: "ফলাফল দেখুন" },
  "discover.clear": { en: "Clear all", bn: "সব মুছুন" },
  "discover.resultsCount": { en: "scholarships", bn: "স্কলারশিপ" },

  // ── Scholarship detail ──
  "detail.about": { en: "About", bn: "সম্পর্কে" },
  "detail.eligibility": { en: "Eligibility", bn: "যোগ্যতা" },
  "detail.benefits": { en: "Benefits", bn: "সুবিধা" },
  "detail.requiredDocuments": { en: "Required documents", bn: "প্রয়োজনীয় নথি" },
  "detail.coreDocuments": { en: "Essential", bn: "অপরিহার্য" },
  "detail.additionalDocuments": { en: "Sometimes required", bn: "কখনো কখনো প্রয়োজন" },
  "detail.generateDocs": { en: "Show document checklist", bn: "নথির তালিকা দেখুন" },
  "detail.docsError": { en: "Couldn't load documents.", bn: "নথি লোড করা যায়নি।" },
  "detail.applyNow": { en: "Apply on official site", bn: "অফিসিয়াল সাইটে আবেদন করুন" },
  "detail.notFound": { en: "Scholarship not found.", bn: "স্কলারশিপ পাওয়া যায়নি।" },

  // ── Chat ──
  "chat.placeholder": { en: "Message the mentor…", bn: "মেন্টরকে লিখুন…" },
  "chat.emptyHint": {
    en: "Ask BairePorbo Mentor about scholarships, IELTS, SOPs, and more.",
    bn: "স্কলারশিপ, IELTS, SOP নিয়ে বাইরে পড় মেন্টরকে জিজ্ঞাসা করুন।",
  },
  "chat.error": { en: "Something went wrong. Please try again.", bn: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।" },
  "chat.history": { en: "History", bn: "ইতিহাস" },
  "chat.newChat": { en: "New chat", bn: "নতুন চ্যাট" },
  "chat.noSessions": { en: "No conversations yet.", bn: "এখনো কোনো কথোপকথন নেই।" },
  "chat.delete": { en: "Delete", bn: "মুছুন" },

  // ── Profile ──
  "profile.signedIn": { en: "Signed in", bn: "সাইন ইন করা আছে" },
  "profile.authChecking": { en: "Checking Bearer-token auth…", bn: "Bearer টোকেন যাচাই হচ্ছে…" },
  "profile.authOk": {
    en: "✓ Bearer-token auth accepted by the backend.",
    bn: "✓ Bearer টোকেন ব্যাকএন্ড গ্রহণ করেছে।",
  },
  "profile.authFail": { en: "Auth failed", bn: "অথেন্টিকেশন ব্যর্থ" },
  "profile.noProfile": {
    en: "No profile fields yet. Complete your profile on the web or in a later update.",
    bn: "এখনো প্রোফাইল তথ্য নেই। ওয়েবে বা পরবর্তী আপডেটে প্রোফাইল পূরণ করুন।",
  },
  "profile.name": { en: "Name", bn: "নাম" },
  "profile.university": { en: "University", bn: "বিশ্ববিদ্যালয়" },
  "profile.targetDegree": { en: "Target degree", bn: "লক্ষ্য ডিগ্রি" },
  "profile.cgpa": { en: "CGPA", bn: "সিজিপিএ" },
  "profile.ielts": { en: "IELTS", bn: "IELTS" },
  "profile.language": { en: "Language", bn: "ভাষা" },
  "profile.signOut": { en: "Sign out", bn: "সাইন আউট" },
} as const;

export type TranslationKey = keyof typeof translations;
