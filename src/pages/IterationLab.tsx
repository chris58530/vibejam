import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Maximize2, 
  Copy, 
  Repeat, 
  Clock, 
  MessageSquare, 
  Plus, 
  CheckCircle2, 
  Code2,
  Send,
  ArrowLeft
} from 'lucide-react';
import { api, Vibe, Version, Comment } from '../lib/api';

interface IterationLabProps {
  vibeId: number;
  onBack: () => void;
  onRemix: (vibe: Vibe, code: string) => void;
}

export default function IterationLab({ vibeId, onBack, onRemix }: IterationLabProps) {
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentCode, setCommentCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVibe();
  }, [vibeId]);

  const loadVibe = async () => {
    const data = await api.getVibe(vibeId);
    setVibe(data);
    if (data.versions && data.versions.length > 0) {
      setSelectedVersion(data.versions[0]);
    }
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!commentText || !selectedVersion) return;
    await api.addComment(vibeId, {
      content: commentText,
      code_snippet: commentCode,
      version_id: selectedVersion.id
    });
    setCommentText('');
    setCommentCode('');
    setShowCodeInput(false);
    loadVibe();
  };

  const handleCopyCode = () => {
    if (selectedVersion) {
      navigator.clipboard.writeText(selectedVersion.code);
    }
  };

  if (loading || !vibe) return (
    <div className="pt-20 flex items-center justify-center h-screen text-white/20 font-bold text-2xl">
      Loading Lab...
    </div>
  );

  return (
    <div className="pt-16 h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white">
              {vibe.title[0]}
            </div>
            <div>
              <h1 className="text-white font-bold">{vibe.title}</h1>
              <p className="text-white/40 text-xs">by {vibe.author_name} • V{selectedVersion?.version_number}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/10 transition-all"
          >
            <Copy className="w-4 h-4" />
            Copy Code
          </button>
          <button 
            onClick={() => onRemix(vibe, selectedVersion?.code || '')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Repeat className="w-4 h-4" />
            Remix
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Stage & Comments */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
          {/* Stage */}
          <div className="h-[60%] bg-white relative">
            <iframe
              srcDoc={selectedVersion?.code}
              className="w-full h-full border-none"
              title="Stage"
            />
            <button className="absolute bottom-4 right-4 p-2 bg-black/60 backdrop-blur-md text-white rounded-lg hover:bg-black/80 transition-colors">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Comments */}
          <div className="flex-1 flex flex-col bg-zinc-900/30 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/60 font-bold text-xs uppercase tracking-widest">
                <MessageSquare className="w-4 h-4" />
                Feedback Thread
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {vibe.comments?.map(comment => (
                <div key={comment.id} className="flex gap-4 group">
                  <img src={comment.author_avatar} className="w-8 h-8 rounded-full border border-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{comment.author_name}</span>
                        <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full border border-white/5">
                          V{vibe.versions?.find(v => v.id === comment.version_id)?.version_number}
                        </span>
                        {comment.is_adopted === 1 && (
                          <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Adopted
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/20">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{comment.content}</p>
                    {comment.code_snippet && (
                      <div className="bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[11px] text-indigo-300">
                        {comment.code_snippet}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-zinc-900 border-t border-white/5">
              <div className="space-y-3">
                {showCodeInput && (
                  <textarea
                    value={commentCode}
                    onChange={(e) => setCommentCode(e.target.value)}
                    placeholder="Paste suggested code snippet..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-indigo-300 focus:ring-1 focus:ring-indigo-500/50 outline-none h-24"
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Suggest an improvement..."
                      className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-indigo-500/50 outline-none"
                    />
                    <button 
                      onClick={() => setShowCodeInput(!showCodeInput)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${showCodeInput ? 'text-indigo-400 bg-indigo-400/10' : 'text-white/20 hover:text-white/40'}`}
                    >
                      <Code2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={handleAddComment}
                    className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="w-80 flex flex-col bg-zinc-900/20">
          <div className="p-4 border-b border-white/5 flex items-center gap-2 text-white/60 font-bold text-xs uppercase tracking-widest">
            <Clock className="w-4 h-4" />
            Version Timeline
          </div>

          <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
            <div className="absolute left-9 top-8 bottom-8 w-px bg-white/5" />
            
            <div className="space-y-8 relative">
              {vibe.versions?.map((version, index) => (
                <div 
                  key={version.id}
                  className={`flex gap-4 cursor-pointer group transition-all ${selectedVersion?.id === version.id ? 'opacity-100' : 'opacity-40 hover:opacity-60'}`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${selectedVersion?.id === version.id ? 'bg-indigo-500 border-indigo-400' : 'bg-zinc-900 border-white/10'}`}>
                    {selectedVersion?.id === version.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold text-sm">V{version.version_number}</span>
                      <span className="text-[10px] text-white/20">{new Date(version.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-white/40 text-xs leading-relaxed italic">
                      {version.update_log || 'No update log provided.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-white/5">
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all">
              <Plus className="w-4 h-4" />
              New Version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
