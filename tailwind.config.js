/** @type {import('tailwindcss').Config} */

/* Helper: reference a CSS custom property as an rgb() with alpha support */
const md = (token) => `rgb(var(--md-${token}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": md('primary'),
        "on-primary": md('on-primary'),
        "primary-container": md('primary-container'),
        "on-primary-container": md('on-primary-container'),
        "primary-fixed": md('primary-fixed'),
        "primary-fixed-dim": md('primary-fixed-dim'),
        "on-primary-fixed": md('on-primary-fixed'),
        "on-primary-fixed-variant": md('on-primary-fixed-variant'),

        "secondary": md('secondary'),
        "on-secondary": md('on-secondary'),
        "secondary-container": md('secondary-container'),
        "on-secondary-container": md('on-secondary-container'),
        "secondary-fixed": md('secondary-fixed'),
        "secondary-fixed-dim": md('secondary-fixed-dim'),
        "on-secondary-fixed": md('on-secondary-fixed'),
        "on-secondary-fixed-variant": md('on-secondary-fixed-variant'),

        "tertiary": md('tertiary'),
        "on-tertiary": md('on-tertiary'),
        "tertiary-container": md('tertiary-container'),
        "on-tertiary-container": md('on-tertiary-container'),
        "tertiary-fixed": md('tertiary-fixed'),
        "tertiary-fixed-dim": md('tertiary-fixed-dim'),
        "on-tertiary-fixed": md('on-tertiary-fixed'),
        "on-tertiary-fixed-variant": md('on-tertiary-fixed-variant'),

        "error": md('error'),
        "on-error": md('on-error'),
        "error-container": md('error-container'),
        "on-error-container": md('on-error-container'),

        "background": md('background'),
        "on-background": md('on-background'),
        "surface": md('surface'),
        "on-surface": md('on-surface'),
        "surface-variant": md('surface-variant'),
        "on-surface-variant": md('on-surface-variant'),
        "surface-dim": md('surface-dim'),
        "surface-bright": md('surface-bright'),
        "surface-tint": md('surface-tint'),
        "surface-container-lowest": md('surface-container-lowest'),
        "surface-container-low": md('surface-container-low'),
        "surface-container": md('surface-container'),
        "surface-container-high": md('surface-container-high'),
        "surface-container-highest": md('surface-container-highest'),

        "outline": md('outline'),
        "outline-variant": md('outline-variant'),

        "inverse-surface": md('inverse-surface'),
        "inverse-on-surface": md('inverse-on-surface'),
        "inverse-primary": md('inverse-primary'),
      },
      fontFamily: {
        "headline": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"]
      },
      borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
};
