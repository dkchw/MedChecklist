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
        // Semantic colors using CSS custom properties — auto-switch light/dark
        semantic: {
          bg: 'rgb(var(--color-bg-primary) / <alpha-value>)',
          card: 'rgb(var(--color-bg-card) / <alpha-value>)',
          surface: 'rgb(var(--color-bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          'border-light': 'rgb(var(--color-border-light) / <alpha-value>)',
          text: 'rgb(var(--color-text-primary) / <alpha-value>)',
          'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
          'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
          'text-dim': 'rgb(var(--color-text-dim) / <alpha-value>)',
          accent: 'rgb(var(--color-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--color-accent-hover) / <alpha-value>)',
        },
        // Intermediate slate shades missing from default Tailwind palette
        slate: {
          750: '#2e3450',
          850: '#1a2035',
        },
        // Tokyo Night reference palette (for direct use where needed)
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
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
      },
      backdropBlur: {
        xs: '2px',
      },
      padding: {
        '0.2': '0.05rem',
      },
    },
  },
  plugins: [],
}
