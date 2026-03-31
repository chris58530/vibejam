import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, toSlug, User } from '../lib/api';
import { EditorMode, detectFramework, wrapReactForPreview, wrapVueForPreview, mergeCode, extractCodeFromAIResponse, extractPartialCode } from '../lib/codeUtils';
import { useAIKeyStore, AI_PROVIDER_MODELS } from '../lib/aiKeyStore';
import { useWorkspaceStore } from '../lib/workspaceStore';
import { chatWithAIStream, ChatMessage, AIServiceError } from '../lib/aiService';
import BeaverKitAPIGuide from '../components/BeaverKitAPIGuide';

// ── 存檔 ─────────────────────────────────────────────────────────────
interface SaveSlot {
  id: string;
  title: string;
  tags: string;
  editorMode: EditorMode;
  code: { html: string; css: string; js: string };
  savedAt: string;
}

const MAX_SAVES = 5;

// ─────────────────────────────────────────────────────────────────────
interface WorkspaceProps {
  currentUser?: User;
  savePanelOpen?: boolean;
}

type EditorTab = 'html' | 'css' | 'js';
type MobileTab = 'code' | 'chat' | 'preview';
type ChatProvider = 'gemini' | 'openai' | 'minimax';

const CHAT_PROVIDER_LABEL: Record<ChatProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  minimax: 'MiniMax',
};

// ── 模式設定 ─────────────────────────────────────────────────────────
const MODE_OPTIONS: { id: EditorMode; emoji: string; label: string; desc: string }[] = [
  { id: 'single', emoji: '📋', label: '直接貼上', desc: '把 AI 給你的整段程式碼貼入' },
  { id: 'split', emoji: '🔧', label: '分開編輯', desc: '自行分開撰寫 HTML、CSS、JS' },
  { id: 'react', emoji: '⚛️', label: 'React 元件', desc: '支援 JSX + Tailwind + lucide' },
  { id: 'vue', emoji: '💚', label: 'Vue 元件', desc: '支援 Vue 3 SFC 單檔元件' },
];

