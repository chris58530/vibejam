import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User } from '../lib/api';
import { useI18n } from '../lib/i18n';

type LibraryTab = 'history' | 'saved' | 'liked';

interface HistoryEntry {
  id: string | number;
  title: string;
  timestamp: number;
  path: string;
}

interface SaveSlot {
  id: string;
  title: string;
  tags: string;
  description: string;
  savedAt: string;
  vibeId?: number;
}

interface YourLibraryProps {
  currentUser?: User;
}

function normalizeHistoryPath(path: string) {
  if (path.startsWith('/vibe/')) return path.replace('/vibe/', '/p/');
  return path;
}

/* ─── helpers ─── */

function groupByDate(items: HistoryEntry[], lang: string): { label: string; entries: HistoryEntry[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - now.getDay() * 86400000;

  const groups: Record<string, HistoryEntry[]> = {};
  const order: string[] = [];

  const labelFor = (ts: number) => {
    if (ts >= startOfToday) return lang === 'zh-TW' ? '今天' : 'Today';
    if (ts >= startOfYesterday) return lang === 'zh-TW' ? '昨天' : 'Yesterday';
    if (ts >= startOfWeek) return lang === 'zh-TW' ? '本週稍早' : 'Earlier this week';
    return lang === 'zh-TW' ? '更早' : 'Earlier';
  };

  for (const item of items) {
    const label = labelFor(item.timestamp);
    if (!groups[label]) { groups[label] = []; order.push(label); }
    groups[label].push(item);
  }

  return order.map(label => ({ label, entries: groups[label] }));
}

export default function YourLibrary({ currentUser }: YourLibraryProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useI18n();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [savedKits, setSavedKits] = useState<SaveSlot[]>([]);

  const activeTab = useMemo<LibraryTab>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'saved' || tab === 'liked') return tab;
    return 'history';
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bk_history');
      const parsed: HistoryEntry[] = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(parsed)
        ? parsed.map((entry: HistoryEntry) => ({ ...entry, path: normalizeHistoryPath(entry.path) }))
        : [];
      setHistory(normalized);
      localStorage.setItem('bk_history', JSON.stringify(normalized));
    } catch {
      setHistory([]);
    }

    try {
      const raw = localStorage.getItem(`beaverkit_saves_${currentUser?.id ?? 'guest'}`);
      const parsed: SaveSlot[] = raw ? JSON.parse(raw) : [];
      setSavedKits(Array.isArray(parsed) ? parsed.filter((slot: SaveSlot) => !slot.id.startsWith('emergency_')) : []);
    } catch {
      setSavedKits([]);
    }
  }, [currentUser?.id]);

  const authorId = currentUser?.username ? `@${currentUser.username}` : '@guest';

  const removeHistoryItem = (id: string | number) => {
    const updated = history.filter((entry: HistoryEntry) => entry.id !== id);
    setHistory(updated);
    localStorage.setItem('bk_history', JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.setItem('bk_history', JSON.stringify([]));
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (language === 'zh-TW') {
      if (days > 0) return `${days} 天前`;
      if (hours > 0) return `${hours} 小時前`;
      if (mins > 0) return `${mins} 分鐘前`;
      return '剛才';
    }

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  };

  /* ═══════════════════════════════════════════
     TAB 1 — History (YT Watch History style)
     Full-width timeline grouped by date
     ═══════════════════════════════════════════ */
  if (activeTab === 'history') {
    const sorted = history.slice().sort((a, b) => b.timestamp - a.timestamp);
    const grouped = groupByDate(sorted, language === 'zh-TW' ? 'zh-TW' : 'en');

    return (
      <main className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface overflow-x-hidden transition-[margin] duration-300">
        {/* Header */}
        <div className="sticky top-16 z-30 bg-surface/95 backdrop-blur-md border-b border-outline-variant/10">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[22px] text-on-surface/50" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
              <h1 className="text-lg font-bold text-on-surface">{t('library_history_title')}</h1>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="text-xs text-on-surface/40 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
              >
                {language === 'zh-TW' ? '清除所有紀錄' : 'Clear all'}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-20">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface/15">history</span>
              <h2 className="text-base font-semibold text-on-surface/50 mt-4">{t('library_history_empty_title')}</h2>
              <p className="text-sm text-on-surface/35 mt-1.5 max-w-sm">{t('library_history_empty_desc')}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(group => (
                <section key={group.label}>
                  <h2 className="text-sm font-semibold text-on-surface/50 mb-3 px-1">{group.label}</h2>
                  <div className="space-y-1">
                    {group.entries.map(item => (
                      <article
                        key={item.id}
                        onClick={() => navigate(normalizeHistoryPath(item.path))}
                        className="group flex items-center gap-4 px-3 py-3 -mx-1 rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px] text-on-surface/30">deployed_code</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-on-surface truncate">{item.title || t('library_untitled')}</p>
                          <p className="text-xs text-on-surface/35 mt-0.5">{formatTimeAgo(item.timestamp)}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeHistoryItem(item.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-on-surface/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title={t('library_remove')}
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  /* ═══════════════════════════════════════════
     TAB 2 — Saved (card grid)
     Page header + responsive card grid
     ═══════════════════════════════════════════ */
  if (activeTab === 'saved') {
    return (
      <main className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface overflow-x-hidden transition-[margin] duration-300">
        {/* Header */}
        <div className="border-b border-outline-variant/10">
          <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="material-symbols-outlined text-[20px] text-on-surface/50" style={{ fontVariationSettings: "'FILL' 1" }}>playlist_play</span>
                  <h1 className="text-lg font-bold text-on-surface">{t('library_saved_title')}</h1>
                </div>
                <p className="text-sm text-on-surface/40 max-w-lg">{t('library_saved_intro')}</p>
                {savedKits.length > 0 && (
                  <p className="text-xs text-on-surface/30 mt-2">
                    {savedKits.length} {language === 'zh-TW' ? '個已儲存' : 'saved'} · {authorId}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate('/workspace')}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span className="hidden sm:inline">{t('library_go_workspace')}</span>
                <span className="sm:hidden">{language === 'zh-TW' ? '新增' : 'Add'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-20">
          {savedKits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface/15">playlist_play</span>
              <h2 className="text-base font-semibold text-on-surface/50 mt-4">{t('library_saved_empty_title')}</h2>
              <p className="text-sm text-on-surface/35 mt-1.5 max-w-sm">{t('library_saved_empty_desc')}</p>
              <button
                onClick={() => navigate('/workspace')}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                {t('library_go_workspace')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {savedKits.map(kit => (
                <article
                  key={kit.id}
                  onClick={() => navigate('/workspace')}
                  className="group rounded-xl overflow-hidden border border-outline-variant/10 bg-surface-container-low hover:border-outline-variant/25 hover:bg-surface-container transition-colors cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-surface-container-high flex items-center justify-center relative overflow-hidden">
                    <span className="material-symbols-outlined text-[32px] text-on-surface/15">deployed_code</span>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px] text-white opacity-0 group-hover:opacity-100 transition-opacity">play_arrow</span>
                    </div>
                  </div>
                  {/* Meta */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-on-surface truncate">{kit.title || t('library_untitled')}</p>
                    <p className="text-xs text-on-surface/40 mt-0.5 line-clamp-2 leading-relaxed">{kit.description || t('library_saved_fallback')}</p>
                    <div className="flex items-center justify-between mt-2.5">
                      {kit.tags ? (
                        <div className="flex gap-1 min-w-0 overflow-hidden">
                          {kit.tags.split(',').slice(0, 2).map(tag => (
                            <span key={tag.trim()} className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] text-on-surface/40 truncate max-w-[80px]">{tag.trim()}</span>
                          ))}
                        </div>
                      ) : <span />}
                      <span className="text-[11px] text-on-surface/30 shrink-0 tabular-nums">
                        {new Date(kit.savedAt).toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  /* ═══════════════════════════════════════════
     TAB 3 — Liked (YT Library grid style)
     Grid of liked items as cards
     ═══════════════════════════════════════════ */
  return (
    <main className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface overflow-x-hidden transition-[margin] duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[22px] text-on-surface/50" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
            <h1 className="text-lg font-bold text-on-surface">{t('library_liked_title')}</h1>
          </div>
          <p className="text-sm text-on-surface/40 max-w-lg">{t('library_liked_intro')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-20">
        {/* Empty state — will be replaced with a grid when liked items exist */}
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface/15">thumb_up</span>
          <h2 className="text-base font-semibold text-on-surface/50 mt-4">{t('library_liked_empty_title')}</h2>
          <p className="text-sm text-on-surface/35 mt-1.5 max-w-sm">{t('library_liked_empty_desc')}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container text-on-surface/70 text-sm font-medium hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">explore</span>
            {t('library_go_home')}
          </button>
        </div>
      </div>
    </main>
  );
}