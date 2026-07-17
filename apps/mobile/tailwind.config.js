/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // BairePorbo brand palette — refine against web tokens in Phase 1.5.
        brand: {
          DEFAULT: "#2563EB",
          fg: "#FFFFFF",
        },
        ink: "#0B1120",
      },
      fontFamily: {
        bengali: ["HindSiliguri_400Regular"],
        "bengali-bold": ["HindSiliguri_600SemiBold"],
      },
    },
  },
  plugins: [],
};
