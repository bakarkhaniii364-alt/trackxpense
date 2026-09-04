/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)', 
        secondary: '#4ad991', 
        danger: '#e2685c', 
        dark: 'rgb(var(--bg-core) / <alpha-value>)', 
        card: 'rgb(var(--bg-card) / <alpha-value>)', 
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        main: 'rgb(var(--text-main) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'Geist',
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Hind Siliguri"', 
          '"Segoe UI"', 
          'Roboto', 
          'Helvetica', 
          'Arial', 
          'sans-serif'
        ],
        mono: [
          '"Geist Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace'
        ]
      },
      boxShadow: {
        'glow': '0 0 20px rgba(246, 130, 31, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      },
      zIndex: {
        'content': 'var(--z-content)',
        'sticky': 'var(--z-sticky)',
        'header': 'var(--z-header)',
        'dropdown': 'var(--z-dropdown)',
        'sidebar': 'var(--z-sidebar)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'toast': 'var(--z-toast)',
        'stealth': 'var(--z-stealth)',
      },
      padding: {
        'safe': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        'xl': 'var(--bento-radius)',
        'lg': 'var(--bento-radius)',
        'md': 'var(--bento-radius)',
        'sm': 'var(--bento-radius)',
        'sidebar': 'var(--sidebar-radius)',
      }
    }
  },
  plugins: [],
}
