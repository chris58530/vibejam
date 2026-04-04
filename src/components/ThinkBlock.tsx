import React, { useState, useEffect } from 'react';

interface ThinkBlockProps {
  content: string;
  isStreaming?: boolean;
}

export default function ThinkBlock({ content, isStreaming = false }: ThinkBlockProps) {
  const [expanded, setExpanded] = useState(true);

  // 串流中自動展開；完成後自動收合
  useEffect(() => {
    setExpanded(isStreaming);
  }, [isStreaming]);

  return (
    <div className="mb-2 rounded-xl border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-container transition-colors text-left"
      >
        {/* 網站 Beaver Icon */}
        <img
          src="/Icon.png"
          alt="BeaverBot"
          className="w-4 h-4 rounded-full opacity-60 shrink-0"
          style={{ filter: 'grayscale(20%)' }}
        />

        {/* 標題：串流中有 shimmer 動畫 */}
        <span className={`text-xs font-medium italic flex-1 ${isStreaming ? 'thinking-shimmer-text' : 'text-on-surface/45'}`}>
          {isStreaming ? '思考中...' : '思考過程'}
        </span>

        {/* 串流中的跳動點 */}
        {isStreaming && (
          <span className="flex items-end gap-[3px] mr-1">
            <span className="thinking-dot w-1 h-1 rounded-full bg-primary/60" />
            <span className="thinking-dot w-1 h-1 rounded-full bg-primary/60" />
            <span className="thinking-dot w-1 h-1 rounded-full bg-primary/60" />
          </span>
        )}

        {/* 展開 / 收合箭頭 */}
        <span className="material-symbols-outlined text-[14px] text-on-surface/30 shrink-0">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 text-[11px] italic text-on-surface/35 whitespace-pre-wrap leading-relaxed border-t border-outline-variant/5">
          {content || <span className="opacity-50">…</span>}
        </div>
      )}
    </div>
  );
}
