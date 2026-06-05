import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Token semantici (theme-aware) -> guidati dalle CSS variables in globals.css.
// I canali sono RGB ("R G B") cosi' le opacity utilities (es. bg-primary/50)
// funzionano via rgb(var(--x) / <alpha-value>).
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        // Palette brand fissa (hex esatti), non theme-aware.
        // Specchia i token definiti in globals.css.
        brand: {
          // light
          paper: "#F2EDE3",
          "paper-alt": "#EAE2D4",
          ink: "#1A1A18",
          "ink-mid": "#4A4A44",
          "ink-light": "#8A8A82",
          chartreuse: "#6DBE00",
          "chartreuse-light": "#8AD800",
          "chartreuse-hover": "#A8E040",
          "chartreuse-pale": "#EEF7CC",
          "chartreuse-mid": "#C8E87A",
          "ember-deep": "#B84A1C",
          "ember-light": "#D4602A",
          "ember-pale": "#FAE8DC",
          "ember-very-dark": "#6B2200",
          // dark
          void: "#111210",
          surface: "#1A1C19",
          "brand-block": "#1A1A18",
          char: "#3A3D38",
          snow: "#F0EFE8",
          fog: "#B0AFA8",
          ash: "#5A5A54",
          "chartreuse-glow": "#9ADE00",
          "chartreuse-vivid": "#C2F000",
          "ember-vivid": "#FF6B2C",
          "ember-vivid-light": "#FF8A56",
        },
      },
      fontFamily: {
        heading: ["var(--font-sora)", "system-ui", "sans-serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [animate],
};

export default config;
