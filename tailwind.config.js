/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "on-tertiary": "#003822",
        "surface-container-lowest": "#0e0e0e",
        "on-surface-variant": "#dfbfbf",
        "surface-container-high": "#2a2a2a",
        "surface-variant": "#353534",
        "on-secondary-container": "#f19fa3",
        "surface-bright": "#3a3939",
        "surface-container": "#201f1f",
        "tertiary": "#6cdba2",
        "on-tertiary-fixed": "#002112",
        "surface": "#131313",
        "on-tertiary-container": "#00311d",
        "on-secondary": "#541f24",
        "background": "#131313",
        "secondary-fixed-dim": "#ffb3b6",
        "error": "#ffb4ab",
        "tertiary-container": "#2da46f",
        "surface-tint": "#ffb3b6",
        "on-primary": "#680019",
        "tertiary-fixed-dim": "#6cdba2",
        "surface-container-low": "#1c1b1b",
        "on-tertiary-fixed-variant": "#005233",
        "surface-dim": "#131313",
        "on-background": "#e5e2e1",
        "tertiary-fixed": "#89f8bd",
        "on-error": "#690005",
        "primary": "#ffb3b6",
        "on-primary-container": "#5b0015",
        "surface-container-highest": "#353534",
        "on-primary-fixed-variant": "#8b152b",
        "on-primary-fixed": "#40000c",
        "on-secondary-fixed-variant": "#703439",
        "inverse-surface": "#e5e2e1",
        "inverse-primary": "#ac2f41",
        "secondary-fixed": "#ffdada",
        "on-secondary-fixed": "#390a10",
        "primary-container": "#ef616f",
        "primary-fixed-dim": "#ffb3b6",
        "secondary": "#ffb3b6",
        "on-surface": "#e5e2e1",
        "outline-variant": "#584142",
        "secondary-container": "#703439",
        "on-error-container": "#ffdad6",
        "outline": "#a68a8a",
        "error-container": "#93000a",
        "primary-fixed": "#ffdada",
        "inverse-on-surface": "#313030"
      },
      fontFamily: {
        "headline": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"]
      },
      borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"}
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
};
