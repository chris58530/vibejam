import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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

const LIBRARY_TABS: { id: LibraryTab; icon: string; countIcon: string }[] = [
  { id: 'history', icon: 'history', countIcon: 'schedule' },
  { id: 'saved', icon: 'playlist_play', countIcon: 'folder' },
  { id: 'liked', icon: 'thumb_up', countIcon: 'favorite' },
];

function normalizeHistoryPath(path: string) {
  if (path.startsWith('/vibe/')) return path.replace('/vibe/', '/p/');
  return path;
}

export default function YourLibrary({ currentUser }: YourLibraryProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useI18n();
  const reduceMotion = useReducedMotion();
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

  const setTab = (tab: LibraryTab) => {
    setSearchParams({ tab });
  };

  const authorId = currentUser?.username ? `@${currentUser.username}` : '@guest';
  const heroCount = activeTab === 'history' ? history.length : activeTab === 'saved' ? savedKits.length : 0;
  const heroTitle = activeTab === 'history'
    ? t('library_history_title')
    : activeTab === 'saved'
      ? t('library_saved_title')
      : t('library_liked_title');
  const heroDescription = activeTab === 'history'
    ? t('library_history_intro')
    : activeTab === 'saved'
      ? t('library_saved_intro')
      : t('library_liked_intro');

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
    <main className="md:ml-56 min-h-screen bg-surface overflow-x-hidden">
      <section className="relative border-b border-outline-variant/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(38,101,253,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_70%)]" />
        <div className="relative max-w-6xl mx-auto px-6 md:px-8 pt-10 pb-8 md:pt-12 md:pb-10">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-bold mb-3">{t('sidebar_your_library')}</p>
              <h1 className="text-[clamp(2.4rem,6vw,5.4rem)] leading-[0.92] font-black tracking-[-0.06em] text-on-surface uppercase">
                {heroTitle}
              </h1>
              <p className="text-sm md:text-base text-on-surface/55 mt-4 max-w-2xl leading-relaxed">
                {heroDescription}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {LIBRARY_TABS.map(tab => {
                const count = tab.id === 'history' ? history.length : tab.id === 'saved' ? savedKits.length : 0;
                const isCurrent = activeTab === tab.id;
                return (
                  <div key={tab.id} className={`rounded-[1.4rem] border px-4 py-4 transition-colors ${isCurrent ? 'border-primary/25 bg-surface-container-high' : 'border-outline-variant/10 bg-surface-container/70'}`}>
                    <div className="flex items-center gap-2 text-on-surface/35 mb-2">
                      <span className="material-symbols-outlined text-[16px]">{tab.countIcon}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em]">{t(`sidebar_${tab.id === 'saved' ? 'saved_vibes' : tab.id === 'liked' ? 'liked_code' : 'history'}` as never)}</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight text-on-surface">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-outline-variant/10 bg-surface-container-low/80 backdrop-blur-sm p-3 md:p-4">
            <div className="relative inline-flex flex-wrap gap-2 rounded-[1.25rem] bg-surface-container px-2 py-2">
              {LIBRARY_TABS.map(tab => {
                const isActive = activeTab === tab.id;
                const label = t(`sidebar_${tab.id === 'saved' ? 'saved_vibes' : tab.id === 'liked' ? 'liked_code' : 'history'}` as never);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTab(tab.id)}
                    className={`relative z-10 flex items-center gap-2 px-4 md:px-5 py-3 rounded-[1rem] text-sm font-bold tracking-[0.01em] whitespace-nowrap transition-colors ${
                      isActive ? 'text-on-primary' : 'text-on-surface/65 hover:text-on-surface'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="library-main-tab-indicator"
                        className="absolute inset-0 rounded-[1rem] bg-primary shadow-[0_10px_30px_rgba(38,101,253,0.28)]"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative material-symbols-outlined text-[18px]">{tab.icon}</span>
                    <span className="relative">{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-on-surface/35 mb-2">{t('library_collection_label')}</p>
                <h2 className="text-2xl md:text-3xl font-black tracking-[-0.04em] text-on-surface">{heroTitle}</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface/40 uppercase tracking-[0.18em]">
                <span>{t('library_items_count')} {heroCount}</span>
                <span className="w-1 h-1 rounded-full bg-on-surface/20" />
                <span>{authorId}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 md:px-8 py-8 pb-14">
        {activeTab === 'history' && (
          history.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-outline-variant/20 bg-surface-container-low px-8 py-20 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[52px] text-on-surface/15">history</span>
              <h2 className="text-xl font-bold text-on-surface/70 mt-4">{t('library_history_empty_title')}</h2>
              <p className="text-sm text-on-surface/40 mt-2 max-w-md leading-relaxed">{t('library_history_empty_desc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history
                .slice()
                .sort((left, right) => right.timestamp - left.timestamp)
                .map(item => (
                <article
                  key={item.id}
                  onClick={() => navigate(normalizeHistoryPath(item.path))}
                  className="group rounded-[1.7rem] border border-outline-variant/10 bg-surface-container-low hover:bg-surface-container transition-colors px-5 py-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1rem] bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/10">
                      <span className="material-symbols-outlined text-[22px] text-on-surface/35">deployed_code</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-on-surface truncate">{item.title || t('library_untitled')}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-surface/35">
                        <span>{t('library_last_opened')} · {formatTimeAgo(item.timestamp)}</span>
                        <span className="hidden md:block w-1 h-1 rounded-full bg-on-surface/20" />
                        <span className="uppercase tracking-[0.14em] text-[11px]">{t('library_timeline_label')}</span>
                      </div>
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
            <div className="rounded-[2rem] border border-dashed border-outline-variant/20 bg-surface-container-low px-8 py-20 flex flex-col items-center justify-center text-center">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {savedKits.map(kit => (
                <article
                  key={kit.id}
                  onClick={() => navigate('/workspace')}
                  className="group rounded-[1.8rem] overflow-hidden border border-outline-variant/10 bg-surface-container-low hover:border-outline-variant/30 transition-all cursor-pointer"
                >
                  <div className="aspect-video relative overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.16),transparent_28%),linear-gradient(135deg,rgba(38,101,253,0.26),rgba(0,0,0,0.02)_55%),linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]">
                    <div className="absolute inset-0 p-5 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/55">
                        <span>{t('library_saved_preview')}</span>
                        <span>{authorId}</span>
                      </div>
                      <div>
                        <p className="text-white/25 text-xs uppercase tracking-[0.24em] mb-2">{kit.tags || t('library_saved_no_tags')}</p>
                        <p className="text-[clamp(1.4rem,2vw,1.9rem)] font-black tracking-[-0.05em] text-white/88 leading-none line-clamp-2">{kit.title || t('library_untitled')}</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/38 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/0 group-hover:text-white text-[28px] transition-colors">play_circle</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-on-surface truncate">{kit.title || t('library_untitled')}</h3>
                      <p className="text-sm text-on-surface/38 mt-1 line-clamp-2">{kit.description || t('library_saved_fallback')}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-on-surface/35">
                      <span className="truncate">{authorId}</span>
                      <span className="shrink-0 uppercase tracking-[0.16em] text-[11px]">
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
          <div className="rounded-[2rem] border border-dashed border-outline-variant/20 bg-surface-container-low px-8 py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-surface-container-high flex items-center justify-center border border-outline-variant/10">
              <span className="material-symbols-outlined text-[40px] text-on-surface/20">thumb_up</span>
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