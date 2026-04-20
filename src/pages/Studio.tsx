import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { api, Vibe, User } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

type StudioTab = 'all' | 'published' | 'drafts' | 'remix';
type SortKey = 'date' | 'views' | 'comments';

interface SaveSlot {
  id: string;
  title: string;
  tags: string;
  description: string;
  editorMode: string;
  code: { html: string; css: string; js: string };
  savedAt: string;
  vibeId?: number;
}

// Unified row: either a published vibe or a local draft
interface StudioRow {
  kind: 'vibe' | 'draft';
  id: string;
  title: string;
  description?: string;
  visibility: 'public' | 'unlisted' | 'private' | 'draft';
  date: string;
  views: number;
  commentCount: number;
  likeCount: number;
  remixCount: number;
  isRemix: boolean;
  tags?: string;
  code?: string;
  // For loading into workspace
  vibeId?: number;
  saveSlot?: SaveSlot;
}

const VISIBILITY_CONFIG: Record<string, { icon: string; label: string; labelZh: string; color: string }> = {
  public: { icon: 'public', label: 'Public', labelZh: '公開', color: 'text-emerald-400' },
  unlisted: { icon: 'link', label: 'Unlisted', labelZh: '不公開', color: 'text-amber-400' },
  private: { icon: 'lock', label: 'Private', labelZh: '私人', color: 'text-red-400' },
  draft: { icon: 'edit_note', label: 'Draft', labelZh: '草稿', color: 'text-on-surface/40' },
};

