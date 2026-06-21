/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.95)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "archive-scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        "threat-pulse": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.7" },
        },
        "seal-stamp": {
          "0%": { transform: "rotate(-12deg) scale(1.4)", opacity: "0" },
          "60%": { transform: "rotate(-12deg) scale(0.95)", opacity: "0.9" },
          "100%": { transform: "rotate(-12deg) scale(1)", opacity: "0.75" },
        },
        "notification-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "glow-pulse-subtle": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(0,210,245,0.1), 0 0 18px rgba(0,210,245,0.04)" },
          "50%": { boxShadow: "0 0 14px rgba(0,210,245,0.2), 0 0 28px rgba(0,210,245,0.08)" },
        },
        "skeleton-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "count-up": "count-up 0.6s ease-out both",
        "archive-scan": "archive-scan 5s linear infinite",
        "threat-pulse": "threat-pulse 2s ease-in-out infinite",
        "seal-stamp": "seal-stamp 0.5s ease-out both",
        "notification-scroll": "notification-scroll 30s linear infinite",
        "glow-pulse-subtle": "glow-pulse-subtle 3s ease-in-out infinite",
        "skeleton-shimmer": "skeleton-shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}