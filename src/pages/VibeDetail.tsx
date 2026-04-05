import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Vibe, Version, Comment, User, AccessDeniedError } from '../lib/api';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';

interface VibeDetailProps {
  currentUser?: User;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

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
  const [showVersionsMobile, setShowVersionsMobile] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // iframe fade animation
  const [iframeVisible, setIframeVisible] = useState(true);

  // auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  // like state
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // ESC key to exit fullscreen
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

  useEffect(() => {
    loadVibe();
  }, [id, supabaseUser]);

  const loadVibe = async () => {
    if (supabaseUser === undefined) return;
    if (!id) { navigate('/'); return; }
    try {
      const data = await api.getVibe(id, supabaseUser?.id);
      setVibe(data);
      setLikeCount(data.like_count ?? 0);
      setLiked(data.user_liked ?? false);
      if (data.versions && data.versions.length > 0) {
        setSelectedVersion(data.versions[0]);
      }
    } catch (err) {
      if (err instanceof AccessDeniedError) {
        setAccessDenied(true);
      } else {
        navigate('/');
      }
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
      id: tempId,
      vibe_id: vibe.id,
      version_id: selectedVersion.id,
      author_id: currentUser.id,
      author_name: currentUser.username,
      author_avatar: currentUser.avatar,
      content,
      code_snippet: codeSnippet,
      is_adopted: 0,
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    setVibe(prev =>
      prev ? { ...prev, comments: [...(prev.comments ?? []), optimisticComment] } : prev,
    );

    try {
      await api.addComment(vibe.id, {
        content,
        code_snippet: codeSnippet,
        version_id: selectedVersion.id,
        author_id: currentUser.id,
      });
      loadVibe();
    } catch (error) {
      console.error('Failed to send comment:', error);
      setVibe(prev =>
        prev ? { ...prev, comments: (prev.comments ?? []).filter((c: Comment) => c.id !== tempId) } : prev,
      );
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
    setTimeout(() => {
      setSelectedVersion(version);
      setIframeVisible(true);
    }, 150);
  };

  const handleCopyCode = () => {
    if (selectedVersion) navigator.clipboard.writeText(selectedVersion.code);
  };

  const handleRemix = () => {
    if (!vibe) return;
    if (!currentUser) { setShowAuthModal(true); return; }
    navigate('/remix', {
      state: {
        parentVibeId: vibe.id,
        code: selectedVersion?.code || '',
        title: vibe.title,
        authorName: vibe.author_name,
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
  const visibilityIcon = { public: 'public', unlisted: 'link', private: 'lock' };
  const visibilityLabel = { public: 'Public', unlisted: 'Unlisted', private: 'Private' };

  const sortedComments = [...(vibe?.comments ?? [])].sort((a, b) =>
    chatSortOrder === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (loading) return (
    <div className="md:ml-16 flex items-center justify-center min-h-screen bg-surface text-on-surface/40 font-mono text-lg tracking-widest uppercase">
      Loading Stage...
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

      {/* Minimal sticky top bar */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10 h-12 flex items-center px-4 md:px-6 gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full hover:bg-surface-container-high transition-colors text-on-surface/60 hover:text-on-surface flex items-center justify-center shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <span className="text-sm font-bold text-on-surface/60 truncate flex-1 min-w-0">{vibe.title}</span>
        {/* Mobile actions in header */}
        <div className="flex items-center gap-1.5 sm:hidden shrink-0">
          <button onClick={handleToggleLike} className={`flex items-center gap-1 px-2 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${liked ? 'text-pink-400' : 'text-on-surface/50'}`}>
            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
          </button>
          <button onClick={handleRemix} className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-on-primary text-xs font-mono font-bold rounded-lg cursor-pointer">
            <span className="material-symbols-outlined text-[13px]">repeat</span>
            Remix
          </button>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
          <iframe
            srcDoc={selectedVersion?.code}
            className="w-full h-full border-none"
            title="Stage Fullscreen"
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

      {/* Main content */}
      <div className="max-w-[1800px] mx-auto px-3 md:px-6 py-4 md:py-6">
        <div className="flex gap-6">

          {/* ── Left column ────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Player */}
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative ring-1 ring-white/[0.06]">
              <iframe
                srcDoc={selectedVersion?.code}
                className="absolute inset-0 w-full h-full border-none transition-opacity duration-150"
                style={{ opacity: iframeVisible ? 1 : 0 }}
                title="Stage"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
              <button
                onClick={() => setIsFullscreen(true)}
                className="absolute bottom-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-md text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors ring-1 ring-white/10 cursor-pointer opacity-0 hover:opacity-100 [.group:hover_&]:opacity-100 z-10"
                style={{ opacity: undefined }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '')}
              >
                <span className="material-symbols-outlined text-[16px]">fullscreen</span>
              </button>
            </div>

            {/* Title */}
            <h1 className="mt-4 text-base md:text-xl font-bold text-on-surface leading-snug tracking-tight">
              {vibe.title}
            </h1>

            {/* Author + Actions row */}
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              {/* Author */}
              <div
                className="flex items-center gap-3 cursor-pointer group min-w-0"
                onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}`)}
              >
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container overflow-hidden ring-1 ring-black/[0.07] group-hover:ring-primary/40 transition-all shrink-0">
                  {vibe.author_avatar ? (
                    <img src={vibe.author_avatar} alt="author" className="w-full h-full object-cover" />
                  ) : (
                    vibe.title[0]
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">@{vibe.author_name}</p>
                  <p className="text-[11px] text-on-surface/40 font-mono">{timeAgo(vibe.created_at)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isOwner && (
                  <button
                    onClick={() => {
                      const slot = {
                        id: `vibe-${vibe.id}`,
                        title: vibe.title,
                        tags: vibe.tags || '',
                        editorMode: 'single',
                        code: { html: selectedVersion?.code || '', css: '', js: '' },
                        savedAt: new Date().toISOString(),
                      };
                      sessionStorage.setItem('beaverkit_pending_load', JSON.stringify(slot));
                      navigate('/workspace');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-mono font-bold rounded-full ring-1 ring-black/[0.07] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-mono font-bold rounded-full ring-1 ring-black/[0.07] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  onClick={handleToggleLike}
                  disabled={isLiking}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold rounded-full transition-all cursor-pointer ${
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary text-xs font-mono font-bold rounded-full shadow-md shadow-primary/20 ring-1 ring-primary/30 hover:shadow-primary/30 hover:scale-[1.02] transition-all cursor-pointer hidden sm:flex"
                >
                  <span className="material-symbols-outlined text-[14px]">repeat</span>
                  Remix
                </button>
              </div>
            </div>

            {/* Stats + Tags + Meta strip */}
            <div className="mt-4 p-3 bg-surface-container-high rounded-xl">
              {/* Stats row */}
              <div className="flex items-center gap-4 text-[11px] font-mono text-on-surface/50 mb-2.5">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">visibility</span>
                  {vibe.views} views
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">chat_bubble</span>
                  {commentCount} comments
                </span>
                {remixCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">repeat</span>
                    {remixCount} remixes
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">layers</span>
                  V{selectedVersion?.version_number}
                </span>
                {vibe.visibility && vibe.visibility !== 'public' && (
                  <span className="flex items-center gap-1 text-on-surface/30">
                    <span className="material-symbols-outlined text-[13px]">{visibilityIcon[vibe.visibility]}</span>
                    {visibilityLabel[vibe.visibility]}
                  </span>
                )}
                {vibe.parent_vibe_title && (
                  <span className="flex items-center gap-1 text-tertiary/60 truncate">
                    <span className="material-symbols-outlined text-[13px]">call_split</span>
                    remix of {vibe.parent_author_name}/{vibe.parent_vibe_title}
                  </span>
                )}
              </div>
              {/* Tags */}
              {parsedTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {parsedTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-highest text-[10px] font-mono text-on-surface/50 ring-1 ring-black/[0.05]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Description */}
              {vibe.description && (
                <div className={`mt-2.5 text-sm text-on-surface/70 font-sans leading-relaxed ${!descExpanded ? 'line-clamp-2' : ''}`}>
                  {vibe.description}
                </div>
              )}
              {vibe.description && vibe.description.length > 120 && (
                <button
                  onClick={() => setDescExpanded(v => !v)}
                  className="mt-1 text-[11px] font-mono text-on-surface/40 hover:text-on-surface/70 transition-colors cursor-pointer"
                >
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            {/* Mobile: Versions toggle */}
            <div className="mt-4 lg:hidden">
              <button
                onClick={() => setShowVersionsMobile(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-high rounded-xl text-sm font-mono font-bold text-on-surface/70 hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  {vibe.versions?.length ?? 0} Versions
                </span>
                <span className="material-symbols-outlined text-[16px]">{showVersionsMobile ? 'expand_less' : 'expand_more'}</span>
              </button>
              {showVersionsMobile && (
                <div className="mt-2 space-y-2">
                  {vibe.versions?.map(version => (
                    <VersionCard
                      key={version.id}
                      version={version}
                      vibe={vibe}
                      isSelected={selectedVersion?.id === version.id}
                      onSelect={handleSelectVersion}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Comments section */}
            <div className="mt-6">
              {/* Comments header */}
              <div className="flex items-center gap-4 mb-5">
                <h3 className="font-bold text-on-surface text-base">{commentCount} Comments</h3>
                <div className="relative">
                  <button
                    onClick={() => setShowChatSortDropdown(v => !v)}
                    className="flex items-center gap-1 text-[11px] font-mono text-on-surface/40 hover:text-on-surface/70 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[13px]">sort</span>
                    {chatSortOrder === 'oldest' ? 'Oldest first' : 'Newest first'}
                    <span className="material-symbols-outlined text-[11px]">expand_more</span>
                  </button>
                  {showChatSortDropdown && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowChatSortDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 z-30 bg-surface-container-highest border border-outline-variant/20 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                        {(['oldest', 'newest'] as const).map(order => (
                          <button
                            key={order}
                            onClick={() => { setChatSortOrder(order); setShowChatSortDropdown(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono hover:bg-surface-container-high transition-colors cursor-pointer ${chatSortOrder === order ? 'text-primary' : 'text-on-surface/60'}`}
                          >
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

              {/* Comment input */}
              {currentUser ? (
                <div className="flex gap-3 mb-8">
                  <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container overflow-hidden ring-1 ring-black/[0.07] shrink-0">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="you" className="w-full h-full object-cover" />
                    ) : (
                      currentUser.username[0]
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    {showCodeInput && (
                      <textarea
                        value={commentCode}
                        onChange={(e) => setCommentCode(e.target.value)}
                        placeholder="Paste suggested code snippet..."
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-3 text-xs font-mono text-tertiary focus:border-primary/50 outline-none h-24 resize-none placeholder:text-on-surface/20"
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
                          className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary/60 outline-none py-2 text-sm text-on-surface placeholder:text-on-surface/30 transition-colors font-sans pr-8"
                        />
                        <button
                          onClick={() => setShowCodeInput(!showCodeInput)}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded transition-colors cursor-pointer ${showCodeInput ? 'text-primary' : 'text-on-surface/30 hover:text-on-surface/60'}`}
                        >
                          <span className="material-symbols-outlined text-[15px]">code</span>
                        </button>
                      </div>
                      {commentText.trim() && (
                        <button
                          onClick={handleAddComment}
                          className="px-3 py-1.5 bg-primary text-on-primary text-xs font-mono font-bold rounded-full hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                        >
                          Comment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-xl transition-colors group cursor-pointer mb-8"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary/70 group-hover:text-primary transition-colors">login</span>
                  <span className="text-primary/70 group-hover:text-primary font-mono text-[11px] font-bold uppercase tracking-widest transition-colors">Sign in to join the conversation</span>
                </button>
              )}

              {/* Comment list */}
              {sortedComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-high/50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px] text-on-surface/15">forum</span>
                  </div>
                  <div className="text-center">
                    <p className="text-on-surface/30 font-sans text-sm font-medium">No comments yet</p>
                    <p className="text-on-surface/15 font-mono text-[11px] mt-1">Be the first to share your thoughts</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-7">
                  {sortedComments.map(comment => (
                    <div key={comment.id} className={`flex gap-3 group ${comment.optimistic ? 'opacity-60' : ''}`}>
                      <img src={comment.author_avatar} className="w-9 h-9 rounded-full shrink-0 border border-outline-variant/10" alt="avatar" />
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-on-surface font-sans font-bold text-sm tracking-tight">{comment.author_name}</span>
                          {comment.author_id === vibe.author_id && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/10 font-mono uppercase tracking-widest">
                              Creator
                            </span>
                          )}
                          {comment.is_adopted === 1 && (
                            <span className="flex items-center gap-1 text-[9px] text-tertiary font-mono uppercase tracking-widest">
                              <span className="material-symbols-outlined text-[10px]">check_circle</span>
                              Adopted
                            </span>
                          )}
                          {comment.optimistic ? (
                            <span className="text-[10px] text-on-surface/30 font-mono italic">Sending…</span>
                          ) : (
                            <span className="text-[10px] text-on-surface/25 font-mono">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                        <p className="text-on-surface/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{comment.content}</p>
                        {comment.code_snippet && (
                          <div className="mt-2 bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/10 font-mono text-[11px] text-tertiary overflow-x-auto">
                            {comment.code_snippet}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom padding */}
            <div className="h-12" />
          </div>

          {/* ── Right sidebar: Versions ────────────────── */}
          <div className="hidden lg:block w-[340px] xl:w-[380px] shrink-0">
            <div className="sticky top-16">
              <h3 className="text-[11px] font-mono font-bold text-on-surface/50 uppercase tracking-widest mb-3">
                {vibe.versions?.length ?? 0} Versions
              </h3>
              <div className="space-y-2">
                {vibe.versions?.map(version => (
                  <VersionCard
                    key={version.id}
                    version={version}
                    vibe={vibe}
                    isSelected={selectedVersion?.id === version.id}
                    onSelect={handleSelectVersion}
                  />
                ))}
                {(!vibe.versions || vibe.versions.length === 0) && (
                  <p className="text-on-surface/25 font-mono text-xs text-center py-4">No versions</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

/* ── Version Card Component ──────────────────────────── */
interface VersionCardProps {
  version: Version;
  vibe: Vibe;
  isSelected: boolean;
  onSelect: (v: Version) => void;
}

function VersionCard({ version, vibe, isSelected, onSelect }: VersionCardProps) {
  const sizeLabel = version.code ? formatBytes(version.code.length) : null;
  return (
    <div
      onClick={() => onSelect(version)}
      className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all ${
        isSelected
          ? 'bg-primary/10 ring-1 ring-primary/20'
          : 'hover:bg-surface-container-high'
      }`}
    >
      {/* Version thumbnail placeholder */}
      <div className={`w-[120px] aspect-video rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold transition-colors ${isSelected ? 'bg-primary/20 text-primary' : 'bg-surface-container-highest text-on-surface/30'}`}>
        V{version.version_number}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold font-mono text-on-surface">Version {version.version_number}</span>
          {isSelected && (
            <span className="text-[9px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/10 font-mono uppercase tracking-widest shrink-0">
              Playing
            </span>
          )}
        </div>
        <p className="text-[11px] text-on-surface/50 font-sans line-clamp-2 leading-relaxed">
          {version.update_log || 'System update registered.'}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-on-surface/30">
          {version.author_avatar ? (
            <img src={version.author_avatar} className="w-3.5 h-3.5 rounded-full" alt="" />
          ) : null}
          <span>{version.author_name || vibe.author_name}</span>
          {sizeLabel && <span>· {sizeLabel}</span>}
          <span>· {new Date(version.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
