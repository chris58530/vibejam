import React, { useRef, useState, useEffect } from 'react';
import { useThemeStore, themeMetas, type ThemeId } from '../lib/themeStore';
import { useI18n } from '../lib/i18n';

export default function ThemeSwitcher() {
  const { t } = useI18n();
  const { themeId, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = themeMetas.find(t => t.id === themeId) ?? themeMetas[0];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-on-surface/60 hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 text-sm font-body"
        title={t('theme_label')}
      >
        <span className="material-symbols-outlined text-[18px]">palette</span>
        <span className="hidden sm:inline">{current.icon}</span>
        <span className="material-symbols-outlined text-[14px] hidden sm:inline">expand_more</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-xl overflow-hidden z-50 min-w-[200px]">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-outline-variant/10">
            <p className="text-xs font-semibold text-on-surface-variant">{t('theme_label')}</p>
          </div>

          {/* Theme list */}
          <div className="py-1">
            {themeMetas.map((theme) => (
              <button
                key={theme.id}
                onClick={() => { setTheme(theme.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body transition-colors ${
                  themeId === theme.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface/70 hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {/* Color preview dots */}
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: theme.preview.primary }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: theme.preview.container }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: theme.preview.tertiary }} />
                </div>

                {/* Name */}
                <span className="flex-1 text-left">{theme.icon} {t(theme.nameKey as any)}</span>

                {/* Check mark */}
                {themeId === theme.id && (
                  <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
