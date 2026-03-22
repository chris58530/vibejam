import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, toSlug, User } from '../lib/api';

interface WorkspaceProps {
  currentUser?: User;
}

type EditorTab = 'html' | 'css' | 'js';
type EditorMode = 'single' | 'split' | 'react';

// ── 偵測是否為 React 程式碼 ──────────────────────────────────────────
function isReactCode(code: string): boolean {
  return (
    /from\s+['"]react['"]/i.test(code) ||
    /import\s+React/i.test(code) ||
    /export\s+default\s+(function|class)\s+\w+/i.test(code)
  );
}

// ── 將 React JSX 包裝成可在 iframe 中執行的完整 HTML ─────────────────
function wrapReactForPreview(rawCode: string): string {
  let code = rawCode;

  // 擷取 React named imports → 轉為全域 React 解構
  const reactNamed: string[] = [];
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]react['"]\s*;?\n?/g, (_, imports) => {
    reactNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()));
    return '';
  });
  code = code.replace(/import\s+React[^'"]*from\s*['"]react['"]\s*;?\n?/g, '');
  code = code.replace(/import\s+(?:ReactDOM|\{[^}]*\})\s*from\s*['"]react-dom(?:\/client)?['"]\s*;?\n?/g, '');

  // 擷取 lucide-react imports → 轉為全域 LucideReact 解構
  const lucideNamed: string[] = [];
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]\s*;?\n?/g, (_, imports) => {
    lucideNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()));
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
  <script src="https://unpkg.com/lucide-react@0.460.0/dist/umd/lucide-react.min.js"></script>
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
  const [reactDialog, setReactDialog] = useState({ open: false, pendingCode: '' });

  const isReactMode = editorMode === 'react';
  const isSplitMode = editorMode === 'split';

  const [title, setTitle] = useState(remixFrom ? `Remix of ${remixFrom.title}` : 'Untitled Project');
  const [tags, setTags] = useState('');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPublishing, setIsPublishing] = useState(false);

  const currentCode = activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode;

  const previewDoc = useMemo(() => {
    if (!htmlCode && !cssCode && !jsCode) return '';
    return isReactMode
      ? wrapReactForPreview(htmlCode)
      : mergeCode(htmlCode, cssCode, jsCode);
  }, [isReactMode, htmlCode, cssCode, jsCode]);

  // ── 編輯器 onChange ────────────────────────────────────────────────
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (activeTab === 'html') {
      setHtmlCode(value);
      if (!value && editorMode === 'react') setEditorMode('single');
    } else if (activeTab === 'css') {
      setCssCode(value);
    } else {
      setJsCode(value);
    }
  };

  // ── 貼上時偵測 React 並跳出對話框 ─────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (activeTab !== 'html') return;
    const pasted = e.clipboardData.getData('text');
    if (isReactCode(pasted)) {
      e.preventDefault();
      setReactDialog({ open: true, pendingCode: pasted });
      return;
    }
  };

  const handleReactConfirm = () => {
    setHtmlCode(reactDialog.pendingCode);
    setEditorMode('react');
    setReactDialog({ open: false, pendingCode: '' });
  };

  const handleReactCancel = () => {
    setHtmlCode(reactDialog.pendingCode);
    setReactDialog({ open: false, pendingCode: '' });
  };

  const handleModeChange = (mode: EditorMode) => {
    setEditorMode(mode);
    setActiveTab('html');
    if (mode === 'single' || mode === 'react') {
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
            {/* Mode Dropdown */}
            <div className="flex items-center mr-2 mb-1">
              <select
                value={editorMode}
                onChange={(e) => handleModeChange(e.target.value as EditorMode)}
                className="bg-surface-container-highest text-on-surface text-[11px] font-bold uppercase tracking-wider rounded px-2 py-1 border border-outline-variant/20 outline-none cursor-pointer appearance-none pr-5"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
              >
                <option value="single">All-in-One</option>
                <option value="split">HTML / CSS / JS</option>
                <option value="react">React JSX</option>
              </select>
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
                <span className="material-symbols-outlined text-[14px]">{isReactMode ? 'code' : 'html'}</span>
                {isReactMode ? 'Component.jsx' : 'index.html'}
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
                isReactMode
                  ? 'Paste your React component code here...'
                  : !isSplitMode
                  ? 'Paste your complete HTML code here...'
                  : activeTab === 'html'
                  ? '<div>Your HTML here</div>'
                  : activeTab === 'css'
                  ? 'body { font-family: sans-serif; }'
                  : 'console.log("hello!");'
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
          <span className="text-primary">{isReactMode ? 'React JSX' : isSplitMode ? 'HTML / CSS / JS' : 'HTML (All-in-One)'}</span>
        </div>
      </footer>

      {/* ── React 偵測對話框 ── */}
      {reactDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-outline-variant/20 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
              </div>
              <div>
                <h3 className="text-on-surface font-bold">偵測到 React 程式碼</h3>
                <p className="text-on-surface-variant text-xs mt-0.5">這看起來是一個 React 元件</p>
              </div>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
              是否要自動轉換成可預覽的格式？<br />
              <span className="text-on-surface/50 text-xs">系統將自動注入 React、Tailwind CSS 及 lucide-react 等所需函式庫。</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleReactCancel}
                className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container"
              >
                維持原狀貼上
              </button>
              <button
                onClick={handleReactConfirm}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                轉換預覽
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

