import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Rocket, Save, Maximize2, Minimize2, Laptop, Smartphone } from 'lucide-react';
import { api } from '../lib/api';

interface WorkspaceProps {
  onPublish: () => void;
  remixFrom?: { id: number; code: string; title: string };
  currentUserId?: number;
}

export default function Workspace({ onPublish, remixFrom, currentUserId }: WorkspaceProps) {
  const [code, setCode] = useState(remixFrom?.code || '');
  const [title, setTitle] = useState(remixFrom ? `Remix of ${remixFrom.title}` : '');
  const [tags, setTags] = useState('');
  const [isPreviewFull, setIsPreviewFull] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!title || !code) return;
    setIsPublishing(true);
    try {
      if (remixFrom) {
        // If remixing an existing project, just add a new version to it!
        const logMsg = title !== \`Remix of \${remixFrom.title}\` ? title : 'Remix logic update';
        await api.addVersion(remixFrom.id, {
          code: code,
          update_log: logMsg,
        });
      } else {
        // Create new vibe as usual
        await api.createVibe({
          title,
          tags,
          code,
          author_id: currentUserId,
        });
      }
      onPublish();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="pt-16 h-screen flex bg-black overflow-hidden">
      {/* Left Panel: Editor */}
      <div className={`flex-1 flex flex-col border-r border-white/10 transition-all duration-500 ${isPreviewFull ? 'w-0 opacity-0' : 'w-1/2'}`}>
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your Vibe a cool name..."
              className="w-full bg-transparent border-none text-4xl font-black text-white placeholder:text-white/10 focus:ring-0 p-0"
            />
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="#tag1, #tag2, #tag3"
              className="w-full bg-transparent border-none text-sm font-medium text-indigo-400 placeholder:text-white/10 focus:ring-0 p-0"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Code Canvas</span>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your AI-generated HTML/CSS/JS code here..."
              className="flex-1 w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-6 font-mono text-sm text-indigo-300 placeholder:text-white/5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 resize-none outline-none transition-all"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-between">
          <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-bold">
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePublish}
            disabled={isPublishing || !title || !code || !currentUserId}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group relative"
          >
            {isPublishing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Rocket className="w-5 h-5" />
            )}
            Jam It Out!
            
            {/* Tooltips */}
            {!currentUserId && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/90 border border-white/10 text-white/80 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Please login with GitHub first
              </div>
            )}
            {currentUserId && (!title || !code) && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/90 border border-white/10 text-white/80 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Title and Code are required
              </div>
            )}
          </motion.button>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className={`relative flex flex-col transition-all duration-500 ${isPreviewFull ? 'w-full' : 'w-1/2'} bg-zinc-950`}>
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-2xl">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
          >
            <Laptop className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={() => setIsPreviewFull(!isPreviewFull)}
            className="p-1.5 rounded-md text-white/40 hover:text-white transition-colors"
          >
            {isPreviewFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-12">
          <div
            className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'}`}
          >
            {code ? (
              <iframe
                srcDoc={code}
                className="w-full h-full border-none"
                title="Live Preview"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 space-y-4">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="font-medium">Waiting for your magic code...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Zap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14.71 14.71 4H20v5.29L9.29 20H4v-5.29Z" />
      <path d="M15 9l-2 2" />
      <path d="M9 15l2 2" />
    </svg>
  );
}
