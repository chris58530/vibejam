import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_NAMES: Record<string, string> = {
  '/': '首頁 (Home)',
  '/workspace': '工作區 (Workspace)',
  '/remix': 'Remix 工作室 (RemixStudio)',
  '/settings': '設定頁 (Settings)',
};

function getPageName(pathname: string, search: string): string {
  if (PAGE_NAMES[pathname]) {
    if (pathname === '/' && search.includes('feed=trending')) return '首頁 - 熱門 (Home/Trending)';
    if (pathname === '/' && search.includes('feed=following')) return '首頁 - 追蹤 (Home/Following)';
    return PAGE_NAMES[pathname];
  }
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0].startsWith('@')) return `作品詳情頁 (VibeDetail) — @${parts[0].slice(1)}/${parts[1]}`;
  if (parts.length === 1 && parts[0].startsWith('@')) return `用戶個人頁 (Profile) — @${parts[0].slice(1)}`;
  return pathname;
}

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = Array.from(el.classList)
    .filter(c => c.length > 2 && c.length < 35 && !c.startsWith('!') && !c.includes(':'))
    .slice(0, 5)
    .join(' ');
  const text = (el.textContent?.trim() || '').slice(0, 50).replace(/\s+/g, ' ');
  const textPart = text ? ` "${text}"` : '';
  return `<${tag}${id}${classes ? ` [${classes}]` : ''}>${textPart}`;
}

function getDomPath(el: Element, depth = 5): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body && parts.length < depth) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.classList.length > 0) {
      selector += '.' + Array.from(current.classList).slice(0, 2).join('.');
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  parts.unshift('body');
  return parts.join(' > ');
}

function generateElementInfo(el: Element, rect: DOMRect, vw: number, vh: number, pageName: string, url: string): string {
  const leftPct = ((rect.left / vw) * 100).toFixed(1);
  const topPct = ((rect.top / vh) * 100).toFixed(1);
  const wPct = ((rect.width / vw) * 100).toFixed(1);
  const hPct = ((rect.height / vh) * 100).toFixed(1);
  const desc = describeElement(el);
  const path = getDomPath(el);

  return [
    '=== Element Inspector ===',
    '',
    `頁面: ${pageName}`,
    `URL : ${url}`,
    `元件: ${desc}`,
    '',
    `位置: left ${leftPct}%、top ${topPct}%`,
    `尺寸: ${Math.round(rect.width)} × ${Math.round(rect.height)} px`,
    '',
    `DOM 路徑: ${path}`,
    '',
    '建議給 AI 的描述:',
    `  「在 ${pageName}，位於畫面 left ${leftPct}%、top ${topPct}% 附近，`,
    `   有一個 ${Math.round(rect.width)}×${Math.round(rect.height)}px 的 ${desc}」`,
  ].join('\n');
}

interface Props {
  onClose: () => void;
}

