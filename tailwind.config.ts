import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05070c",
          900: "#0a0e17",
          800: "#101827",
          700: "#182235",
          600: "#243049",
        },
        signal: {
          DEFAULT: "#3dffb5",
          dim: "#1fbf86",
          glow: "#7affd0",
        },
        ember: {
          DEFAULT: "#ff5c3a",
          soft: "#ff8a6b",
        },
        mist: {
          DEFAULT: "#c8d4e8",
          muted: "#8796b0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Segoe UI", "sans-serif"],
        body: ["var(--font-body)", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        signal: "0 0 0 1px rgba(61,255,181,0.35), 0 0 28px rgba(61,255,181,0.12)",
        panel: "0 24px 80px rgba(0,0,0,0.45)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(61,255,181,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(61,255,181,0.05) 1px, transparent 1px)",
        aurora:
          "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(61,255,181,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(255,92,58,0.12), transparent 50%), radial-gradient(ellipse 50% 60% at 50% 100%, rgba(56,120,255,0.1), transparent 55%)",
      },
      animation: {
        "fade-up": "fadeUp 0.7s ease-out both",
        "pulse-soft": "pulseSoft 3.2s ease-in-out infinite",
        "scan": "scan 8s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
