import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, toSlug, User } from '../lib/api';

interface WorkspaceProps {
  currentUser?: User;
}

type EditorTab = 'html' | 'css' | 'js';
type EditorMode = 'single' | 'split' | 'react' | 'vue';

// ── 框架偵測 ─────────────────────────────────────────────────────────
function detectFramework(code: string): EditorMode {
  // React
  if (
    /from\s+['"]react['"]/i.test(code) ||
    /import\s+React/i.test(code)
  ) return 'react';

  // Vue SFC: <template> + <script>
  if (
    /<template\b/i.test(code) && /<script\b/i.test(code)
  ) return 'vue';

  // Vue options/composition: import from 'vue' 或 createApp
  if (
    /from\s+['"]vue['"]/i.test(code) ||
    /Vue\.createApp|createApp\s*\(/i.test(code)
  ) return 'vue';

  return 'single';
}

// ── 將 React JSX 包裝成可在 iframe 中執行的完整 HTML ─────────────────
function wrapReactForPreview(rawCode: string): string {
  let code = rawCode;

  // 擷取 React named imports → 轉為全域 React 解構
  const reactNamed: string[] = [];
  // 處理: import React, { useState, useEffect } from 'react'
  code = code.replace(/import\s+\w+\s*,\s*\{([^}]+)\}\s*from\s*['"]react['"]\s*;?\n?/g, (_, imports) => {
    reactNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()));
    return '';
  });
  // 處理: import { useState } from 'react'
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]react['"]\s*;?\n?/g, (_, imports) => {
    reactNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()));
    return '';
  });
  // 處理: import React from 'react'
  code = code.replace(/import\s+React[^'"]*from\s*['"]react['"]\s*;?\n?/g, '');
  code = code.replace(/import\s+(?:ReactDOM|\{[^}]*\})\s*from\s*['"]react-dom(?:\/client)?['"]\s*;?\n?/g, '');

  // 擷取 lucide-react imports → 轉為全域 LucideReact 解構
  const lucideNamed: string[] = [];
  // 處理: import { MapPin, Clock } from 'lucide-react' (可能跨多行)
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]\s*;?\n?/g, (_, imports) => {
    lucideNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean));
    return '';
  });

  // 移除剩餘所有 import
  code = code.replace(/^import\s+[^;]+;?\n?/gm, '');

  // 移除 export 關鍵字
  code = code.replace(/^export\s+default\s+(?=function|class)/gm, '');
  code = code.replace(/^export\s+default\s+\w+\s*;?\s*\n?/gm, '');
  code = code.replace(/^export\s+(?=function|class|const|let|var)/gm, '');

  // 找出根元件名稱
  const match = code.match(/^(?:function|class)\s+(\w+)/m) || code.match(/^const\s+(\w+)\s*=/m);
  const componentName = match?.[1] || 'App';

  // 建立解構行
  const destructures: string[] = [];
  const uniqueReact = [...new Set(reactNamed)].filter(Boolean);
  const uniqueLucide = [...new Set(lucideNamed)].filter(Boolean);
  if (uniqueReact.length > 0) destructures.push(`const { ${uniqueReact.join(', ')} } = React;`);
  if (uniqueLucide.length > 0) destructures.push(`const { ${uniqueLucide.join(', ')} } = LucideReact;`);

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script>window.react = window.React;</script>
  <script src="https://unpkg.com/lucide-react/dist/umd/lucide-react.min.js"></script>
  <script>window.LucideReact = window.LucideReact || window.lucideReact || {};</script>
  <script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${destructures.join('\n')}${destructures.length > 0 ? '\n\n' : ''}${code}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(${componentName})
);
  </script>
</body>
</html>`;
}

// ── 合併 HTML / CSS / JS 成完整文件 ──────────────────────────────────
function mergeCode(html: string, css: string, js: string): string {
  const isComplete = /^\s*<!DOCTYPE|^\s*<html/i.test(html);
  if (isComplete && !css.trim() && !js.trim()) return html;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${css}
  </style>
</head>
<body>
${html}
  <script>
${js}
  </script>
</body>
</html>`;
}

// ── 將 Vue SFC / Options API 包裝成可在 iframe 中執行的完整 HTML ─────
function wrapVueForPreview(rawCode: string): string {
  const isSFC = /<template\b/i.test(rawCode) && /<script\b/i.test(rawCode);

  if (isSFC) {
    // 擷取 <template>, <script>, <style>
    const templateMatch = rawCode.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i);
    const scriptMatch = rawCode.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
    const styleMatch = rawCode.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);

    const templateContent = templateMatch?.[1]?.trim() || '<div>No template</div>';
    let scriptContent = scriptMatch?.[1]?.trim() || '';
    const styleContent = styleMatch?.[1]?.trim() || '';

    // 移除 import 語句
    scriptContent = scriptContent.replace(/^import\s+[^;]+;?\n?/gm, '');
    // 將 export default 改為變數賦值
    scriptContent = scriptContent.replace(/export\s+default\s*/, 'const __component__ = ');

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <style>${styleContent}</style>
</head>
<body>
  <div id="app">${templateContent}</div>
  <script>
${scriptContent}
const app = Vue.createApp(typeof __component__ !== 'undefined' ? __component__ : {});
app.mount('#app');
  </script>
</body>
</html>`;
  }

  // Non-SFC: import { ref } from 'vue' 或 createApp 風格
  let code = rawCode;
  const vueNamed: string[] = [];
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]vue['"]\s*;?\n?/g, (_, imports) => {
    vueNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean));
    return '';
  });
  code = code.replace(/import\s+[^;]*from\s*['"]vue['"]\s*;?\n?/g, '');
  code = code.replace(/^import\s+[^;]+;?\n?/gm, '');

  const destructures = vueNamed.length > 0
    ? `const { ${[...new Set(vueNamed)].join(', ')} } = Vue;\n`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
</head>
<body>
  <div id="app"></div>
  <script>
${destructures}${code}
  </script>
</body>
</html>`;
}