export default function DebugOverlay({ onClose }: Props) {
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // Box mode state
  const [box, setBox] = useState({ x: 120, y: 120, w: 320, h: 200 });
  const [showExport, setShowExport] = useState(false);
  const [exportText, setExportText] = useState('');
  const [copied, setCopied] = useState(false);

  // Inspector mode state
  const [inspectorMode, setInspectorMode] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ rect: DOMRect; desc: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dragRef = useRef<{ startX: number; startY: number; startBx: number; startBy: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleBoxMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startBx: box.x, startBy: box.y };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: box.w, startH: box.h };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setBox(b => ({
          ...b,
          x: Math.max(0, dragRef.current!.startBx + dx),
          y: Math.max(0, dragRef.current!.startBy + dy),
        }));
      }
      if (resizeRef.current) {
        const dw = e.clientX - resizeRef.current.startX;
        const dh = e.clientY - resizeRef.current.startY;
        setBox(b => ({
          ...b,
          w: Math.max(80, resizeRef.current!.startW + dw),
          h: Math.max(60, resizeRef.current!.startH + dh),
        }));
      }
    };
    const onMouseUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Inspector mode: ESC to exit
  useEffect(() => {
    if (!inspectorMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectorMode(false);
        setHoverInfo(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspectorMode]);

  const getElementUnderCursor = (clientX: number, clientY: number): Element | null => {
    // Hide our overlay so elementFromPoint returns the real UI element
    const overlay = overlayRef.current;
    if (overlay) overlay.style.visibility = 'hidden';
    const el = document.elementFromPoint(clientX, clientY);
    if (overlay) overlay.style.visibility = '';
    if (!el || el === document.body || el === document.documentElement) return null;
    return el;
  };

  const handleInspectorMouseMove = (e: React.MouseEvent) => {
    const el = getElementUnderCursor(e.clientX, e.clientY);
    if (!el) {
      setHoverInfo(null);
      return;
    }
    setHoverInfo({ rect: el.getBoundingClientRect(), desc: describeElement(el) });
  };

  const handleInspectorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = getElementUnderCursor(e.clientX, e.clientY);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pageName = getPageName(location.pathname, location.search);
    const text = generateElementInfo(el, rect, window.innerWidth, window.innerHeight, pageName, location.pathname + location.search);

    navigator.clipboard.writeText(text).then(() => {
      setToast('元件資訊已複製！');
      setTimeout(() => setToast(null), 2500);
    });

    setInspectorMode(false);
    setHoverInfo(null);
  };

  const generateExport = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = Math.round(box.x + box.w / 2);
    const cy = Math.round(box.y + box.h / 2);

    const overlayEl = overlayRef.current;
    if (overlayEl) overlayEl.style.display = 'none';
    const elements = document.elementsFromPoint(cx, cy).slice(0, 10);
    if (overlayEl) overlayEl.style.display = '';

    const pageName = getPageName(location.pathname, location.search);
    const xPct = ((box.x / vw) * 100).toFixed(1);
    const yPct = ((box.y / vh) * 100).toFixed(1);
    const wPct = ((box.w / vw) * 100).toFixed(1);
    const hPct = ((box.h / vh) * 100).toFixed(1);

    const text = [
      '=== BeaverKit Debug 定位資訊 ===',
      '',
      `頁面: ${pageName}`,
      `URL : ${location.pathname}${location.search}`,
      '',
      '選取框位置:',
      `  Left  : ${Math.round(box.x)}px  (視窗寬 ${xPct}%)`,
      `  Top   : ${Math.round(box.y)}px  (視窗高 ${yPct}%)`,
      '',
      '選取框尺寸:',
      `  Width : ${Math.round(box.w)}px  (視窗寬 ${wPct}%)`,
      `  Height: ${Math.round(box.h)}px  (視窗高 ${hPct}%)`,
      '',
      `中心點: (${cx}px, ${cy}px)`,
      '',
      '偵測到的 DOM 元素 (由上到下，中心點穿透):',
      ...elements.map((el, i) => `  ${i + 1}. ${describeElement(el)}`),
      '',
      '建議給 AI 的描述語:',
      `  「在 ${pageName}，距視窗左側 ${xPct}%、上方 ${yPct}% 的區域，`,
      `   寬約 ${wPct}%、高約 ${hPct}% 的範圍（約 ${Math.round(box.w)}×${Math.round(box.h)}px），`,
      `   對應的 DOM 元素為: ${elements[0] ? describeElement(elements[0]) : '(無法偵測)'}」`,
    ].join('\n');

    setExportText(text);
    setShowExport(true);
  }, [box, location]);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const exportPanelLeft = Math.min(box.x, Math.max(0, window.innerWidth - 460));
  const exportPanelTop = Math.min(box.y + box.h + 52, window.innerHeight - 320);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] pointer-events-none select-none"
    >
      {/* ── Mode Toolbar (always visible) ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1 bg-[#111] border border-white/10 rounded-full px-2 py-1.5 shadow-2xl z-[300]">
        <button
          onClick={() => { setInspectorMode(false); setHoverInfo(null); }}
          className={`flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full transition-colors ${!inspectorMode ? 'bg-red-500 text-white' : 'text-white/40 hover:text-white/60'}`}
        >
          <span className="material-symbols-outlined text-[13px]">select</span>
          選取框
        </button>
        <button
          onClick={() => { setInspectorMode(true); setShowExport(false); }}
          className={`flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full transition-colors ${inspectorMode ? 'bg-[#2665fd] text-white' : 'text-white/40 hover:text-white/60'}`}
        >
          <span className="material-symbols-outlined text-[13px]">ads_click</span>
          元素檢查
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 w-6 h-6 flex items-center justify-center rounded-full transition-colors text-sm"
          title="關閉 Debug 模式"
        >
          ✕
        </button>
      </div>

      {/* ── Inspector Mode ── */}
      {inspectorMode && (
        <>
          {/* Crosshair cursor style */}
          <style>{`* { cursor: crosshair !important; }`}</style>

          {/* Full-screen capture layer */}
          <div
            ref={captureRef}
            className="absolute inset-0 pointer-events-auto"
            style={{ zIndex: 250 }}
            onMouseMove={handleInspectorMouseMove}
            onClick={handleInspectorClick}
          />

          {/* Hover highlight box */}
          {hoverInfo && (
            <div
              className="fixed pointer-events-none"
              style={{
                left: hoverInfo.rect.left - 2,
                top: hoverInfo.rect.top - 2,
                width: hoverInfo.rect.width + 4,
                height: hoverInfo.rect.height + 4,
                border: '2px solid #2665fd',
                boxShadow: '0 0 0 3px rgba(38,101,253,0.2), inset 0 0 12px rgba(38,101,253,0.08)',
                background: 'rgba(38,101,253,0.07)',
                borderRadius: 3,
                zIndex: 260,
                transition: 'left 60ms, top 60ms, width 60ms, height 60ms',
              }}
            >
              {/* Element label */}
              <div
                className="absolute left-0 text-[10px] font-mono text-white px-2 py-0.5 rounded whitespace-nowrap max-w-xs overflow-hidden text-ellipsis pointer-events-none"
                style={{
                  background: '#2665fd',
                  top: hoverInfo.rect.top > 24 ? -22 : hoverInfo.rect.height + 4,
                }}
              >
                {hoverInfo.desc}
              </div>

              {/* Size label bottom-right */}
              <div
                className="absolute -bottom-5 right-0 text-[10px] font-mono text-[#2665fd] whitespace-nowrap pointer-events-none"
              >
                {Math.round(hoverInfo.rect.width)} × {Math.round(hoverInfo.rect.height)}
              </div>
            </div>
          )}

          {/* Inspector hint bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-[300]">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#111]/90 border border-[#2665fd]/30 rounded-full text-[11px] font-mono text-white/60 shadow-xl backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#2665fd] animate-pulse" />
              點擊元件複製資訊　ESC 退出
            </div>
          </div>
        </>
      )}

      {/* ── Box Mode ── */}
      {!inspectorMode && (
        <>
          {/* Very subtle full-screen tint */}
          <div className="absolute inset-0 bg-red-950/5 pointer-events-auto" onMouseDown={e => e.stopPropagation()} />

          {/* Crosshair grid lines */}
          <div className="absolute pointer-events-none" style={{ left: box.x + box.w / 2, top: 0, width: 1, height: '100%', background: 'rgba(239,68,68,0.15)' }} />
          <div className="absolute pointer-events-none" style={{ top: box.y + box.h / 2, left: 0, height: 1, width: '100%', background: 'rgba(239,68,68,0.15)' }} />

          {/* Selection Box */}
          <div
            className="absolute border-2 border-red-500 bg-red-500/[0.12] cursor-move pointer-events-auto"
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            onMouseDown={handleBoxMouseDown}
          >
            <div className="absolute -top-6 left-0 bg-red-500 text-white text-[10px] font-mono px-2 py-0.5 rounded-t whitespace-nowrap pointer-events-none">
              {Math.round(box.w)} × {Math.round(box.h)} px
            </div>
            <div className="absolute -bottom-6 left-0 text-red-400 text-[10px] font-mono whitespace-nowrap pointer-events-none">
              ({Math.round(box.x)}, {Math.round(box.y)})
            </div>

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-red-400/30" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-400/30" />
            </div>

            {[['top-0 left-0', '-translate-x-1/2 -translate-y-1/2'],
              ['top-0 right-0', 'translate-x-1/2 -translate-y-1/2'],
              ['bottom-0 left-0', '-translate-x-1/2 translate-y-1/2']].map(([pos, tr], i) => (
              <div key={i} className={`absolute ${pos} w-2 h-2 bg-red-500 rounded-full pointer-events-none transform ${tr}`} />
            ))}

            <div
              className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-sm cursor-se-resize pointer-events-auto transition-colors flex items-center justify-center"
              onMouseDown={handleResizeMouseDown}
              title="拖曳調整大小"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white" className="pointer-events-none">
                <path d="M2 6L6 2M4 6L6 4M6 6L6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Export Button */}
          <div
            className="absolute pointer-events-auto"
            style={{ left: box.x, top: box.y + box.h + 10 }}
          >
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[11px] font-mono font-bold rounded-lg shadow-xl transition-colors"
              onClick={generateExport}
            >
              <span className="material-symbols-outlined text-[13px]">target</span>
              匯出座標與模塊資訊
            </button>
          </div>

          {/* Export Text Panel */}
          {showExport && (
            <div
              className="absolute pointer-events-auto bg-[#1A1A1A] border border-red-500/25 rounded-xl shadow-2xl overflow-hidden"
              style={{
                left: exportPanelLeft,
                top: exportPanelTop,
                width: 450,
                maxHeight: 300,
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-red-950/50 border-b border-red-500/20 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-widest">Debug Export</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[10px] font-mono rounded-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-[12px]">{copied ? 'check' : 'content_copy'}</span>
                    {copied ? '已複製！' : '複製全部'}
                  </button>
                  <button
                    onClick={() => setShowExport(false)}
                    className="text-red-400/50 hover:text-red-400 text-sm leading-none transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <pre className="p-4 text-[11px] font-mono text-on-surface/80 overflow-auto leading-relaxed whitespace-pre" style={{ maxHeight: 240 }}>
                {exportText}
              </pre>
            </div>
          )}
        </>
      )}

      {/* ── Toast Notification (shared between modes) ── */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
          <div
            className="flex items-center gap-2.5 px-5 py-3 text-white text-[13px] font-medium rounded-2xl shadow-2xl"
            style={{ background: '#2665fd' }}
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
