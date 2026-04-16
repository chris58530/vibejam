import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, Vibe, Version, Comment, User, VibeChild, VibeAncestor, AccessDeniedError } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import AuthModal from '../components/AuthModal';
import VibeComments from '../components/VibeComments';

interface VibeDetailProps {
  currentUser?: User;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

// ── OriginCard ─────────────────────────────────────────────────────
interface OriginCardProps {
  ancestorChain: VibeAncestor[];
  onNavigate: (id: number) => void;
}

function OriginCard({ ancestorChain, onNavigate }: OriginCardProps) {
  if (ancestorChain.length === 0) return null;
  const root = ancestorChain[0];
  const initial = root.title?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="border-l-[3px] border-tertiary/60 bg-tertiary/5 rounded-r-xl px-3 py-3 mb-0">
      <p className="text-[10px] italic text-on-surface/35 mb-2">起源自這個作品</p>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-full bg-tertiary/20 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-tertiary/20">
          {root.author_avatar
            ? <img src={root.author_avatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-[11px] font-bold text-tertiary">{initial}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-on-surface truncate leading-snug">{root.title}</p>
          <p className="text-[11px] text-on-surface/40 truncate">by {root.author_name}</p>
        </div>
      </div>
      <button
        onClick={() => onNavigate(root.id)}
        className="flex items-center gap-1 text-[11px] font-semibold text-tertiary hover:text-tertiary/80 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
        查看原作
      </button>
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-tertiary/15">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <p className="text-[10px] text-on-surface/35">這個 Remix 家族的所有作品共用同一個討論空間</p>
      </div>
    </div>
  );
}

// ── EditorialLineage ───────────────────────────────────────────────
interface EditorialLineageProps {
  ancestorChain: VibeAncestor[];
  currentTitle: string;
  currentAuthor: string;
  onNavigate: (id: number) => void;
}

function EditorialLineage({ ancestorChain, currentTitle, currentAuthor, onNavigate }: EditorialLineageProps) {
  const depth = ancestorChain.length;

  if (depth === 0) {
    // current IS root
    return (
      <div>
        <div className="bg-primary/7 border border-primary/14 rounded-xl p-3">
          <p className="text-sm font-bold text-on-surface truncate">{currentTitle}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <p className="text-[11px] text-primary truncate">@{currentAuthor} · 這是起源作品，正在觀看</p>
          </div>
        </div>
      </div>
    );
  }

  const parent = ancestorChain[depth - 1];

  if (depth === 1) {
    // parent IS root
    return (
      <div>
        <p className="text-[10px] text-on-surface/35 italic mb-2">直接 remix 自原作</p>
        <button
          onClick={() => onNavigate(parent.id)}
          className="w-full flex items-start gap-2 p-2 -mx-0 rounded-lg hover:bg-surface-container-high/60 transition-colors cursor-pointer text-left mb-1"
        >
          <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-outline-variant/20 mt-0.5">
            {parent.author_avatar
              ? <img src={parent.author_avatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-[9px] font-bold text-on-surface/50">{parent.title?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-on-surface/60 truncate leading-snug">{parent.title}</p>
            <p className="text-[11px] text-on-surface/35 truncate">by {parent.author_name}</p>
          </div>
          <span className="material-symbols-outlined text-[13px] text-on-surface/20 mt-1 shrink-0">open_in_new</span>
        </button>
        <p className="text-[10px] text-on-surface/25 px-2 py-0.5">↓ 第 1 代</p>
        <div className="bg-primary/7 border border-primary/14 rounded-xl p-3 mt-1">
          <p className="text-sm font-bold text-on-surface truncate">{currentTitle}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <p className="text-[11px] text-primary truncate">@{currentAuthor} · 正在觀看</p>
          </div>
        </div>
      </div>
    );
  }

  // depth > 1
  return (
    <div>
      <p className="text-[10px] text-on-surface/35 italic mb-2">remix 自</p>
      <button
        onClick={() => onNavigate(parent.id)}
        className="w-full flex items-start gap-2 p-2 -mx-0 rounded-lg hover:bg-surface-container-high/60 transition-colors cursor-pointer text-left mb-1"
      >
        <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-outline-variant/20 mt-0.5">
          {parent.author_avatar
            ? <img src={parent.author_avatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-[9px] font-bold text-on-surface/50">{parent.title?.[0]?.toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-on-surface/60 truncate leading-snug">{parent.title}</p>
          <p className="text-[11px] text-on-surface/35 truncate">by {parent.author_name}</p>
        </div>
        <span className="material-symbols-outlined text-[13px] text-on-surface/20 mt-1 shrink-0">open_in_new</span>
      </button>
      <p className="text-[10px] text-on-surface/25 px-2 py-0.5">↓ 第 {depth} 代，距起源 {depth} 層</p>
      <div className="bg-primary/7 border border-primary/14 rounded-xl p-3 mt-1">
        <p className="text-sm font-bold text-on-surface truncate">{currentTitle}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <p className="text-[11px] text-primary truncate">@{currentAuthor} · 正在觀看</p>
        </div>
      </div>
    </div>
  );
}

// ── RemixList ──────────────────────────────────────────────────────
interface RemixListProps {
  children: VibeChild[];
  onNavigate: (id: number) => void;
}

function RemixList({ children, onNavigate }: RemixListProps) {
  if (children.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-on-surface/25">還沒有 Remix</p>
        <p className="text-[11px] text-on-surface/15 mt-0.5">成為第一個 Remix 的人</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {children.map(child => {
        const initial = child.title?.[0]?.toUpperCase() ?? '?';
        return (
          <button
            key={child.id}
            onClick={() => onNavigate(child.id)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-container-high/60 transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-outline-variant/20">
              {child.author_avatar
                ? <img src={child.author_avatar} alt="" className="w-full h-full object-cover" />
                : <span className="text-[10px] font-bold text-on-surface/50">{initial}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-on-surface/70 truncate leading-snug">{child.title}</p>
              <p className="text-[11px] text-on-surface/35 truncate">by {child.author_name}</p>
            </div>
            {Number(child.remix_count) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-on-surface/30 bg-surface-container-highest px-1.5 py-0.5 rounded-full shrink-0">
                <span className="material-symbols-outlined text-[10px]">repeat</span>
                {child.remix_count}
              </span>
            )}
            <span className="material-symbols-outlined text-[14px] text-on-surface/20 shrink-0">chevron_right</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function VibeDetail({ currentUser }: VibeDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const isSending = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [iframeVisible, setIframeVisible] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Lineage state (lifted from RemixTree)
  const [ancestors, setAncestors] = useState<VibeAncestor[]>([]);
  const [vibeChildren, setVibeChildren] = useState<VibeChild[]>([]);
  const [lineageLoading, setLineageLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSupabaseUser(data.session?.user ?? null));
  }, []);

  useEffect(() => { loadVibe(); }, [id, supabaseUser]);

  const loadVibe = async () => {
    if (supabaseUser === undefined) return;
    if (!id) { navigate('/'); return; }
    try {
      const data = await api.getVibe(id, supabaseUser?.id);
      setVibe(data);
      setLikeCount(data.like_count ?? 0);
      setLiked(data.user_liked ?? false);
      if (data.versions?.length) setSelectedVersion(data.versions[0]);
    } catch (err) {
      if (err instanceof AccessDeniedError) setAccessDenied(true);
      else navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!vibe) return;
    setLineageLoading(true);
    Promise.all([
      api.getVibeAncestry(vibe.id),
      api.getVibeChildren(vibe.id),
    ]).then(([anc, chi]) => {
      setAncestors(anc);
      setVibeChildren(chi);
    }).finally(() => setLineageLoading(false));
  }, [vibe?.id]);

  // 瀏覽紀錄：vibe 載入後寫入 localStorage，供 Sidebar Your Library 使用
  useEffect(() => {
    if (!vibe) return;
    try {
      const raw = localStorage.getItem('bk_history');
      const prev: Array<{ id: number; title: string; timestamp: number; path: string }> = raw ? JSON.parse(raw) : [];
      const entry = { id: vibe.id, title: vibe.title || '未命名', timestamp: Date.now(), path: `/p/${vibe.id}` };
      const updated = [entry, ...prev.filter(h => h.id !== vibe.id)].slice(0, 50);
      localStorage.setItem('bk_history', JSON.stringify(updated));
    } catch { /* storage full or parse error */ }
  }, [vibe?.id]);

  // 切回分頁時自動刷新最新資料（vibe 主資料 + remix 子列表）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadVibe();
        if (id) {
          api.getVibeChildren(Number(id)).then(chi => setVibeChildren(chi)).catch(() => { });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, supabaseUser]);

  const ancestorChain = ancestors.slice(0, -1); // remove last (current)

  const handleAddComment = async (content: string) => {
    if (!content.trim() || !selectedVersion || !currentUser || !vibe) return;
    if (isSending.current) return;
    isSending.current = true;
    const codeSnippet = '';
    const tempId = -Date.now();
    const optimistic: Comment = {
      id: tempId, vibe_id: vibe.id, version_id: selectedVersion.id,
      author_id: currentUser.id, author_name: currentUser.username,
      author_avatar: currentUser.avatar, content, code_snippet: codeSnippet,
      is_adopted: 0, created_at: new Date().toISOString(), optimistic: true,
    };
    setVibe(prev => prev ? {
      ...prev,
      comments: [...(prev.comments ?? []), optimistic],
      comment_count: (prev.comment_count ?? (prev.comments?.length ?? 0)) + 1,
    } : prev);
    try {
      await api.addComment(vibe.id, { content, code_snippet: codeSnippet, version_id: selectedVersion.id, author_id: currentUser.id });
      // 標記為已確認（移除 dimmed 效果），再靜默刷新取得真實 ID
      setVibe(prev => prev ? {
        ...prev,
        comments: (prev.comments ?? []).map((c: Comment) =>
          c.id === tempId ? { ...c, optimistic: false } : c
        ),
      } : prev);
      loadVibe();
    } catch (e) {
      console.error(e);
      setVibe(prev => prev ? {
        ...prev,
        comments: (prev.comments ?? []).filter((c: Comment) => c.id !== tempId),
        comment_count: Math.max(0, (prev.comment_count ?? 1) - 1),
      } : prev);
    } finally {
      isSending.current = false;
    }
  };

  const handleToggleLike = async () => {
    if (!supabaseUser) { setShowAuthModal(true); return; }
    if (isLiking || !vibe) return;
    setIsLiking(true);
    setLiked((p: boolean) => !p);
    setLikeCount((p: number) => liked ? p - 1 : p + 1);
    try {
      const r = await api.toggleLike(vibe.id, supabaseUser.id);
      setLiked(r.liked); setLikeCount(r.like_count);
    } catch {
      setLiked((p: boolean) => !p);
      setLikeCount((p: number) => liked ? p + 1 : p - 1);
    } finally { setIsLiking(false); }
  };

  const handleSelectVersion = (v: Version) => {
    if (v.id === selectedVersion?.id) return;
    setIframeVisible(false);
    setTimeout(() => { setSelectedVersion(v); setIframeVisible(true); }, 150);
  };

  const handleRemix = () => {
    if (!vibe) return;
    if (!currentUser) { setShowAuthModal(true); return; }
    navigate('/remix', {
      state: {
        parentVibeId: vibe.id, code: selectedVersion?.code || '',
        title: vibe.title, authorName: vibe.author_name,
        versionNumber: selectedVersion?.version_number || 1,
        parentVisibility: vibe.visibility || 'public',
      },
    });
  };

  const handleEdit = () => {
    if (!vibe) return;
    const slot = {
      id: `vibe-${vibe.id}`,
      title: vibe.title,
      tags: vibe.tags || '',
      editorMode: 'single',
      code: { html: selectedVersion?.code || '', css: '', js: '' },
      savedAt: new Date().toISOString(),
      vibeId: vibe.id,
    };
    sessionStorage.setItem('beaverkit_pending_load', JSON.stringify(slot));
    navigate('/workspace');
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return '1d ago';
    if (days < 30) return `${days}d ago`;
    const m = Math.floor(days / 30);
    if (m < 12) return `${m}mo ago`;
    return `${Math.floor(m / 12)}y ago`;
  };

  const parsedTags = vibe?.tags ? vibe.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const commentCount = vibe?.comment_count ?? vibe?.comments?.length ?? 0;
  const remixCount = vibe?.remix_count ?? 0;

  if (loading) return (
    <div className="md:ml-56 h-screen flex items-center justify-center bg-surface text-on-surface/35 text-sm">
      Loading…
    </div>
  );

  if (accessDenied) return (
    <div className="md:ml-56 h-screen flex flex-col items-center justify-center bg-surface gap-5">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
        <span className="material-symbols-outlined text-[32px] text-on-surface/30">lock</span>
      </div>
      <div className="text-center">
        <h1 className="text-on-surface font-bold text-lg mb-1">Access Denied</h1>
        <p className="text-on-surface/40 text-sm">This vibe is private.</p>
      </div>
      <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold cursor-pointer">
        Go Home
      </button>
    </div>
  );

  if (!vibe) return null;
  const isOwner = vibe.user_role === 'owner';

  const handleNavigate = (nid: number) => {
    navigate(`/p/${nid}`);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="md:ml-56 h-[calc(100vh-64px)] flex overflow-hidden bg-black">

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-black">
          <iframe srcDoc={selectedVersion?.code} className="w-full h-full border-none" title="Fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock" />
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute bottom-5 right-5 w-9 h-9 bg-black/70 backdrop-blur text-white rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors ring-1 ring-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">fullscreen_exit</span>
          </button>
        </div>
      )}

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-40 w-[280px] bg-surface-container-low flex flex-col lg:hidden overflow-y-auto">
            <div className="h-11 flex items-center shrink-0 border-b border-outline-variant/10 px-3 gap-2 bg-surface-container-low sticky top-0 z-10">
              <span className="flex-1 text-[11px] font-sans font-semibold text-on-surface/50 uppercase tracking-wider">Remix 資訊</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center text-on-surface/40 hover:text-on-surface cursor-pointer rounded">
                <span className="material-symbols-outlined text-[17px]">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Author */}
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-high/40 transition-colors rounded-lg p-2 -mx-2"
                onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}`)}
              >
                <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center overflow-hidden ring-1 ring-black/[0.06] shrink-0">
                  {vibe.author_avatar
                    ? <img src={vibe.author_avatar} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-on-primary-container">{vibe.author_name?.[0]?.toUpperCase() ?? vibe.title[0]}</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">@{vibe.author_name}</p>
                  <p className="text-[11px] text-on-surface/40">{timeAgo(vibe.created_at)}</p>
                </div>
              </div>
              {ancestorChain.length > 0 && (
                <OriginCard ancestorChain={ancestorChain} onNavigate={handleNavigate} />
              )}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface/50 mb-3">Remix 路徑</p>
                <EditorialLineage ancestorChain={ancestorChain} currentTitle={vibe.title} currentAuthor={vibe.author_name} onNavigate={handleNavigate} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface/50 mb-3">所有 Remixes ({vibeChildren.length})</p>
                {lineageLoading
                  ? <div className="flex justify-center py-6"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
                  : <RemixList children={vibeChildren} onNavigate={handleNavigate} />}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ THREE-COLUMN LAYOUT ═══════ */}
      {/* bg-black gap via pl/pt creates consistent 10px black divider lines */}

      {/* ── CENTER + RIGHT + FOOTER WRAPPER ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pl-[10px]">
        {/* ── COLUMNS ROW ── */}
        <div className="flex gap-[10px]">

          {/* ── CENTER CONTENT (70%) ── */}
          <div className="flex-1 flex flex-col min-w-0 bg-surface rounded-xl">
            {/* Player */}
            <div className="bg-black relative group w-full rounded-t-xl overflow-hidden aspect-video">
              <iframe
                srcDoc={selectedVersion?.code}
                className="absolute inset-0 w-full h-full border-none transition-opacity duration-150"
                style={{ opacity: iframeVisible ? 1 : 0 }}
                title="Stage"
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
              />
              <button
                onClick={() => setIsFullscreen(true)}
                className="absolute bottom-3 right-3 w-8 h-8 bg-black/60 backdrop-blur text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-all ring-1 ring-white/10 cursor-pointer opacity-0 group-hover:opacity-100 z-10"
              >
                <span className="material-symbols-outlined text-[16px]">fullscreen</span>
              </button>
              {/* Mobile: tree toggle + back */}
              <div className="absolute top-3 left-3 flex gap-2 z-10 lg:hidden">
                <button onClick={() => navigate(-1)} className="w-8 h-8 bg-black/60 backdrop-blur text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-all ring-1 ring-white/10 cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </button>
                <button onClick={() => setMobileSidebarOpen(true)} className="w-8 h-8 bg-black/60 backdrop-blur text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-all ring-1 ring-white/10 cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">account_tree</span>
                </button>
              </div>
            </div>

            {/* Version selector strip — below player */}
            {(vibe.versions?.length ?? 0) > 1 && (
              <div className="flex items-center gap-1 px-3 py-2 bg-surface-container-low border-b border-outline-variant/8 overflow-x-auto no-scrollbar">
                <span className="material-symbols-outlined text-[14px] text-on-surface/30 shrink-0 mr-1">history</span>
                {vibe.versions?.map((version, idx) => {
                  const isSel = selectedVersion?.id === version.id;
                  const isLatest = idx === 0;
                  return (
                    <button
                      key={version.id}
                      onClick={() => handleSelectVersion(version)}
                      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${isSel
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
                        : 'text-on-surface/45 hover:bg-surface-container-high hover:text-on-surface/70'
                        }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSel ? 'bg-primary' : 'bg-on-surface/20'}`} />
                      V{version.version_number}
                      {isLatest && !isSel && <span className="text-[8px] text-emerald-400 uppercase">new</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Info card */}
            <div className="px-5 pt-4 pb-3">
              <h1 className="text-lg font-bold text-on-surface mb-2 leading-snug">{vibe.title}</h1>
              <div className="flex items-center gap-4 flex-wrap mb-2.5">
                <span className="flex items-center gap-1 text-xs text-on-surface/45">
                  <span className="material-symbols-outlined text-[13px]">visibility</span>{vibe.views} views
                </span>
                <span className="flex items-center gap-1 text-xs text-on-surface/45">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>{timeAgo(vibe.created_at)}
                </span>
                {remixCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-on-surface/45">
                    <span className="material-symbols-outlined text-[13px]">repeat</span>{remixCount} remixes
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-on-surface/45">
                  <span className="material-symbols-outlined text-[13px]">layers</span>V{selectedVersion?.version_number}
                </span>
              </div>
              {parsedTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                  {parsedTags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] text-on-surface/55 ring-1 ring-black/[0.05]">#{tag}</span>
                  ))}
                </div>
              )}
              {vibe.description ? (
                <p className="text-[13px] text-on-surface/70 leading-relaxed whitespace-pre-wrap">{vibe.description}</p>
              ) : (
                <p className="text-[13px] text-on-surface/25 italic">No description provided.</p>
              )}
            </div>

            {/* ── Comments section ── */}
            <VibeComments
              currentUser={currentUser}
              comments={vibe.comments ?? []}
              commentCount={commentCount}
              vibeAuthorId={vibe.author_id}
              onAddComment={handleAddComment}
              onRequireAuth={() => setShowAuthModal(true)}
              timeAgo={timeAgo}
            />

          </div>

          {/* ── RIGHT SIDEBAR (20%) ── pump.fun-style separated cards ── */}
          <div className="hidden lg:flex flex-col w-[20%] min-w-[240px] max-w-[320px] shrink-0 gap-[10px] bg-black">

            {/* Card 1: Author + Actions */}
            <div className="bg-surface rounded-xl border border-outline-variant/20">
              {/* Author */}
              <div
                className="flex items-center gap-3 px-4 pt-4 pb-3 cursor-pointer hover:bg-surface-container-high/30 transition-colors"
                onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}`)}
              >
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden ring-2 ring-primary/20 shrink-0">
                  {vibe.author_avatar
                    ? <img src={vibe.author_avatar} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-on-primary-container">{vibe.author_name?.[0]?.toUpperCase() ?? vibe.title[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">@{vibe.author_name}</p>
                  <p className="text-[11px] text-on-surface/40">{timeAgo(vibe.created_at)}</p>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface/25 shrink-0">chevron_right</span>
              </div>
              {/* Action buttons */}
              <div className="px-4 pb-4 flex gap-2">
                {isOwner ? (
                  <button
                    onClick={handleEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={handleRemix}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">repeat</span>
                    Remix
                  </button>
                )}
                <button
                  onClick={handleToggleLike}
                  disabled={isLiking}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${liked ? 'bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/30 hover:bg-pink-500/20' : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface/55 ring-1 ring-outline-variant/15'
                    }`}
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                  {likeCount > 0 ? likeCount : 'Like'}
                </button>
                {isOwner && (
                  <button
                    onClick={handleRemix}
                    title="Remix 自己的作品（建立實驗分支）"
                    aria-label="Remix this vibe as an experimental branch"
                    className="flex items-center gap-1 px-3 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-lg ring-1 ring-outline-variant/15 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">repeat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Stats */}
            <div className="bg-surface rounded-xl border border-outline-variant/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-on-surface/40">visibility</span>
                    <span className="text-sm font-bold text-on-surface">{vibe.views ?? 0}</span>
                  </div>
                  <div className="w-px h-4 bg-outline-variant/15" />
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-pink-400" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                    <span className="text-sm font-bold text-pink-400">{likeCount}</span>
                  </div>
                  <div className="w-px h-4 bg-outline-variant/15" />
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-tertiary">repeat</span>
                    <span className="text-sm font-bold text-tertiary">{remixCount}</span>
                  </div>
                </div>
                <span className="text-[10px] text-on-surface/25 bg-surface-container-high px-2 py-0.5 rounded-full">V{selectedVersion?.version_number ?? 1}</span>
              </div>
            </div>

            {/* Card 3: Remix 路徑 */}
            <div className="bg-surface rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface/50">Remix 路徑</span>
              </div>
              <div className="px-4 pb-3">
                {lineageLoading
                  ? <div className="flex justify-center py-6"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
                  : <EditorialLineage ancestorChain={ancestorChain} currentTitle={vibe.title} currentAuthor={vibe.author_name} onNavigate={nid => navigate(`/p/${nid}`)} />}
              </div>
            </div>

            {/* Card 4: All Remixes */}
            <div className="bg-surface rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface/50">所有 Remixes</span>
                {vibeChildren.length > 0 && <span className="text-[10px] text-on-surface/30 bg-surface-container-high px-2 py-0.5 rounded-full">{vibeChildren.length}</span>}
              </div>
              <div className="px-3 pb-3">
                {lineageLoading
                  ? <div className="flex justify-center py-6"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
                  : <RemixList children={vibeChildren} onNavigate={nid => navigate(`/p/${nid}`)} />}
              </div>
            </div>
          </div>
        </div>

        {/* Platform footer — spans center + right */}
        <footer className="shrink-0 flex flex-row justify-between items-center px-6 py-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface/60 font-sans">BeaverKit</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface/25">© 2024</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-on-surface/30 hover:text-primary transition-colors">Terms</a>
            <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-on-surface/30 hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-on-surface/30 hover:text-primary transition-colors">About</a>
          </div>
        </footer>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
