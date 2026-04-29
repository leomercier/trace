import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        canvas: "var(--canvas)",
        panel: "var(--panel)",
        "panel-muted": "var(--panel-muted)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        accent: "var(--accent)",
        measure: "var(--measure)",
        note: "var(--note)",
        "note-border": "var(--note-border)",
        "cursor-1": "var(--cursor-1)",
        "cursor-2": "var(--cursor-2)",
        "cursor-3": "var(--cursor-3)",
        "cursor-4": "var(--cursor-4)",
        "trace-black": "var(--trace-black)",
        "trace-white": "var(--trace-white)",
        "trace-pink": "var(--trace-pink)",
        "trace-orange": "var(--trace-orange)",
        "trace-violet": "var(--trace-violet)",
        "trace-lime": "var(--trace-lime)",
        "trace-plum": "var(--trace-plum)",
        "trace-success": "var(--trace-success)",
        "trace-info": "var(--trace-info)",
        "trace-warning": "var(--trace-warning)",
        "trace-error": "var(--trace-error)",
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        hand: ["var(--font-hand)"],
        display: ["var(--font-display)"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
