/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
    "./node_modules/@cloudflare/kumo/dist/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)', 
        secondary: '#4ad991', 
        danger: '#e2685c', 
        dark: 'var(--bg-core, #000000)', 
        card: 'var(--bg-card, #0D0D10)', 
        surface: 'var(--bg-surface, #0D0D10)',
        main: 'var(--text-main, #F4F4F5)',
        muted: 'var(--text-muted, #71717A)',
        kumo: {
          canvas: 'var(--color-kumo-canvas, var(--bg-page))',
          base: 'var(--color-kumo-base, var(--bg-surface))',
          elevated: 'var(--color-kumo-elevated, var(--bg-surface-hover))',
          recessed: 'var(--color-kumo-recessed, var(--bg-subtle))',
          line: 'var(--color-kumo-line, var(--border-default))',
          hairline: 'var(--color-kumo-hairline, var(--border-subtle))',
          fill: 'var(--color-kumo-fill, var(--border-strong))',
          subtle: 'var(--text-color-kumo-subtle, var(--text-secondary))',
          default: 'var(--text-color-kumo-default, var(--text-primary))',
          strong: 'var(--text-color-kumo-strong, #FFFFFF)',
          brand: 'var(--color-kumo-brand, var(--accent))',
          tint: 'var(--color-kumo-tint, var(--accent-bg-soft))',
        },
      },
      fontFamily: {
        sans: [
          'Geist',
          '"Hind Siliguri"', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          'Helvetica', 
          'Arial', 
          'sans-serif'
        ],
        mono: [
          '"Geist Mono"',
          '"Hind Siliguri"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace'
        ]
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
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
