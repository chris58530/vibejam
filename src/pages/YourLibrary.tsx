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
}

interface YourLibraryProps {
  currentUser?: User;
}

const LIBRARY_TABS: { id: LibraryTab; icon: string; countIcon: string }[] = [
  { id: 'history', icon: 'history', countIcon: 'schedule' },
  { id: 'saved', icon: 'playlist_play', countIcon: 'folder' },
  { id: 'liked', icon: 'thumb_up', countIcon: 'favorite' },
];

export default function YourLibrary({ currentUser }: YourLibraryProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
      setHistory(Array.isArray(parsed) ? parsed : []);
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

  const setTab = (tab: LibraryTab) => {
    setSearchParams({ tab });
  };

  const removeHistoryItem = (id: string | number) => {
    const updated = history.filter((entry: HistoryEntry) => entry.id !== id);
    setHistory(updated);
    localStorage.setItem('bk_history', JSON.stringify(updated));
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

  return (
    <main className="md:ml-56 min-h-screen bg-surface">
      <section className="px-6 md:px-8 pt-8 pb-6 border-b border-outline-variant/10 bg-gradient-to-b from-surface-container-low to-surface">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-primary font-bold mb-2">{t('sidebar_your_library')}</p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface">{t('library_title')}</h1>
              <p className="text-sm md:text-base text-on-surface/55 mt-2 max-w-2xl leading-relaxed">{t('library_subtitle')}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[360px]">
              {LIBRARY_TABS.map(tab => {
                const count = tab.id === 'history' ? history.length : tab.id === 'saved' ? savedKits.length : 0;
                return (
                  <div key={tab.id} className="rounded-2xl border border-outline-variant/10 bg-surface-container px-4 py-3">
                    <div className="flex items-center gap-2 text-on-surface/35 mb-2">
                      <span className="material-symbols-outlined text-[16px]">{tab.countIcon}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em]">{t(`sidebar_${tab.id === 'saved' ? 'saved_vibes' : tab.id === 'liked' ? 'liked_code' : 'history'}` as never)}</span>
                    </div>
                    <p className="text-2xl font-bold text-on-surface">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 bg-surface/90 backdrop-blur-md border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {LIBRARY_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const label = t(`sidebar_${tab.id === 'saved' ? 'saved_vibes' : tab.id === 'liked' ? 'liked_code' : 'history'}` as never);
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-on-surface text-surface'
                    : 'bg-surface-container text-on-surface/60 hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-6 md:px-8 py-8 pb-14">
        {activeTab === 'history' && (
          history.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-outline-variant/20 bg-surface-container-low px-8 py-20 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[52px] text-on-surface/15">history</span>
              <h2 className="text-xl font-bold text-on-surface/70 mt-4">{t('library_history_empty_title')}</h2>
              <p className="text-sm text-on-surface/40 mt-2 max-w-md leading-relaxed">{t('library_history_empty_desc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(item => (
                <article
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className="group rounded-2xl border border-outline-variant/10 bg-surface-container-low hover:bg-surface-container transition-colors px-5 py-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[22px] text-on-surface/35">code_blocks</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-on-surface truncate">{item.title || t('library_untitled')}</p>
                      <p className="text-sm text-on-surface/35 mt-1">{t('library_last_opened')} · {formatTimeAgo(item.timestamp)}</p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        removeHistoryItem(item.id);
                      }}
                      className="px-3 py-2 rounded-xl text-sm text-on-surface/35 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      {t('library_remove')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )
        )}

        {activeTab === 'saved' && (
          savedKits.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-outline-variant/20 bg-surface-container-low px-8 py-20 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[52px] text-on-surface/15">playlist_play</span>
              <h2 className="text-xl font-bold text-on-surface/70 mt-4">{t('library_saved_empty_title')}</h2>
              <p className="text-sm text-on-surface/40 mt-2 max-w-md leading-relaxed">{t('library_saved_empty_desc')}</p>
              <button
                onClick={() => navigate('/workspace')}
                className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors"
              >
                {t('library_go_workspace')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {savedKits.map(kit => (
                <article
                  key={kit.id}
                  onClick={() => navigate('/workspace')}
                  className="group rounded-3xl overflow-hidden border border-outline-variant/10 bg-surface-container-low hover:border-outline-variant/30 transition-all cursor-pointer"
                >
                  <div className="aspect-video bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] relative flex items-center justify-center">
                    <span className="material-symbols-outlined text-[40px] text-on-surface/10">code_blocks</span>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/0 group-hover:text-white/90 text-[26px] transition-colors">open_in_new</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-on-surface truncate">{kit.title || t('library_untitled')}</h3>
                        <p className="text-sm text-on-surface/35 mt-1 line-clamp-2">{kit.description || t('library_saved_fallback')}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-on-surface/35">
                      <span className="truncate">{kit.tags || t('library_saved_no_tags')}</span>
                      <span className="shrink-0">
                        {new Date(kit.savedAt).toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        )}

        {activeTab === 'liked' && (
          <div className="rounded-3xl border border-dashed border-outline-variant/20 bg-surface-container-low px-8 py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-[38px] text-on-surface/20">thumb_up</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface/70 mt-5">{t('library_liked_empty_title')}</h2>
            <p className="text-sm text-on-surface/40 mt-2 max-w-md leading-relaxed">{t('library_liked_empty_desc')}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors"
            >
              {t('library_go_home')}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}