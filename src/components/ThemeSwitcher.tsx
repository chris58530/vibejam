import React from 'react';
import { useThemeStore } from '../lib/themeStore';

export default function ThemeSwitcher() {
  const { mode, toggleMode } = useThemeStore();
  const isDark = mode === 'dark';

  return (
    <button
      onClick={toggleMode}
      className="p-2 rounded-lg text-on-surface/60 hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="material-symbols-outlined text-[20px]">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
