import React, { useEffect, useRef, useState } from 'react';
import { devLog, LogEntry } from '../lib/devLog';

export default function DevLogPanel() {
  const [open, setOpen]           = useState(false);
  const [entries, setEntries]     = useState<LogEntry[]>(() => devLog.getEntries());
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied]       = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => devLog.subscribe(() => setEntries([...devLog.getEntries()])), []);

  useEffect(() => {
    if (autoScroll && open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries, autoScroll, open]);

  const errorCount = entries.filter(e => e.type === 'error').length;
  const warnCount  = entries.filter(e => e.type === 'warn').length;

  const copyAll = async () => {
    const t0 = entries[0]?.timestamp ?? Date.now();
    const text = entries.map(e => {
      const rel = `+${((e.timestamp - t0) / 1000).toFixed(3)}s`;
      return `[${rel}] [${e.type.toUpperCase().padEnd(5)}] ${e.message}`;
    }).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: textarea trick
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="開啟 DevLog 面板"
        className="fixed bottom-20 right-[7.5rem] md:bottom-6 md:right-[9rem] z-[199] w-11 h-11 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 bg-surface-container-high text-on-surface/50 hover:text-green-400 hover:bg-green-500/10 hover:ring-2 hover:ring-green-500/20"
      >
        <span className="material-symbols-outlined text-[20px]">terminal</span>
        {(errorCount > 0 || warnCount > 0) && (
          <span className={`absolute -top-1 -right-1 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${errorCount > 0 ? 'bg-red-500' : 'bg-yellow-500'}`}>
            {Math.min(errorCount || warnCount, 9)}
          </span>
        )}
      </button>

      {/* ── Panel ────────────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-0 right-0 md:bottom-20 md:right-4 z-[300] w-full md:w-[460px] h-[65vh] md:h-[520px] flex flex-col overflow-hidden md:rounded-xl shadow-2xl"
          style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0"
            style={{ background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-green-400">terminal</span>
              <span className="text-xs font-mono text-white/70 font-semibold">DevLog</span>
              <span className="text-[10px] text-white/30 font-mono">{entries.length} entries</span>
              {errorCount > 0 && <span className="text-[10px] text-red-400 font-mono">{errorCount}E</span>}
              {warnCount  > 0 && <span className="text-[10px] text-yellow-400 font-mono">{warnCount}W</span>}
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={copyAll}
                className="px-2 py-1 text-[10px] font-mono rounded transition-colors flex items-center gap-1 text-white/50 hover:text-white hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[12px]">content_copy</span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => devLog.clear()}
                className="px-2 py-1 text-[10px] font-mono rounded transition-colors text-white/50 hover:text-white hover:bg-white/10"
              >
                Clear
              </button>
              <button onClick={() => setOpen(false)}
                className="px-2 py-1 text-[10px] font-mono rounded transition-colors text-white/50 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Log list */}
          <div ref={listRef} className="flex-1 overflow-y-auto font-mono text-[11px] leading-[1.6]">
            {entries.length === 0 ? (
              <p className="text-white/20 text-center py-10 text-xs">（暫無 Log）</p>
            ) : entries.map((e, i) => {
              const t0 = entries[0].timestamp;
              const rel = `+${((e.timestamp - t0) / 1000).toFixed(3)}s`;
              return (
                <div key={e.id}
                  className={`px-3 py-[2px] ${
                    e.type === 'error' ? 'text-red-400 bg-red-900/10' :
                    e.type === 'warn'  ? 'text-yellow-300 bg-yellow-900/10' :
                    e.type === 'info'  ? 'text-blue-300' :
                    'text-white/55'
                  }`}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                >
                  <span className="text-white/20 select-none mr-1.5">{rel}</span>
                  <span className={`mr-1.5 text-[9px] font-bold uppercase select-none ${
                    e.type === 'error' ? 'text-red-500' :
                    e.type === 'warn'  ? 'text-yellow-500' :
                    e.type === 'info'  ? 'text-blue-400' :
                    'text-white/20'
                  }`}>[{e.type}]</span>
                  <span className="break-all whitespace-pre-wrap">{e.message}</span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1.5 shrink-0"
            style={{ background: '#161b22', borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="w-3 h-3 accent-green-500" />
              <span className="text-[10px] text-white/35 font-mono">Auto-scroll</span>
            </label>
            <span className="text-[10px] text-white/20 font-mono">時間軸從第一條 log 起算</span>
          </div>
        </div>
      )}
    </>
  );
}
