import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, toSlug, Vibe, Version, Comment, User, Collaborator, InviteLink, AccessDeniedError } from '../lib/api';
import { supabase } from '../lib/supabase';

interface VibeDetailProps {
  currentUser?: User;
}

type ActiveTab = 'chat' | 'versions' | 'manage';

export default function VibeDetail({ currentUser }: VibeDetailProps) {
  const { username, vibeSlug } = useParams<{ username: string; vibeSlug: string }>();
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

  // Supabase user for API calls requiring supabase_id
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSupabaseUser(data.session?.user ?? null));
  }, []);

  // Collaborator management state
  const [collabInput, setCollabInput] = useState('');
  const [collabError, setCollabError] = useState('');
  const [collabLoading, setCollabLoading] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [inviteCopied, setInviteCopied] = useState<string | null>(null);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);

  useEffect(() => {
    loadVibe();
  }, [username, vibeSlug, supabaseUser]);

  const loadVibe = async () => {
    if (supabaseUser === undefined) return; // still loading auth
    const rawUsername = username?.startsWith('@') ? username.substring(1) : username;
    const decodedUsername = rawUsername ? decodeURIComponent(rawUsername) : '';
    const decodedSlug = vibeSlug ? decodeURIComponent(vibeSlug) : '';
    try {
      const data = await api.getVibeBySlug(decodedUsername, decodedSlug, supabaseUser?.id);
      setVibe(data);
      if (data.versions && data.versions.length > 0) {
        setSelectedVersion(data.versions[0]);
      }
      // Load invite links if owner
      if (data.user_role === 'owner' && supabaseUser?.id) {
        loadInviteLinks(data.id, supabaseUser.id);
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

  const loadInviteLinks = async (vibeId: number, sid: string) => {
    try {
      const links = await api.getInviteLinks(vibeId, sid);
      setInviteLinks(links);
    } catch {}
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

  const handleCopyCode = () => {
    if (selectedVersion) {
      navigator.clipboard.writeText(selectedVersion.code);
    }
  };

  const handleRemix = () => {
    if (!vibe) return;
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

  const handleAddCollaborator = async () => {
    if (!vibe || !supabaseUser?.id || !collabInput.trim()) return;
    setCollabLoading(true);
    setCollabError('');
    try {
      const collab = await api.addCollaborator(vibe.id, supabaseUser.id, collabInput.trim());
      setVibe(prev => prev ? { ...prev, collaborators: [...(prev.collaborators ?? []), collab] } : prev);
      setCollabInput('');
    } catch (err: any) {
      setCollabError(err.message || '新增失敗');
    } finally {
      setCollabLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: number) => {
    if (!vibe || !supabaseUser?.id) return;
    try {
      await api.removeCollaborator(vibe.id, userId, supabaseUser.id);
      setVibe(prev => prev ? { ...prev, collaborators: (prev.collaborators ?? []).filter(c => c.user_id !== userId) } : prev);
    } catch {}
  };

  const handleCreateInviteLink = async () => {
    if (!vibe || !supabaseUser?.id) return;
    try {
      const { token } = await api.createInviteLink(vibe.id, supabaseUser.id);
      const newLink: InviteLink = { id: Date.now(), vibe_id: vibe.id, token, created_by: currentUser?.id ?? 0, revoked: false, created_at: new Date().toISOString() };
      setInviteLinks(prev => [newLink, ...prev]);
    } catch {}
  };

  const handleRevokeInviteLink = async (token: string) => {
    if (!vibe || !supabaseUser?.id) return;
    try {
      await api.revokeInviteLink(vibe.id, token, supabaseUser.id);
      setInviteLinks(prev => prev.map(l => l.token === token ? { ...l, revoked: true } : l));
    } catch {}
  };

  const handleCopyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    setInviteCopied(token);
    setTimeout(() => setInviteCopied(null), 2000);
  };

  const handleVisibilityChange = async (newVisibility: 'public' | 'unlisted' | 'private') => {
    if (!vibe || !supabaseUser?.id) return;
    setVisibilityUpdating(true);
    try {
      await api.updateVisibility(vibe.id, supabaseUser.id, newVisibility);
      setVibe(prev => prev ? { ...prev, visibility: newVisibility } : prev);
    } catch {} finally {
      setVisibilityUpdating(false);
    }
  };

  const visibilityIcon = { public: 'public', unlisted: 'link', private: 'lock' };
  const visibilityLabel = { public: 'Public', unlisted: 'Unlisted', private: 'Private' };

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
      <div className="h-16 border-b border-outline-variant/10 flex items-center justify-between px-6 bg-surface-container-low shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full hover:bg-surface-container-high transition-colors text-on-surface/60 hover:text-on-surface flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}`)}
          >
            <div className="w-10 h-10 rounded-md bg-primary-container flex items-center justify-center font-bold text-on-primary-container overflow-hidden transition-all border border-transparent group-hover:border-primary">
              {vibe.author_avatar ? (
                <img src={vibe.author_avatar} alt="author" className="w-full h-full object-cover" />
              ) : (
                vibe.title[0]
              )}
            </div>
            <div className="group-hover:opacity-80 transition-opacity flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <h1 className="text-on-surface font-sans font-bold text-sm tracking-tight">{vibe.title}</h1>
                {vibe.visibility && vibe.visibility !== 'public' && (
                  <span className="flex items-center gap-0.5 text-[9px] text-on-surface/40 font-mono uppercase tracking-widest border border-outline-variant/20 rounded px-1 py-0.5">
                    <span className="material-symbols-outlined text-[10px]">{visibilityIcon[vibe.visibility]}</span>
                    {visibilityLabel[vibe.visibility]}
                  </span>
                )}
              </div>
              <p className="text-on-surface/40 font-mono text-[10px] mt-0.5">Original by {vibe.author_name} • V{selectedVersion?.version_number}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-mono font-bold rounded border border-outline-variant/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
            Copy
          </button>
          <button
            onClick={handleRemix}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-fixed text-on-primary text-xs font-mono font-bold rounded shadow-lg shadow-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">repeat</span>
            Remix
          </button>
        </div>
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
        <div className={`${mobilePanel === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 bg-surface-container-lowest relative items-center justify-center p-4 lg:p-12`}>
          <div className="w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-outline-variant/20 relative">
            <iframe
              srcDoc={selectedVersion?.code}
              className="w-full h-full border-none absolute inset-0 bg-white"
              title="Stage"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
          <button className="absolute bottom-6 right-6 lg:bottom-14 lg:right-14 w-10 h-10 bg-surface/80 backdrop-blur-md border border-outline-variant/20 text-on-surface rounded flex items-center justify-center hover:bg-surface transition-colors z-10 shadow-lg">
            <span className="material-symbols-outlined text-[18px]">fullscreen</span>
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
            {isOwner && (
              <div
                onClick={() => setActiveTab('manage')}
                className={`flex-1 h-full flex items-center justify-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${activeTab === 'manage' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40 hover:text-on-surface hover:bg-surface-container-low'}`}>
                <span className="material-symbols-outlined text-[14px]">manage_accounts</span>
                Manage
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden relative">

            {/* Chat Window */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden absolute inset-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
                  {vibe.comments?.map(comment => (
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
                    <div className="w-full h-full flex items-center justify-center text-on-surface/20 font-mono text-xs text-center p-8">
                      Be the first to drop some knowledge.
                    </div>
                  )}
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
                    <div className="py-3 px-4 bg-surface-container-lowest border border-outline-variant/10 rounded text-center">
                      <p className="text-on-surface/40 font-mono text-[10px] uppercase tracking-widest">Sign in to participate</p>
                    </div>
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
                      onClick={() => setSelectedVersion(version)}
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

            {/* Manage Window (owner only) */}
            {activeTab === 'manage' && isOwner && (
              <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar absolute inset-0">

                {/* Visibility */}
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface/40 mb-3">可見性</p>
                  <div className="flex gap-2">
                    {(['public', 'unlisted', 'private'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => handleVisibilityChange(v)}
                        disabled={visibilityUpdating}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-colors text-[10px] font-bold uppercase tracking-wide ${
                          vibe.visibility === v
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-outline-variant/20 text-on-surface/50 hover:border-outline-variant/40 hover:text-on-surface/80'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{visibilityIcon[v]}</span>
                        {visibilityLabel[v]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-on-surface/30 mt-2 font-mono">
                    {vibe.visibility === 'public' && '在探索頁顯示，所有人可見'}
                    {vibe.visibility === 'unlisted' && '僅能透過直接連結存取，不出現在探索頁'}
                    {vibe.visibility === 'private' && '僅限您和協作者存取'}
                  </p>
                </div>

                {/* Collaborators */}
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface/40 mb-3">協作者</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={collabInput}
                      onChange={(e) => { setCollabInput(e.target.value); setCollabError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCollaborator(); }}
                      placeholder="輸入使用者名稱"
                      className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface placeholder:text-on-surface/30 focus:border-primary/50 outline-none"
                    />
                    <button
                      onClick={handleAddCollaborator}
                      disabled={collabLoading || !collabInput.trim()}
                      className="px-3 py-2 bg-primary text-on-primary rounded text-xs font-bold disabled:opacity-50"
                    >
                      新增
                    </button>
                  </div>
                  {collabError && <p className="text-xs text-error font-mono mb-2">{collabError}</p>}
                  <div className="space-y-2">
                    {(vibe.collaborators ?? []).length === 0 && (
                      <p className="text-on-surface/30 text-xs font-mono">尚無協作者</p>
                    )}
                    {(vibe.collaborators ?? []).map((c: Collaborator) => (
                      <div key={c.user_id} className="flex items-center gap-3 p-2 bg-surface-container-lowest rounded border border-outline-variant/10">
                        <img src={c.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${c.username}`} className="w-7 h-7 rounded" alt="avatar" />
                        <span className="flex-1 text-sm text-on-surface font-sans">{c.username}</span>
                        <button
                          onClick={() => handleRemoveCollaborator(c.user_id)}
                          className="text-[10px] text-error/60 hover:text-error font-mono uppercase tracking-wide transition-colors"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invite Links */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface/40">邀請連結</p>
                    <button
                      onClick={handleCreateInviteLink}
                      className="text-[10px] font-mono font-bold text-primary hover:text-primary/80 uppercase tracking-wide transition-colors"
                    >
                      + 建立連結
                    </button>
                  </div>
                  <div className="space-y-2">
                    {inviteLinks.length === 0 && (
                      <p className="text-on-surface/30 text-xs font-mono">尚無邀請連結</p>
                    )}
                    {inviteLinks.map((link) => (
                      <div key={link.token} className={`flex items-center gap-2 p-2 rounded border text-[11px] font-mono ${link.revoked ? 'opacity-40 border-outline-variant/10' : 'border-outline-variant/20 bg-surface-container-lowest'}`}>
                        <span className="flex-1 text-on-surface/50 truncate">{link.token.slice(0, 12)}…</span>
                        {!link.revoked && (
                          <>
                            <button
                              onClick={() => handleCopyInviteLink(link.token)}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              {inviteCopied === link.token ? '已複製！' : '複製'}
                            </button>
                            <button
                              onClick={() => handleRevokeInviteLink(link.token)}
                              className="text-error/60 hover:text-error transition-colors"
                            >
                              撤銷
                            </button>
                          </>
                        )}
                        {link.revoked && <span className="text-on-surface/30">已撤銷</span>}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
