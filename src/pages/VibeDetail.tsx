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

// ── Remix Tree Sidebar ─────────────────────────────────────────────
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
      <div className="flex items-center justify-center py-8">
        <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ancestors = [root, ..., grandparent, parent, current]
  // current is the last element (we render it separately as the "you are here" node)
  const ancestorChain = ancestors.slice(0, -1); // all except current
  const MAX_SHOW = 3;
  const collapsed = ancestorChain.length > MAX_SHOW;
  let displayedAncestors: VibeAncestor[] = ancestorChain;
  let hiddenCount = 0;
  if (collapsed) {
    hiddenCount = ancestorChain.length - MAX_SHOW + 1;
    displayedAncestors = [ancestorChain[0], ...ancestorChain.slice(-(MAX_SHOW - 1))];
  }

  const isRoot = ancestorChain.length === 0;

  return (
    <div className="select-none">
      {/* Root / no parent */}
      {isRoot && (
        <div className="flex items-start gap-2.5 mb-0">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-3 h-3 rounded-full bg-surface-container-highest border-2 border-outline-variant/40 mt-0.5" />
            <div className="w-px flex-1 min-h-[24px] bg-outline-variant/20 mt-1" />
          </div>
          <div className="pb-4 min-w-0">
            <span className="text-[10px] font-mono text-on-surface/25 uppercase tracking-widest">Origin</span>
          </div>
        </div>
      )}

      {/* Ancestor chain */}
      {displayedAncestors.map((anc, i) => {
        const isFirst = i === 0;
        const showCollapsedIndicator = collapsed && isFirst && hiddenCount > 0;
        return (
          <React.Fragment key={anc.id}>
            <button
              onClick={() => onNavigate(anc.id)}
              className="flex items-start gap-2.5 w-full text-left group mb-0 cursor-pointer"
            >
              <div className="flex flex-col items-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-surface-container-highest border-2 border-outline-variant/30 mt-0.5 group-hover:border-primary/50 transition-colors" />
                <div className="w-px flex-1 min-h-[32px] bg-outline-variant/20 mt-1" />
              </div>
              <div className="pb-4 min-w-0 flex-1">
                <p className="text-xs font-sans text-on-surface/60 group-hover:text-on-surface transition-colors truncate leading-snug">
                  {anc.title}
                </p>
                <p className="text-[10px] font-mono text-on-surface/30 truncate">@{anc.author_name}</p>
              </div>
              <span className="material-symbols-outlined text-[13px] text-on-surface/20 group-hover:text-primary/60 transition-colors mt-0.5 shrink-0">open_in_new</span>
            </button>
            {showCollapsedIndicator && (
              <div className="flex items-start gap-2.5 mb-0">
                <div className="flex flex-col items-center shrink-0 w-3">
                  <div className="flex flex-col gap-[3px] items-center py-1">
                    <div className="w-[3px] h-[3px] rounded-full bg-outline-variant/30" />
                    <div className="w-[3px] h-[3px] rounded-full bg-outline-variant/30" />
                    <div className="w-[3px] h-[3px] rounded-full bg-outline-variant/30" />
                  </div>
                  <div className="w-px flex-1 min-h-[8px] bg-outline-variant/20" />
                </div>
                <div className="pb-2 min-w-0">
                  <span className="text-[10px] font-mono text-on-surface/20">{hiddenCount} more levels</span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Current node — YOU ARE HERE */}
      <div className="flex items-start gap-2.5">
        <div className="flex flex-col items-center shrink-0">
          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center mt-0 shrink-0 shadow-md shadow-primary/30">
            <div className="w-1.5 h-1.5 bg-on-primary rounded-full" />
          </div>
          {children.length > 0 && (
            <div className="w-px flex-1 min-h-[24px] bg-primary/20 mt-1" />
          )}
        </div>
        <div className={`min-w-0 ${children.length > 0 ? 'pb-4' : ''}`}>
          <p className="text-xs font-sans font-bold text-on-surface leading-snug truncate">{currentTitle}</p>
          <p className="text-[10px] font-mono text-primary/70">@{currentAuthor} · here</p>
        </div>
      </div>

      {/* Children (direct forks) */}
      {children.length > 0 && (
        <div className="ml-1.5 border-l border-outline-variant/15 pl-4 space-y-0">
          <div className="pt-1 pb-2">
            <span className="text-[10px] font-mono text-on-surface/25 uppercase tracking-widest">
              {children.length} fork{children.length !== 1 ? 's' : ''}
            </span>
          </div>
          {children.map((child, i) => (
            <button
              key={child.id}
              onClick={() => onNavigate(child.id)}
              className="flex items-start gap-2 w-full text-left group py-2 cursor-pointer hover:bg-surface-container-high/50 rounded-lg px-2 -mx-2 transition-colors"
            >
              {/* Branch line indicator */}
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-surface-container-highest border border-outline-variant/30 group-hover:border-primary/40 transition-colors" />
                {i < children.length - 1 && (
                  <div className="w-px flex-1 min-h-[8px] bg-outline-variant/15 mt-0.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-sans text-on-surface/60 group-hover:text-on-surface transition-colors truncate leading-snug">
                  {child.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[10px] font-mono text-on-surface/30">@{child.author_name}</p>
                  {Number(child.remix_count) > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] font-mono text-on-surface/20">
                      <span className="material-symbols-outlined text-[10px]">repeat</span>
                      {child.remix_count}
                    </span>
                  )}
                </div>
              </div>
              <span className="material-symbols-outlined text-[13px] text-on-surface/15 group-hover:text-primary/50 transition-colors mt-0.5 shrink-0">chevron_right</span>
            </button>
          ))}
        </div>
      )}

      {children.length === 0 && (
        <div className="mt-4 pl-6">
          <p className="text-[10px] font-mono text-on-surface/20">No forks yet</p>
          <p className="text-[10px] font-mono text-on-surface/15 mt-0.5">Be the first to remix this</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
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
  const [descExpanded, setDescExpanded] = useState(false);
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
      if (data.versions && data.versions.length > 0) setSelectedVersion(data.versions[0]);
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
    setCommentText('');
    setCommentCode('');
    setShowCodeInput(false);
    const tempId = -Date.now();
    const optimisticComment: Comment = {
      id: tempId, vibe_id: vibe.id, version_id: selectedVersion.id,
      author_id: currentUser.id, author_name: currentUser.username,
      author_avatar: currentUser.avatar, content, code_snippet: codeSnippet,
      is_adopted: 0, created_at: new Date().toISOString(), optimistic: true,
    };
    setVibe(prev => prev ? { ...prev, comments: [...(prev.comments ?? []), optimisticComment] } : prev);
    try {
      await api.addComment(vibe.id, { content, code_snippet: codeSnippet, version_id: selectedVersion.id, author_id: currentUser.id });
      loadVibe();
    } catch (error) {
      console.error('Failed to send comment:', error);
      setVibe(prev => prev ? { ...prev, comments: (prev.comments ?? []).filter((c: Comment) => c.id !== tempId) } : prev);
    } finally {
      isSending.current = false;
    }
  };

  const handleToggleLike = async () => {
    if (!supabaseUser) { setShowAuthModal(true); return; }
    if (isLiking || !vibe) return;
    setIsLiking(true);
    setLiked((prev: boolean) => !prev);
    setLikeCount((prev: number) => liked ? prev - 1 : prev + 1);
    try {
      const result = await api.toggleLike(vibe.id, supabaseUser.id);
      setLiked(result.liked);
      setLikeCount(result.like_count);
    } catch {
      setLiked((prev: boolean) => !prev);
      setLikeCount((prev: number) => liked ? prev + 1 : prev - 1);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSelectVersion = (version: Version) => {
    if (version.id === selectedVersion?.id) return;
    setIframeVisible(false);
    setTimeout(() => { setSelectedVersion(version); setIframeVisible(true); }, 150);
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
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  };

  const parsedTags = vibe?.tags ? vibe.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const commentCount = vibe?.comment_count ?? vibe?.comments?.length ?? 0;
  const remixCount = vibe?.remix_count ?? 0;
  const visibilityIcon = { public: 'public', unlisted: 'link', private: 'lock' } as const;
  const visibilityLabel = { public: 'Public', unlisted: 'Unlisted', private: 'Private' } as const;
  const sortedComments = [...(vibe?.comments ?? [])].sort((a, b) =>
    chatSortOrder === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (loading) return (
    <div className="md:ml-16 flex items-center justify-center min-h-screen bg-surface text-on-surface/40 font-mono text-sm tracking-widest uppercase">
      Loading...
    </div>
  );

  if (accessDenied) return (
    <div className="md:ml-16 flex flex-col items-center justify-center min-h-screen bg-surface gap-6">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
        <span className="material-symbols-outlined text-[40px] text-on-surface/40">lock</span>
      </div>
      <div className="text-center">
        <h1 className="text-on-surface font-bold text-xl mb-2">存取被拒</h1>
        <p className="text-on-surface/50 text-sm">此作品為私人作品。僅擁有者和協作者可以查看。</p>
      </div>
      <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold cursor-pointer">
        返回首頁
      </button>
    </div>
  );

  if (!vibe) return null;
  const isOwner = vibe.user_role === 'owner';

  return (
    <div className="md:ml-16 min-h-screen bg-surface">

      {/* Sticky minimal top bar */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10 h-12 flex items-center px-3 md:px-5 gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full hover:bg-surface-container-high transition-colors text-on-surface/50 hover:text-on-surface flex items-center justify-center shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <span className="text-sm font-bold text-on-surface/50 truncate flex-1 min-w-0">{vibe.title}</span>
        {/* Mobile: open sidebar */}
        <button
          onClick={() => setMobileSidebarOpen(v => !v)}
          className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-high text-on-surface/60 text-xs font-mono font-bold rounded-lg cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">account_tree</span>
          <span className="text-[10px]">Remix Tree</span>
        </button>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-black">
          <iframe
            srcDoc={selectedVersion?.code}
            className="w-full h-full border-none"
            title="Fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute bottom-6 right-6 w-10 h-10 bg-black/80 backdrop-blur-md text-white rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors ring-1 ring-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">fullscreen_exit</span>
          </button>
        </div>
      )}

      {/* Mobile remix tree drawer */}
      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-40 w-[300px] bg-surface-container-low border-l border-outline-variant/10 flex flex-col lg:hidden">
            <div className="h-12 flex items-center justify-between px-4 border-b border-outline-variant/10 shrink-0">
              <span className="text-xs font-mono font-bold text-on-surface/60 uppercase tracking-widest">Remix Tree</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center text-on-surface/50 hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <RemixTree
                vibeId={vibe.id}
                currentTitle={vibe.title}
                currentAuthor={vibe.author_name}
                onNavigate={(id) => { navigate(`/vibe/${id}`); setMobileSidebarOpen(false); }}
              />
            </div>
          </div>
        </>
      )}

      {/* Main layout */}
      <div className="flex">

        {/* ── Left: main content ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 px-3 md:px-5 py-4 md:py-5">

          {/* Player */}
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative group ring-1 ring-white/[0.06]">
            <iframe
              srcDoc={selectedVersion?.code}
              className="absolute inset-0 w-full h-full border-none transition-opacity duration-150"
              style={{ opacity: iframeVisible ? 1 : 0 }}
              title="Stage"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute bottom-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-md text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-all ring-1 ring-white/10 cursor-pointer opacity-0 group-hover:opacity-100 z-10"
            >
              <span className="material-symbols-outlined text-[16px]">fullscreen</span>
            </button>
          </div>

          {/* Title */}
          <h1 className="mt-3 text-base md:text-lg font-bold text-on-surface leading-snug tracking-tight">
            {vibe.title}
          </h1>

          {/* Author + Actions */}
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div
              className="flex items-center gap-2.5 cursor-pointer group min-w-0"
              onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}`)}
            >
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container overflow-hidden ring-1 ring-black/[0.07] group-hover:ring-primary/40 transition-all shrink-0">
                {vibe.author_avatar
                  ? <img src={vibe.author_avatar} alt="author" className="w-full h-full object-cover" />
                  : vibe.title[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">@{vibe.author_name}</p>
                <p className="text-[10px] text-on-surface/35 font-mono">{timeAgo(vibe.created_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {isOwner && (
                <button
                  onClick={() => {
                    const slot = {
                      id: `vibe-${vibe.id}`, title: vibe.title, tags: vibe.tags || '',
                      editorMode: 'single', code: { html: selectedVersion?.code || '', css: '', js: '' },
                      savedAt: new Date().toISOString(),
                    };
                    sessionStorage.setItem('beaverkit_pending_load', JSON.stringify(slot));
                    navigate('/workspace');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-mono font-bold rounded-full ring-1 ring-black/[0.07] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">edit</span>
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
              <button
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-full transition-all cursor-pointer ${
                  liked
                    ? 'bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/30 hover:bg-pink-500/20'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface/60 hover:text-on-surface ring-1 ring-black/[0.07]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                <span>{likeCount > 0 ? likeCount : 'Like'}</span>
              </button>
              <button
                onClick={handleRemix}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-on-primary text-xs font-mono font-bold rounded-full shadow-md shadow-primary/20 ring-1 ring-primary/30 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">repeat</span>
                Remix
              </button>
            </div>
          </div>

          {/* Meta info card */}
          <div className="mt-3 p-3 bg-surface-container-high/60 rounded-xl space-y-2.5">
            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap text-[11px] font-mono text-on-surface/40">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">visibility</span>{vibe.views} views
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">chat_bubble</span>{commentCount} comments
              </span>
              {remixCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">repeat</span>{remixCount} remixes
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">layers</span>V{selectedVersion?.version_number}
              </span>
              {vibe.visibility && vibe.visibility !== 'public' && (
                <span className="flex items-center gap-1 text-on-surface/25">
                  <span className="material-symbols-outlined text-[12px]">{visibilityIcon[vibe.visibility]}</span>
                  {visibilityLabel[vibe.visibility]}
                </span>
              )}
            </div>
            {/* Tags */}
            {parsedTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {parsedTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-highest text-[10px] font-mono text-on-surface/45 ring-1 ring-black/[0.05]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {/* Description */}
            {vibe.description && (
              <>
                <p className={`text-xs text-on-surface/65 font-sans leading-relaxed ${!descExpanded ? 'line-clamp-2' : ''}`}>
                  {vibe.description}
                </p>
                {vibe.description.length > 100 && (
                  <button onClick={() => setDescExpanded(v => !v)} className="text-[10px] font-mono text-on-surface/35 hover:text-on-surface/60 cursor-pointer transition-colors">
                    {descExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Comments */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-5">
              <h3 className="font-bold text-on-surface text-sm">{commentCount} Comments</h3>
              <div className="relative">
                <button
                  onClick={() => setShowChatSortDropdown(v => !v)}
                  className="flex items-center gap-1 text-[10px] font-mono text-on-surface/35 hover:text-on-surface/60 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">sort</span>
                  {chatSortOrder === 'oldest' ? 'Oldest' : 'Newest'}
                  <span className="material-symbols-outlined text-[10px]">expand_more</span>
                </button>
                {showChatSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowChatSortDropdown(false)} />
                    <div className="absolute left-0 top-full mt-1 z-30 bg-surface-container-highest border border-outline-variant/20 rounded-lg shadow-xl overflow-hidden min-w-[130px]">
                      {(['oldest', 'newest'] as const).map(order => (
                        <button
                          key={order}
                          onClick={() => { setChatSortOrder(order); setShowChatSortDropdown(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono hover:bg-surface-container-high transition-colors cursor-pointer ${chatSortOrder === order ? 'text-primary' : 'text-on-surface/60'}`}
                        >
                          <span className="material-symbols-outlined text-[12px]">{order === 'oldest' ? 'arrow_downward' : 'arrow_upward'}</span>
                          {order === 'oldest' ? 'Oldest first' : 'Newest first'}
                          {chatSortOrder === order && <span className="ml-auto material-symbols-outlined text-[11px]">check</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Input */}
            {currentUser ? (
              <div className="flex gap-2.5 mb-7">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container overflow-hidden ring-1 ring-black/[0.07] shrink-0">
                  {currentUser.avatar
                    ? <img src={currentUser.avatar} alt="you" className="w-full h-full object-cover" />
                    : currentUser.username[0]}
                </div>
                <div className="flex-1 space-y-2">
                  {showCodeInput && (
                    <textarea
                      value={commentCode}
                      onChange={(e) => setCommentCode(e.target.value)}
                      placeholder="Paste code snippet..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-3 text-xs font-mono text-tertiary focus:border-primary/50 outline-none h-20 resize-none placeholder:text-on-surface/20"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                        placeholder="Add a comment..."
                        className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary/60 outline-none py-1.5 text-sm text-on-surface placeholder:text-on-surface/25 transition-colors font-sans pr-7"
                      />
                      <button
                        onClick={() => setShowCodeInput(!showCodeInput)}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded transition-colors cursor-pointer ${showCodeInput ? 'text-primary' : 'text-on-surface/25 hover:text-on-surface/50'}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">code</span>
                      </button>
                    </div>
                    {commentText.trim() && (
                      <button
                        onClick={handleAddComment}
                        className="px-3 py-1 bg-primary text-on-primary text-xs font-mono font-bold rounded-full hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                      >
                        Post
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-xl transition-colors group cursor-pointer mb-7"
              >
                <span className="material-symbols-outlined text-[15px] text-primary/60 group-hover:text-primary transition-colors">login</span>
                <span className="text-primary/60 group-hover:text-primary font-mono text-[10px] font-bold uppercase tracking-widest transition-colors">Sign in to comment</span>
              </button>
            )}

            {/* Comment list */}
            {sortedComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <span className="material-symbols-outlined text-[36px] text-on-surface/10">forum</span>
                <div className="text-center">
                  <p className="text-on-surface/25 text-sm font-medium">No comments yet</p>
                  <p className="text-on-surface/15 font-mono text-[10px] mt-1">Be the first</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedComments.map(comment => (
                  <div key={comment.id} className={`flex gap-2.5 ${comment.optimistic ? 'opacity-60' : ''}`}>
                    <img src={comment.author_avatar} className="w-8 h-8 rounded-full shrink-0 border border-outline-variant/10" alt="avatar" />
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-on-surface font-sans font-bold text-xs tracking-tight">{comment.author_name}</span>
                        {comment.author_id === vibe.author_id && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded border border-primary/25 text-primary bg-primary/8 font-mono uppercase tracking-widest">Creator</span>
                        )}
                        {comment.is_adopted === 1 && (
                          <span className="flex items-center gap-0.5 text-[8px] text-tertiary font-mono uppercase tracking-widest">
                            <span className="material-symbols-outlined text-[9px]">check_circle</span>Adopted
                          </span>
                        )}
                        {comment.optimistic
                          ? <span className="text-[10px] text-on-surface/25 font-mono italic">Sending…</span>
                          : <span className="text-[10px] text-on-surface/20 font-mono">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        }
                      </div>
                      <p className="text-on-surface/75 text-sm leading-relaxed whitespace-pre-wrap font-sans">{comment.content}</p>
                      {comment.code_snippet && (
                        <div className="mt-1.5 bg-surface-container-lowest rounded-lg p-2.5 border border-outline-variant/10 font-mono text-[10px] text-tertiary overflow-x-auto">
                          {comment.code_snippet}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="h-16" />
        </div>

        {/* ── Right sidebar: Remix Tree + Versions ──────────────── */}
        <div className="hidden lg:flex flex-col w-[300px] xl:w-[340px] shrink-0 border-l border-outline-variant/10 bg-surface-container-low/40">
          {/* Sidebar header tabs */}
          <div className="sticky top-12 bg-surface-container-low/95 backdrop-blur-sm z-10">
            <div className="flex border-b border-outline-variant/10">
              <button
                onClick={() => setSidebarTab('remix')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer ${sidebarTab === 'remix' ? 'border-b-2 border-primary text-primary' : 'text-on-surface/35 hover:text-on-surface/60'}`}
              >
                <span className="material-symbols-outlined text-[13px]">account_tree</span>
                Remix Tree
              </button>
              <button
                onClick={() => setSidebarTab('versions')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer ${sidebarTab === 'versions' ? 'border-b-2 border-primary text-primary' : 'text-on-surface/35 hover:text-on-surface/60'}`}
              >
                <span className="material-symbols-outlined text-[13px]">history</span>
                Versions
              </button>
            </div>
          </div>

          {/* Sidebar content */}
          <div className="overflow-y-auto flex-1 p-4">
            {sidebarTab === 'remix' && (
              <RemixTree
                vibeId={vibe.id}
                currentTitle={vibe.title}
                currentAuthor={vibe.author_name}
                onNavigate={(targetId) => navigate(`/vibe/${targetId}`)}
              />
            )}
            {sidebarTab === 'versions' && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-on-surface/30 uppercase tracking-widest mb-3">
                  {vibe.versions?.length ?? 0} versions
                </p>
                {vibe.versions?.map(version => {
                  const isSelected = selectedVersion?.id === version.id;
                  const sizeLabel = version.code ? formatBytes(version.code.length) : null;
                  return (
                    <div
                      key={version.id}
                      onClick={() => handleSelectVersion(version)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-surface-container-high'}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-primary' : 'bg-outline-variant/40'}`} />
                          <span className="text-xs font-bold font-mono text-on-surface">V{version.version_number}</span>
                          {isSelected && <span className="text-[8px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/10 font-mono uppercase tracking-widest">Playing</span>}
                        </div>
                        <span className="text-[10px] font-mono text-on-surface/25">{new Date(version.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-on-surface/45 font-sans line-clamp-2 leading-relaxed">
                        {version.update_log || 'System update registered.'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-on-surface/25">
                        {version.author_avatar && <img src={version.author_avatar} className="w-3 h-3 rounded-full" alt="" />}
                        <span>{version.author_name || vibe.author_name}</span>
                        {sizeLabel && <span>· {sizeLabel}</span>}
                      </div>
                    </div>
                  );
                })}
                {(!vibe.versions || vibe.versions.length === 0) && (
                  <p className="text-on-surface/20 font-mono text-xs text-center py-6">No versions</p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
