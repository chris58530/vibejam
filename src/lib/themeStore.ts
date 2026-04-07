import { create } from 'zustand';

export type ColorMode = 'light' | 'dark';

/* ── hex → "R G B" for Tailwind opacity support ──────────── */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}

type Palette = Record<string, string>;

/* ── Dark mode palette ──────────────────────────────────── */
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

/* ── Light mode palette ─────────────────────────────────── */
const lightPalette: Palette = {
  'primary':                    '#B4202E',
  'on-primary':                 '#FFFFFF',
  'primary-container':          '#FFDAD7',
  'on-primary-container':       '#410008',
  'primary-fixed':              '#FFDADA',
  'primary-fixed-dim':          '#FFB3B6',
  'on-primary-fixed':           '#40000C',
  'on-primary-fixed-variant':   '#8B152B',
  'secondary':                  '#775658',
  'on-secondary':               '#FFFFFF',
  'secondary-container':        '#FFDAD9',
  'on-secondary-container':     '#2C1517',
  'secondary-fixed':            '#FFDADA',
  'secondary-fixed-dim':        '#E8BDBF',
  'on-secondary-fixed':         '#2C1517',
  'on-secondary-fixed-variant': '#5D3F40',
  'tertiary':                   '#006D3F',
  'on-tertiary':                '#FFFFFF',
  'tertiary-container':         '#89F8BD',
  'on-tertiary-container':      '#002112',
  'tertiary-fixed':             '#89F8BD',
  'tertiary-fixed-dim':         '#6CDBA2',
  'on-tertiary-fixed':          '#002112',
  'on-tertiary-fixed-variant':  '#005233',
  'inverse-primary':            '#FFB3B6',

  'error':                '#BA1A1A',
  'on-error':             '#FFFFFF',
  'error-container':      '#FFDAD6',
  'on-error-container':   '#410002',

  'background':               '#fafafa',
  'on-background':            '#1a1a1a',
  'surface':                  '#fafafa',
  'on-surface':               '#1a1a1a',
  'surface-variant':          '#e4e4e7',
  'on-surface-variant':       '#52525b',
  'surface-dim':              '#d4d4d8',
  'surface-bright':           '#ffffff',
  'surface-tint':             '#a1a1aa',
  'surface-container-lowest': '#ffffff',
  'surface-container-low':    '#f4f4f5',
  'surface-container':        '#ececee',
  'surface-container-high':   '#e4e4e7',
  'surface-container-highest':'#d4d4d8',

  'outline':                  '#71717a',
  'outline-variant':          '#c8c5c5',

  'inverse-surface':          '#2f2f2f',
  'inverse-on-surface':       '#f4f4f5',
};

const palettes: Record<ColorMode, Palette> = { light: lightPalette, dark: darkPalette };

/* ── Apply CSS custom properties to :root ────────────────── */
function applyMode(mode: ColorMode) {
  const palette = palettes[mode];
  const root = document.documentElement;
  for (const [token, hex] of Object.entries(palette)) {
    root.style.setProperty(`--md-${token}`, hexToRgb(hex));
  }
  // Set a data attribute for non-Tailwind selectors (scrollbars, etc.)
  root.setAttribute('data-theme', mode);
}

/* ── Zustand store ───────────────────────────────────────── */
const STORAGE_KEY = 'beaverkit_color_mode';

interface ThemeState {
  mode: ColorMode;
  toggleMode: () => void;
  setMode: (mode: ColorMode) => void;
}

function getInitialMode(): ColorMode {
  const stored = localStorage.getItem(STORAGE_KEY) as ColorMode | null;
  if (stored === 'light' || stored === 'dark') return stored;
  // Respect OS preference
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: getInitialMode(),
  toggleMode: () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyMode(next);
    set({ mode: next });
  },
  setMode: (mode: ColorMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyMode(mode);
    set({ mode });
  },
}));

/* ── Bootstrap: apply saved mode on load ─────────────────── */
applyMode(useThemeStore.getState().mode);
