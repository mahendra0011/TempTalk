/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Rajdhani", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"]
      },
      colors: {
        void: "#020403",
        panel: "#08100e",
        signal: "#36ff88",
        violet: "#9a5cff",
        danger: "#ff4267",
        ember: "#ffc857"
      },
      boxShadow: {
        glow: "0 0 32px rgba(54, 255, 136, 0.18)",
        violet: "0 0 28px rgba(154, 92, 255, 0.18)"
      }
    }
  },
  plugins: []
};
