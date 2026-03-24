import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAIKeyStore } from '../lib/aiKeyStore';
import { chatWithAI, ChatMessage, AIServiceError } from '../lib/aiService';

type ChatProvider = 'gemini' | 'openai' | 'minimax';

const CHAT_PROVIDER_LABEL: Record<ChatProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  minimax: 'MiniMax',
};

export default function AIChat() {
  const navigate = useNavigate();
  const { keys, validated, initialized, initialize, getUsage, dailyLimits } = useAIKeyStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ChatProvider | ''>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChatProviders = (['gemini', 'openai', 'minimax'] as const).filter(
    p => !!keys[p] && !!validated[p]
  );

  // Auto-select first active provider
  useEffect(() => {
    if (initialized) {
      if (activeChatProviders.length === 0) {
        setSelectedProvider('');
        return;
      }
      if (!selectedProvider || !activeChatProviders.includes(selectedProvider)) {
        setSelectedProvider(activeChatProviders[0]);
      }
    }
  }, [initialized, selectedProvider, activeChatProviders]);

  const hasActiveProvider = !!selectedProvider;
  const todayUsage = selectedProvider ? getUsage(selectedProvider) : 0;
  const limit = selectedProvider ? (dailyLimits[selectedProvider] || 0) : 0;

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
      const systemPrompt: ChatMessage = {
        role: 'system',
        content: '你是 VibeBot，VibeJam 平台的 AI 助理。你善於回答關於網頁開發、創意程式設計、HTML/CSS/JS 的問題。回答時保持友善、簡潔，並在適當時提供程式碼範例。使用繁體中文回答。',
      };
      const response = await chatWithAI(selectedProvider, [systemPrompt, ...newMessages]);
      setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
    } catch (err) {
      if (err instanceof AIServiceError) {
        setError(err.message);
      } else {
        setError('發生未知錯誤，請稍後再試。');
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto md:ml-16 md:mr-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">smart_toy</span>
            <h2 className="font-semibold font-headline text-on-surface">VibeBot Chat</h2>
            {hasActiveProvider && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-semibold">
                Active: {CHAT_PROVIDER_LABEL[selectedProvider]}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Provider selector */}
          <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-2.5 py-1.5 border border-outline-variant/10">
            <span className="material-symbols-outlined text-sm text-on-surface-variant">toggle_on</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as ChatProvider)}
              className="bg-transparent text-xs font-semibold text-on-surface focus:outline-none"
              disabled={activeChatProviders.length === 0}
              title={activeChatProviders.length === 0 ? '尚無有效 API，請先到設定頁測試通過' : '切換目前使用中的 API'}
            >
              {activeChatProviders.length === 0 ? (
                <option value="">無有效 API</option>
              ) : (
                activeChatProviders.map((p) => (
                  <option key={p} value={p}>{CHAT_PROVIDER_LABEL[p]}</option>
                ))
              )}
            </select>
          </div>

          {/* Usage indicator */}
          {hasActiveProvider && (
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">analytics</span>
              {todayUsage}{limit > 0 ? `/${limit}` : ''}
            </span>
          )}

          {/* Settings link */}
          <button onClick={() => navigate('/settings')} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" title="AI 設定">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">settings</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
        {!hasActiveProvider ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">key</span>
            <div>
              <p className="text-on-surface font-semibold mb-1">尚無有效 API</p>
              <p className="text-sm text-on-surface-variant">請到設定頁儲存並測試通過至少一把 API Key，才會出現在下拉選單。</p>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="px-5 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              前往設定
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <span className="material-symbols-outlined text-6xl text-primary/30">smart_toy</span>
            <div>
              <p className="text-on-surface font-semibold mb-1">嗨！我是 VibeBot 🎵</p>
              <p className="text-sm text-on-surface-variant">問我任何關於網頁開發、CSS 動畫、JS 的問題！</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {['如何做一個炫酷的 CSS 動畫？', '教我用 Canvas 畫粒子效果', '怎麼做玻璃質感的 UI？'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 bg-surface-container-low border border-outline-variant/10 rounded-full text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-on-primary rounded-br-sm'
                  : 'bg-surface-container-low border border-outline-variant/10 text-on-surface rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-error-container/20 border border-error/20 rounded-lg px-4 py-2 text-sm text-error flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {hasActiveProvider && (
        <div className="px-6 pb-4 pt-2 border-t border-outline-variant/10">
          <div className="flex items-end gap-2 bg-surface-container-low border border-outline-variant/10 rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入訊息... (Enter 送出，Shift+Enter 換行)"
              rows={1}
              className="flex-1 bg-transparent border-none text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none resize-none max-h-32 py-1.5 px-2"
              style={{ minHeight: '36px' }}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
