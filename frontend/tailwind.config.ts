import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ["Figtree", "sans-serif"],
        headline: ["Syne", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      /* ── Custom easing curves ─────────────────────────────── */
      transitionTimingFunction: {
        /* Spring-like: overshoot then settle */
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        /* Expo out: fast start, smooth stop */
        "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        /* Ease-back: slight elastic pull */
        "back-out": "cubic-bezier(0.34, 1.25, 0.64, 1)",
        /* Snappy: very fast exit, smooth entry */
        "snappy": "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      transitionDuration: {
        "50": "50ms",
        "80": "80ms",
        "100": "100ms",
        "120": "120ms",
        "150": "150ms",
        "160": "160ms",
        "175": "175ms",
        "180": "180ms",
        "200": "200ms",
        "220": "220ms",
        "250": "250ms",
        "280": "280ms",
        "300": "300ms",
        "340": "340ms",
        "400": "400ms",
        "500": "500ms",
      },
      boxShadow: {
        "glow-sm": "0 0 10px hsl(var(--primary) / 0.25)",
        "glow": "0 0 20px hsl(var(--primary) / 0.35), 0 0 40px hsl(var(--primary) / 0.15)",
        "glow-lg": "0 0 32px hsl(var(--primary) / 0.45), 0 0 64px hsl(var(--primary) / 0.2)",
        "glow-secondary": "0 0 20px hsl(var(--secondary) / 0.35)",
        "glow-accent": "0 0 20px hsl(var(--accent) / 0.45)",
        "card": "0 1px 3px hsl(220 13% 10% / 0.07), 0 4px 12px hsl(220 13% 10% / 0.05)",
        "card-hover": "0 8px 30px hsl(220 13% 10% / 0.1), 0 2px 8px hsl(220 13% 10% / 0.06)",
        "card-hover-glow": "0 8px 30px hsl(220 13% 10% / 0.1), 0 0 20px hsl(var(--primary) / 0.15)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "gradient-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-10px) rotate(1deg)" },
          "66%": { transform: "translateY(-5px) rotate(-1deg)" },
        },
        "float-delayed": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "70%": { transform: "scale(1.35)", opacity: "0" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 24px hsl(var(--primary) / 0.7), 0 0 48px hsl(var(--primary) / 0.3)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-800px 0" },
          "100%": { backgroundPosition: "800px 0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "blob": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(5%, -10%) scale(1.06)" },
          "50%": { transform: "translate(-5%, 5%) scale(0.94)" },
          "75%": { transform: "translate(8%, 8%) scale(1.02)" },
        },
        "ticker": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-pan": "gradient-pan 5s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "float-delayed": "float-delayed 8s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
        "shimmer": "shimmer 1.8s linear infinite",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-left": "slide-in-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.4s ease both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "spin-slow": "spin-slow 8s linear infinite",
        "blob": "blob 12s ease-in-out infinite",
        "ticker": "ticker 28s linear infinite",
        "glow": "glow-pulse 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