function formatDate(dateStr: string, lang: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'zh-TW' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function titleColorClass(title: string): string {
  const palettes = [
    'from-violet-600/40 via-purple-600/20 to-indigo-800/40',
    'from-blue-600/40 via-cyan-500/20 to-sky-700/40',
    'from-emerald-600/40 via-teal-500/20 to-green-700/40',
    'from-rose-600/40 via-pink-500/20 to-red-700/40',
    'from-amber-600/40 via-orange-500/20 to-yellow-700/40',
    'from-indigo-600/40 via-blue-500/20 to-violet-800/40',
    'from-fuchsia-600/40 via-violet-500/20 to-purple-700/40',
    'from-sky-600/40 via-blue-500/20 to-cyan-700/40',
  ];
  const hash = [...title].reduce((a, c) => a + c.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

interface StudioProps {
  currentUser?: User;
}

export default function Studio({ currentUser }: StudioProps) {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const isZh = language === 'zh-TW';

  const [tab, setTab] = useState<StudioTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [search, setSearch] = useState('');
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<SaveSlot[]>([]);

  // Get supabase user id
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSupabaseUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch user's vibes
  useEffect(() => {
    if (!supabaseUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getVibes(supabaseUserId)
      .then(all => {
        const own = all.filter(v => v.author_name === currentUser?.username);
        setVibes(own);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [supabaseUserId, currentUser?.username]);

  // Load local drafts
  useEffect(() => {
    try {
      const saveKey = `beaverkit_saves_${currentUser?.id ?? 'guest'}`;
      const raw = localStorage.getItem(saveKey);
      if (raw) setDrafts(JSON.parse(raw));
    } catch {}
  }, [currentUser?.id]);

  // Build unified rows
  const rows = useMemo<StudioRow[]>(() => {
    const vibeRows: StudioRow[] = vibes.map(v => ({
      kind: 'vibe',
      id: `vibe-${v.id}`,
      title: v.title,
      description: v.description,
      visibility: v.visibility ?? 'public',
      date: v.created_at,
      views: v.views ?? 0,
      commentCount: v.comment_count ?? 0,
      likeCount: v.like_count ?? 0,
      remixCount: v.remix_count ?? 0,
      isRemix: !!v.parent_vibe_id,
      tags: v.tags,
      code: v.latest_code,
      vibeId: v.id,
    }));

    const draftRows: StudioRow[] = drafts
      .filter(d => !d.vibeId) // exclude drafts that are edits of published vibes
      .map(d => ({
        kind: 'draft',
        id: `draft-${d.id}`,
        title: d.title || (isZh ? '未命名草稿' : 'Untitled Draft'),
        description: d.description,
        visibility: 'draft',
        date: d.savedAt,
        views: 0,
        commentCount: 0,
        likeCount: 0,
        remixCount: 0,
        isRemix: false,
        tags: d.tags,
        saveSlot: d,
      }));

    return [...vibeRows, ...draftRows];
  }, [vibes, drafts, isZh]);

  // Filter by tab
  const filteredRows = useMemo(() => {
    let filtered = rows;

    switch (tab) {
      case 'published':
        filtered = filtered.filter(r => r.kind === 'vibe' && !r.isRemix);
        break;
      case 'drafts':
        filtered = filtered.filter(r => r.kind === 'draft');
        break;
      case 'remix':
        filtered = filtered.filter(r => r.isRemix);
        break;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.tags ?? '').toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'views': return b.views - a.views;
        case 'comments': return b.commentCount - a.commentCount;
        default: return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return filtered;
  }, [rows, tab, search, sortKey]);

  // Handle row click → navigate to workspace / vibe detail
  const handleEdit = (row: StudioRow) => {
    if (row.kind === 'draft' && row.saveSlot) {
      sessionStorage.setItem('beaverkit_pending_load', JSON.stringify(row.saveSlot));
      navigate('/workspace');
    } else if (row.vibeId) {
      // Load published vibe into workspace for editing
      const vibe = vibes.find(v => v.id === row.vibeId);
      if (vibe) {
        const slot: SaveSlot = {
          id: `edit-${vibe.id}`,
          title: vibe.title,
          tags: vibe.tags ?? '',
          description: vibe.description ?? '',
          editorMode: 'single',
          code: { html: vibe.latest_code ?? '', css: '', js: '' },
          savedAt: new Date().toISOString(),
          vibeId: vibe.id,
        };
        sessionStorage.setItem('beaverkit_pending_load', JSON.stringify(slot));
        navigate('/workspace');
      }
    }
  };

  const handleView = (row: StudioRow) => {
    if (row.vibeId) {
      navigate(`/p/${row.vibeId}`);
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    const key = `beaverkit_saves_${currentUser?.id ?? 'guest'}`;
    const updated = drafts.filter(d => d.id !== draftId);
    setDrafts(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const tabs: { key: StudioTab; label: string; count: number }[] = [
    { key: 'all', label: isZh ? '全部' : 'All', count: rows.length },
    { key: 'published', label: isZh ? '已發布' : 'Published', count: rows.filter(r => r.kind === 'vibe' && !r.isRemix).length },
    { key: 'drafts', label: isZh ? '草稿' : 'Drafts', count: rows.filter(r => r.kind === 'draft').length },
    { key: 'remix', label: 'Remix', count: rows.filter(r => r.isRemix).length },
  ];

  return (
    <div className="md:ml-[var(--app-sidebar-width)] transition-[margin] duration-300 min-h-screen px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline tracking-tight">
            {isZh ? '頻道內容' : 'Channel Content'}
          </h1>
          <p className="text-sm text-on-surface/40 mt-1">
            {isZh ? '管理你的所有 Kit 作品' : 'Manage all your Kits'}
          </p>
        </div>
        <button
          onClick={() => navigate('/workspace')}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          {isZh ? '建立' : 'Create'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-outline-variant/10 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              tab === t.key
                ? 'text-on-surface'
                : 'text-on-surface/40 hover:text-on-surface/70'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs ${tab === t.key ? 'text-on-surface/60' : 'text-on-surface/30'}`}>
                {t.count}
              </span>
            )}
            {tab === t.key && (
              <motion.div
                layoutId="studio-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface/30">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isZh ? '搜尋你的作品...' : 'Search your kits...'}
            className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-xl text-sm text-on-surface placeholder:text-on-surface/30 border border-outline-variant/10 focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 text-sm text-on-surface/40">
          <span className="material-symbols-outlined text-[18px]">sort</span>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="bg-transparent text-on-surface/60 text-sm cursor-pointer focus:outline-none"
          >
            <option value="date">{isZh ? '日期' : 'Date'}</option>
            <option value="views">{isZh ? '瀏覽數' : 'Views'}</option>
            <option value="comments">{isZh ? '留言數' : 'Comments'}</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !supabaseUserId ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-[56px] text-on-surface/15 mb-4">login</span>
          <h2 className="text-lg font-semibold text-on-surface/60 mb-2">
            {isZh ? '登入以管理你的作品' : 'Sign in to manage your kits'}
          </h2>
          <p className="text-sm text-on-surface/30 max-w-md">
            {isZh ? '登入後即可在此查看、編輯和管理你所有的 Kit 作品。' : 'Sign in to view, edit and manage all your Kits here.'}
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-[56px] text-on-surface/15 mb-4">
            {tab === 'drafts' ? 'edit_note' : 'dashboard'}
          </span>
          <h2 className="text-lg font-semibold text-on-surface/60 mb-2">
            {tab === 'drafts'
              ? (isZh ? '還沒有草稿' : 'No drafts yet')
              : search
                ? (isZh ? '沒有符合的結果' : 'No matching results')
                : (isZh ? '還沒有作品' : 'No kits yet')
            }
          </h2>
          <p className="text-sm text-on-surface/30 max-w-md mb-6">
            {isZh
              ? '點擊右上角的「建立」按鈕來創作你的第一個 Kit。'
              : 'Click the "Create" button to build your first Kit.'}
          </p>
          <button
            onClick={() => navigate('/workspace')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {isZh ? '建立第一個 Kit' : 'Create your first Kit'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredRows.map((row, idx) => {
              const vis = VISIBILITY_CONFIG[row.visibility] ?? VISIBILITY_CONFIG.public;
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03, duration: 0.22 }}
                  className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/[0.08] hover:border-outline-variant/25 transition-all hover:shadow-lg group cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div
                    className={`aspect-video bg-gradient-to-br ${titleColorClass(row.title)} relative overflow-hidden`}
                    onClick={() => handleEdit(row)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[52px] text-white/10 select-none">
                        {row.kind === 'draft' ? 'edit_note' : row.isRemix ? 'fork_right' : 'code_blocks'}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/50 to-transparent">
                      <p className="text-white/90 text-[11px] font-medium truncate">{row.title}</p>
                    </div>
                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleEdit(row); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-xs font-semibold hover:bg-white/30 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        {isZh ? '編輯' : 'Edit'}
                      </button>
                      {row.kind === 'vibe' && (
                        <button
                          onClick={e => { e.stopPropagation(); handleView(row); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-xs font-semibold hover:bg-white/30 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          {isZh ? '查看' : 'View'}
                        </button>
                      )}
                      {row.kind === 'draft' && row.saveSlot && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteDraft(row.saveSlot!.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/50 backdrop-blur-sm rounded-lg text-white text-xs font-semibold hover:bg-red-500/70 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          {isZh ? '刪除' : 'Delete'}
                        </button>
                      )}
                    </div>
                    {/* Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      {row.isRemix && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-tertiary/70 backdrop-blur-sm text-white font-medium">Remix</span>
                      )}
                      {row.kind === 'draft' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/80 font-medium">
                          {isZh ? '草稿' : 'Draft'}
                        </span>
                      )}
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`material-symbols-outlined text-[16px] drop-shadow ${vis.color}`}>{vis.icon}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5" onClick={() => handleEdit(row)}>
                    <h3 className="text-sm font-semibold text-on-surface leading-snug line-clamp-1 mb-1">{row.title}</h3>
                    {row.description ? (
                      <p className="text-xs text-on-surface/40 line-clamp-2 leading-relaxed mb-3">{row.description}</p>
                    ) : (
                      <div className="mb-3" />
                    )}
                    <div className="flex items-center justify-between text-[11px] text-on-surface/30">
                      <span>{formatDate(row.date, language)}</span>
                      {row.kind === 'vibe' && (
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">visibility</span>
                            {formatNumber(row.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">favorite</span>
                            {formatNumber(row.likeCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">comment</span>
                            {formatNumber(row.commentCount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {filteredRows.length > 0 && (
        <div className="mt-8 pb-4 text-xs text-on-surface/20 text-center">
          {isZh
            ? `共 ${filteredRows.length} 項`
            : `${filteredRows.length} item${filteredRows.length !== 1 ? 's' : ''}`
          }
        </div>
      )}
    </div>
  );
}
