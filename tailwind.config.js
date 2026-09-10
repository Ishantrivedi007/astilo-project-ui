import { heroui } from "@heroui/react";

const themed = (v) => `rgb(var(${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    transparent: "transparent",
    current: "currentColor",
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', "system-ui", "sans-serif"],
        display: ['"Syne"', '"Space Grotesk"', "system-ui", "sans-serif"],
      },
      colors: {
        app: themed("--bg-rgb"),
        surface: themed("--surface-rgb"),
        hair: themed("--hair-rgb"),
        accent: {
          DEFAULT: themed("--accent-rgb"),
          2: themed("--accent-2-rgb"),
        },
        ink: {
          DEFAULT: themed("--ink-rgb"),
          muted: themed("--ink-muted-rgb"),
        },
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-6deg)" },
          "50%": { transform: "rotate(6deg)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        eq: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--glow-rgb) / 0.45)" },
          "50%": { boxShadow: "0 0 26px 8px rgb(var(--glow-rgb) / 0.18)" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        wiggle: "wiggle 0.4s ease-in-out",
        "spin-slow": "spin-slow 8s linear infinite",
        eq: "eq 0.9s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.6s ease-in-out infinite",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: { DEFAULT: "#7657E8", foreground: "#ffffff" },
            secondary: { DEFAULT: "#B48CFF", foreground: "#1b1730" },
            focus: "#7657E8",
          },
        },
        dark: {
          colors: {
            background: "#0b0620",
            primary: { DEFAULT: "#9B7CFF", foreground: "#12021a" },
            secondary: { DEFAULT: "#4F8CFF", foreground: "#ffffff" },
            focus: "#9B7CFF",
          },
        },
      },
    }),
  ],
};
