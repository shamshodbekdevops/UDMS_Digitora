import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // CSS variable — opacity modifier ishlatilmaydi
        bg:           "var(--bg)",
        surface:      "var(--surface)",
        "surface-el": "var(--surface-el)",
        border:       "var(--border)",
        "border-glow":"var(--border-glow)",
        "text-primary":"var(--text-primary)",
        "text-muted":  "var(--text-muted)",

        // Static hex — bg-accent/10 kabi opacity modifier uchun
        accent:       "#E8762C",
        "accent-warm":"#D85F1C",
        safe:    "#3DDC84",
        caution: "#F2C94C",
        warning: "#FF8A3D",
        danger:  "#FF4757",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body:    ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
