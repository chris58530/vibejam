import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, toSlug, User } from '../lib/api';

interface WorkspaceProps {
  currentUser?: User;
}

export default function Workspace({ currentUser }: WorkspaceProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const remixFrom = location.state as { id: number; code: string; title: string; author_name?: string } | undefined;

  const [code, setCode] = useState(remixFrom?.code || '');
  const [title, setTitle] = useState(remixFrom ? `Remix of ${remixFrom.title}` : 'Untitled Project');
  const [tags, setTags] = useState('');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!title || !code) return;
    setIsPublishing(true);
    try {
      if (remixFrom) {
        const logMsg = title !== `Remix of ${remixFrom.title}` ? title : 'Remix logic update';
        await api.addVersion(remixFrom.id, {
          code: code,
          update_log: logMsg,
          author_id: currentUser?.id,
        });
        const authorName = remixFrom.author_name || currentUser?.username;
        if (authorName) {
          navigate(`/@${authorName}/${toSlug(remixFrom.title)}`);
        } else {
          navigate('/');
        }
      } else {
        await api.createVibe({
          title,
          tags,
          code,
          author_id: currentUser?.id,
        });
        if (currentUser) {
          navigate(`/@${currentUser.username}/${toSlug(title)}`);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="md:ml-16 pt-16 flex-1 flex flex-col h-[calc(100vh)] overflow-hidden bg-background">
      {/* Vibe Properties Header */}
      <div className="bg-surface px-6 py-3 flex items-center gap-6 border-b border-outline-variant/10">
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-1.5 rounded-lg border-b-2 border-primary-container focus-within:border-primary transition-colors">
          <span className="material-symbols-outlined text-primary-container text-sm">edit_note</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-on-surface p-0 w-64 outline-none"
            placeholder="Untitled Project"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-1.5 rounded-lg focus-within:border-primary/50 transition-colors border-b-2 border-transparent">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Tags</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-xs text-on-surface/80 p-0 w-48 outline-none"
            placeholder="#ui-design #editorial"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        
        <div className="ml-auto flex gap-3">
          <button 
            onClick={handlePublish}
            disabled={isPublishing || !title || !code || !currentUser?.id}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-1.5 rounded-lg text-sm font-bold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed group relative flex items-center gap-2"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
            {!currentUser?.id && (
              <div className="absolute top-full mt-2 right-0 px-3 py-1.5 bg-black/90 border border-white/10 text-white/80 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Please login first
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Split Pane Layout */}
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* Left Pane: Code Editor */}
        <section className="md:w-1/2 flex flex-col bg-surface-container-lowest border-r border-outline-variant/10 h-1/2 md:h-full">
          <div className="flex bg-surface-container-low h-10 items-end px-2 gap-1 border-b border-outline-variant/10">
            <div className="px-4 py-2 bg-surface-container-lowest text-primary text-xs font-medium rounded-t-lg flex items-center gap-2 border-t border-x border-outline-variant/10">
              <span className="material-symbols-outlined text-[14px]">html</span>
              index.html
            </div>
          </div>
          <div className="flex-1 p-0 font-mono text-sm leading-relaxed editor-well overflow-hidden flex relative group cursor-text">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-surface-container-lowest border-r border-outline-variant/5 text-right py-4 pr-2 text-on-surface/20 select-none hidden sm:block">
               {code.split('\n').map((_, i) => (
                 <div key={i}>{i + 1}</div>
               ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your AI-generated HTML/CSS/JS code here..."
              className="flex-1 w-full bg-transparent p-4 sm:pl-12 py-4 font-mono text-sm text-[#E5E2E1] outline-none resize-none hide-scrollbar placeholder:text-on-surface/20 whitespace-pre"
              spellCheck={false}
            />
          </div>
        </section>

        {/* Right Pane: Preview */}
        <section className="md:w-1/2 bg-surface flex flex-col h-1/2 md:h-full">
          <div className="h-10 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-surface-container-highest rounded px-2 py-0.5">
                <span className="material-symbols-outlined text-[14px] text-tertiary">lock</span>
                <span className="text-[10px] text-on-surface/60 font-mono tracking-tight">localhost:3000/vibe/preview</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
                className="material-symbols-outlined text-on-surface/40 hover:text-primary transition-colors text-lg"
              >
                {viewMode === 'desktop' ? 'smartphone' : 'desktop_windows'}
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-8 bg-surface-container flex items-center justify-center overflow-hidden">
            <div className={`bg-white rounded-xl shadow-2xl overflow-hidden border border-outline-variant/20 transition-all duration-500 relative flex ${viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'}`}>
              {code ? (
                <iframe
                  srcDoc={code}
                  className="w-full h-full border-none absolute inset-0 bg-white"
                  title="Live Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="w-full h-full bg-[#050505] flex flex-col items-center justify-center p-12 relative z-10">
                  <div className="w-full h-full border border-dashed border-outline-variant/20 rounded-lg flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-6xl text-primary/20 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>fluid</span>
                    <h3 className="text-on-surface-variant font-mono text-lg">render_engine.init("{title || 'untitled'}")</h3>
                    <p className="text-on-surface-variant/40 text-sm mt-2 font-mono">Ready for execution...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className="bg-[#131313] border-t border-[#584142]/20 flex justify-between items-center px-6 h-8 w-full z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#FFB3B6]">
            <span className="material-symbols-outlined text-[12px]">rebase</span>
            main*
          </div>
          <div className="text-[10px] text-on-surface/40 font-mono">
           {code ? `Ln ${code.split('\n').length}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-on-surface/40">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> 
            VibeJam Cloud
          </span>
          <span>UTF-8</span>
          <span className="text-primary">HTML/CSS/JS</span>
        </div>
      </footer>
    </main>
  );
}

