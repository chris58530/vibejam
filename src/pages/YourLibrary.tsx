import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { getSavedVibes, unsaveVibe, SavedVibe } from '../lib/savedVibes';

type LibraryTab = 'history' | 'saved' | 'liked';

interface HistoryEntry {
  id: string | number;
  title: string;
  timestamp: number;
  path: string;
}

interface YourLibraryProps {
  currentUser?: User;
}

function normalizeHistoryPath(path: string) {
  if (path.startsWith('/vibe/')) return path.replace('/vibe/', '/p/');
  return path;
}

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

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function YourLibrary({ currentUser }: YourLibraryProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useI18n();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [savedVibes, setSavedVibes] = useState<SavedVibe[]>([]);

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

    setSavedVibes(getSavedVibes(currentUser?.id));
  }, [currentUser?.id]);

  const removeHistoryItem = (id: string | number) => {
    const updated = history.filter((entry: HistoryEntry) => entry.id !== id);
    setHistory(updated);
    localStorage.setItem('bk_history', JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.setItem('bk_history', JSON.stringify([]));
  };

  const handleUnsave = (vibeId: number) => {
    unsaveVibe(vibeId, currentUser?.id);
    setSavedVibes(prev => prev.filter(v => v.id !== vibeId));
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
     TAB 1 — History
     ═══════════════════════════════════════════ */
  if (activeTab === 'history') {
    const sorted = history.slice().sort((a, b) => b.timestamp - a.timestamp);
    const grouped = groupByDate(sorted, language === 'zh-TW' ? 'zh-TW' : 'en');

    return (
      <main className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface overflow-x-hidden transition-[margin] duration-300">
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
     TAB 2 — Saved (收藏的 Vibe 卡片)
     ═══════════════════════════════════════════ */
  if (activeTab === 'saved') {
    return (
      <main className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface overflow-x-hidden transition-[margin] duration-300">
        <div className="border-b border-outline-variant/10">
          <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined text-[20px] text-on-surface/50" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
              <h1 className="text-lg font-bold text-on-surface">{t('library_saved_title')}</h1>
            </div>
            <p className="text-sm text-on-surface/40 max-w-lg">{t('library_saved_intro')}</p>
            {savedVibes.length > 0 && (
              <p className="text-xs text-on-surface/30 mt-2">
                {savedVibes.length} {language === 'zh-TW' ? '個已收藏' : 'saved'}
              </p>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-20">
          {savedVibes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface/15">bookmark</span>
              <h2 className="text-base font-semibold text-on-surface/50 mt-4">{t('library_saved_empty_title')}</h2>
              <p className="text-sm text-on-surface/35 mt-1.5 max-w-sm">{t('library_saved_empty_desc')}</p>
              <button
                onClick={() => navigate('/')}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container text-on-surface/70 text-sm font-medium hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">explore</span>
                {t('library_go_home')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {savedVibes.map(vibe => (
                <article
                  key={vibe.id}
                  onClick={() => navigate(`/p/${vibe.id}`)}
                  className="group rounded-xl overflow-hidden border border-outline-variant/10 bg-surface-container-low hover:border-outline-variant/25 hover:bg-surface-container transition-colors cursor-pointer"
                >
                  {/* Thumbnail placeholder */}
                  <div className="aspect-video bg-surface-container-high flex items-center justify-center relative overflow-hidden">
                    <span className="material-symbols-outlined text-[32px] text-on-surface/15">deployed_code</span>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px] text-white opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                    </div>
                  </div>
                  {/* Meta */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-on-surface truncate">{vibe.title || t('library_untitled')}</p>
                    <p className="text-xs text-on-surface/40 mt-0.5 truncate">@{vibe.author_name}</p>
                    {vibe.description && (
                      <p className="text-xs text-on-surface/30 mt-1 line-clamp-2 leading-relaxed">{vibe.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-2.5 text-[11px] text-on-surface/35">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">favorite</span>
                          {formatViews(vibe.like_count ?? 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          {formatViews(vibe.views)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnsave(vibe.id); }}
                        className="p-1 rounded-md text-primary/60 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title={language === 'zh-TW' ? '取消收藏' : 'Remove'}
                      >
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark_remove</span>
                      </button>
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
     TAB 3 — Liked
     ═══════════════════════════════════════════ */
  return (
    <main className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface overflow-x-hidden transition-[margin] duration-300">
      <div className="border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[22px] text-on-surface/50" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
            <h1 className="text-lg font-bold text-on-surface">{t('library_liked_title')}</h1>
          </div>
          <p className="text-sm text-on-surface/40 max-w-lg">{t('library_liked_intro')}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-20">
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
