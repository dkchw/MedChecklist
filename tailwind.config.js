/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          blue: '#0284c7',
          red: '#ef4444',
          emerald: '#10b981',
          amber: '#f59e0b',
        },
        tokyo: {
          bg: '#1a1b26',
          darker: '#16161e',
          card: '#24283b',
          cardHover: '#292e42',
          surface: '#1f2335',
          border: '#292e42',
          borderLight: '#414868',
          text: '#c0caf5',
          textSecondary: '#a9b1d6',
          textMuted: '#7982a9',
          textDim: '#565f89',
          blue: '#7aa2f7',
          cyan: '#7dcfff',
          green: '#9ece6a',
          yellow: '#e0af68',
          orange: '#ff9e64',
          purple: '#bb9af7',
          red: '#f7768e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
