import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { api, User, Vibe } from '../lib/api';
import { supabase } from '../lib/supabase';
import { EditorMode, detectFramework, wrapReactForPreview, wrapVueForPreview, mergeCode, extractCodeFromAIResponse, extractPartialCode } from '../lib/codeUtils';
import { useAIKeyStore, AI_PROVIDER_MODELS } from '../lib/aiKeyStore';
import { useWorkspaceStore } from '../lib/workspaceStore';
import { chatWithAIStream, ChatMessage, AIServiceError } from '../lib/aiService';
import BeaverKitAPIGuide from '../components/BeaverKitAPIGuide';
import ThinkBlock from '../components/ThinkBlock';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

// ── 存檔 ─────────────────────────────────────────────────────────────
interface SaveSlot {
  id: string;
  title: string;
  tags: string;
  description: string;
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
type RightTab = 'code' | 'preview';
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

// ── 隨機預設專案名稱 ─────────────────────────────────────────────────
const VIBE_ADJECTIVES = [
  'Cosmic', 'Neon', 'Fuzzy', 'Electric', 'Silent', 'Wild', 'Crystal',
  'Glowing', 'Turbo', 'Pastel', 'Frozen', 'Solar', 'Lunar', 'Hyper',
  'Velvet', 'Molten', 'Echoed', 'Vivid', 'Chill', 'Blazing',
];
const VIBE_NOUNS = [
  'Mango', 'Vortex', 'Penguin', 'Cactus', 'Comet', 'Biscuit', 'Lagoon',
  'Panda', 'Sprocket', 'Lantern', 'Nebula', 'Waffle', 'Otter', 'Spark',
  'Tornado', 'Lemon', 'Pixel', 'Gecko', 'Aurora', 'Tofu',
];
function randomVibeName(): string {
  const adj = VIBE_ADJECTIVES[Math.floor(Math.random() * VIBE_ADJECTIVES.length)];
  const noun = VIBE_NOUNS[Math.floor(Math.random() * VIBE_NOUNS.length)];
  return `${adj} ${noun}`;
}

// ─────────────────────────────────────────────────────────────────────
export default function Workspace({ currentUser, savePanelOpen = false }: WorkspaceProps) {
  const navigate = useNavigate();
  const { setPublishFn, setIsPublishing: setStoreIsPublishing, setSaveStatus } = useWorkspaceStore();

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

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [descRowOpen, setDescRowOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'round'>('desktop');
  const [isPublishing, setIsPublishing] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  // Right panel tab (code / preview)
  const [rightTab, setRightTab] = useState<RightTab>('code');

  // Draggable splitter
  const splitPercentRef = useRef(40);
  const isDraggingRef = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // API Guide popup
  const [showApiGuidePopup, setShowApiGuidePopup] = useState(false);

  // Visibility dropdown
  const [visibilityDropdownOpen, setVisibilityDropdownOpen] = useState(false);
  const visibilityDropdownRef = useRef<HTMLDivElement>(null);

  // API 說明面板
  const [showApiGuide, setShowApiGuide] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [chatFontScale, setChatFontScale] = useState(100);
  const [isManualEditMode, setIsManualEditMode] = useState(false);
  const [highlightEditBtn, setHighlightEditBtn] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatusLocal] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const lastSavedSnapshotRef = useRef<string>('');
  
  const handleEditorClick = () => {
    if (!isManualEditMode) {
      setHighlightEditBtn(true);
      setTimeout(() => setHighlightEditBtn(false), 1000);
    }
  };

  // 追蹤未儲存狀態
  useEffect(() => {
    const snapshot = JSON.stringify({ htmlCode, cssCode, jsCode, title, tags });
    if (snapshot !== lastSavedSnapshotRef.current && lastSavedSnapshotRef.current !== '') {
      setSaveStatusLocal('unsaved');
      setSaveStatus('unsaved');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlCode, cssCode, jsCode, title, tags]);

  // ── 存檔 ───────────────────────────────────────────────────────────
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [publishedVibes, setPublishedVibes] = useState<Vibe[]>([]);
  const [remixVibes, setRemixVibes] = useState<Vibe[]>([]);
  const [vibesLoading, setVibesLoading] = useState(false);
  const [savesOpen, setSavesOpen] = useState(true);
  const [publishedOpen, setPublishedOpen] = useState(true);
  const [remixOpen, setRemixOpen] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [confirmLoad, setConfirmLoad] = useState<Vibe | null>(null);

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

  // 取得 Supabase 用戶 ID
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSupabaseUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 面板開啟時 fetch 使用者已發布 / Remix 的 Vibes
  useEffect(() => {
    if (!savePanelOpen || !supabaseUserId) return;
    setVibesLoading(true);
    api.getVibes(supabaseUserId)
      .then(all => {
        const own = all.filter(v => v.author_name === currentUser?.username);
        setPublishedVibes(own.filter(v => !v.parent_vibe_id));
        setRemixVibes(own.filter(v => !!v.parent_vibe_id));
      })
      .catch(() => {})
      .finally(() => setVibesLoading(false));
  }, [savePanelOpen, supabaseUserId, currentUser?.username]);

  // 從已發布 / Remix 載入 Vibe 到編輯器
  const handleLoadFromVibe = (vibe: Vibe) => {
    setHtmlCode(vibe.latest_code ?? '');
    setCssCode('');
    setJsCode('');
    setEditorMode('single');
    setTitle(vibe.title);
    setTags(vibe.tags ?? '');
    setActiveTab('html');
    setConfirmLoad(null);
    showToast(`已載入「${vibe.title}」`, 'download');
  };

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

  // Splitter drag handler — 直接操作左側面板 DOM style，完全繞過 React 渲染
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

  // Click outside visibility dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (visibilityDropdownRef.current && !visibilityDropdownRef.current.contains(e.target as Node)) {
        setVisibilityDropdownOpen(false);
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
  const handlePublish = async (modalData?: { title: string; description: string; tags: string; visibility: 'public' | 'unlisted' | 'private' }) => {
    const pTitle = modalData?.title || title;
    const pDesc = modalData?.description || description;
    const pVis = modalData?.visibility || visibility;
    const pTags = modalData?.tags ?? tags;

    if (!pTitle || !previewDoc) return;
    if (modalData) {
      setTitle(pTitle);
      setDescription(pDesc);
      setVisibility(pVis);
      setTags(pTags);
      setIsSettingsOpen(false);
    }
    setIsPublishing(true);
    setStoreIsPublishing(true);
    try {
      const result = await api.createVibe({
        title: pTitle,
        tags: pTags,
        description: pDesc,
        code: previewDoc,
        author_id: currentUser?.id,
        visibility: pVis,
      });
      if (currentUser) {
        navigate(`/p/${result.id}`);
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
    setPublishFn(() => handlePublish());
    return () => setPublishFn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, visibility, tags, previewDoc, currentUser]);

  // ── 存檔操作 ─────────────────────────────────────────────────────
  const handleSave = () => {
    const existing = saves.findIndex(s => s.title === title);
    let newSaves: SaveSlot[];

    if (existing !== -1) {
      newSaves = saves.map((s, i) =>
        i === existing
          ? { ...s, tags, description, editorMode, code: { html: htmlCode, css: cssCode, js: jsCode }, savedAt: new Date().toISOString() }
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
        description,
        editorMode,
        code: { html: htmlCode, css: cssCode, js: jsCode },
        savedAt: new Date().toISOString(),
      };
      newSaves = [slot, ...saves];
      showToast(`專案「${title}」已存檔 (${newSaves.length}/5)`, 'save');
    }

    setSaves(newSaves);
    localStorage.setItem(saveKey, JSON.stringify(newSaves));
    lastSavedSnapshotRef.current = JSON.stringify({ htmlCode, cssCode, jsCode, title, tags });
    setSaveStatusLocal('saved');
    setSaveStatus('saved');
  };

  // 從設定 Modal 儲存草稿（套用 modal 資料再存本機）
  const handleSaveFromModal = (modalData: { title: string; description: string; tags: string; visibility: 'public' | 'unlisted' | 'private' }) => {
    setTitle(modalData.title);
    setDescription(modalData.description);
    setTags(modalData.tags);
    setVisibility(modalData.visibility);
    setIsSettingsOpen(false);
    // 延一幀讓 state 更新後再存
    setTimeout(() => {
      const snap = JSON.stringify({ htmlCode, cssCode, jsCode, title: modalData.title, tags: modalData.tags });
      const existing = saves.findIndex(s => s.title === modalData.title);
      let newSaves: SaveSlot[];
      if (existing !== -1) {
        newSaves = saves.map((s, i) =>
          i === existing
            ? { ...s, tags: modalData.tags, description: modalData.description, editorMode, code: { html: htmlCode, css: cssCode, js: jsCode }, savedAt: new Date().toISOString() }
            : s
        );
      } else if (saves.length >= MAX_SAVES) {
        showToast(`存檔已滿 (5/5)，請先刪除一個`, 'folder_off');
        return;
      } else {
        const slot: SaveSlot = {
          id: Date.now().toString(),
          title: modalData.title,
          tags: modalData.tags,
          description: modalData.description,
          editorMode,
          code: { html: htmlCode, css: cssCode, js: jsCode },
          savedAt: new Date().toISOString(),
        };
        newSaves = [slot, ...saves];
      }
      setSaves(newSaves);
      localStorage.setItem(saveKey, JSON.stringify(newSaves));
      lastSavedSnapshotRef.current = snap;
      setSaveStatusLocal('saved');
      setSaveStatus('saved');
      showToast(`草稿「${modalData.title}」已儲存`, 'save');
    }, 0);
  };

  const handleLoadSave = (slot: SaveSlot) => {
    setTitle(slot.title);
    setTags(slot.tags);
    setDescription(slot.description ?? '');
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
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleStopAI = () => {
    abortControllerRef.current?.abort();
  };

  const handleAiSend = async (overrideText?: string | React.MouseEvent) => {
    const text = (typeof overrideText === "string" ? overrideText : aiInput).trim();
    if (!text || aiLoading || !selectedProvider) return;

    setAiError('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setAiInput('');
    setAiLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
        { maxTokens: 8192, model: selectedModel || undefined, signal: controller.signal }
      );

      const finalCode = extractCodeFromAIResponse(accumulated);
      if (finalCode) {
        setHtmlCode(finalCode);
        if (editorMode !== 'react' && editorMode !== 'vue') setEditorMode('single');
        setActiveTab('html');
      }
    } catch (err) {
      // 使用者主動叫停 — 保留已串流的內容，不顯示錯誤
      if (err instanceof Error && err.name === 'AbortError') {
        // 若空白訊息（還沒任何 chunk），移除佔位
        setMessages(prev => prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev);
      } else {
        setMessages(prev => prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev);
        if (err instanceof AIServiceError) {
          setAiError(err.message);
        } else {
          setAiError('發生未知錯誤，請稍後再試。');
        }
      }
    } finally {
      setAiLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleAiKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSend();
    }
  };

  const hasActiveProvider = !!selectedProvider;
  
  const PRESET_PROMPTS = [
    { icon: 'palette', text: '把顏色改成藍色' },
    { icon: 'person', text: '加上我的名字' },
    { icon: 'speed', text: '速度加快兩倍' },
    { icon: 'dark_mode', text: '改成紫色主題' }
  ];
  const todayUsage = selectedProvider ? getUsage(selectedProvider as ChatProvider) : 0;
  const limit = selectedProvider ? (dailyLimits[selectedProvider] || 0) : 0;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main className={`${savePanelOpen ? 'md:ml-72' : 'md:ml-16'} flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background transition-[margin] duration-300`}>
      {/* ── Header ── */}
      <div className="bg-surface px-4 py-1.5 flex items-center gap-3 border-b border-outline-variant/10 shrink-0 relative">
        {/* Center: Title — clickable to open settings */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 cursor-pointer group flex items-center px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
          onClick={() => setIsSettingsOpen(true)}
        >
          <span className="material-symbols-outlined text-[14px] text-on-surface/30 group-hover:text-primary/60 mr-1.5 transition-colors">edit</span>
          <span className={`text-base font-semibold mb-[1px] transition-colors ${title ? 'text-on-surface group-hover:text-primary' : 'text-on-surface/30 group-hover:text-primary/50 italic font-normal'}`}>
            {title || '點此命名專案...'}
          </span>
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Mode dropdown (code tab) */}
          {rightTab === 'code' && (
            <div className="relative hidden md:flex items-center" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 bg-surface-container-low text-on-surface text-[11px] font-bold uppercase tracking-wider rounded px-2.5 py-1 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
              >
                <span className="text-sm">{MODE_OPTIONS.find(m => m.id === editorMode)?.emoji}</span>
                {MODE_OPTIONS.find(m => m.id === editorMode)?.label}
                <span className="material-symbols-outlined text-[12px] text-on-surface/40 ml-0.5">expand_more</span>
              </button>

              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-surface border border-white/5 rounded-xl shadow-2xl overflow-hidden z-50">
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
          )}

          {/* View mode buttons (preview tab) */}
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

          {/* Save button */}
          <button
            onClick={handleSave}
            title="儲存專案 (本機)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
              saveStatus === 'unsaved'
                ? 'border-amber-500/50 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                : 'border-outline-variant/20 text-on-surface/50 bg-surface-container-low hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">
              {saveStatus === 'unsaved' ? 'save' : 'check_circle'}
            </span>
            <span className="hidden sm:inline">
              {saveStatus === 'unsaved' ? '未儲存' : '已儲存'}
            </span>
          </button>

          {/* Settings & Publish */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            disabled={isPublishing}
            className="flex items-center justify-center gap-1.5 h-8 px-4 bg-[#2665fd] hover:bg-[#1e50cf] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">{isPublishing ? 'hourglass_empty' : 'rocket_launch'}</span>
            <span>{isPublishing ? '發布中...' : '設定與發布'}</span>
          </button>
        </div>
      </div>

      {/* ── Description Row (collapsible) ── */}
      <motion.div
        initial={false}
        animate={{ height: descRowOpen ? 'auto' : 0 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        className="overflow-hidden shrink-0"
      >
        <div className="bg-surface px-4 py-1 flex items-center gap-2 border-b border-outline-variant/10">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold shrink-0">Desc</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-xs text-on-surface/50 p-0 flex-1 outline-none placeholder:text-on-surface/20"
            placeholder="新增簡短專案描述..."
            type="text"
            maxLength={200}
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          />
          {description.length > 0 && (
            <span className="text-[10px] text-on-surface/20 shrink-0">{description.length}/200</span>
          )}
        </div>
      </motion.div>

      {/* ── Mobile Tab Switcher ── */}
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

      {/* ── Split Pane ── */}
      <div ref={splitContainerRef} className="flex-1 flex overflow-hidden flex-col md:flex-row relative md:p-3 md:gap-3">

        {/* ── Left Column: AI Chat (full height) ── */}
        <div
          ref={leftPanelRef}
          className={`${mobileTab !== 'chat' ? 'hidden' : 'flex'} md:flex w-full flex-col bg-surface-container-low shrink-0 relative group transition-all duration-300 md:rounded-xl md:shadow-lg ${!isAiSidebarOpen ? 'md:hidden' : ''}`}
          style={{ width: `${splitPercentRef.current}%`, minWidth: '280px' }}
        >

          {/* Close Sidebar Button */}
          <button onClick={() => setIsAiSidebarOpen(false)} className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-surface-container border border-white/10 rounded-r-lg hidden md:flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant z-20 transition-all shadow-md opacity-0 group-hover:opacity-100" title="收合側邊欄">
            <span className="material-symbols-outlined text-[14px]">chevron_left</span>
          </button>
          {/* AI Assistant Header */}
          {/* Provider + Model Selector */}
          {activeChatProviders.length > 0 ? (
            <div className="px-3 py-2 border-b border-outline-variant/5 flex items-center gap-2 shrink-0 bg-surface-container-lowest/50">
              {/* Provider select */}
              {activeChatProviders.length > 1 ? (
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
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
              {/* Model select */}
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
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2.5 whitespace-pre-wrap leading-relaxed border ${msg.role === 'user'
                  ? 'bg-primary text-on-primary rounded-br-none border-primary/30 shadow-sm'
                  : 'bg-surface-container-high text-on-surface rounded-tl-none border-outline-variant/5 shadow-sm'
                  }`}
                  style={{ fontSize: `${(chatFontScale / 100) * 24}px` }}
                >
                  {msg.role === 'assistant' ? formatAssistantMessage(msg.content, aiLoading && i === messages.length - 1) : msg.content}
                </div>
              </div>
            ))}

            {/* 初始載入泡泡：僅在 AI 回應尚無任何內容時顯示 */}
            {aiLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
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

            {aiError && (
              <div className="bg-error-container text-on-error-container text-[10px] rounded-lg px-3 py-2">
                {aiError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preset Prompts */}
          {hasActiveProvider && messages.length === 0 && (
            <div className="px-3 pb-2 flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
              {PRESET_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleAiSend(p.text)}
                  className="whitespace-nowrap px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/10 text-on-surface/60 text-[11px] hover:text-on-surface hover:border-primary/30 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[12px]">{p.icon}</span>
                  {p.text}
                </button>
              ))}
            </div>
          )}
          {/* Input Area */}
          {hasActiveProvider && (
            <div className="p-3 border-t border-outline-variant/5 shrink-0">
              <div className="flex items-end bg-background rounded-xl shadow-inner overflow-hidden">
                <textarea
                  ref={aiInputRef}
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={handleAiKeyDown}
                  rows={1}
                  placeholder="輸入需求..."
                  className="flex-1 bg-transparent text-on-surface px-3 py-2.5 resize-none outline-none placeholder:text-on-surface/30"
                  style={{ fontSize: `${(chatFontScale / 100) * 24}px`, maxHeight: '80px', overflowY: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                  }}
                />
                {aiLoading ? (
                  <button
                    onClick={handleStopAI}
                    title="停止生成"
                    className="w-9 h-9 m-1 bg-error/80 text-white rounded-lg flex items-center justify-center hover:bg-error transition-colors shrink-0 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[15px]">stop</span>
                  </button>
                ) : (
                  <button
                    onClick={handleAiSend}
                    disabled={!aiInput.trim()}
                    className="w-9 h-9 m-1 bg-primary text-on-primary rounded-lg flex items-center justify-center hover:bg-primary-fixed transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Draggable Splitter ── */}
        <div
          className="hidden md:flex w-1.5 cursor-col-resize items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors group shrink-0 select-none"
          onMouseDown={() => { isDraggingRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
        >
          <div className="w-0.5 h-8 bg-outline-variant/20 rounded-full group-hover:bg-primary/40 group-active:bg-primary/60 transition-colors"></div>
        </div>

        {/* ── AI Sidebar Reopen Button (when collapsed) ── */}
        {!isAiSidebarOpen && (
          <button
            onClick={() => setIsAiSidebarOpen(true)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-surface-container border border-white/10 rounded-r-lg items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-all shadow-md ml-0"
            title="展開 AI 助手"
          >
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        )}

        {/* ── Right Column: Code + Preview ── */}
        <section className={`${mobileTab === 'chat' ? 'hidden' : 'flex'} md:flex flex-1 flex-col bg-background overflow-hidden relative md:rounded-xl md:shadow-lg`}>

          {/* ── Floating Tab Toggle (Canvas Style) ── */}
          <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-20 items-center gap-1.5 bg-surface-container p-1 rounded-lg shadow-lg">
            <button
              onClick={() => setRightTab('code')}
              className={`px-6 py-1.5 rounded-md font-medium text-sm flex items-center gap-2 transition-colors ${
                rightTab === 'code'
                  ? 'bg-white/10 text-on-surface shadow-sm'
                  : 'text-on-surface/40 hover:text-on-surface/70'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">code</span>
              Code
            </button>
            <button
              onClick={() => setRightTab('preview')}
              className={`px-6 py-1.5 rounded-md font-medium text-sm flex items-center gap-2 transition-colors ${
                rightTab === 'preview'
                  ? 'bg-white/10 text-on-surface shadow-sm'
                  : 'text-on-surface/40 hover:text-on-surface/70'
              }`}
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

          {/* ── Code Editor ── */}
          {rightTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              <div className="flex items-center justify-between bg-[#1e1e1e] border-b border-outline-variant/10 px-4 h-10 shrink-0 select-none mt-14 mx-4 md:mx-6 rounded-t-xl overflow-hidden shadow-sm">
                <div className="flex bg-[#1e1e1e] text-xs h-full">
                  {!isSplitMode ? (
                    <div className="px-4 h-full flex items-center gap-2 border-b-2 border-primary bg-[#1e1e1e] text-on-surface font-medium">
                      <span className="material-symbols-outlined text-[14px] text-primary">{isReactMode ? 'code' : isVueMode ? 'code' : 'html'}</span>
                      {isReactMode ? 'App.jsx' : isVueMode ? 'App.vue' : 'index.html'}
                    </div>
                  ) : tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 h-full flex items-center gap-1.5 transition-colors border-b-2 ${activeTab === tab.id ? 'border-primary text-on-surface font-medium bg-[#252526]' : 'border-transparent text-on-surface-variant hover:bg-[#252526]'}`}><span className="material-symbols-outlined text-[13px]">{tab.icon}</span>{tab.label}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setIsManualEditMode(!isManualEditMode); setHighlightEditBtn(false); }} className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all duration-300 ${isManualEditMode ? 'bg-primary/20 text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'} ${highlightEditBtn ? 'bg-yellow-500/20 text-yellow-300 ring-2 ring-yellow-500/50 scale-105' : ''}`} title={isManualEditMode ? '切換回保護模式' : '開啟手動編輯 (防呆)'}><span className="material-symbols-outlined text-[14px]">{isManualEditMode ? 'edit' : 'edit_off'}</span><span className="text-[11px]">{isManualEditMode ? '編輯中' : '唯讀保護'}</span></button>
                </div>
              </div>
              {/* Filename label (non-split mode only) */}
              

              {/* Textarea */}
              <div className="flex-1 font-mono text-sm leading-relaxed editor-well overflow-hidden flex relative group cursor-text mb-4 mx-4 md:mx-6 rounded-b-xl border border-outline-variant/10 bg-[#1e1e1e] shadow-lg" onClick={handleEditorClick}>
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-surface-container-lowest border-r border-outline-variant/5 text-right py-4 pr-2 text-on-surface/20 select-none hidden sm:block">
                  {currentCode.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={currentCode}
                  readOnly={!isManualEditMode}
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
            </div>
          )}

          {/* ── Preview ── */}
          {rightTab === 'preview' && (
            <div className="flex-1 px-4 pb-4 md:px-6 md:pb-6 bg-background flex items-center justify-center overflow-hidden mt-14">
              {viewMode === 'round' ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="relative" style={{ width: '320px', height: '320px' }}>
                    <div className="absolute inset-0 rounded-full shadow-2xl" style={{ background: 'linear-gradient(145deg,#3a3a3a,#1a1a1a)', padding: '10px' }}>
                      <div className="w-full h-full rounded-full overflow-hidden relative bg-black">
                        {previewDoc ? (
                          <iframe ref={iframeRef} srcDoc={previewDoc} className="absolute inset-0 w-full h-full border-none" title="Round Preview" sandbox="allow-scripts allow-same-origin" />
                        ) : (
                          <div className="w-full h-full bg-[#050505] flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface/20 text-4xl">watch</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-3 h-8 rounded-r-md bg-gradient-to-b from-[#444] to-[#222] shadow-md"></div>
                  </div>
                </div>
              ) : viewMode === 'mobile' ? (
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
                          <iframe ref={iframeRef} srcDoc={previewDoc} className="absolute inset-0 w-full h-full border-none" title="Mobile Preview" sandbox="allow-scripts allow-same-origin" />
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
                      <iframe ref={iframeRef} srcDoc={previewDoc} className="absolute inset-0 w-full h-full border-none" title="Live Preview" sandbox="allow-scripts allow-same-origin" />
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

      {/* ── API Guide Popup ── */}
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


      {/* ── 我的專案面板 ── */}
      {savePanelOpen && (
        <aside className="fixed left-16 top-16 h-[calc(100vh-64px)] w-56 bg-[#1a1a1c] border-r border-white/[0.06] z-30 flex-col hidden md:flex overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 shrink-0">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#dae2fd]/40">我的專案</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">

            {/* ── 儲存區 ── */}
            <div className="border-b border-white/5">
              <button
                onClick={() => setSavesOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#dae2fd]/30 text-[13px]">save</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#dae2fd]/40">儲存區</span>
                  <span className={`text-[9px] font-mono tabular-nums ${saves.length >= MAX_SAVES ? 'text-red-400/70' : 'text-[#dae2fd]/20'}`}>{saves.length}/{MAX_SAVES}</span>
                </div>
                <span className="material-symbols-outlined text-[13px] text-[#dae2fd]/20 transition-transform duration-200" style={{ transform: savesOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>expand_more</span>
              </button>

              {savesOpen && (
                <div className="px-2.5 pb-2.5 space-y-1">
                  <button
                    onClick={handleSave}
                    disabled={saves.length >= MAX_SAVES && !saves.find(s => s.title === title)}
                    className="w-full flex items-center justify-center gap-1.5 bg-[#2665fd] hover:bg-[#2665fd]/90 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-semibold py-2 rounded-lg transition-colors active:scale-[0.98] mt-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">save</span>
                    儲存目前專案
                  </button>
                  {!currentUser && (
                    <p className="text-[9px] text-[#dae2fd]/25 text-center pt-0.5">僅限本機儲存</p>
                  )}
                  {saves.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[9px] text-[#dae2fd]/20 leading-relaxed">尚無存檔</p>
                    </div>
                  ) : (
                    saves.map(slot => (
                      <div key={slot.id} className="group flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.05] transition-colors">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadSave(slot)}>
                          <p className="text-[13px] text-[#dae2fd]/80 truncate group-hover:text-[#dae2fd] transition-colors leading-tight">{slot.title}</p>
                          <p className="text-[10px] text-[#dae2fd]/25 font-mono mt-0.5">
                            {new Date(slot.savedAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteSave(slot.id)} title="刪除" className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[#dae2fd]/30 hover:text-red-400/70 transition-colors shrink-0">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── 已發布 ── */}
            <div className="border-b border-white/5">
              <button
                onClick={() => setPublishedOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#dae2fd]/30 text-[13px]">public</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#dae2fd]/40">已發布</span>
                  {currentUser && <span className="text-[9px] font-mono text-[#dae2fd]/20">{publishedVibes.length}</span>}
                </div>
                <span className="material-symbols-outlined text-[13px] text-[#dae2fd]/20 transition-transform duration-200" style={{ transform: publishedOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>expand_more</span>
              </button>

              {publishedOpen && (
                <div className="px-2.5 pb-2.5 space-y-1">
                  {!currentUser ? (
                    <div className="text-center py-6">
                      <p className="text-[9px] text-[#dae2fd]/20 leading-relaxed">登入後查看</p>
                    </div>
                  ) : vibesLoading ? (
                    <div className="text-center py-6">
                      <p className="text-[9px] text-[#dae2fd]/20 animate-pulse">載入中…</p>
                    </div>
                  ) : publishedVibes.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[9px] text-[#dae2fd]/20">尚無已發布作品</p>
                    </div>
                  ) : (
                    publishedVibes.map(vibe => (
                      <div key={vibe.id} onClick={() => setConfirmLoad(vibe)} className="group px-3 py-2 rounded-md hover:bg-white/[0.05] cursor-pointer transition-colors">
                        <p className="text-[13px] text-[#dae2fd]/80 truncate group-hover:text-[#dae2fd] transition-colors leading-tight">{vibe.title}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── Remix ── */}
            <div>
              <button
                onClick={() => setRemixOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#dae2fd]/30 text-[13px]">fork_right</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#dae2fd]/40">Remix</span>
                  {currentUser && <span className="text-[9px] font-mono text-[#dae2fd]/20">{remixVibes.length}</span>}
                </div>
                <span className="material-symbols-outlined text-[13px] text-[#dae2fd]/20 transition-transform duration-200" style={{ transform: remixOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>expand_more</span>
              </button>

              {remixOpen && (
                <div className="px-2.5 pb-2.5 space-y-1">
                  {!currentUser ? (
                    <div className="text-center py-6">
                      <p className="text-[9px] text-[#dae2fd]/20 leading-relaxed">登入後查看</p>
                    </div>
                  ) : vibesLoading ? (
                    <div className="text-center py-6">
                      <p className="text-[9px] text-[#dae2fd]/20 animate-pulse">載入中…</p>
                    </div>
                  ) : remixVibes.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[9px] text-[#dae2fd]/20">尚無 Remix 作品</p>
                    </div>
                  ) : (
                    remixVibes.map(vibe => (
                      <div key={vibe.id} onClick={() => setConfirmLoad(vibe)} className="group px-3 py-2 rounded-md hover:bg-white/[0.05] cursor-pointer transition-colors">
                        <p className="text-[13px] text-[#dae2fd]/80 truncate group-hover:text-[#dae2fd] transition-colors leading-tight">{vibe.title}</p>
                        {vibe.parent_vibe_title && (
                          <p className="text-[10px] text-[#dae2fd]/25 truncate mt-0.5">↳ {vibe.parent_vibe_title}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        </aside>
      )}

      {/* ── 覆蓋確認 dialog ── */}
      {confirmLoad && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setConfirmLoad(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[#1a1a1c] border border-white/[0.08] rounded-xl shadow-2xl p-5 w-72" onClick={e => e.stopPropagation()}>
            <p className="text-[13px] font-semibold text-[#dae2fd]/90 mb-1">載入此專案？</p>
            <p className="text-[11px] text-[#dae2fd]/40 mb-5 leading-relaxed">「{confirmLoad.title}」將覆蓋目前編輯器的內容。</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmLoad(null)} className="flex-1 py-2 rounded-lg text-[11px] font-medium text-[#dae2fd]/40 border border-white/[0.06] hover:border-white/[0.12] hover:text-[#dae2fd]/70 transition-colors">取消</button>
              <button onClick={() => handleLoadFromVibe(confirmLoad)} className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white bg-[#2665fd] hover:bg-[#2665fd]/90 transition-colors">確認載入</button>
            </div>
          </div>
        </div>
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

      {/* ── Project Settings Modal ── */}
      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={title}
        description={description}
        tags={tags}
        visibility={visibility}
        onSave={handlePublish}
        onSaveLocal={handleSaveFromModal}
        isPublishing={isPublishing}
      />
    </main>
  );
}

// ── Helper: Format assistant messages ─────────────────────────────────
function formatAssistantMessage(content: string, isStreaming = false): React.ReactNode {
  // 解析 <think>...</think> 標籤
  let thinkContent: string | null = null;
  let responseContent = content;
  let thinkIsStreaming = false;

  const thinkStart = content.indexOf('<think>');
  if (thinkStart !== -1) {
    const thinkEnd = content.indexOf('</think>', thinkStart);
    if (thinkEnd !== -1) {
      // 完整 think 區塊
      thinkContent = content.slice(thinkStart + 7, thinkEnd);
      responseContent = content.slice(thinkEnd + 8).trimStart();
      thinkIsStreaming = false;
    } else {
      // 串流中，</think> 尚未到達
      thinkContent = content.slice(thinkStart + 7);
      responseContent = '';
      thinkIsStreaming = isStreaming;
    }

    // 若 think 開頭之前有文字也納入回應
    const beforeThink = content.slice(0, thinkStart).trimEnd();
    if (beforeThink) responseContent = beforeThink + '\n' + responseContent;
  }

  // 格式化回應內容（程式碼區塊）
  const parts = responseContent.split(/(```[\s\S]*?```)/g);
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
      // 檢查是否有尚未閉合的程式碼區塊（即串流中的程式碼）
      const unclosedMatch = part.match(/```(?:\w+)?\n?([\s\S]*)$/);
      if (unclosedMatch) {
        // 先顯示區塊之前的文字
        const beforeCode = part.slice(0, unclosedMatch.index).trimEnd();
        if (beforeCode) nodes.push(<span key={i + 'before'}>{beforeCode}</span>);
        
        // 顯示一個「正在生成程式碼...」的佔位 UI
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
      {thinkContent !== null && (
        <ThinkBlock content={thinkContent} isStreaming={thinkIsStreaming} />
      )}
      {nodes.length > 0 && <div className="mt-1 flex flex-col gap-2">{nodes}</div>}
    </>
  );
}
