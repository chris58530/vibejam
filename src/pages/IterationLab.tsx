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
  currentUserId?: number;
}

export default function IterationLab({ vibeId, onBack, onRemix, currentUserId }: IterationLabProps) {
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentCode, setCommentCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'chat'|'versions'>('chat');

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
      version_id: selectedVersion.id,
      author_id: currentUserId,
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
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white overflow-hidden">
              {vibe.author_avatar ? (
                <img src={vibe.author_avatar} alt="author" className="w-full h-full object-cover" />
              ) : (
                vibe.title[0]
              )}
            </div>
            <div>
              <h1 className="text-white font-bold">{vibe.title}</h1>
              <p className="text-white/40 text-xs">Original by {vibe.author_name} • V{selectedVersion?.version_number} by {selectedVersion?.author_name || vibe.author_name}</p>
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
        {/* Left: Stage (Preview) */}
        <div className="flex-1 bg-white relative">
          <iframe
            srcDoc={selectedVersion?.code}
            className="w-full h-full border-none"
            title="Stage"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
          <button className="absolute bottom-4 right-4 p-2 bg-black/60 backdrop-blur-md text-white rounded-lg hover:bg-black/80 transition-colors z-10">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Chat / Comments & Timeline */}
        <div className="w-[400px] flex flex-col border-l border-white/5 bg-zinc-900/30 overflow-hidden">
          
          {/* Tabs header for Chat vs Timeline */}
          <div className="flex w-full items-center border-b border-white/5 bg-zinc-900/50 cursor-pointer">
            <div 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-center text-xs font-bold text-white uppercase tracking-widest transition-colors ${activeTab === 'chat' ? 'border-b-2 border-indigo-500 bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
              <MessageSquare className="w-4 h-4 inline-block mr-2" />
              Chat
            </div>
            <div 
              onClick={() => setActiveTab('versions')}
              className={`flex-1 py-3 text-center text-xs font-bold text-white uppercase tracking-widest transition-colors ${activeTab === 'versions' ? 'border-b-2 border-indigo-500 bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
              <Clock className="w-4 h-4 inline-block mr-2" />
              Versions
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* Chat Window */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden absolute inset-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                  {vibe.comments?.map(comment => (
                    <div key={comment.id} className="flex gap-3 group">
                      <img src={comment.author_avatar} className="w-8 h-8 rounded-full border border-white/10 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{comment.author_name}</span>
                            {comment.is_adopted === 1 && (
                              <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                Adopted
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/20">{new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                        {comment.code_snippet && (
                          <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono text-[11px] text-indigo-300 overflow-x-auto">
                            {comment.code_snippet}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-zinc-900 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20">
                  {currentUserId ? (
                    <div className="space-y-3">
                      {showCodeInput && (
                        <textarea
                          value={commentCode}
                          onChange={(e) => setCommentCode(e.target.value)}
                          placeholder="Paste suggested code snippet..."
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-indigo-300 focus:ring-1 focus:ring-indigo-500/50 outline-none h-24 custom-scrollbar"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                            placeholder="Type a message..."
                            className="w-full bg-zinc-800 border border-white/10 rounded-full pl-4 pr-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                          <button
                            onClick={() => setShowCodeInput(!showCodeInput)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${showCodeInput ? 'text-indigo-400 bg-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                          >
                            <Code2 className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={handleAddComment}
                          className="p-2.5 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!commentText.trim()}
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-zinc-800/50 border border-white/5 rounded-xl text-center">
                      <p className="text-white/50 text-sm">Please log in with GitHub to participate in the thread.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Window */}
            {activeTab === 'versions' && (
              <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar absolute inset-0">
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
                        <div className="flex items-center gap-2 mb-2">
                          {version.author_avatar ? (
                            <img src={version.author_avatar} className="w-4 h-4 rounded-full" alt="author" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-indigo-500/50 flex items-center justify-center text-[8px] text-white">
                              {(version.author_name || vibe.author_name || '?')[0]}
                            </div>
                          )}
                          <span className="text-xs text-white/60 font-medium">{version.author_name || vibe.author_name}</span>
                          {(version.author_id && version.author_id !== vibe.author_id) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-indigo-500/30 text-indigo-400 bg-indigo-500/10">Fork</span>
                          )}
                        </div>
                        <p className="text-white/40 text-xs leading-relaxed italic">
                          {version.update_log || 'No update log provided.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
