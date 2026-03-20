import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAIKeyStore, AI_PROVIDERS } from '../lib/aiKeyStore';
import { chatWithAI, ChatMessage, AIServiceError } from '../lib/aiService';

export default function AIChat() {
  const navigate = useNavigate();
  const { keys, initialized, initialize, getUsage, dailyLimits } = useAIKeyStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai' | 'minimax'>('gemini');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-select first available provider
  useEffect(() => {
    if (initialized) {
      if (keys['gemini']) setSelectedProvider('gemini');
      else if (keys['openai']) setSelectedProvider('openai');
    }
  }, [initialized, keys]);

  const hasKey = !!keys[selectedProvider];
  const todayUsage = getUsage(selectedProvider);
  const limit = dailyLimits[selectedProvider] || 0;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

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
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto md:ml-64 md:mr-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">smart_toy</span>
            <h2 className="font-semibold font-headline text-on-surface">VibeBot Chat</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Provider selector */}
          <div className="flex items-center bg-surface-container-low rounded-lg p-0.5">
            {(['gemini', 'openai', 'minimax'] as const).map(p => (
              <button
                key={p}
                onClick={() => setSelectedProvider(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedProvider === p
                    ? 'bg-surface-container-high text-primary'
                    : keys[p]
                      ? 'text-on-surface-variant hover:text-on-surface'
                      : 'text-on-surface-variant/30 cursor-not-allowed'
                }`}
                disabled={!keys[p]}
                title={keys[p] ? '' : '未設定 API Key'}
              >
                {p === 'gemini' ? 'Gemini' : p === 'openai' ? 'OpenAI' : 'MiniMax'}
              </button>
            ))}
          </div>

          {/* Usage indicator */}
          {hasKey && (
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
        {!hasKey ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">key</span>
            <div>
              <p className="text-on-surface font-semibold mb-1">尚未設定 API Key</p>
              <p className="text-sm text-on-surface-variant">前往設定頁面輸入你的 AI 服務金鑰，即可開始對話。</p>
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
      {hasKey && (
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
