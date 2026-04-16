import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, User } from '../lib/api';
import { useAIKeyStore, AI_PROVIDER_MODELS } from '../lib/aiKeyStore';
import { chatWithAIStream, ChatMessage, AIServiceError } from '../lib/aiService';
import { extractCodeFromAIResponse, extractPartialCode, generatePreviewDoc } from '../lib/codeUtils';
import BeaverKitAPIGuide from '../components/BeaverKitAPIGuide';

type ChatProvider = 'gemini' | 'openai' | 'minimax';
type MobileTab = 'chat' | 'code' | 'preview';
type RightTab = 'code' | 'preview';
type ViewMode = 'desktop' | 'mobile';

const CHAT_PROVIDER_LABEL: Record<ChatProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  minimax: 'MiniMax',
};

const PRESET_PROMPTS = [
  { icon: 'palette', text: '把整體視覺改得更精緻' },
  { icon: 'animation', text: '加入更明顯的動態效果' },
  { icon: 'ads_click', text: '加一個更清楚的 CTA 按鈕' },
];

interface RemixStudioProps {
  currentUser?: User;
}

interface RemixState {
  parentVibeId: number;
  code: string;
  title: string;
  authorName: string;
  versionNumber: number;
  parentVisibility?: 'public' | 'unlisted' | 'private';
}

