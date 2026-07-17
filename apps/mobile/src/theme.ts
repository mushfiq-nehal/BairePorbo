/**
 * Design tokens ported from the web app (apps/web/src/app/globals.css).
 * Light, warm theme: sand surfaces, teal primary, coral accent.
 * Use `colors` in JS (StatusBar, tab bar, icons, ActivityIndicator) and the
 * matching Tailwind names (bg-teal-500, text-ink-900, …) in className.
 */
export const colors = {
  // Ink (text)
  ink900: "#1b1b1b",
  ink800: "#2a2a2a",
  ink700: "#3d3d3d",
  ink500: "#5e5e5e",
  ink400: "#9aa8b8",
  ink300: "#b8c4d0",

  // Surface / neutral (sand)
  sand50: "#faf9f7",
  sand100: "#f4f1ed",
  sand200: "#e8e3db",
  sand300: "#d4cfc7",

  // Brand — teal
  teal100: "#e0f5f4",
  teal200: "#b0e5e3",
  teal500: "#0f8f8d",
  teal600: "#0c7b79",
  teal700: "#0a6d6b",
  teal800: "#074e4d",

  // Brand — coral
  coral100: "#fdeee9",
  coral400: "#f08a68",
  coral500: "#e06e48",
  coral700: "#b14a2a",

  // Semantic
  bgBody: "#f8f8f7",
  surface: "#ffffff",
  border: "#e8e3db",
  white: "#ffffff",
} as const;

/**
 * Font families. Each weight is its own loaded family (React Native doesn't
 * synthesize weights reliably for custom fonts). The typography components in
 * ui/Text pick the right family per variant + language.
 */
export const fonts = {
  // Display — Fraunces (serif headings)
  displaySemibold: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
  // Body — Manrope
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemibold: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
  // Bengali — Hind Siliguri
  bengali: "HindSiliguri_400Regular",
  bengaliMedium: "HindSiliguri_500Medium",
  bengaliSemibold: "HindSiliguri_600SemiBold",
  bengaliBold: "HindSiliguri_700Bold",
} as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Soft elevation matching the web's --shadow-sm/md (cool-tinted). */
export const shadow = {
  sm: {
    shadowColor: "#0f2234",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#0f2234",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 5,
  },
  teal: {
    shadowColor: "#0f8f8d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;
