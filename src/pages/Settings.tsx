import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAIKeyStore, AI_PROVIDERS, AI_PROVIDER_MODELS, AIProvider } from '../lib/aiKeyStore';
import { chatWithAI, ChatMessage, AIServiceError } from '../lib/aiService';

type ChatProvider = 'gemini' | 'openai' | 'minimax';
const CHAT_PROVIDER_LABEL: Record<ChatProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  minimax: 'MiniMax',
};

export default function Settings() {
  const navigate = useNavigate();
  const {
    keys, testResults, testMessages, usage, dailyLimits,
    initialized, initialize,
    setKey, removeKey, testKey, setDailyLimit, getUsage,
    validated,
  } = useAIKeyStore();

  // ── API Key 管理狀態 ─────────────────────────────────────────────────
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [editingLimit, setEditingLimit] = useState<Record<string, string>>({});

  useEffect(() => { if (!initialized) initialize(); }, [initialized, initialize]);

  useEffect(() => {
    const vals: Record<string, string> = {};
    for (const p of AI_PROVIDERS) vals[p.id] = keys[p.id] || '';
    setInputValues(vals);
  }, [keys]);

  const handleSave = async (provider: AIProvider) => {
    const val = inputValues[provider]?.trim();
    if (val) await setKey(provider, val);
    else await removeKey(provider);
  };

  const handleTest = async (provider: AIProvider) => {
    const val = inputValues[provider]?.trim();
    if (val && val !== keys[provider]) await setKey(provider, val);
    await testKey(provider);
  };

  const handleLimitSave = (provider: AIProvider) => {
    const val = parseInt(editingLimit[provider], 10);
    setDailyLimit(provider, isNaN(val) ? 0 : val);
  };

  const getStatusColor = (provider: string) => {
    const s = testResults[provider];
    if (s === 'success') return 'bg-tertiary';
    if (s === 'error') return 'bg-error';
    if (s === 'testing') return 'bg-yellow-400 animate-pulse';
    return keys[provider] ? 'bg-on-surface/30' : 'bg-on-surface/10';
  };

  const getStatusText = (provider: string) => {
    const s = testResults[provider];
    if (s === 'success') return '已連線';
    if (s === 'error') return '連線失敗';
    if (s === 'testing') return '測試中...';
    return keys[provider] ? '已儲存' : '未設定';
  };

  const maskedKey = (key: string, show: boolean) => {
    if (!key) return '';
    if (show) return key;
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  };

  const totalUsage = AI_PROVIDERS.reduce((sum, p) => sum + getUsage(p.id), 0);
  const configuredCount = AI_PROVIDERS.filter(p => !!keys[p.id]).length;

  // ── AI Chat 狀態 ──────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ChatProvider | ''>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const activeChatProviders = (['gemini', 'openai', 'minimax'] as const).filter(
    p => !!keys[p] && !!validated[p]
  );

  useEffect(() => {
    if (initialized) {
      if (activeChatProviders.length === 0) { setSelectedProvider(''); return; }
      if (!selectedProvider || !activeChatProviders.includes(selectedProvider as ChatProvider)) {
        setSelectedProvider(activeChatProviders[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, keys, validated]);

  useEffect(() => {
    if (selectedProvider) {
      const models = AI_PROVIDER_MODELS[selectedProvider as ChatProvider];
      setSelectedModel(models?.[0]?.id || '');
    }
  }, [selectedProvider]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !selectedProvider) return;
    setChatError('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const systemPrompt: ChatMessage = {
        role: 'system',
        content: '你是 BeaverBot，BeaverKit 平台的 AI 助理。你善於回答關於網頁開發、AI API 設定、HTML/CSS/JS 的問題。回答時保持友善、簡潔，使用繁體中文。',
      };
      const response = await chatWithAI(selectedProvider as ChatProvider, [systemPrompt, ...newMessages], { model: selectedModel || undefined });
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
    } catch (err) {
      setChatError(err instanceof AIServiceError ? err.message : '發生未知錯誤');
    } finally {
      setChatLoading(false);
      chatInputRef.current?.focus();
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  };

  const hasActiveProvider = !!selectedProvider;
  const todayUsage = selectedProvider ? getUsage(selectedProvider as ChatProvider) : 0;
  const chatLimit = selectedProvider ? (dailyLimits[selectedProvider] || 0) : 0;

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="md:ml-16 flex h-[calc(100vh-64px)] overflow-hidden justify-center bg-background">
      <div className="flex w-full max-w-[1600px] gap-4 md:gap-6 p-4 md:p-6 overflow-hidden">

        {/* ══ 左欄：AI Chat ══════════════════════════════════════════════ */}
        <div className="hidden lg:flex flex-col flex-1 bg-surface-container-low border border-outline-variant/10 rounded-xl overflow-hidden shadow-sm">

          {/* Chat Header */}
        <div className="px-4 py-3 border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            <span className="text-sm font-bold text-on-surface">BeaverBot Chat</span>
            {hasActiveProvider && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-mono font-bold">
                {CHAT_PROVIDER_LABEL[selectedProvider as ChatProvider]}
              </span>
            )}
          </div>
          {/* Provider + Model selectors */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value as ChatProvider)}
              disabled={activeChatProviders.length === 0}
              className="flex-1 min-w-0 bg-surface-container-high border border-outline-variant/10 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-on-surface focus:outline-none"
            >
              {activeChatProviders.length === 0
                ? <option value="">尚無有效 API</option>
                : activeChatProviders.map(p => <option key={p} value={p}>{CHAT_PROVIDER_LABEL[p]}</option>)
              }
            </select>
            {selectedProvider && AI_PROVIDER_MODELS[selectedProvider as ChatProvider] && (
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="flex-1 min-w-0 bg-surface-container-high border border-outline-variant/10 rounded-lg px-2 py-1 text-[11px] font-mono text-on-surface focus:outline-none"
              >
                {AI_PROVIDER_MODELS[selectedProvider as ChatProvider]!.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            )}
            {hasActiveProvider && (
              <span className="text-[10px] font-mono text-on-surface/30 ml-auto shrink-0">
                {todayUsage}{chatLimit > 0 ? `/${chatLimit}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5" style={{ minHeight: 0 }}>
          {!hasActiveProvider ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
              <span className="material-symbols-outlined text-4xl text-on-surface/10">key</span>
              <p className="text-xs text-on-surface/40">儲存並測試通過 API Key 後即可使用</p>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-3">
              <span className="material-symbols-outlined text-4xl text-primary/20">smart_toy</span>
              <p className="text-xs text-on-surface/50 font-medium">嗨！我是 BeaverBot</p>
              <p className="text-[11px] text-on-surface/30">問我任何關於 API 設定或網頁開發的問題</p>
              <div className="flex flex-col gap-1.5 w-full mt-1">
                {['如何使用 Gemini API？', '怎麼做 CSS 動畫？', '推薦的 AI 模型？'].map(q => (
                  <button
                    key={q}
                    onClick={() => { setChatInput(q); chatInputRef.current?.focus(); }}
                    className="px-3 py-1.5 bg-surface-container-high border border-outline-variant/10 rounded-lg text-[11px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all text-left truncate"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-[20px] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-sm'
                    : 'bg-surface-container text-on-surface rounded-bl-sm border border-outline-variant/10'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-surface-container border border-outline-variant/10 rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          {chatError && (
            <div className="bg-error-container/20 border border-error/20 rounded-lg px-3 py-2 text-xs text-error">
              {chatError}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {hasActiveProvider && (
          <div className="p-4 border-t border-outline-variant/10 shrink-0">
            <div className="flex items-end gap-2 bg-surface-container border border-outline-variant/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition-all shadow-sm">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="有什麼我可以幫忙的嗎？..."
                rows={1}
                disabled={chatLoading}
                className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none resize-none pt-0.5"
                style={{ maxHeight: '120px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="w-8 h-8 bg-primary text-on-primary rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0 mb-0.5"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ 中欄：API Key 管理 ════════════════════════════════════════ */}
      <div className="flex flex-col w-full lg:w-[400px] xl:w-[460px] shrink-0 min-w-0">

        {/* Header */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-bold font-headline text-on-surface leading-tight">AI 設定中心</h1>
            <p className="text-xs text-on-surface-variant">管理 API Key，啟用平台所有 AI 功能</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-surface-container-low border border-outline-variant/10 rounded-lg px-3 py-1.5">
            <span className="text-lg font-bold font-headline text-tertiary">{configuredCount}</span>
            <span className="text-xs text-on-surface-variant">已設定</span>
            <div className="w-px h-4 bg-outline-variant/20 mx-1" />
            <span className="text-lg font-bold font-headline text-on-surface">{totalUsage}</span>
            <span className="text-xs text-on-surface-variant">今日呼叫</span>
          </div>
        </div>

        {/* ── 獨立滾動的 Provider 卡片區 ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1" style={{ minHeight: 0 }}>
          {AI_PROVIDERS.map((provider) => {
            const hasKey = !!keys[provider.id];
            const todayProvUsage = getUsage(provider.id);
            const limit = dailyLimits[provider.id] || 0;

            return (
              <div
                key={provider.id}
                className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 transition-all hover:border-outline-variant/20"
              >
                {/* Provider Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusColor(provider.id)}`} />
                    <h3 className="font-semibold text-on-surface font-headline text-sm">{provider.label}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                      {getStatusText(provider.id)}
                    </span>
                  </div>
                  {hasKey && (
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">analytics</span>
                      今日：{todayProvUsage}{limit > 0 ? `/${limit}` : ''} 次
                    </div>
                  )}
                </div>

                {/* Key Input */}
                <div className="flex gap-2 mb-2.5">
                  <div className="relative flex-1">
                    <input
                      type={visibility[provider.id] ? 'text' : 'password'}
                      className="w-full bg-surface-container-high border border-outline-variant/10 rounded-lg px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                      placeholder={provider.placeholder}
                      value={inputValues[provider.id] || ''}
                      onChange={e => setInputValues(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => setVisibility(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {visibility[provider.id] ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <button
                    onClick={() => handleSave(provider.id)}
                    className="px-4 py-2.5 bg-primary/10 text-primary text-sm font-semibold rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    儲存
                  </button>
                  {hasKey && (
                    <button
                      onClick={() => handleTest(provider.id)}
                      disabled={testResults[provider.id] === 'testing'}
                      className="px-4 py-2.5 bg-tertiary/10 text-tertiary text-sm font-semibold rounded-lg hover:bg-tertiary/20 transition-colors disabled:opacity-50"
                    >
                      測試
                    </button>
                  )}
                </div>

                {/* Error */}
                {testResults[provider.id] === 'error' && testMessages[provider.id] && (
                  <div className="flex items-start gap-2 mb-2.5 px-3 py-2 bg-error/8 border border-error/20 rounded-lg">
                    <span className="material-symbols-outlined text-error text-[14px] mt-0.5 shrink-0">error</span>
                    <p className="text-error text-xs font-mono break-all">{testMessages[provider.id]}</p>
                  </div>
                )}

                {/* Daily Limit + Usage Bar */}
                {hasKey && (
                  <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-outline-variant/5">
                    <span className="text-xs text-on-surface-variant shrink-0">每日上限：</span>
                    <input
                      type="number"
                      min="0"
                      className="w-20 bg-surface-container-high border border-outline-variant/10 rounded-md px-2 py-1 text-xs font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder="不限"
                      value={editingLimit[provider.id] ?? (limit || '')}
                      onChange={e => setEditingLimit(prev => ({ ...prev, [provider.id]: e.target.value }))}
                      onBlur={() => handleLimitSave(provider.id)}
                      onKeyDown={e => e.key === 'Enter' && handleLimitSave(provider.id)}
                    />
                    <span className="text-xs text-on-surface-variant/50 shrink-0">次（0 = 不限）</span>
                    {limit > 0 && (
                      <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${todayProvUsage >= limit ? 'bg-error' : 'bg-tertiary'}`}
                          style={{ width: `${Math.min((todayProvUsage / limit) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                    <button
                      onClick={() => { removeKey(provider.id); setInputValues(prev => ({ ...prev, [provider.id]: '' })); }}
                      className="ml-auto text-xs text-error/60 hover:text-error transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      移除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div className="h-2" />
        </div>
      </div>

      {/* ══ 右欄：Info Panels ════════════════════════════════════════ */}
      <div className="hidden xl:flex flex-col w-64 shrink-0 gap-3 overflow-y-auto custom-scrollbar" style={{ minHeight: 0 }}>

        {/* Usage Summary */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 shrink-0">
          <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
            使用概覽
          </h3>
          <div className="space-y-2">
            {AI_PROVIDERS.filter(p => !!keys[p.id]).map(p => {
              const u = getUsage(p.id);
              const lim = dailyLimits[p.id] || 0;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(p.id)}`} />
                  <span className="text-xs text-on-surface-variant flex-1 truncate">{p.label}</span>
                  <span className="text-xs font-mono text-on-surface">{u}{lim > 0 ? `/${lim}` : ''}</span>
                </div>
              );
            })}
            {configuredCount === 0 && (
              <p className="text-xs text-on-surface-variant/50 text-center py-2">尚未設定任何 Provider</p>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 shrink-0">
          <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-tertiary text-[18px]">shield</span>
            BYOK 安全模式
          </h3>
          <div className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
            {[
              { icon: 'lock', text: 'AES-256 加密儲存於本機 LocalStorage' },
              { icon: 'visibility_off', text: 'Key 不會傳送至伺服器' },
              { icon: 'swap_horiz', text: 'API 呼叫透過後端 Proxy 轉發' },
            ].map(({ icon, text }) => (
              <div key={icon} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-tertiary text-[13px] mt-0.5 shrink-0">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How to get keys */}
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 shrink-0">
          <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-primary text-[18px]">info</span>
            如何取得 API Key？
          </h3>
          <div className="space-y-2.5">
            {[
              { name: 'Google Gemini', url: 'aistudio.google.com', icon: 'auto_awesome' },
              { name: 'OpenAI', url: 'platform.openai.com/api-keys', icon: 'psychology' },
              { name: 'MiniMax', url: 'platform.minimaxi.com', icon: 'hub' },
            ].map(item => (
              <div key={item.name} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-[13px] mt-0.5 shrink-0">{item.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">{item.name}</p>
                  <p className="text-[10px] text-primary/70 break-all">{item.url}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
    </div>
  );
}