// ── 模式設定 ─────────────────────────────────────────────────────────
const MODE_OPTIONS: { id: EditorMode; emoji: string; label: string; desc: string }[] = [
  { id: 'single', emoji: '📋', label: '直接貼上', desc: '把 AI 給你的整段程式碼貼入' },
  { id: 'split', emoji: '🔧', label: '分開編輯', desc: '自行分開撰寫 HTML、CSS、JS' },
  { id: 'react', emoji: '⚛️', label: 'React 元件', desc: '支援 JSX + Tailwind + lucide' },
  { id: 'vue', emoji: '💚', label: 'Vue 元件', desc: '支援 Vue 3 SFC 單檔元件' },
];

// ─────────────────────────────────────────────────────────────────────
export default function Workspace({ currentUser }: WorkspaceProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const remixFrom = location.state as { id: number; code: string; title: string; author_name?: string } | undefined;

  const [htmlCode, setHtmlCode] = useState(remixFrom?.code || '');
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

  const [title, setTitle] = useState(remixFrom ? `Remix of ${remixFrom.title}` : 'Untitled Project');
  const [tags, setTags] = useState('');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPublishing, setIsPublishing] = useState(false);

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
    try {
      if (remixFrom) {
        const logMsg = title !== `Remix of ${remixFrom.title}` ? title : 'Remix logic update';
        await api.addVersion(remixFrom.id, {
          code: previewDoc,
          update_log: logMsg,
          author_id: currentUser?.id,
        });
        const authorName = remixFrom.author_name || currentUser?.username;
        if (authorName) {
          navigate(`/@${authorName}/${toSlug(remixFrom.title)}`);
        } else {
          navigate('/');
        }
      } else {
        await api.createVibe({
          title,
          tags,
          code: previewDoc,
          author_id: currentUser?.id,
        });
        if (currentUser) {
          navigate(`/@${currentUser.username}/${toSlug(title)}`);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  const tabs = [
    { id: 'html' as EditorTab, label: 'HTML', icon: 'html' },
    { id: 'css' as EditorTab, label: 'CSS', icon: 'css' },
    { id: 'js' as EditorTab, label: 'JS', icon: 'javascript' },
  ];

  return (
    <main className="md:ml-16 pt-16 flex-1 flex flex-col h-[calc(100vh)] overflow-hidden bg-background">
      {/* ── Header ── */}
      <div className="bg-surface px-6 py-3 flex items-center gap-6 border-b border-outline-variant/10">
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
        <div className="ml-auto flex gap-3">
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

      {/* ── Split Pane ── */}
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* Editor */}
        <section className="md:w-1/2 flex flex-col bg-surface-container-lowest border-r border-outline-variant/10 h-1/2 md:h-full">
          {/* Mode Selector + Tabs */}
          <div className="flex bg-surface-container-low h-10 items-end px-2 gap-1 border-b border-outline-variant/10">
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
                      className={`w-full text-left px-4 py-3 hover:bg-surface-container transition-colors flex items-start gap-3 ${
                        editorMode === opt.id ? 'bg-primary/5' : ''
                      }`}
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
                className={`px-4 py-2 text-xs font-medium rounded-t-lg flex items-center gap-1.5 border-t border-x transition-colors ${
                  activeTab === tab.id
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

        {/* Preview */}
        <section className="md:w-1/2 bg-surface flex flex-col h-1/2 md:h-full">
          <div className="h-10 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-surface-container-highest rounded px-2 py-0.5">
                <span className="material-symbols-outlined text-[14px] text-tertiary">lock</span>
                <span className="text-[10px] text-on-surface/60 font-mono tracking-tight">localhost:3000/vibe/preview</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
                className="material-symbols-outlined text-on-surface/40 hover:text-primary transition-colors text-lg"
              >
                {viewMode === 'desktop' ? 'smartphone' : 'desktop_windows'}
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-8 bg-surface-container flex items-center justify-center overflow-hidden">
            <div className={`bg-white rounded-xl shadow-2xl overflow-hidden border border-outline-variant/20 transition-all duration-500 relative flex ${viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'}`}>
              {previewDoc ? (
                <iframe
                  srcDoc={previewDoc}
                  className="w-full h-full border-none absolute inset-0 bg-white"
                  title="Live Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="w-full h-full bg-[#050505] flex flex-col items-center justify-center p-12 relative z-10">
                  <div className="w-full h-full border border-dashed border-outline-variant/20 rounded-lg flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-6xl text-primary/20 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>fluid</span>
                    <h3 className="text-on-surface-variant font-mono text-lg">render_engine.init("{title || 'untitled'}")</h3>
                    <p className="text-on-surface-variant/40 text-sm mt-2 font-mono">Ready for execution...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className="bg-[#131313] border-t border-[#584142]/20 flex justify-between items-center px-6 h-8 w-full z-50">
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
            VibeJam Cloud
          </span>
          <span>UTF-8</span>
          <span className="text-primary">{isReactMode ? 'React JSX' : isVueMode ? 'Vue 3' : isSplitMode ? 'HTML / CSS / JS' : 'HTML (All-in-One)'}</span>
        </div>
      </footer>

      {/* ── Toast 通知 ── */}
      {toast.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out] pointer-events-none">
          <div className="bg-surface border border-outline-variant/20 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
            </div>
            <span className="text-on-surface text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}

