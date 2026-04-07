import { create } from 'zustand';

type Palette = Record<string, string>;

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}

const darkPalette: Palette = {
  'primary':                    '#FFB3B6',
  'on-primary':                 '#680019',
  'primary-container':          '#EF616F',
  'on-primary-container':       '#5B0015',
  'primary-fixed':              '#FFDADA',
  'primary-fixed-dim':          '#FFB3B6',
  'on-primary-fixed':           '#40000C',
  'on-primary-fixed-variant':   '#8B152B',
  'secondary':                  '#FFB3B6',
  'on-secondary':               '#541F24',
  'secondary-container':        '#703439',
  'on-secondary-container':     '#F19FA3',
  'secondary-fixed':            '#FFDADA',
  'secondary-fixed-dim':        '#FFB3B6',
  'on-secondary-fixed':         '#390A10',
  'on-secondary-fixed-variant': '#703439',
  'tertiary':                   '#6CDBA2',
  'on-tertiary':                '#003822',
  'tertiary-container':         '#2DA46F',
  'on-tertiary-container':      '#00311D',
  'tertiary-fixed':             '#89F8BD',
  'tertiary-fixed-dim':         '#6CDBA2',
  'on-tertiary-fixed':          '#002112',
  'on-tertiary-fixed-variant':  '#005233',
  'inverse-primary':            '#AC2F41',

  'error':                '#FFB4AB',
  'on-error':             '#690005',
  'error-container':      '#93000A',
  'on-error-container':   '#FFDAD6',

  'background':               '#09090b',
  'on-background':            '#fafafa',
  'surface':                  '#09090b',
  'on-surface':               '#fafafa',
  'surface-variant':          '#27272a',
  'on-surface-variant':       '#a1a1aa',
  'surface-dim':              '#09090b',
  'surface-bright':           '#27272a',
  'surface-tint':             '#71717a',
  'surface-container-lowest': '#000000',
  'surface-container-low':    '#18181b',
  'surface-container':        '#18181b',
  'surface-container-high':   '#27272a',
  'surface-container-highest':'#3f3f46',

  'outline':                  '#52525b',
  'outline-variant':          '#71717a',

  'inverse-surface':          '#fafafa',
  'inverse-on-surface':       '#18181b',
};

function applyTheme() {
  const root = document.documentElement;
  for (const [token, hex] of Object.entries(darkPalette)) {
    root.style.setProperty(`--md-${token}`, hexToRgb(hex));
  }
}

// No-op store kept for any existing imports
export const useThemeStore = create(() => ({ mode: 'dark' as const }));

applyTheme();
