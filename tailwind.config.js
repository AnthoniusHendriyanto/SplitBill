/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      "colors": {
        "page": "var(--page-bg)",
        "card": "var(--card-bg)",
        "card-alt": "var(--card-alt-bg)",
        "card-elevated": "var(--card-elevated-bg)",
        "gradient-start": "var(--gradient-start)",
        "gradient-end": "var(--gradient-end)",
        "table-hover": "var(--table-hover-bg)",
        "toast-error": "var(--toast-error-bg)",
        "toast-success": "var(--toast-success-bg)",
        "btn-success-hover": "var(--btn-success-hover-bg)",
        "error-boundary": "var(--error-boundary-bg)",
        "indigo": {
          "455": "#5c5fef",
          "650": "#4347d9"
        },
        "slate": {
          "350": "#9ca3af",
          "355": "#949dae",
          "360": "#8e97a8",
          "850": "#1f2940",
          "905": "#121b2e",
          "955": "#0d1425"
        },
        "emerald": {
          "450": "#34d399"
        },
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "md": "16px",
        "container-padding": "24px",
        "xl": "32px",
        "unit": "4px",
        "xs": "4px",
        "sm": "8px",
        "lg": "24px"
      },
      "fontFamily": {
        "inter": ["Inter", "sans-serif"],
        "label-caps": ["Inter"],
        "number-lg": ["Inter"],
        "h3": ["Inter"],
        "h2": ["Inter"],
        "number-display": ["Inter"],
        "h1": ["Inter"],
        "body-sm": ["Inter"],
        "body-base": ["Inter"]
      },
      "fontSize": {
        "label-caps": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "number-lg": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "h3": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "h2": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "number-display": ["16px", { "lineHeight": "24px", "fontWeight": "500" }],
        "h1": ["30px", { "lineHeight": "38px", "letterSpacing": "-0.02em", "fontWeight": "600" }],
        "body-sm": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "body-base": ["16px", { "lineHeight": "24px", "fontWeight": "400" }]
      }
    },
  },
  plugins: [],
}
