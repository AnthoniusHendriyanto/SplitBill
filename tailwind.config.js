/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        '2xl': '14px',
        '3xl': '24px',
      },
      colors: {
        surface: {
          base: 'var(--surface-base)',
          elevated: 'var(--surface-elevated)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        brand: {
          primary: 'var(--brand-primary)',
          hover: 'var(--brand-primary-hover)',
          active: 'var(--brand-primary-active)',
          subtle: 'var(--brand-primary-subtle)',
          glow: 'var(--brand-primary-glow)',
        },
        success: 'var(--semantic-success)',
        warning: 'var(--semantic-warning)',
        error: 'var(--semantic-error)',
        info: 'var(--semantic-info)',
        page: 'var(--page-bg)',
        card: 'var(--card-bg)',
        'card-alt': 'var(--card-alt-bg)',
        'table-hover': 'var(--table-hover-bg)',
        'toast-error': 'var(--toast-error-bg)',
        'toast-success': 'var(--toast-success-bg)',
        'btn-success-hover': 'var(--btn-success-hover-bg)',
        'error-boundary': 'var(--error-boundary-bg)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        geist: ['Geist', 'sans-serif'],
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        glass: 'var(--glass-shadow)',
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