export default function RemixStudio({ currentUser }: RemixStudioProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const remixFrom = location.state as RemixState | undefined;

  const { keys, validated, initialized, initialize, getUsage, dailyLimits } = useAIKeyStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ChatProvider | ''>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [code, setCode] = useState(remixFrom?.code || '');
  const [title, setTitle] = useState(remixFrom ? `Remix of ${remixFrom.title}` : '');
  const [isPublishing, setIsPublishing] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [rightTab, setRightTab] = useState<RightTab>('code');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [showApiGuidePopup, setShowApiGuidePopup] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isManualEditMode, setIsManualEditMode] = useState(false);
  const [highlightEditBtn, setHighlightEditBtn] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [codeEditorScrollTop, setCodeEditorScrollTop] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const splitPercentRef = useRef(40);
  const isDraggingRef = useRef(false);
  const autoScrollEnabledRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const parentVisibility = remixFrom?.parentVisibility || 'public';
  const visibilityLocked = parentVisibility === 'private';
  const defaultVisibility: 'public' | 'unlisted' | 'private' =
    parentVisibility === 'private' ? 'private' :
    parentVisibility === 'unlisted' ? 'unlisted' : 'public';
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>(defaultVisibility);

  const activeChatProviders = (['gemini', 'openai', 'minimax'] as const).filter(
    p => !!keys[p] && !!validated[p]
  );

  const hasActiveProvider = !!selectedProvider;
  const todayUsage = selectedProvider ? getUsage(selectedProvider) : 0;
  const limit = selectedProvider ? (dailyLimits[selectedProvider] || 0) : 0;
  const previewDoc = useMemo(() => generatePreviewDoc(code), [code]);

  useEffect(() => {
    if (!remixFrom) navigate('/');
  }, [remixFrom, navigate]);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  useEffect(() => {
    if (!autoScrollEnabledRef.current) return;
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!loading) return;
    const el = codeEditorRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [code, loading]);

  useEffect(() => {
    if (!initialized) return;
    if (activeChatProviders.length === 0) {
      setSelectedProvider('');
      return;
    }
    if (!selectedProvider || !activeChatProviders.includes(selectedProvider as ChatProvider)) {
      setSelectedProvider(activeChatProviders[0]);
    }
  }, [initialized, selectedProvider, activeChatProviders]);

  useEffect(() => {
    if (!selectedProvider) return;
    const models = AI_PROVIDER_MODELS[selectedProvider];
    setSelectedModel(models?.[0]?.id || '');
  }, [selectedProvider]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !splitContainerRef.current || !leftPanelRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const percent = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
      splitPercentRef.current = percent;
      leftPanelRef.current.style.width = `${percent}%`;
    };
    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

  const buildSystemPrompt = (): ChatMessage => ({
    role: 'system',
    content: `你是 BeaverBot，BeaverKit 平台的 AI 程式碼助理。使用者正在 remix 一個專案。

你的任務：
1. 根據使用者的指令修改程式碼
2. 回覆時必須包含完整的修改後程式碼，用 \`\`\`html（或 \`\`\`tsx / \`\`\`vue 視框架而定）包裹
3. 在程式碼區塊之前或之後，簡短說明你做了什麼修改
4. 不要只給部分程式碼或 diff，必須給出完整可執行的程式碼

【視窗尺寸規範 — 必須遵守】
BeaverKit 預覽視窗基準解析度為 1280×720（16:9）。
- 所有生成的程式碼，必須在 <head> 的 <style> 最開頭加入以下 CSS，確保在任何螢幕大小都能完美呈現：
  html, body { width: 1280px; height: 720px; margin: 0; transform-origin: top left; transform: scale(calc(100vw / 1280)); }
- 若專案使用 canvas，設定 width=1280 height=720
- 不要使用固定的其他像素尺寸（如 800px、600px）作為根元素寬高

以下是目前的完整程式碼：

\`\`\`
${code}
\`\`\`

請根據使用者的指示修改上述程式碼。使用繁體中文回答。`,
  });

  const handleEditorClick = () => {
    if (!isManualEditMode) {
      setHighlightEditBtn(true);
      setTimeout(() => setHighlightEditBtn(false), 1000);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading || !selectedProvider) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    const controller = new AbortController();

    setError('');
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    try {
      let accumulated = '';
      await chatWithAIStream(
        selectedProvider,
        [buildSystemPrompt(), ...newMessages.slice(-10)],
        (_chunk, full) => {
          accumulated = full;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: full };
            return updated;
          });
          const complete = extractCodeFromAIResponse(full);
          if (complete) {
            setCode(complete);
            setHighlightedLine(complete.split('\n').length - 1);
            return;
          }
          const partial = extractPartialCode(full);
          if (partial) {
            setCode(partial);
            setHighlightedLine(partial.split('\n').length - 1);
          }
        },
        { maxTokens: 8192, model: selectedModel || undefined, signal: controller.signal }
      );

      const finalCode = extractCodeFromAIResponse(accumulated);
      if (finalCode) setCode(finalCode);
    } catch (err) {
      setMessages(prev => prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev);
      if (controller.signal.aborted) return;
      if (err instanceof AIServiceError) {
        setError(err.message);
      } else {
        setError('發生未知錯誤，請稍後再試。');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
      setHighlightedLine(null);
    }
  };

  const handleStopAI = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setHighlightedLine(null);
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
        visibility,
      });
      if (currentUser) {
        navigate(`/p/${result.id}`, { state: { fromRemixOf: remixFrom.parentVibeId } });
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

  if (!remixFrom) return null;

  return (
    <main className="md:ml-[var(--app-sidebar-width)] flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background transition-[margin] duration-300">
      <div className="bg-surface px-4 py-1.5 flex items-center gap-3 border-b border-outline-variant/10 shrink-0 relative">
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          {isTitleEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setIsTitleEditing(false)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.preventDefault();
                  setIsTitleEditing(false);
                }
              }}
              className="bg-transparent border-b border-primary text-base font-semibold text-on-surface outline-none text-center w-48 pb-0.5 placeholder:text-on-surface/30 placeholder:font-normal placeholder:italic"
              placeholder="未命名 Remix"
              autoFocus
            />
          ) : (
            <button
              className="cursor-text group flex items-center px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
              onClick={() => {
                setIsTitleEditing(true);
                setTimeout(() => titleInputRef.current?.select(), 0);
              }}
              title="點擊編輯專案名稱"
            >
              <span className="material-symbols-outlined text-[14px] text-on-surface/30 group-hover:text-primary/60 mr-1.5 transition-colors">edit</span>
              <span className={`text-base font-semibold mb-[1px] transition-colors ${title ? 'text-on-surface group-hover:text-primary' : 'text-on-surface/30 group-hover:text-primary/50 italic font-normal'}`}>
                {title || '點此命名 Remix...'}
              </span>
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {rightTab === 'code' && (
            <div className="hidden md:flex items-center gap-1.5 bg-surface-container-low text-on-surface text-[11px] font-bold uppercase tracking-wider rounded px-2.5 py-1 border border-outline-variant/20">
              <span className="material-symbols-outlined text-[13px] text-primary">fork_right</span>
              Remix Mode
            </div>
          )}

          {rightTab === 'preview' && (
            <div className="hidden md:flex items-center gap-0.5">
              <button
                onClick={() => setViewMode('desktop')}
                title="桌面"
                className={`material-symbols-outlined text-[16px] p-1 rounded transition-colors ${viewMode === 'desktop' ? 'text-primary' : 'text-on-surface/40 hover:text-primary'}`}
              >desktop_windows</button>
              <button
                onClick={() => setViewMode('mobile')}
                title="手機"
                className={`material-symbols-outlined text-[16px] p-1 rounded transition-colors ${viewMode === 'mobile' ? 'text-primary' : 'text-on-surface/40 hover:text-primary'}`}
              >smartphone</button>
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={isPublishing || !title.trim() || !code}
            className="flex items-center justify-center gap-1.5 h-8 px-4 bg-[#2665fd] hover:bg-[#1e50cf] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">{isPublishing ? 'hourglass_empty' : 'rocket_launch'}</span>
            <span>{isPublishing ? '發布中...' : '發布 Remix'}</span>
          </button>
        </div>
      </div>

      <div className="bg-surface px-4 py-1 flex items-center gap-2 border-b border-outline-variant/10 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold shrink-0">From</span>
        <span className="material-symbols-outlined text-[13px] text-primary shrink-0">fork_right</span>
        <button
          onClick={() => navigate(`/p/${remixFrom.parentVibeId}`)}
          className="text-xs text-primary hover:text-primary/80 transition-colors truncate"
        >
          {remixFrom.title}
        </button>
        <span className="text-xs text-on-surface/35 truncate">by {remixFrom.authorName}</span>
        {visibilityLocked && (
          <span className="ml-auto text-[10px] text-on-surface/25 shrink-0">原作為私有，Remix 只能維持私有</span>
        )}
      </div>

      <div className="flex md:hidden border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'chat' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">smart_toy</span>
          AI Chat
        </button>
        <button
          onClick={() => { setMobileTab('code'); setRightTab('code'); }}
          className={`flex-1 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'code' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">code</span>
          Code
        </button>
        <button
          onClick={() => { setMobileTab('preview'); setRightTab('preview'); }}
          className={`flex-1 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'preview' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">preview</span>
          Preview
        </button>
      </div>

      <div ref={splitContainerRef} className="flex-1 flex overflow-hidden flex-col md:flex-row relative md:p-3 md:gap-3">
        <div
          ref={leftPanelRef}
          className={`${mobileTab !== 'chat' ? 'hidden' : 'flex'} md:flex w-full flex-col bg-surface-container-low shrink-0 relative group transition-all duration-300 md:rounded-xl md:shadow-lg ${!isAiSidebarOpen ? 'md:hidden' : ''}`}
          style={{ width: `${splitPercentRef.current}%`, minWidth: '280px' }}
        >
          <button
            onClick={() => setIsAiSidebarOpen(false)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-surface-container border border-white/10 rounded-r-lg hidden md:flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant z-20 transition-all shadow-md opacity-0 group-hover:opacity-100"
            title="收合側邊欄"
          >
            <span className="material-symbols-outlined text-[14px]">chevron_left</span>
          </button>

          {activeChatProviders.length > 0 ? (
            <div className="px-3 py-2 border-b border-outline-variant/5 flex items-center gap-2 shrink-0 bg-surface-container-lowest/50">
              {activeChatProviders.length > 1 ? (
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as ChatProvider)}
                  className="bg-surface-container-high text-on-surface text-[11px] font-medium rounded-lg px-2 py-1 border border-outline-variant/10 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                >
                  {activeChatProviders.map(p => (
                    <option key={p} value={p}>{CHAT_PROVIDER_LABEL[p]}</option>
                  ))}
                </select>
              ) : (
                <span className="px-2 py-1 bg-primary/10 text-primary text-[11px] font-semibold rounded-lg border border-primary/15">
                  {CHAT_PROVIDER_LABEL[activeChatProviders[0]]}
                </span>
              )}
              {selectedProvider && AI_PROVIDER_MODELS[selectedProvider as ChatProvider] && (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="flex-1 bg-surface-container-high text-on-surface/70 text-[11px] rounded-lg px-2 py-1 border border-outline-variant/10 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer truncate"
                >
                  {AI_PROVIDER_MODELS[selectedProvider as ChatProvider]!.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              )}
              {selectedProvider && limit > 0 && (
                <span className="text-[10px] font-mono text-on-surface/30 shrink-0">
                  {todayUsage}/{limit}
                </span>
              )}
            </div>
          ) : (
            <div className="px-4 py-2 border-b border-outline-variant/5 shrink-0 bg-surface-container-lowest/50">
              <p className="text-[10px] font-mono text-on-surface/30 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[11px] mr-1 align-middle">key</span>
                請先設定 AI API Key
              </p>
            </div>
          )}

          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 hide-scrollbar"
            style={{ minHeight: 0 }}
            onScroll={e => {
              const el = e.currentTarget;
              autoScrollEnabledRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            {!hasActiveProvider && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <span className="material-symbols-outlined text-3xl text-on-surface/15 mb-2">key</span>
                <p className="text-xs text-on-surface/30 mb-3">尚未設定 AI API Key</p>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-primary-fixed transition-colors"
                >
                  前往設定
                </button>
              </div>
            )}

            {hasActiveProvider && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <span className="material-symbols-outlined text-4xl text-primary/20 mb-3">auto_awesome</span>
                <p className="text-xs text-on-surface/50 font-medium mb-1">告訴 AI 你想要什麼</p>
                <p className="text-[10px] text-on-surface/25">例如：「幫我做一個計時器」、「加入動畫效果」</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2.5 whitespace-pre-wrap leading-relaxed border ${msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-none border-primary/30 shadow-sm'
                    : 'bg-surface-container-high text-on-surface rounded-tl-none border-outline-variant/5 shadow-sm'
                    }`}
                >
                  {msg.role === 'assistant' ? formatAssistantMessage(msg.content, loading && i === messages.length - 1) : msg.content}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="bg-surface-container-high rounded-2xl rounded-tl-none px-3 py-2.5 border border-outline-variant/5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <img src="/Icon.png" alt="" className="w-3.5 h-3.5 rounded-full opacity-50" />
                    <span className="text-xs font-mono thinking-shimmer-text">thinking</span>
                    <span className="flex items-end gap-[3px]">
                      <span className="thinking-dot w-1 h-1 rounded-full bg-primary/70" />
                      <span className="thinking-dot w-1 h-1 rounded-full bg-primary/70" />
                      <span className="thinking-dot w-1 h-1 rounded-full bg-primary/70" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-error-container text-on-error-container text-[10px] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {hasActiveProvider && messages.length === 0 && (
            <div className="px-3 pb-2 flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
              {PRESET_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.text)}
                  className="whitespace-nowrap px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/10 text-on-surface/60 text-[11px] hover:text-on-surface hover:border-primary/30 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[12px]">{p.icon}</span>
                  {p.text}
                </button>
              ))}
            </div>
          )}

          {hasActiveProvider && (
            <div className="p-3 border-t border-outline-variant/5 shrink-0">
              <div className="flex items-end bg-background rounded-xl shadow-inner overflow-hidden">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="輸入需求..."
                  className="flex-1 bg-transparent text-on-surface px-3 py-2.5 resize-none outline-none placeholder:text-on-surface/30"
                  style={{ maxHeight: '80px', overflowY: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                  }}
                />
                {loading ? (
                  <button
                    onClick={handleStopAI}
                    title="停止生成"
                    className="w-9 h-9 m-1 bg-error/80 text-white rounded-lg flex items-center justify-center hover:bg-error transition-colors shrink-0 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[15px]">stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="w-9 h-9 m-1 bg-primary text-on-primary rounded-lg flex items-center justify-center hover:bg-primary-fixed transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="hidden md:flex w-1.5 cursor-col-resize items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors group shrink-0 select-none"
          onMouseDown={() => {
            isDraggingRef.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          <div className="w-0.5 h-8 bg-outline-variant/20 rounded-full group-hover:bg-primary/40 group-active:bg-primary/60 transition-colors"></div>
        </div>

        {!isAiSidebarOpen && (
          <button
            onClick={() => setIsAiSidebarOpen(true)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-surface-container border border-white/10 rounded-r-lg items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-all shadow-md ml-0"
            title="展開 AI 助手"
          >
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        )}

        <section className={`${mobileTab === 'chat' ? 'hidden' : 'flex'} md:flex flex-1 flex-col bg-background overflow-hidden relative md:rounded-xl md:shadow-lg`}>
          <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-20 items-center gap-1.5 bg-surface-container p-1 rounded-lg shadow-lg">
            <button
              onClick={() => setRightTab('code')}
              className={`px-6 py-1.5 rounded-md font-medium text-sm flex items-center gap-2 transition-colors ${rightTab === 'code' ? 'bg-white/10 text-on-surface shadow-sm' : 'text-on-surface/40 hover:text-on-surface/70'}`}
            >
              <span className="material-symbols-outlined text-[16px]">code</span>
              Code
            </button>
            <button
              onClick={() => setRightTab('preview')}
              className={`px-6 py-1.5 rounded-md font-medium text-sm flex items-center gap-2 transition-colors ${rightTab === 'preview' ? 'bg-white/10 text-on-surface shadow-sm' : 'text-on-surface/40 hover:text-on-surface/70'}`}
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              Preview
            </button>
            <button
              onClick={() => setShowApiGuidePopup(!showApiGuidePopup)}
              title="BeaverKit API 說明"
              className="flex items-center justify-center w-7 h-7 rounded-md text-on-surface/30 hover:text-on-surface hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">info</span>
            </button>
          </div>

          {rightTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              <div className="flex items-center justify-between bg-[#1e1e1e] border-b border-outline-variant/10 px-4 h-10 shrink-0 select-none mt-14 mx-4 md:mx-6 rounded-t-xl overflow-hidden shadow-sm">
                <div className="flex bg-[#1e1e1e] text-xs h-full">
                  <div className="px-4 h-full flex items-center gap-2 border-b-2 border-primary bg-[#1e1e1e] text-on-surface font-medium">
                    <span className="material-symbols-outlined text-[14px] text-primary">html</span>
                    index.html
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsManualEditMode(!isManualEditMode);
                      setHighlightEditBtn(false);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all duration-300 ${isManualEditMode ? 'bg-primary/20 text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'} ${highlightEditBtn ? 'bg-yellow-500/20 text-yellow-300 ring-2 ring-yellow-500/50 scale-105' : ''}`}
                    title={isManualEditMode ? '切換回保護模式' : '開啟手動編輯 (防呆)'}
                  >
                    <span className="material-symbols-outlined text-[14px]">{isManualEditMode ? 'edit' : 'edit_off'}</span>
                    <span className="text-[11px]">{isManualEditMode ? '編輯中' : '唯讀保護'}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 font-mono text-sm leading-relaxed editor-well overflow-hidden flex relative group cursor-text mb-4 mx-4 md:mx-6 rounded-b-xl border border-outline-variant/10 bg-[#1e1e1e] shadow-lg" onClick={handleEditorClick}>
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-surface-container-lowest border-r border-outline-variant/5 text-right py-4 pr-2 text-on-surface/20 select-none hidden sm:block">
                  {code.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={codeEditorRef}
                  value={code}
                  readOnly={!isManualEditMode}
                  onChange={e => setCode(e.target.value)}
                  onScroll={e => setCodeEditorScrollTop((e.target as HTMLTextAreaElement).scrollTop)}
                  placeholder="把 AI 生成的程式碼貼在這裡"
                  className="flex-1 w-full bg-transparent p-4 sm:pl-12 py-4 font-mono text-sm text-on-surface outline-none resize-none hide-scrollbar placeholder:text-on-surface/20 whitespace-pre"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {rightTab === 'preview' && (
            <div className="flex-1 px-4 pb-4 md:px-6 md:pb-6 bg-background flex items-center justify-center overflow-hidden mt-14">
              {viewMode === 'mobile' ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="relative flex flex-col shadow-2xl" style={{ width: '375px', height: '667px' }}>
                    <div className="absolute inset-0 rounded-[40px] overflow-hidden border-[10px] border-[#2A2A2A] bg-[#2A2A2A] flex flex-col">
                      <div className="h-7 bg-[#1A1A1A] flex items-center justify-between px-5 shrink-0">
                        <span className="text-[10px] text-white/60 font-mono">9:41</span>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px] text-white/60">signal_cellular_alt</span>
                          <span className="material-symbols-outlined text-[11px] text-white/60">wifi</span>
                          <span className="material-symbols-outlined text-[11px] text-white/60">battery_full</span>
                        </div>
                      </div>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1A1A1A] rounded-b-2xl z-10"></div>
                      <div className="flex-1 relative overflow-hidden bg-white">
                        {previewDoc ? (
                          <iframe srcDoc={previewDoc} className="absolute inset-0 w-full h-full border-none" title="Mobile Preview" sandbox="allow-scripts allow-same-origin allow-pointer-lock" />
                        ) : (
                          <div className="w-full h-full bg-[#050505] flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface/15 text-5xl">smartphone</span>
                          </div>
                        )}
                      </div>
                      <div className="h-6 bg-[#1A1A1A] flex items-center justify-center shrink-0">
                        <div className="w-24 h-1 rounded-full bg-white/30"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col rounded-xl shadow-xl overflow-hidden border border-white/5 transition-all duration-500">
                  <div className="bg-[#242424] px-4 py-2 flex items-center gap-3 shrink-0 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
                    </div>
                    <div className="flex-1 bg-[#1A1A1A] rounded-md px-3 py-1 flex items-center gap-2 max-w-sm mx-auto">
                      <span className="material-symbols-outlined text-[12px] text-on-surface/30">lock</span>
                      <span className="text-[11px] text-on-surface/40 font-mono">preview</span>
                    </div>
                  </div>
                  <div className="flex-1 relative bg-white overflow-hidden">
                    {previewDoc ? (
                      <iframe srcDoc={previewDoc} className="absolute inset-0 w-full h-full border-none" title="Live Preview" sandbox="allow-scripts allow-same-origin allow-pointer-lock" />
                    ) : (
                      <div className="w-full h-full bg-[#050505] flex items-center justify-center">
                        <div className="text-center">
                          <span className="material-symbols-outlined text-on-surface/10 text-5xl">preview</span>
                          <p className="text-[11px] text-on-surface/20 mt-2">尚無預覽內容</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {showApiGuidePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowApiGuidePopup(false)}>
          <div className="w-[640px] max-h-[80vh] bg-surface rounded-xl shadow-2xl overflow-hidden border border-outline-variant/20 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">api</span>
                <span className="text-sm font-bold text-on-surface">BeaverKit API 說明</span>
              </div>
              <button onClick={() => setShowApiGuidePopup(false)} className="text-on-surface/40 hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <BeaverKitAPIGuide compact />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function formatAssistantMessage(content: string, isStreaming = false): React.ReactNode {
  const parts = content.split(/(```[\s\S]*?```)/g);
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^```[\s\S]*```$/.test(part)) {
      nodes.push(
        <div key={i} className="my-1.5 bg-surface-container-lowest rounded px-2.5 py-1.5 border border-outline-variant/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary/80">
            <span className="material-symbols-outlined text-[11px] text-green-500">check_circle</span>
            程式碼已自動套用至編輯器
          </div>
        </div>
      );
    } else {
      const unclosedMatch = part.match(/```(?:\w+)?\n?([\s\S]*)$/);
      if (unclosedMatch) {
        const beforeCode = part.slice(0, unclosedMatch.index).trimEnd();
        if (beforeCode) nodes.push(<span key={i + 'before'}>{beforeCode}</span>);
        nodes.push(
          <div key={i + 'streaming'} className="my-1.5 bg-surface-container-lowest rounded px-2.5 py-1.5 border border-primary/30 shadow-sm flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary animate-pulse">
              <span className="material-symbols-outlined text-[11px] animate-spin text-primary">data_object</span>
              正在寫入右側編輯器...
            </div>
            <span className="flex items-end gap-[2px]">
              <span className="thinking-dot w-1 h-1 rounded-full bg-primary border-primary" />
              <span className="thinking-dot w-1 h-1 rounded-full bg-primary border-primary" />
              <span className="thinking-dot w-1 h-1 rounded-full bg-primary border-primary" />
            </span>
          </div>
        );
      } else {
        const stripped = part.trimEnd();
        if (stripped) nodes.push(<span key={i}>{stripped}</span>);
      }
    }
  }

  return (
    <>
      {nodes.length > 0 && <div className="mt-1 flex flex-col gap-2">{nodes}</div>}
      {isStreaming && nodes.length === 0 && (
        <div className="my-1.5 bg-surface-container-lowest rounded px-2.5 py-1.5 border border-primary/30 shadow-sm flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary animate-pulse">
            <span className="material-symbols-outlined text-[11px] animate-spin text-primary">data_object</span>
            正在寫入右側編輯器...
          </div>
        </div>
      )}
    </>
  );
}
