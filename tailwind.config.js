/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* --- Raw scale colors (maps CSS variables via OKLCH) --- */
        slate: {
          50: 'var(--color-slate-50)',
          100: 'var(--color-slate-100)',
          200: 'var(--color-slate-200)',
          300: 'var(--color-slate-300)',
          400: 'var(--color-slate-400)',
          500: 'var(--color-slate-500)',
          600: 'var(--color-slate-600)',
          700: 'var(--color-slate-700)',
          800: 'var(--color-slate-800)',
          900: 'var(--color-slate-900)',
          950: 'var(--color-slate-950)',
          350: '#9ca3af',
          355: '#949dae',
          360: '#8e97a8',
          850: '#1f2940',
          905: '#121b2e',
          955: '#0d1425',
        },
        indigo: {
          50: 'var(--color-indigo-50)',
          100: 'var(--color-indigo-100)',
          200: 'var(--color-indigo-200)',
          300: 'var(--color-indigo-300)',
          400: 'var(--color-indigo-400)',
          500: 'var(--color-indigo-500)',
          600: 'var(--color-indigo-600)',
          700: 'var(--color-indigo-700)',
          800: 'var(--color-indigo-800)',
          900: 'var(--color-indigo-900)',
          950: 'var(--color-indigo-950)',
          455: '#5056e6',
          650: '#3f44b0',
        },
        emerald: {
          50: 'var(--color-emerald-50)',
          100: 'var(--color-emerald-100)',
          200: 'var(--color-emerald-200)',
          300: 'var(--color-emerald-300)',
          400: 'var(--color-emerald-400)',
          500: 'var(--color-emerald-500)',
          600: 'var(--color-emerald-600)',
          700: 'var(--color-emerald-700)',
          800: 'var(--color-emerald-800)',
          900: 'var(--color-emerald-900)',
          950: 'var(--color-emerald-950)',
        },
        amber: {
          50: 'var(--color-amber-50)',
          100: 'var(--color-amber-100)',
          200: 'var(--color-amber-200)',
          300: 'var(--color-amber-300)',
          400: 'var(--color-amber-400)',
          500: 'var(--color-amber-500)',
          600: 'var(--color-amber-600)',
          700: 'var(--color-amber-700)',
          800: 'var(--color-amber-800)',
          900: 'var(--color-amber-900)',
          950: 'var(--color-amber-950)',
        },
        red: {
          50: 'var(--color-red-50)',
          100: 'var(--color-red-100)',
          200: 'var(--color-red-200)',
          300: 'var(--color-red-300)',
          400: 'var(--color-red-400)',
          500: 'var(--color-red-500)',
          600: 'var(--color-red-600)',
          700: 'var(--color-red-700)',
          800: 'var(--color-red-800)',
          900: 'var(--color-red-900)',
          950: 'var(--color-red-950)',
        },

        /* --- Semantic surface aliases --- */
        surface: {
          base: 'var(--surface-base)',
          elevated: 'var(--surface-elevated)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
        },

        /* --- Semantic text aliases --- */
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },

        /* --- Semantic border aliases --- */
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },

        /* --- Brand aliases --- */
        brand: {
          primary: 'var(--brand-primary)',
          hover: 'var(--brand-primary-hover)',
          active: 'var(--brand-primary-active)',
          subtle: 'var(--brand-primary-subtle)',
          glow: 'var(--brand-primary-glow)',
        },

        /* --- Semantic status aliases --- */
        success: 'var(--semantic-success)',
        warning: 'var(--semantic-warning)',
        error: 'var(--semantic-error)',
        info: 'var(--semantic-info)',

        /* --- Legacy backward compat aliases --- */
        page: 'var(--page-bg)',
        card: 'var(--card-bg)',
        'card-alt': 'var(--card-alt-bg)',
        'card-elevated': 'var(--card-elevated-bg)',
        'gradient-start': 'var(--gradient-start)',
        'gradient-end': 'var(--gradient-end)',
        'table-hover': 'var(--table-hover-bg)',
        'toast-error': 'var(--toast-error-bg)',
        'toast-success': 'var(--toast-success-bg)',
        'btn-success-hover': 'var(--btn-success-hover-bg)',
        'error-boundary': 'var(--error-boundary-bg)',
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },

      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        'container-padding': '24px',
        unit: '4px',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        inter: ['Inter', 'sans-serif'],
        'label-caps': ['Inter'],
        'number-lg': ['Inter'],
        h3: ['Inter'],
        h2: ['Inter'],
        'number-display': ['Inter'],
        h1: ['Inter'],
        'body-sm': ['Inter'],
        'body-base': ['Inter'],
      },

      fontSize: {
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
        'number-lg': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h3: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h2: ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'number-display': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        h1: ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-base': ['16px', { lineHeight: '24px', fontWeight: '400' }],
      },

      boxShadow: {
        premium: 'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
      },
    },
  },
  plugins: [],
}
