import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#121619", // Slate Charcoal
        card: "#1e242b",       // Elevated dark slate gray
        gold: "#d4af37",       // Warm Brushed Gold
        accent: "#c59b27",     // Gold accent for hover/borders
        platinum: "#e2e8f0",   // Soft platinum/silver
      },
    },
  },
  plugins: [],
};
export default config;