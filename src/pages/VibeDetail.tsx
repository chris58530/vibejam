import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Vibe, Version, Comment, User, AccessDeniedError } from '../lib/api';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';

interface VibeDetailProps {
  currentUser?: User;
}

type ActiveTab = 'chat' | 'versions';

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

  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [mobilePanel, setMobilePanel] = useState<'preview' | 'panel'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatSortOrder, setChatSortOrder] = useState<'newest' | 'oldest'>('oldest');
  const [showChatSortDropdown, setShowChatSortDropdown] = useState(false);

  // iframe fade animation
  const [iframeVisible, setIframeVisible] = useState(true);

  // comments auto-scroll
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Auto-scroll comments to bottom when comments change
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [vibe?.comments?.length]);

  // Supabase user for API calls requiring supabase_id
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSupabaseUser(data.session?.user ?? null));
  }, []);


  useEffect(() => {
    loadVibe();
  }, [id, supabaseUser]);

  const loadVibe = async () => {
    if (supabaseUser === undefined) return; // still loading auth
    if (!id) { navigate('/'); return; }
    try {
      const data = await api.getVibe(id, supabaseUser?.id);
      setVibe(data);
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
        prev
          ? { ...prev, comments: (prev.comments ?? []).filter(c => c.id !== tempId) }
          : prev,
      );
    } finally {
      isSending.current = false;
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
    if (selectedVersion) {
      navigator.clipboard.writeText(selectedVersion.code);
    }
  };

  const handleRemix = () => {
    if (!vibe) return;
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
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

  const visibilityIcon = { public: 'public', unlisted: 'link', private: 'lock' };
  const visibilityLabel = { public: 'Public', unlisted: 'Unlisted', private: 'Private' };

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

  if (loading) return (
    <div className="md:ml-16 pt-20 flex items-center justify-center min-h-screen bg-surface text-on-surface/40 font-mono text-lg tracking-widest uppercase">
      Loading Stage...
    </div>
  );

  if (accessDenied) return (
    <div className="md:ml-16 pt-20 flex flex-col items-center justify-center min-h-screen bg-surface gap-6">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
        <span className="material-symbols-outlined text-[40px] text-on-surface/40">lock</span>
      </div>
      <div className="text-center">
        <h1 className="text-on-surface font-bold text-xl mb-2">存取被拒</h1>
        <p className="text-on-surface/50 text-sm">此作品為私人作品。僅擁有者和協作者可以查看。</p>
      </div>
      <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold">
        返回首頁
      </button>
    </div>
  );

  if (!vibe) return null;

  const isOwner = vibe.user_role === 'owner';

  return (
    <div className="md:ml-16 pt-[64px] h-screen flex flex-col bg-surface overflow-hidden">
      {/* Platform Header */}
      <div className="border-b border-outline-variant/10 bg-surface-container-low shrink-0 z-10">
        {/* Main header row */}
        <div className="h-14 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full hover:bg-surface-container-high transition-colors text-on-surface/60 hover:text-on-surface flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div
              className="flex items-center gap-3 cursor-pointer group min-w-0"
              onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}`)}
            >
              <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center font-bold text-on-primary-container overflow-hidden ring-1 ring-black/[0.07] group-hover:ring-primary/40 transition-all shrink-0">
                {vibe.author_avatar ? (
                  <img src={vibe.author_avatar} alt="author" className="w-full h-full object-cover" />
                ) : (
                  vibe.title[0]
                )}
              </div>
              <div className="group-hover:opacity-80 transition-opacity flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-on-surface font-sans font-bold text-base tracking-tight truncate">
                    {vibe.title}
                  </h1>
                  {vibe.visibility && vibe.visibility !== 'public' && (
                    <span className="flex items-center gap-0.5 text-[9px] text-on-surface/40 font-mono uppercase tracking-widest border border-outline-variant/20 rounded px-1 py-0.5 shrink-0">
                      <span className="material-symbols-outlined text-[10px]">{visibilityIcon[vibe.visibility]}</span>
                      {visibilityLabel[vibe.visibility]}
                    </span>
                  )}
                </div>
                {vibe.description && (
                  <p className="text-[11px] text-on-surface/40 font-sans mt-0.5 line-clamp-2 max-w-sm">{vibe.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-on-surface/40 font-mono mt-0.5">
                  <span className="hover:text-on-surface/60 transition-colors">@{vibe.author_name}</span>
                  <span className="text-on-surface/20">•</span>
                  <span>V{selectedVersion?.version_number}</span>
                  {vibe.parent_vibe_title && (
                    <>
                      <span className="text-on-surface/20">•</span>
                      <span className="text-tertiary/60 truncate">remix of {vibe.parent_author_name}/{vibe.parent_vibe_title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            {/* Stats */}
            <div className="hidden lg:flex items-center gap-3 mr-3 text-on-surface/35">
              <span className="flex items-center gap-1 text-[11px] font-mono" title="Views">
                <span className="material-symbols-outlined text-[14px]">visibility</span>
                {vibe.views}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono" title="Comments">
                <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                {commentCount}
              </span>
              {remixCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-mono" title="Remixes">
                  <span className="material-symbols-outlined text-[14px]">repeat</span>
                  {remixCount}
                </span>
              )}
            </div>
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-mono font-bold rounded-lg ring-1 ring-black/[0.07] transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-mono font-bold rounded-lg ring-1 ring-black/[0.07] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              <span className="hidden sm:inline">Copy</span>
            </button>
            <button
              onClick={handleRemix}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-on-primary text-xs font-mono font-bold rounded-lg shadow-lg shadow-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">repeat</span>
              Remix
            </button>
          </div>
        </div>

        {/* Tags & metadata row */}
        {(parsedTags.length > 0 || vibe.created_at) && (
          <div className="px-4 md:px-6 pb-2.5 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {parsedTags.map((tag, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-high text-[10px] font-mono text-on-surface/50 whitespace-nowrap ring-1 ring-black/[0.05]">
                {tag}
              </span>
            ))}
            <span className="text-[10px] text-on-surface/25 font-mono ml-auto whitespace-nowrap">
              {timeAgo(vibe.created_at)}
            </span>
          </div>
        )}
      </div>

      {/* Mobile Panel Switcher */}
      <div className="flex md:hidden border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
        <button
          onClick={() => setMobilePanel('preview')}
          className={`flex-1 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${mobilePanel === 'preview' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">preview</span>
          Preview
        </button>
        <button
          onClick={() => setMobilePanel('panel')}
          className={`flex-1 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${mobilePanel === 'panel' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">chat_bubble</span>
          Chat / Versions
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative md:flex-row flex-col">
        {/* Left: Stage (Preview) */}
        <div className={`${mobilePanel === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 bg-surface-container-lowest relative items-center justify-center ${isFullscreen ? 'fixed inset-0 z-[200] bg-black p-0' : 'p-0'}`}>
          <div className={`overflow-hidden relative ${isFullscreen ? 'w-full h-full' : 'w-full h-full'}`}>
            <iframe
              srcDoc={selectedVersion?.code}
              className="w-full h-full border-none absolute inset-0 bg-white transition-opacity duration-150"
              style={{ opacity: iframeVisible ? 1 : 0 }}
              title="Stage"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`absolute w-9 h-9 backdrop-blur-md text-on-surface rounded-lg flex items-center justify-center hover:bg-surface transition-colors z-10 shadow-lg ring-1 ring-black/[0.07] ${isFullscreen ? 'bottom-4 right-4 bg-surface/90' : 'bottom-5 right-5 lg:bottom-10 lg:right-10 bg-surface/80'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
          </button>
        </div>

        {/* Right: Chat / Comments & Timeline */}
        <div className={`${mobilePanel === 'panel' ? 'flex' : 'hidden'} md:flex w-full md:w-[35%] md:min-w-[320px] md:max-w-[440px] flex-col border-l border-outline-variant/10 bg-surface-container-low overflow-hidden shrink-0`}>

          {/* Tabs header */}
          <div className="flex w-full items-center border-b border-outline-variant/10 bg-surface-container-lowest cursor-pointer shrink-0 h-12">
            <div
              onClick={() => setActiveTab('chat')}
              className={`flex-1 h-full flex items-center justify-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${activeTab === 'chat' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40 hover:text-on-surface hover:bg-surface-container-low'}`}>
              <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
              Chat
            </div>
            <div
              onClick={() => setActiveTab('versions')}
              className={`flex-1 h-full flex items-center justify-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${activeTab === 'versions' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40 hover:text-on-surface hover:bg-surface-container-low'}`}>
              <span className="material-symbols-outlined text-[14px]">history</span>
              Versions
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden relative">

            {/* Chat Window */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden absolute inset-0">
                {/* Sort toolbar */}
                <div className="flex items-center justify-end px-4 py-2 border-b border-outline-variant/10 shrink-0 bg-surface-container-low">
                  <div className="relative">
                    <button
                      onClick={() => setShowChatSortDropdown(v => !v)}
                      className="flex items-center gap-1 text-[10px] font-mono text-on-surface/40 hover:text-on-surface/70 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">sort</span>
                      {chatSortOrder === 'oldest' ? 'Oldest first' : 'Newest first'}
                      <span className="material-symbols-outlined text-[11px]">expand_more</span>
                    </button>
                    {showChatSortDropdown && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowChatSortDropdown(false)} />
                        <div className="absolute right-0 top-full mt-1 z-30 bg-surface-container-highest border border-outline-variant/20 rounded-lg shadow-xl overflow-hidden min-w-[130px]">
                          {(['oldest', 'newest'] as const).map(order => (
                            <button
                              key={order}
                              onClick={() => { setChatSortOrder(order); setShowChatSortDropdown(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono hover:bg-surface-container-high transition-colors ${chatSortOrder === order ? 'text-primary' : 'text-on-surface/60'}`}
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
                <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
                  {[...(vibe.comments ?? [])].sort((a, b) => chatSortOrder === 'newest' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(comment => (
                    <div key={comment.id} className={`flex gap-3 group ${comment.optimistic ? 'opacity-60' : ''}`}>
                      <img src={comment.author_avatar} className="w-8 h-8 rounded shrink-0 border border-outline-variant/10" alt="avatar" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-on-surface font-sans font-bold text-sm tracking-tight">{comment.author_name}</span>
                            {comment.is_adopted === 1 && (
                              <span className="flex items-center gap-1 text-[9px] text-tertiary font-mono uppercase tracking-widest">
                                <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                Adopted
                              </span>
                            )}
                          </div>
                          {comment.optimistic ? (
                            <span className="text-[10px] text-on-surface/30 font-mono italic">Sending…</span>
                          ) : (
                            <span className="text-[10px] text-on-surface/20 font-mono">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                        <p className="text-on-surface/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{comment.content}</p>
                        {comment.code_snippet && (
                          <div className="mt-2 bg-surface-container-lowest rounded p-3 border border-outline-variant/10 font-mono text-[11px] text-tertiary overflow-x-auto hide-scrollbar">
                            {comment.code_snippet}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!vibe.comments || vibe.comments.length === 0) && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-8">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container-high/50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px] text-on-surface/15">forum</span>
                      </div>
                      <div className="text-center">
                        <p className="text-on-surface/30 font-sans text-sm font-medium">No comments yet</p>
                        <p className="text-on-surface/15 font-mono text-[11px] mt-1">Be the first to share your thoughts</p>
                      </div>
                    </div>
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-surface-container border-t border-outline-variant/10 shrink-0 z-20">
                  {currentUser ? (
                    <div className="space-y-3">
                      {showCodeInput && (
                        <textarea
                          value={commentCode}
                          onChange={(e) => setCommentCode(e.target.value)}
                          placeholder="Paste suggested code snippet..."
                          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded p-3 text-xs font-mono text-tertiary focus:border-primary/50 outline-none h-24 hide-scrollbar placeholder:text-on-surface/20"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddComment();
                              }
                            }}
                            placeholder="Type your message..."
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded pl-3 pr-10 py-2.5 text-sm text-on-surface placeholder:text-on-surface/30 focus:border-primary/50 outline-none font-sans"
                          />
                          <button
                            onClick={() => setShowCodeInput(!showCodeInput)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors flex items-center justify-center ${showCodeInput ? 'text-primary bg-primary/10' : 'text-on-surface/40 hover:text-on-surface hover:bg-surface-container-high'}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">code</span>
                          </button>
                        </div>
                        <button
                          onClick={handleAddComment}
                          className="w-10 h-10 bg-primary text-on-primary rounded hover:bg-primary-fixed transition-colors shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!commentText.trim()}
                        >
                          <span className="material-symbols-outlined text-[16px] ml-0.5">send</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-lg transition-colors group"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary/70 group-hover:text-primary transition-colors">login</span>
                      <span className="text-primary/70 group-hover:text-primary font-mono text-[11px] font-bold uppercase tracking-widest transition-colors">Sign in to join the conversation</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Window */}
            {activeTab === 'versions' && (
              <div className="flex-1 overflow-y-auto p-6 relative hide-scrollbar absolute inset-0">
                <div className="absolute left-[34px] top-8 bottom-8 w-px bg-outline-variant/10" />

                <div className="space-y-8 relative">
                  {vibe.versions?.map((version, index) => (
                    <div
                      key={version.id}
                      className={`flex gap-4 cursor-pointer group transition-all ${selectedVersion?.id === version.id ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}
                      onClick={() => handleSelectVersion(version)}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 transition-colors mt-0.5 ${selectedVersion?.id === version.id ? 'bg-primary border-primary' : 'bg-surface-container-lowest border-outline-variant/20 group-hover:border-outline-variant/40'}`}>
                        {selectedVersion?.id === version.id && <div className="w-1.5 h-1.5 bg-on-primary rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-on-surface font-mono font-bold text-sm">V{version.version_number}</span>
                          <span className="text-[10px] text-on-surface/30 font-mono">{new Date(version.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {version.author_avatar ? (
                            <img src={version.author_avatar} className="w-4 h-4 rounded" alt="author" />
                          ) : (
                            <div className="w-4 h-4 rounded bg-tertiary-container flex items-center justify-center text-[8px] text-on-tertiary-container font-bold">
                              {(version.author_name || vibe.author_name || '?')[0]}
                            </div>
                          )}
                          <span className="text-xs text-on-surface/60 font-sans font-medium">{version.author_name || vibe.author_name}</span>
                          {(version.author_id && version.author_id !== vibe.author_id) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-tertiary/20 text-tertiary font-mono uppercase bg-tertiary/5 tracking-widest">Remix</span>
                          )}
                        </div>
                        <p className="text-on-surface/40 text-[11px] leading-relaxed font-sans">
                          {version.update_log || 'System update registered.'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!vibe.versions || vibe.versions.length === 0) && (
                    <div className="w-full text-center text-on-surface/20 font-mono text-xs pt-4">No version history</div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