// ─────────────────────────────────────────────────────────────────────
export default function Workspace({ currentUser, savePanelOpen = false }: WorkspaceProps) {
  const navigate = useNavigate();
  const { setPublishFn, setIsPublishing: setStoreIsPublishing } = useWorkspaceStore();

  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [activeTab, setActiveTab] = useState<EditorTab>('html');

  const [editorMode, setEditorMode] = useState<EditorMode>('single');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toast 通知
  const [toast, setToast] = useState<{ show: boolean; message: string; icon: string }>({ show: false, message: '', icon: 'auto_awesome' });

  const isReactMode = editorMode === 'react';
  const isVueMode = editorMode === 'vue';
  const isSplitMode = editorMode === 'split';

  const [title, setTitle] = useState('Untitled Project');
  const [tags, setTags] = useState('');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'round'>('desktop');
  const [isPublishing, setIsPublishing] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('code');

  // API 說明面板
  const [showApiGuide, setShowApiGuide] = useState(false);

  // ── 存檔 ───────────────────────────────────────────────────────────
  const [saves, setSaves] = useState<SaveSlot[]>([]);

  const saveKey = `beaverkit_saves_${currentUser?.id ?? 'guest'}`;

  useEffect(() => {
    document.body.style.overflowY = 'hidden';
    return () => { document.body.style.overflowY = ''; };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(saveKey);
      if (stored) setSaves(JSON.parse(stored));
    } catch { }
  }, [saveKey]);

  // 從 Profile 頁的存檔「前往 Workspace 載入」傳遞進來
  useEffect(() => {
    const pending = sessionStorage.getItem('beaverkit_pending_load');
    if (!pending) return;
    try {
      const slot = JSON.parse(pending) as SaveSlot;
      setTitle(slot.title);
      setTags(slot.tags);
      setEditorMode(slot.editorMode);
      setHtmlCode(slot.code.html);
      setCssCode(slot.code.css);
      setJsCode(slot.code.js);
      setActiveTab('html');
      sessionStorage.removeItem('beaverkit_pending_load');
      showToast(`已載入「${slot.title}」`, 'download');
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCode = activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode;

  // 點擊外部關閉下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (message: string, icon = 'auto_awesome') => {
    setToast({ show: true, message, icon });
    setTimeout(() => setToast({ show: false, message: '', icon: 'auto_awesome' }), 3000);
  };

  // ── iframe ref + BeaverKit API postMessage bridge ────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { keys, validated, initialized: aiInitialized, initialize: initializeAI, getUsage, dailyLimits, getKey } = useAIKeyStore();

  useEffect(() => {
    if (!aiInitialized) initializeAI();
  }, [aiInitialized, initializeAI]);

  useEffect(() => {
    const userId = currentUser?.id ?? 'guest';
    const handleMsg = (e: MessageEvent) => {
      const d = e.data;
      if (typeof d?.type !== 'string' || !d.type.startsWith('beaverkit:')) return;
      const win = iframeRef.current?.contentWindow;
      if (!win) return;

      if (d.type === 'beaverkit:save') {
        const k = `beaverkit_proj_${userId}_${d.key}`;
        try { localStorage.setItem(k, JSON.stringify(d.data)); } catch { /* storage full */ }
        win.postMessage({ type: 'beaverkit:save:ok', id: d.id, result: true }, '*');

      } else if (d.type === 'beaverkit:load') {
        const k = `beaverkit_proj_${userId}_${d.key}`;
        let result = null;
        try {
          const raw = localStorage.getItem(k);
          if (raw) result = JSON.parse(raw);
        } catch { /* corrupted */ }
        win.postMessage({ type: 'beaverkit:load:ok', id: d.id, result }, '*');

      } else if (d.type === 'beaverkit:getApiKey') {
        const apiKey = getKey(d.provider) ?? null;
        win.postMessage({ type: 'beaverkit:getApiKey:ok', id: d.id, result: apiKey }, '*');
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [currentUser?.id, getKey]);

  const previewDoc = useMemo(() => {
    if (!htmlCode && !cssCode && !jsCode) return '';
    if (isReactMode) return wrapReactForPreview(htmlCode);
    if (isVueMode) return wrapVueForPreview(htmlCode);
    return mergeCode(htmlCode, cssCode, jsCode);
  }, [isReactMode, isVueMode, htmlCode, cssCode, jsCode]);

  // ── 編輯器 onChange ────────────────────────────────────────────────
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (activeTab === 'html') {
      setHtmlCode(value);
      if (!value && (editorMode === 'react' || editorMode === 'vue')) setEditorMode('single');
    } else if (activeTab === 'css') {
      setCssCode(value);
    } else {
      setJsCode(value);
    }
  };

  // ── 貼上時自動偵測框架（靜默轉換 + toast）─────────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (activeTab !== 'html') return;
    const pasted = e.clipboardData.getData('text');
    const detected = detectFramework(pasted);

    if (detected !== 'single' && detected !== editorMode) {
      e.preventDefault();
      setHtmlCode(pasted);
      setEditorMode(detected);
      const label = MODE_OPTIONS.find(m => m.id === detected)?.label || detected;
      showToast(`已自動切換為 ${label} 模式`, 'auto_awesome');
    }
  };

  const handleModeChange = (mode: EditorMode) => {
    setEditorMode(mode);
    setActiveTab('html');
    setDropdownOpen(false);
    if (mode === 'single' || mode === 'react' || mode === 'vue') {
      setCssCode('');
      setJsCode('');
    }
  };

  // ── 發布 ───────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!title || !previewDoc) return;
    setIsPublishing(true);
    setStoreIsPublishing(true);
    try {
      await api.createVibe({
        title,
        tags,
        code: previewDoc,
        author_id: currentUser?.id,
        visibility,
      });
      if (currentUser) {
        navigate(`/@${currentUser.username}/${toSlug(title)}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
      setStoreIsPublishing(false);
    }
  };

  useEffect(() => {
    setPublishFn(handlePublish);
    return () => setPublishFn(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, previewDoc, currentUser]);

  // ── 存檔操作 ─────────────────────────────────────────────────────
  const handleSave = () => {
    const existing = saves.findIndex(s => s.title === title);
    let newSaves: SaveSlot[];

    if (existing !== -1) {
      newSaves = saves.map((s, i) =>
        i === existing
          ? { ...s, tags, editorMode, code: { html: htmlCode, css: cssCode, js: jsCode }, savedAt: new Date().toISOString() }
          : s
      );
      showToast(`已更新存檔「${title}」`, 'save');
    } else if (saves.length >= MAX_SAVES) {
      showToast(`存檔已滿 (5/5)，請先刪除一個`, 'folder_off');
      return;
    } else {
      const slot: SaveSlot = {
        id: Date.now().toString(),
        title,
        tags,
        editorMode,
        code: { html: htmlCode, css: cssCode, js: jsCode },
        savedAt: new Date().toISOString(),
      };
      newSaves = [slot, ...saves];
      showToast(`專案「${title}」已存檔 (${newSaves.length}/5)`, 'save');
    }

    setSaves(newSaves);
    localStorage.setItem(saveKey, JSON.stringify(newSaves));
  };

  const handleLoadSave = (slot: SaveSlot) => {
    setTitle(slot.title);
    setTags(slot.tags);
    setEditorMode(slot.editorMode);
    setHtmlCode(slot.code.html);
    setCssCode(slot.code.css);
    setJsCode(slot.code.js);
    setActiveTab('html');
    showToast(`已載入「${slot.title}」`, 'download');
  };

  const handleDeleteSave = (id: string) => {
    const newSaves = saves.filter(s => s.id !== id);
    setSaves(newSaves);
    localStorage.setItem(saveKey, JSON.stringify(newSaves));
  };

  const tabs = [
    { id: 'html' as EditorTab, label: 'HTML', icon: 'html' },
    { id: 'css' as EditorTab, label: 'CSS', icon: 'css' },
    { id: 'js' as EditorTab, label: 'JS', icon: 'javascript' },
  ];

  // ── AI Chat ────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ChatProvider | ''>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabledRef = useRef(true);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  const activeChatProviders = (['gemini', 'openai', 'minimax'] as const).filter(
    p => !!keys[p] && !!validated[p]
  );

  useEffect(() => {
    if (aiInitialized) {
      if (activeChatProviders.length === 0) { setSelectedProvider(''); return; }
      if (!selectedProvider || !activeChatProviders.includes(selectedProvider as ChatProvider)) {
        setSelectedProvider(activeChatProviders[0]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiInitialized, JSON.stringify(activeChatProviders)]);

  useEffect(() => {
    if (selectedProvider) {
      const models = AI_PROVIDER_MODELS[selectedProvider as ChatProvider];
      setSelectedModel(models?.[0]?.id || '');
    }
  }, [selectedProvider]);

  useEffect(() => {
    if (!autoScrollEnabledRef.current) return;
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const buildSystemPrompt = (): ChatMessage => ({
    role: 'system',
    content: `你是 BeaverBot，BeaverKit 的 AI 程式碼助理。使用者正在 Workspace 建立作品（目前模式：${editorMode}）。

目前的程式碼：
\`\`\`
${currentCode || '（尚無程式碼）'}
\`\`\`

你的任務：
1. 根據使用者的指令修改或生成程式碼
2. 回覆時必須包含**完整的可執行程式碼**，用 \`\`\`html（或 \`\`\`tsx / \`\`\`vue 視框架而定）包裹
3. 在程式碼區塊之前或之後，簡短說明你做了什麼
4. 不要只給部分程式碼，必須給出完整程式碼

使用繁體中文回答。`,
  });

  const handleAiSend = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading || !selectedProvider) return;

    setAiError('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setAiInput('');
    setAiLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const recentMessages = newMessages.slice(-10);
      let accumulated = '';

      await chatWithAIStream(
        selectedProvider,
        [buildSystemPrompt(), ...recentMessages],
        (_chunk, full) => {
          accumulated = full;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: full };
            return updated;
          });
          const complete = extractCodeFromAIResponse(full);
          if (complete) {
            setHtmlCode(complete);
            if (editorMode !== 'react' && editorMode !== 'vue') setEditorMode('single');
            setActiveTab('html');
          } else {
            const partial = extractPartialCode(full);
            if (partial) {
              setHtmlCode(partial);
              setActiveTab('html');
            }
          }
        },
        { maxTokens: 8192, model: selectedModel || undefined }
      );

      const finalCode = extractCodeFromAIResponse(accumulated);
      if (finalCode) {
        setHtmlCode(finalCode);
        if (editorMode !== 'react' && editorMode !== 'vue') setEditorMode('single');
        setActiveTab('html');
      }
    } catch (err) {
      setMessages(prev => prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev);
      if (err instanceof AIServiceError) {
        setAiError(err.message);
      } else {
        setAiError('發生未知錯誤，請稍後再試。');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSend();
    }
  };

  const hasActiveProvider = !!selectedProvider;
  const todayUsage = selectedProvider ? getUsage(selectedProvider as ChatProvider) : 0;
  const limit = selectedProvider ? (dailyLimits[selectedProvider] || 0) : 0;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main className={`${savePanelOpen ? 'md:ml-72' : 'md:ml-16'} flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background transition-[margin] duration-300`}>
      {/* ── Header ── */}
      <div className="bg-surface px-6 py-1.5 flex items-center gap-6 border-b border-outline-variant/10 shrink-0">
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
        <div className="ml-auto flex items-center gap-2">
          {/* Visibility selector */}
          <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1">
            {(['public', 'unlisted', 'private'] as const).map((v) => {
              const icons = { public: 'public', unlisted: 'link', private: 'lock' };
              const labels = { public: 'Public', unlisted: 'Unlisted', private: 'Private' };
              return (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  title={labels[v]}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    visibility === v
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface/50 hover:text-on-surface/80'
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">{icons[v]}</span>
                  <span className="hidden sm:inline">{labels[v]}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !title || !previewDoc || !currentUser?.id}
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

      {/* ── Mobile Tab Switcher ── */}
      <div className="flex md:hidden border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
        <button
          onClick={() => setMobileTab('code')}
          className={`flex-1 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'code' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">code</span>
          Code
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'chat' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">smart_toy</span>
          AI Chat
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'preview' ? 'border-b-2 border-primary text-primary bg-surface-container-high' : 'text-on-surface/40'}`}
        >
          <span className="material-symbols-outlined text-[14px] mr-1 align-middle">preview</span>
          Preview
        </button>
      </div>

      {/* ── Split Pane ── */}
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">

        {/* ── Left Column: Editor + AI Chat ── */}
        <div className={`${mobileTab === 'preview' ? 'hidden' : 'flex'} md:flex w-full md:w-[48%] md:min-w-[360px] flex-col border-r border-outline-variant/10`}>

          {/* Editor */}
          <section
            className={`${mobileTab === 'chat' ? 'hidden md:flex' : 'flex'} flex-col bg-surface-container-lowest border-b border-outline-variant/10 overflow-hidden`}
            style={{ flex: '3 3 0', minHeight: 0 }}
          >
            {/* Mode Selector + Tabs */}
            <div className="flex bg-surface-container-low h-10 items-end px-2 gap-1 border-b border-outline-variant/10 shrink-0">
              {/* Custom Mode Dropdown */}
              <div className="relative flex items-center mr-2 mb-1" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 bg-surface-container-highest text-on-surface text-[11px] font-bold uppercase tracking-wider rounded px-2.5 py-1 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
                >
                  <span className="text-sm">{MODE_OPTIONS.find(m => m.id === editorMode)?.emoji}</span>
                  {MODE_OPTIONS.find(m => m.id === editorMode)?.label}
                  <span className="material-symbols-outlined text-[12px] text-on-surface/40 ml-0.5">expand_more</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-outline-variant/20 rounded-xl shadow-2xl overflow-hidden z-50">
                    {MODE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleModeChange(opt.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-surface-container transition-colors flex items-start gap-3 ${editorMode === opt.id ? 'bg-primary/5' : ''}`}
                      >
                        <span className="text-lg mt-0.5">{opt.emoji}</span>
                        <div>
                          <div className={`text-sm font-bold ${editorMode === opt.id ? 'text-primary' : 'text-on-surface'}`}>
                            {opt.label}
                          </div>
                          <div className="text-[11px] text-on-surface-variant leading-tight mt-0.5">{opt.desc}</div>
                        </div>
                        {editorMode === opt.id && (
                          <span className="material-symbols-outlined text-primary text-[16px] ml-auto mt-1">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs (只在 split 模式顯示) */}
              {isSplitMode && tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg flex items-center gap-1.5 border-t border-x transition-colors ${activeTab === tab.id
                    ? 'bg-surface-container-lowest text-primary border-outline-variant/10'
                    : 'text-on-surface/40 border-transparent hover:text-on-surface/70'
                    }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}

              {/* 非 split 模式 → 顯示檔案名標籤 */}
              {!isSplitMode && (
                <div className="px-4 py-2 bg-surface-container-lowest text-primary text-xs font-medium rounded-t-lg flex items-center gap-1.5 border-t border-x border-outline-variant/10">
                  <span className="material-symbols-outlined text-[14px]">{isReactMode ? 'code' : isVueMode ? 'code' : 'html'}</span>
                  {isReactMode ? 'Component.jsx' : isVueMode ? 'Component.vue' : 'index.html'}
                </div>
              )}
            </div>

            {/* Textarea */}
            <div className="flex-1 p-0 font-mono text-sm leading-relaxed editor-well overflow-hidden flex relative group cursor-text">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-surface-container-lowest border-r border-outline-variant/5 text-right py-4 pr-2 text-on-surface/20 select-none hidden sm:block">
                {currentCode.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={currentCode}
                onChange={handleEditorChange}
                onPaste={handlePaste}
                placeholder={
                  isSplitMode
                    ? activeTab === 'html'
                      ? '<div>Your HTML here</div>'
                      : activeTab === 'css'
                        ? 'body { font-family: sans-serif; }'
                        : 'console.log("hello!");'
                    : '把 AI 生成的程式碼貼在這裡 ✨\n\n💡 小提示：\n• 跟 AI 說「請輸出成一個完整的 HTML 檔案」效果最好\n• 也支援 React 和 Vue 元件，貼上後會自動偵測'
                }
                className="flex-1 w-full bg-transparent p-4 sm:pl-12 py-4 font-mono text-sm text-[#E5E2E1] outline-none resize-none hide-scrollbar placeholder:text-on-surface/20 whitespace-pre"
                spellCheck={false}
              />
            </div>
          </section>

          {/* ── AI Chat Panel ── */}
          <div
            className={`${mobileTab === 'code' ? 'hidden md:flex' : 'flex'} flex-col bg-surface-container-low overflow-hidden`}
            style={{ flex: '2 2 0', minHeight: 0 }}
          >
            {/* Provider + Model Selector */}
            {activeChatProviders.length > 0 ? (
              <div className="px-4 py-2 border-b border-outline-variant/10 flex flex-wrap items-center gap-2 shrink-0">
                {activeChatProviders.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${selectedProvider === p
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface/50 hover:text-on-surface'
                      }`}
                  >
                    {CHAT_PROVIDER_LABEL[p]}
                  </button>
                ))}
                {selectedProvider && AI_PROVIDER_MODELS[selectedProvider as ChatProvider] && (
                  <div className="flex items-center gap-1 bg-surface-container-high rounded-full pl-2 pr-1 py-0.5 border border-outline-variant/10">
                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant">model_training</span>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="bg-transparent text-[10px] font-mono font-bold text-on-surface focus:outline-none max-w-[120px]"
                    >
                      {AI_PROVIDER_MODELS[selectedProvider as ChatProvider]!.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedProvider && limit > 0 && (
                  <span className="ml-auto text-[10px] font-mono text-on-surface/30">
                    {todayUsage}/{limit}
                  </span>
                )}
              </div>
            ) : (
              <div className="px-4 py-2 border-b border-outline-variant/10 shrink-0">
                <p className="text-[10px] font-mono text-on-surface/30 uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[11px] mr-1 align-middle">smart_toy</span>
                  AI Chat — 請先至設定頁面輸入 API Key
                </p>
              </div>
            )}

            {/* Chat Messages */}
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
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap ${msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-md'
                    : 'bg-surface-container-high text-on-surface rounded-bl-md'
                    }`}>
                    {msg.role === 'assistant' ? formatAssistantMessage(msg.content) : msg.content}
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-3 py-2">
                    <div className="flex items-center gap-1.5">
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

              {aiError && (
                <div className="bg-error-container text-on-error-container text-[10px] rounded-lg px-3 py-2">
                  {aiError}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {hasActiveProvider && (
              <div className="p-3 border-t border-outline-variant/10 bg-surface-container-lowest shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={aiInputRef}
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={handleAiKeyDown}
                    rows={1}
                    placeholder="描述你想要的功能或修改..."
                    className="flex-1 bg-surface-container-high text-on-surface text-xs rounded-xl px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-on-surface/30"
                    style={{ maxHeight: '80px', overflowY: 'auto' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                    }}
                  />
                  <button
                    onClick={handleAiSend}
                    disabled={!aiInput.trim() || aiLoading}
                    className="w-8 h-8 bg-primary text-on-primary rounded-xl flex items-center justify-center hover:bg-primary-fixed transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">send</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Preview ── */}
        <section className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 bg-surface flex-col`}>
          <div className="h-10 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-end px-4 shrink-0 gap-1">
            <button
              onClick={() => setViewMode('desktop')}
              title="桌面"
              className={`material-symbols-outlined text-[18px] p-1 rounded transition-colors ${viewMode === 'desktop' ? 'text-primary' : 'text-on-surface/40 hover:text-primary'}`}
            >desktop_windows</button>
            <button
              onClick={() => setViewMode('mobile')}
              title="手機"
              className={`material-symbols-outlined text-[18px] p-1 rounded transition-colors ${viewMode === 'mobile' ? 'text-primary' : 'text-on-surface/40 hover:text-primary'}`}
            >smartphone</button>
          </div>

          <div className="flex-1 px-4 pb-4 pt-0 md:px-6 md:pb-6 bg-surface-container flex items-center justify-center overflow-hidden">
            {showApiGuide ? (
              <div className="w-full h-full rounded-xl overflow-hidden border border-outline-variant/20">
                <BeaverKitAPIGuide compact />
              </div>
            ) : viewMode === 'round' ? (
              /* ── Round / Smartwatch frame ── */
              <div className="flex items-center justify-center w-full h-full">
                <div className="relative" style={{ width: '320px', height: '320px' }}>
                  {/* Outer bezel */}
                  <div className="absolute inset-0 rounded-full shadow-2xl" style={{ background: 'linear-gradient(145deg,#3a3a3a,#1a1a1a)', padding: '10px' }}>
                    <div className="w-full h-full rounded-full overflow-hidden relative bg-black">
                      {previewDoc ? (
                        <iframe
                          ref={iframeRef}
                          srcDoc={previewDoc}
                          className="absolute inset-0 w-full h-full border-none"
                          title="Round Preview"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#050505] flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-surface/20 text-4xl">watch</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Crown button */}
                  <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-3 h-8 rounded-r-md bg-gradient-to-b from-[#444] to-[#222] shadow-md"></div>
                </div>
              </div>
            ) : viewMode === 'mobile' ? (
              /* ── Mobile phone frame ── */
              <div className="flex items-center justify-center w-full h-full">
                <div className="relative flex flex-col shadow-2xl" style={{ width: '375px', height: '667px' }}>
                  <div className="absolute inset-0 rounded-[40px] overflow-hidden border-[10px] border-[#2A2A2A] bg-[#2A2A2A] flex flex-col">
                    {/* Status bar */}
                    <div className="h-7 bg-[#1A1A1A] flex items-center justify-between px-5 shrink-0">
                      <span className="text-[10px] text-white/60 font-mono">9:41</span>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px] text-white/60">signal_cellular_alt</span>
                        <span className="material-symbols-outlined text-[11px] text-white/60">wifi</span>
                        <span className="material-symbols-outlined text-[11px] text-white/60">battery_full</span>
                      </div>
                    </div>
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1A1A1A] rounded-b-2xl z-10"></div>
                    {/* Screen */}
                    <div className="flex-1 relative overflow-hidden bg-white">
                      {previewDoc ? (
                        <iframe
                          ref={iframeRef}
                          srcDoc={previewDoc}
                          className="absolute inset-0 w-full h-full border-none"
                          title="Mobile Preview"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#050505] flex items-center justify-center">
                          <BeaverKitAPIGuide compact />
                        </div>
                      )}
                    </div>
                    {/* Home bar */}
                    <div className="h-6 bg-[#1A1A1A] flex items-center justify-center shrink-0">
                      <div className="w-24 h-1 rounded-full bg-white/30"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Desktop browser frame ── */
              <div className="w-full h-full flex flex-col rounded-xl shadow-2xl overflow-hidden border border-outline-variant/20 transition-all duration-500">
                {/* Browser chrome */}
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
                {/* Page content */}
                <div className="flex-1 relative bg-white overflow-hidden">
                  {previewDoc ? (
                    <iframe
                      ref={iframeRef}
                      srcDoc={previewDoc}
                      className="absolute inset-0 w-full h-full border-none"
                      title="Live Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#050505] overflow-hidden">
                      <BeaverKitAPIGuide compact />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="bg-[#131313] border-t border-[#584142]/20 flex justify-between items-center px-6 h-8 w-full z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#FFB3B6]">
            <span className="material-symbols-outlined text-[12px]">rebase</span>
            main*
          </div>
          <div className="text-[10px] text-on-surface/40 font-mono">
            {currentCode ? `Ln ${currentCode.split('\n').length}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-on-surface/40">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            BeaverKit Cloud
          </span>
          <span>UTF-8</span>
          <span className="text-primary">{isReactMode ? 'React JSX' : isVueMode ? 'Vue 3' : isSplitMode ? 'HTML / CSS / JS' : 'HTML (All-in-One)'}</span>
        </div>
      </footer>

      {/* ── 存檔面板 ── */}
      {savePanelOpen && (
        <aside className="fixed left-16 top-16 h-[calc(100vh-64px)] w-56 bg-[#1C1B1B] border-r border-outline-variant/10 z-30 flex-col hidden md:flex">
          {/* Header */}
          <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#FFB3B6] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
              <span className="text-[11px] uppercase tracking-widest font-bold text-[#E5E2E1]">存檔區</span>
            </div>
            <span className={`text-[10px] font-mono tabular-nums ${saves.length >= MAX_SAVES ? 'text-red-400' : 'text-[#E5E2E1]/40'}`}>
              {saves.length}/{MAX_SAVES}
            </span>
          </div>

          {/* Save button */}
          <div className="px-3 py-2.5 border-b border-outline-variant/10 shrink-0">
            <button
              onClick={handleSave}
              disabled={saves.length >= MAX_SAVES && !saves.find(s => s.title === title)}
              className="w-full flex items-center justify-center gap-2 bg-[#2A2A2A] hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed text-[#E5E2E1] text-xs font-bold py-2 rounded-lg border border-outline-variant/10 transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[14px] text-[#FFB3B6]">save</span>
              儲存目前專案
            </button>
            {!currentUser && (
              <p className="text-[9px] text-yellow-400/60 text-center mt-1.5">⚠ 僅限本機儲存</p>
            )}
          </div>

          {/* Save list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-1.5 px-2">
            {saves.length === 0 ? (
              <div className="text-center py-8 px-4">
                <span className="material-symbols-outlined text-[#E5E2E1]/10 text-4xl block mb-2">folder_open</span>
                <p className="text-[10px] text-[#E5E2E1]/30 leading-relaxed">尚無存檔<br />點擊上方按鈕開始</p>
              </div>
            ) : (
              saves.map(slot => (
                <div key={slot.id} className="bg-[#2A2A2A] rounded-lg p-2.5 border border-outline-variant/10 hover:border-outline-variant/25 transition-colors group">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-[11px] font-bold text-[#E5E2E1] truncate leading-tight flex-1">{slot.title}</p>
                    <button
                      onClick={() => handleDeleteSave(slot.id)}
                      className="text-[#E5E2E1]/20 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      title="刪除存檔"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                  {slot.tags && (
                    <p className="text-[9px] text-[#E5E2E1]/30 truncate mb-1">{slot.tags}</p>
                  )}
                  <p className="text-[9px] text-[#E5E2E1]/25 font-mono mb-2">
                    {new Date(slot.savedAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={() => handleLoadSave(slot)}
                    className="w-full text-[10px] font-bold text-[#FFB3B6] bg-[#FFB3B6]/5 hover:bg-[#FFB3B6]/10 py-1 rounded border border-[#FFB3B6]/10 hover:border-[#FFB3B6]/20 transition-colors active:scale-95"
                  >
                    載入
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ── Toast 通知 ── */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out] pointer-events-none">
          <div className="bg-surface border border-outline-variant/20 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-lg">{toast.icon}</span>
            </div>
            <span className="text-on-surface text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Helper: Format assistant messages ─────────────────────────────────
function formatAssistantMessage(content: string): React.ReactNode {
  const parts = content.split(/(```[\s\S]*?```)/g);
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^```[\s\S]*```$/.test(part)) {
      nodes.push(
        <div key={i} className="my-1.5 bg-surface-container-lowest rounded px-2.5 py-1.5 border border-outline-variant/10">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary/60">
            <span className="material-symbols-outlined text-[11px]">check_circle</span>
            程式碼已自動套用至編輯器
          </div>
        </div>
      );
    } else {
      const stripped = part.replace(/```[\w]*\n?[\s\S]*$/, '').trimEnd();
      if (stripped) nodes.push(<span key={i}>{stripped}</span>);
    }
  }
  return <>{nodes}</>;
}
