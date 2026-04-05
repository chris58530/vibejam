import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Vibe, Version, Comment, User, VibeChild, VibeAncestor, AccessDeniedError } from '../lib/api';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';

interface VibeDetailProps {
  currentUser?: User;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

// ── Remix Tree ─────────────────────────────────────────────────────
interface RemixTreeProps {
  vibeId: number;
  currentTitle: string;
  currentAuthor: string;
  onNavigate: (id: number) => void;
}

function RemixTree({ vibeId, currentTitle, currentAuthor, onNavigate }: RemixTreeProps) {
  const [ancestors, setAncestors] = useState<VibeAncestor[]>([]);
  const [children, setChildren] = useState<VibeChild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getVibeAncestry(vibeId),
      api.getVibeChildren(vibeId),
    ]).then(([anc, chi]) => {
      setAncestors(anc);
      setChildren(chi);
    }).finally(() => setLoading(false));
  }, [vibeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const ancestorChain = ancestors.slice(0, -1);
  const MAX_SHOW = 3;
  const collapsed = ancestorChain.length > MAX_SHOW;
  let displayedAncestors = ancestorChain;
  let hiddenCount = 0;
  if (collapsed) {
    hiddenCount = ancestorChain.length - MAX_SHOW + 1;
    displayedAncestors = [ancestorChain[0], ...ancestorChain.slice(-(MAX_SHOW - 1))];
  }
  const isRoot = ancestorChain.length === 0;

  return (
    <div className="select-none font-sans">
      {/* Origin label for root vibes */}
      {isRoot && (
        <div className="flex items-start gap-3 mb-0">
          <div className="flex flex-col items-center shrink-0 pt-0.5">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-outline-variant/30 bg-surface-container-highest" />
            <div className="w-px bg-outline-variant/20 mt-1 flex-1 min-h-[20px]" />
          </div>
          <p className="text-[11px] text-on-surface/25 uppercase tracking-widest pb-3">Origin</p>
        </div>
      )}

      {/* Ancestors */}
      {displayedAncestors.map((anc, i) => {
        const showDots = collapsed && i === 0 && hiddenCount > 0;
        return (
          <React.Fragment key={anc.id}>
            <button
              onClick={() => onNavigate(anc.id)}
              className="flex items-start gap-3 w-full text-left group cursor-pointer"
            >
              <div className="flex flex-col items-center shrink-0 pt-0.5">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-outline-variant/25 bg-surface-container-high group-hover:border-primary/50 transition-colors" />
                <div className="w-px bg-outline-variant/20 mt-1 flex-1 min-h-[28px]" />
              </div>
              <div className="flex-1 min-w-0 pb-3">
                <p className="text-sm text-on-surface/55 group-hover:text-on-surface/90 transition-colors truncate leading-snug">{anc.title}</p>
                <p className="text-xs text-on-surface/30 truncate mt-0.5">by {anc.author_name}</p>
              </div>
              <span className="material-symbols-outlined text-[13px] text-on-surface/15 group-hover:text-primary/50 transition-colors mt-1 shrink-0">open_in_new</span>
            </button>
            {showDots && (
              <div className="flex items-start gap-3 mb-0">
                <div className="flex flex-col items-center shrink-0 w-2.5">
                  <div className="flex flex-col gap-[3px] py-0.5">
                    {[0,1,2].map(d => <div key={d} className="w-[3px] h-[3px] rounded-full bg-outline-variant/25" />)}
                  </div>
                  <div className="w-px bg-outline-variant/20 flex-1 min-h-[8px]" />
                </div>
                <p className="text-xs text-on-surface/20 pb-2">{hiddenCount} more levels</p>
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Current node */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center shrink-0 pt-0.5">
          <div className="w-3.5 h-3.5 rounded-full bg-primary shadow-md shadow-primary/40 flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 bg-on-primary rounded-full" />
          </div>
          {children.length > 0 && <div className="w-px bg-primary/25 mt-1 flex-1 min-h-[24px]" />}
        </div>
        <div className={`min-w-0 ${children.length > 0 ? 'pb-3' : ''}`}>
          <p className="text-sm font-semibold text-on-surface truncate leading-snug">{currentTitle}</p>
          <p className="text-xs text-primary/60 mt-0.5">by {currentAuthor} · viewing now</p>
        </div>
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="ml-[5px] border-l border-outline-variant/15 pl-4 mt-0">
          <p className="text-[11px] text-on-surface/25 uppercase tracking-widest py-2">
            {children.length} fork{children.length !== 1 ? 's' : ''}
          </p>
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => onNavigate(child.id)}
              className="flex items-center gap-2.5 w-full text-left group py-2 px-2 -mx-2 cursor-pointer hover:bg-surface-container-high/60 rounded-lg transition-colors"
            >
              <div className="w-2 h-2 rounded-full border border-outline-variant/30 bg-surface-container-highest group-hover:border-primary/40 transition-colors shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-on-surface/55 group-hover:text-on-surface/90 transition-colors truncate">{child.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-on-surface/30 truncate">by {child.author_name}</p>
                  {Number(child.remix_count) > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-on-surface/20">
                      <span className="material-symbols-outlined text-[10px]">repeat</span>
                      {child.remix_count}
                    </span>
                  )}
                </div>
              </div>
              <span className="material-symbols-outlined text-[14px] text-on-surface/15 group-hover:text-primary/50 transition-colors shrink-0">chevron_right</span>
            </button>
          ))}
        </div>
      )}

      {children.length === 0 && (
        <div className="pt-3 pl-7">
          <p className="text-xs text-on-surface/20">No forks yet</p>
          <p className="text-xs text-on-surface/15 mt-0.5">Be the first to remix</p>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function VibeDetail({ currentUser }: VibeDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentCode, setCommentCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const isSending = useRef(false);

  const [chatSortOrder, setChatSortOrder] = useState<'newest' | 'oldest'>('oldest');
  const [showChatSortDropdown, setShowChatSortDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'remix' | 'versions'>('remix');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [iframeVisible, setIframeVisible] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  useEffect(() => {
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

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedVersion || !currentUser || !vibe) return;
    if (isSending.current) return;
    isSending.current = true;
    const content = commentText.trim();
    const codeSnippet = commentCode;
    setCommentText(''); setCommentCode(''); setShowCodeInput(false);
    const tempId = -Date.now();
    const optimistic: Comment = {
      id: tempId, vibe_id: vibe.id, version_id: selectedVersion.id,
      author_id: currentUser.id, author_name: currentUser.username,
      author_avatar: currentUser.avatar, content, code_snippet: codeSnippet,
      is_adopted: 0, created_at: new Date().toISOString(), optimistic: true,
    };
    setVibe(prev => prev ? { ...prev, comments: [...(prev.comments ?? []), optimistic] } : prev);
    try {
      await api.addComment(vibe.id, { content, code_snippet: codeSnippet, version_id: selectedVersion.id, author_id: currentUser.id });
      loadVibe();
    } catch (e) {
      console.error(e);
      setVibe(prev => prev ? { ...prev, comments: (prev.comments ?? []).filter((c: Comment) => c.id !== tempId) } : prev);
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
  const sortedComments = [...(vibe?.comments ?? [])].sort((a, b) =>
    chatSortOrder === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // ── Panel header style tokens ──────────────────────────────────
  const panelHeaderCls = "h-11 flex items-center shrink-0 border-b border-outline-variant/10 px-3 gap-2 bg-surface-container-low";
  const tabActiveCls = "border-b-2 border-primary text-primary";
  const tabInactiveCls = "text-on-surface/35 hover:text-on-surface/65";
  const tabBaseCls = "flex items-center gap-1.5 h-full px-3 text-[10px] font-sans font-semibold uppercase tracking-wider transition-colors cursor-pointer";

  if (loading) return (
    <div className="md:ml-16 h-screen flex items-center justify-center bg-surface text-on-surface/35 text-sm">
      Loading…
    </div>
  );

  if (accessDenied) return (
    <div className="md:ml-16 h-screen flex flex-col items-center justify-center bg-surface gap-5">
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

  return (
    <div className="md:ml-16 h-screen flex overflow-hidden bg-surface">

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-black">
          <iframe srcDoc={selectedVersion?.code} className="w-full h-full border-none" title="Fullscreen" sandbox="allow-scripts allow-same-origin allow-forms" />
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
          <div className="fixed right-0 top-0 bottom-0 z-40 w-[280px] bg-surface-container-low flex flex-col lg:hidden">
            <div className={panelHeaderCls}>
              <span className="flex-1 text-[11px] font-sans font-semibold text-on-surface/50 uppercase tracking-wider">Remix Tree</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center text-on-surface/40 hover:text-on-surface cursor-pointer rounded">
                <span className="material-symbols-outlined text-[17px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <RemixTree vibeId={vibe.id} currentTitle={vibe.title} currentAuthor={vibe.author_name} onNavigate={(nid) => { navigate(`/vibe/${nid}`); setMobileSidebarOpen(false); }} />
            </div>
          </div>
        </>
      )}

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Sticky header */}
        <div className={`${panelHeaderCls} sticky top-0 z-10`}>
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 rounded-lg hover:bg-surface-container-highest transition-colors text-on-surface/50 hover:text-on-surface flex items-center justify-center shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          </button>

          {/* Author avatar + title */}
          <div
            className="flex items-center gap-2 cursor-pointer group flex-1 min-w-0"
            onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}`)}
          >
            <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container overflow-hidden ring-1 ring-black/[0.06] group-hover:ring-primary/40 transition-all shrink-0">
              {vibe.author_avatar
                ? <img src={vibe.author_avatar} alt="" className="w-full h-full object-cover" />
                : vibe.title[0]}
            </div>
            <div className="min-w-0 flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-on-surface truncate leading-none">{vibe.title}</span>
              <span className="text-xs text-on-surface/35 truncate shrink-0">by @{vibe.author_name}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isOwner && (
              <button
                onClick={() => {
                  const slot = { id: `vibe-${vibe.id}`, title: vibe.title, tags: vibe.tags || '', editorMode: 'single', code: { html: selectedVersion?.code || '', css: '', js: '' }, savedAt: new Date().toISOString() };
                  sessionStorage.setItem('beaverkit_pending_load', JSON.stringify(slot));
                  navigate('/workspace');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-sans font-semibold rounded-lg ring-1 ring-black/[0.07] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">edit</span>
                Edit
              </button>
            )}
            <button
              onClick={handleToggleLike}
              disabled={isLiking}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer ${
                liked ? 'bg-pink-500/12 text-pink-400 ring-1 ring-pink-500/25 hover:bg-pink-500/18' : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface/55 ring-1 ring-black/[0.07]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
              {likeCount > 0 ? likeCount : 'Like'}
            </button>
            <button
              onClick={handleRemix}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-on-primary text-xs font-sans font-semibold rounded-lg shadow-sm shadow-primary/20 ring-1 ring-primary/20 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">repeat</span>
              Remix
            </button>
            {/* Mobile tree toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-high text-on-surface/50 text-xs font-sans font-semibold rounded-lg ring-1 ring-black/[0.07] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">account_tree</span>
            </button>
          </div>
        </div>

        {/* Scrollable body: player + info + comments (YouTube-style stack) */}
        <div className="flex-1 overflow-y-auto">
          {/* Player — 16:9 aspect, capped to viewport */}
          <div className="bg-black relative group w-full aspect-video max-h-[calc(100vh-44px-340px)] min-h-[280px]">
            <iframe
              srcDoc={selectedVersion?.code}
              className="absolute inset-0 w-full h-full border-none transition-opacity duration-150"
              style={{ opacity: iframeVisible ? 1 : 0 }}
              title="Stage"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute bottom-3 right-3 w-8 h-8 bg-black/60 backdrop-blur text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-all ring-1 ring-white/10 cursor-pointer opacity-0 group-hover:opacity-100 z-10"
            >
              <span className="material-symbols-outlined text-[16px]">fullscreen</span>
            </button>
          </div>

          {/* Info card (YT-style description block) */}
          <div className="px-5 pt-4 pb-3 border-b border-outline-variant/10">
            {/* Stats row */}
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
            {/* Tags */}
            {parsedTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                {parsedTags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] text-on-surface/55 ring-1 ring-black/[0.05]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {/* Description */}
            {vibe.description ? (
              <p className="text-[13px] text-on-surface/70 leading-relaxed whitespace-pre-wrap">{vibe.description}</p>
            ) : (
              <p className="text-[13px] text-on-surface/25 italic">No description provided.</p>
            )}
          </div>

          {/* Comments section */}
          <div className="px-5 py-4">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-semibold text-on-surface">
                {commentCount} Comment{commentCount !== 1 ? 's' : ''}
              </h3>
              <div className="relative">
                <button onClick={() => setShowChatSortDropdown(v => !v)} className="flex items-center gap-1 text-xs text-on-surface/45 hover:text-on-surface/75 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">sort</span>
                  Sort by {chatSortOrder === 'oldest' ? 'Oldest' : 'Newest'}
                  <span className="material-symbols-outlined text-[13px]">expand_more</span>
                </button>
                {showChatSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowChatSortDropdown(false)} />
                    <div className="absolute left-0 top-full mt-1 z-30 bg-surface-container-highest border border-outline-variant/20 rounded-lg shadow-xl overflow-hidden min-w-[150px]">
                      {(['oldest', 'newest'] as const).map(order => (
                        <button key={order} onClick={() => { setChatSortOrder(order); setShowChatSortDropdown(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-container-high transition-colors cursor-pointer ${chatSortOrder === order ? 'text-primary' : 'text-on-surface/65'}`}>
                          <span className="material-symbols-outlined text-[13px]">{order === 'oldest' ? 'arrow_downward' : 'arrow_upward'}</span>
                          {order === 'oldest' ? 'Oldest first' : 'Newest first'}
                          {chatSortOrder === order && <span className="ml-auto material-symbols-outlined text-[12px]">check</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Comment input (YT-style: avatar + underline input) */}
            {currentUser ? (
              <div className="flex items-start gap-3 mb-6 pb-3 border-b border-outline-variant/10">
                <img src={currentUser.avatar} className="w-8 h-8 rounded-full shrink-0 border border-outline-variant/10" alt="" />
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                    placeholder="Add a comment…"
                    className="flex-1 bg-transparent border-b border-outline-variant/20 focus:border-primary/60 px-0 py-1.5 text-sm text-on-surface placeholder:text-on-surface/30 outline-none transition-colors"
                  />
                  {commentText.trim() && (
                    <button onClick={handleAddComment} className="px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-full cursor-pointer hover:bg-primary/90 transition-colors shrink-0">
                      Comment
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="w-full flex items-center justify-center gap-2 px-3 py-3 mb-6 bg-surface-container-high/60 border border-outline-variant/15 rounded-xl text-on-surface/55 text-sm cursor-pointer hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[15px]">login</span>
                Sign in to comment
              </button>
            )}

            {/* Comment list */}
            <div className="space-y-5">
              {sortedComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8">
                  <span className="material-symbols-outlined text-[32px] text-on-surface/10">forum</span>
                  <p className="text-xs text-on-surface/25">Be the first to comment</p>
                </div>
              ) : sortedComments.map(comment => (
                <div key={comment.id} className={`flex gap-3 ${comment.optimistic ? 'opacity-50' : ''}`}>
                  <img src={comment.author_avatar} className="w-8 h-8 rounded-full shrink-0 border border-outline-variant/10" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-semibold text-on-surface">@{comment.author_name}</span>
                      {comment.author_id === vibe.author_id && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-primary/25 text-primary bg-primary/8 uppercase tracking-widest">Creator</span>
                      )}
                      {comment.optimistic
                        ? <span className="text-[10px] text-on-surface/25 italic">Sending…</span>
                        : <span className="text-[10px] text-on-surface/25">{timeAgo(comment.created_at)}</span>
                      }
                    </div>
                    <p className="text-[13px] text-on-surface/75 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right sidebar ──────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[272px] xl:w-[300px] shrink-0 border-l border-outline-variant/10">

        {/* Right header */}
        <div className={`${panelHeaderCls} justify-between`}>
          <button onClick={() => setSidebarTab('remix')} className={`${tabBaseCls} ${sidebarTab === 'remix' ? tabActiveCls : tabInactiveCls}`}>
            <span className="material-symbols-outlined text-[12px]">account_tree</span>
            Remix Tree
          </button>
          <button onClick={() => setSidebarTab('versions')} className={`${tabBaseCls} ${sidebarTab === 'versions' ? tabActiveCls : tabInactiveCls}`}>
            <span className="material-symbols-outlined text-[12px]">history</span>
            Versions
          </button>
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'remix' && (
            <div className="p-4">
              <RemixTree
                vibeId={vibe.id}
                currentTitle={vibe.title}
                currentAuthor={vibe.author_name}
                onNavigate={nid => navigate(`/vibe/${nid}`)}
              />
            </div>
          )}

          {sidebarTab === 'versions' && (
            <div className="p-3 space-y-1">
              <p className="text-[10px] font-sans text-on-surface/25 uppercase tracking-widest px-2 py-2">
                {vibe.versions?.length ?? 0} versions
              </p>
              {vibe.versions?.map(version => {
                const isSel = selectedVersion?.id === version.id;
                const sz = version.code ? formatBytes(version.code.length) : null;
                return (
                  <div
                    key={version.id}
                    onClick={() => handleSelectVersion(version)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${isSel ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-surface-container-high/60'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSel ? 'bg-primary shadow-sm shadow-primary/40' : 'bg-outline-variant/35'}`} />
                        <span className="text-xs font-semibold text-on-surface">V{version.version_number}</span>
                        {isSel && <span className="text-[9px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/8 uppercase tracking-widest">Now</span>}
                      </div>
                      <span className="text-[10px] text-on-surface/25">{new Date(version.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-on-surface/40 line-clamp-2 leading-relaxed">
                      {version.update_log || 'System update.'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-on-surface/25">
                      {version.author_avatar && <img src={version.author_avatar} className="w-3 h-3 rounded-full" alt="" />}
                      <span>{version.author_name || vibe.author_name}</span>
                      {sz && <span>· {sz}</span>}
                    </div>
                  </div>
                );
              })}
              {(!vibe.versions?.length) && <p className="text-xs text-on-surface/20 text-center py-6">No versions</p>}
            </div>
          )}
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
