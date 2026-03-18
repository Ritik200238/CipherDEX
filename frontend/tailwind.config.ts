import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0a0b14",
        "bg-secondary": "#111227",
        "bg-card": "#161832",
        "bg-card-hover": "#1c1e3a",
        "accent-purple": "#8b5cf6",
        "accent-blue": "#3b82f6",
        "accent-cyan": "#06b6d4",
      },
    },
  },
  plugins: [],
};

export default config;
