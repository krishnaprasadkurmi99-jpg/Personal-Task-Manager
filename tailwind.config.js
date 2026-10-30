/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          DEFAULT: "#0B0B12",
          card: "#191927",
          raised: "#202031",
          violet: "#A78BFA",
          iris: "#7C3AED",
          mint: "#6EE7B7",
          foreground: "#F5F3FF",
          muted: "#A1A1AA",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 80px rgba(124, 58, 237, 0.18)",
      },
    },
  },
  plugins: [],
};
