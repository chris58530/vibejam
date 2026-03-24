import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, toSlug, User } from '../lib/api';
import { useAIKeyStore } from '../lib/aiKeyStore';
import { chatWithAI, ChatMessage, AIServiceError } from '../lib/aiService';
import { extractCodeFromAIResponse, generatePreviewDoc } from '../lib/codeUtils';

type ChatProvider = 'gemini' | 'openai' | 'minimax';

const CHAT_PROVIDER_LABEL: Record<ChatProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  minimax: 'MiniMax',
};

interface RemixStudioProps {
  currentUser?: User;
}

interface RemixState {
  parentVibeId: number;
  code: string;
  title: string;
  authorName: string;
  versionNumber: number;
}

export default function RemixStudio({ currentUser }: RemixStudioProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const remixFrom = location.state as RemixState | undefined;

  // If no remix state, redirect to home
  useEffect(() => {
    if (!remixFrom) navigate('/');
  }, [remixFrom, navigate]);

  const { keys, validated, initialized, initialize, getUsage, dailyLimits } = useAIKeyStore();

  // AI chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ChatProvider | ''>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Code & publish state
  const [code, setCode] = useState(remixFrom?.code || '');
  const [title, setTitle] = useState(remixFrom ? `Remix of ${remixFrom.title}` : '');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChatProviders = (['gemini', 'openai', 'minimax'] as const).filter(
    p => !!keys[p] && !!validated[p]
  );

  useEffect(() => {
    if (initialized) {
      if (activeChatProviders.length === 0) {
        setSelectedProvider('');
        return;
      }
      if (!selectedProvider || !activeChatProviders.includes(selectedProvider as ChatProvider)) {
        setSelectedProvider(activeChatProviders[0]);
      }
    }
  }, [initialized, JSON.stringify(activeChatProviders)]);

  const hasActiveProvider = !!selectedProvider;
  const todayUsage = selectedProvider ? getUsage(selectedProvider) : 0;
  const limit = selectedProvider ? (dailyLimits[selectedProvider] || 0) : 0;

  // Generate preview
  const previewDoc = useMemo(() => generatePreviewDoc(code), [code]);

  // Build system prompt with current code context
  const buildSystemPrompt = (): ChatMessage => ({
    role: 'system',
    content: `你是 VibeBot，VibeJam 平台的 AI 程式碼助理。使用者正在 remix 一個專案。

你的任務：
1. 根據使用者的指令修改程式碼
2. 回覆時必須包含**完整的修改後程式碼**，用 \`\`\`html（或 \`\`\`tsx / \`\`\`vue 視框架而定）包裹
3. 在程式碼區塊之前或之後，簡短說明你做了什麼修改
4. 不要只給部分程式碼或 diff，必須給出完整可執行的程式碼

以下是目前的完整程式碼：

\`\`\`
${code}
\`\`\`

請根據使用者的指示修改上述程式碼。使用繁體中文回答。`,
  });

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !selectedProvider) return;

    setError('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Only keep last 10 messages for context to manage token usage
      const recentMessages = newMessages.slice(-10);
      const response = await chatWithAI(selectedProvider, [buildSystemPrompt(), ...recentMessages], {
        maxTokens: 8192,
      });

      const assistantMsg: ChatMessage = { role: 'assistant', content: response.text };
      setMessages(prev => [...prev, assistantMsg]);

      // Extract code from AI response and update preview
      const extractedCode = extractCodeFromAIResponse(response.text);
      if (extractedCode) {
        setCode(extractedCode);
      }
    } catch (err) {
      if (err instanceof AIServiceError) {
        setError(err.message);
      } else {
        setError('發生未知錯誤，請稍後再試。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !code || !remixFrom) return;
    setIsPublishing(true);
    try {
      const result = await api.createVibe({
        title: title.trim(),
        tags: '',
        code: previewDoc || code,
        author_id: currentUser?.id,
        parent_vibe_id: remixFrom.parentVibeId,
        parent_version_number: remixFrom.versionNumber,
      });
      if (currentUser) {
        navigate(`/@${currentUser.username}/${toSlug(title.trim())}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to publish remix:', err);
      setError('發布失敗，請稍後再試。');
    } finally {
      setIsPublishing(false);
    }
  };

  const [mobileTab, setMobileTab] = useState<'code' | 'chat' | 'preview'>('code');

  if (!remixFrom) return null;

  return (
    <div className="md:ml-16 pt-16 flex-1 flex flex-col md:flex-row h-[calc(100vh)] overflow-hidden bg-background">
      {/* Mobile Tab Switcher — 3 tabs */}
      <div className="flex md:hidden border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
        <button
          onClick={() => setMobileTab('code')}
          className={`flex-1 py-3 text-center text-xs font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'code' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">code</span>
          Code
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-center text-xs font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'chat' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">chat</span>
          AI Chat
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-3 text-center text-xs font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'preview' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">preview</span>
          Preview
        </button>
      </div>

      {/* ── Left Column: Code Editor (top) + AI Chat (bottom) ── */}
      <div
        className={`${
          mobileTab === 'preview' ? 'hidden' : 'flex'
        } md:flex w-full md:w-[48%] md:min-w-[380px] flex-col border-r border-outline-variant/10 bg-surface-container-low`}
      >
        {/* ─ Code Editor Panel (top 3/5 on desktop) ─ */}
        <div
          className={`${
            mobileTab === 'chat' ? 'hidden md:flex' : 'flex'
          } flex-col overflow-hidden border-b border-outline-variant/10`}
          style={{ flex: '3 3 0', minHeight: 0 }}
        >
          {/* Code editor header */}
          <div className="px-4 py-2.5 border-b border-outline-variant/10 bg-surface-container-lowest flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-[14px] text-primary">code</span>
            <span className="text-xs font-mono font-bold text-on-surface/60 uppercase tracking-widest">Code Editor</span>
            <span className="ml-auto text-[10px] font-mono text-on-surface/25">{code.length} chars</span>
          </div>
          {/* Code textarea */}
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="flex-1 w-full bg-surface-container-lowest text-on-surface/85 font-mono text-xs p-4 resize-none outline-none leading-relaxed custom-scrollbar"
            style={{ tabSize: 2, whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto' }}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            placeholder="// 程式碼在這裡..."
          />
        </div>

        {/* ─ AI Chat Panel (bottom 2/5 on desktop) ─ */}
        <div
          className={`${
            mobileTab === 'code' ? 'hidden md:flex' : 'flex'
          } flex-col overflow-hidden`}
          style={{ flex: '2 2 0', minHeight: 0 }}
        >
          {/* Source Info Header */}
          <div className="px-4 py-3 border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-mono">
              <span className="material-symbols-outlined text-[14px]">repeat</span>
              <span>Remixing from</span>
              <button
                onClick={() => navigate(`/@${encodeURIComponent(remixFrom.authorName)}/${toSlug(remixFrom.title)}`)}
                className="text-primary hover:underline font-bold truncate max-w-[200px]"
              >
                {remixFrom.title}
              </button>
              <span className="text-on-surface/30">V{remixFrom.versionNumber}</span>
              <span className="text-on-surface/30">by {remixFrom.authorName}</span>
            </div>
          </div>

          {/* Provider Selector */}
          {activeChatProviders.length > 0 && (
            <div className="px-4 py-2 border-b border-outline-variant/10 flex items-center gap-2 shrink-0">
              {activeChatProviders.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                    selectedProvider === p
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface/50 hover:text-on-surface'
                  }`}
                >
                  {CHAT_PROVIDER_LABEL[p]}
                </button>
              ))}
              {selectedProvider && limit > 0 && (
                <span className="ml-auto text-[10px] font-mono text-on-surface/30">
                  {todayUsage}/{limit}
                </span>
              )}
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" style={{ minHeight: 0 }}>
            {!hasActiveProvider && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <span className="material-symbols-outlined text-4xl text-on-surface/20 mb-3">key</span>
                <p className="text-sm text-on-surface/40 mb-2">尚未設定 AI API Key</p>
                <p className="text-xs text-on-surface/30 mb-4">請先至設定頁面輸入至少一個 AI 服務的 API Key</p>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-primary-fixed transition-colors"
                >
                  前往設定
                </button>
              </div>
            )}

            {hasActiveProvider && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <span className="material-symbols-outlined text-5xl text-primary/30 mb-4">auto_awesome</span>
                <p className="text-sm text-on-surface/60 font-medium mb-2">告訴 AI 你想要什麼修改</p>
                <p className="text-xs text-on-surface/30">例如：「把背景改成漸層色」、「加一個按鈕」、「改成暗色主題」</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-md'
                    : 'bg-surface-container-high text-on-surface rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' ? formatAssistantMessage(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-error-container text-on-error-container text-xs rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {hasActiveProvider && (
            <div className="p-3 border-t border-outline-variant/10 bg-surface-container-lowest shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="描述你想要的修改..."
                  className="flex-1 bg-surface-container-high text-on-surface text-sm rounded-xl px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-on-surface/30"
                  style={{ maxHeight: '100px', overflowY: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 bg-primary text-on-primary rounded-xl flex items-center justify-center hover:bg-primary-fixed transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Preview Panel ── */}
      <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-surface-container-lowest`}>
        {/* Preview Header */}
        <div className="px-6 py-3 border-b border-outline-variant/10 flex items-center gap-4 bg-surface shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <span className="material-symbols-outlined text-primary text-sm">edit_note</span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-on-surface p-0 w-64 outline-none"
              placeholder="Remix 標題"
            />
          </div>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !title.trim() || !code}
            className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-fixed text-on-primary text-xs font-mono font-bold rounded-lg shadow-lg shadow-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">publish</span>
            {isPublishing ? '發布中...' : '發布 Remix'}
          </button>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 relative p-4 lg:p-8">
          <div className="w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-outline-variant/20 relative">
            {previewDoc ? (
              <iframe
                srcDoc={previewDoc}
                className="w-full h-full border-none absolute inset-0 bg-white"
                title="Remix Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-on-surface/20">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl mb-3 block">preview</span>
                  <p className="text-sm font-mono">預覽區域</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper: Format assistant messages (hide raw code blocks, show explanation) ──
function formatAssistantMessage(content: string): React.ReactNode {
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          return (
            <div key={i} className="my-2 bg-surface-container-lowest rounded-lg px-3 py-2 border border-outline-variant/10">
              <div className="flex items-center gap-2 text-[10px] font-mono text-primary/60">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                程式碼已自動套用至預覽
              </div>
            </div>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
