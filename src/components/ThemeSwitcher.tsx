import React from 'react';
import { useThemeStore } from '../lib/themeStore';

export default function ThemeSwitcher() {
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';

  return (
    <button
      className="p-2 rounded-lg text-on-surface/60 hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 cursor-default"
      title={isDark ? '深色模式' : '淺色模式'}
      aria-label={isDark ? '深色模式' : '淺色模式'}
      disabled
    >
      <span className="material-symbols-outlined text-[20px]">
        {isDark ? 'dark_mode' : 'light_mode'}
      </span>
    </button>
  );
}
