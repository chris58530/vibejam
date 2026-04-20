import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Vibe } from '../lib/api';

interface VibeCardProps {
  key?: string | number;
  vibe: Vibe;
  onClick: () => void;
  compact?: boolean;
  maxViews?: number;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function VibeCard({ vibe, onClick, compact = false, maxViews = 1 }: VibeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const freezeScript = `
    <style>*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }</style>
    <script>
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = function(cb) {
        if (!window.hasRenderedFirstFrame) {
          window.hasRenderedFirstFrame = true;
          return originalRaf(cb);
        }
        return 0;
      };
      const originalSetInterval = window.setInterval;
      window.setInterval = function(cb, time) {
        originalSetInterval(() => {
           if (window.hasRenderedFirstFrame) return;
           cb();
           window.hasRenderedFirstFrame = true;
        }, time);
      };
    </script>
  `;

  const rawCode = vibe.latest_code || '';
  const previewCode = isHovered
    ? rawCode
    : (rawCode.includes('<head>')
      ? rawCode.replace('<head>', '<head>' + freezeScript)
      : freezeScript + rawCode);

  const avatarSrc = vibe.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vibe.author_name}`;
  const progressPct = maxViews > 0 ? Math.min(100, (vibe.views / maxViews) * 100) : 0;
  const remixBadge = (vibe.remix_count ?? 0) > 0 ? `+${vibe.remix_count}` : null;

  /* ── Compact (pump.fun) style ── */
  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="group cursor-pointer flex flex-row gap-2.5 p-2 rounded-lg hover:bg-on-surface/[0.04] transition-colors duration-150"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* Square iframe thumbnail */}
        <div className="relative w-[68px] h-[68px] flex-shrink-0 rounded-lg overflow-hidden bg-surface-container-lowest ring-1 ring-on-surface/[0.06] group-hover:ring-primary/30 transition-all duration-200">
          <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100 bg-black/25'}`} />
          <iframe
            srcDoc={previewCode}
            className="absolute top-0 left-0 border-none pointer-events-none"
            style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: 'top left' }}
            title={vibe.title}
            sandbox="allow-scripts allow-pointer-lock"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Title + ticker */}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-bold text-[13px] text-on-surface truncate leading-tight group-hover:text-primary transition-colors duration-150">
              {vibe.title}
            </span>
            <span className="text-[10px] text-on-surface/35 font-mono flex-shrink-0">
              {vibe.author_name.slice(0, 6).toUpperCase()}
            </span>
          </div>

          {/* Author + time */}
          <div className="flex items-center gap-1 mt-0.5">
            <img
              src={avatarSrc}
              alt={vibe.author_name}
              className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); navigate(`/u/${encodeURIComponent(vibe.author_name)}`); }}
            />
            <span
              className="text-[10px] text-on-surface/40 hover:text-on-surface/70 transition-colors truncate cursor-pointer"
              onClick={(e) => { e.stopPropagation(); navigate(`/u/${encodeURIComponent(vibe.author_name)}`); }}
            >
              {vibe.author_name}
            </span>
            <span className="text-[10px] text-on-surface/25">·</span>
            <span className="text-[10px] text-on-surface/35 flex-shrink-0">{timeAgo(vibe.created_at)}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] text-on-surface/55 font-mono flex-shrink-0">
              MC {formatViews(vibe.views)}
            </span>
            <div className="flex-1 h-[3px] bg-on-surface/[0.07] rounded-full overflow-hidden min-w-0">
              <div
                className="h-full bg-on-surface/25 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {remixBadge && (
              <span className="text-[10px] text-green-400 font-mono flex-shrink-0">{remixBadge} remixed</span>
            )}
          </div>

          {/* Description */}
          {vibe.description && (
            <p className="text-[10px] text-on-surface/30 mt-0.5 line-clamp-1 leading-tight">
              {vibe.description}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  /* ── Default (full) style ── */
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-surface-container-lowest rounded-xl overflow-hidden ring-1 ring-black/[0.07] group-hover:ring-primary/25 transition-all duration-300 w-full">
        <div className={`absolute inset-0 z-10 transition-opacity duration-300 pointer-events-none ${isHovered ? 'bg-transparent' : 'bg-black/20 backdrop-grayscale-[0.5]'}`} />

        <iframe
          srcDoc={previewCode}
          className="absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left border-none pointer-events-none bg-white opacity-80 group-hover:scale-[0.52] group-hover:opacity-100 transition-all duration-500 rounded-[10px]"
          title={vibe.title}
          sandbox="allow-scripts allow-pointer-lock"
          loading="lazy"
        />

        {/* Version badge - bottom right */}
        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white z-20 pointer-events-none">
          V{vibe.latest_version}
        </div>
        {/* Visibility badge - top left */}
        {vibe.visibility && vibe.visibility !== 'public' && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-white z-20 pointer-events-none">
            <span className="material-symbols-outlined text-[10px]">{vibe.visibility === 'private' ? 'lock' : 'link'}</span>
            {vibe.visibility}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="mt-3 flex gap-3">
        {/* Author avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-surface-container-high overflow-hidden mt-0.5 ring-1 ring-black/[0.07]">
          <img
            src={vibe.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vibe.author_name}`}
            alt={vibe.author_name}
            className="w-full h-full object-cover"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/u/${encodeURIComponent(vibe.author_name)}`);
            }}
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="font-mono font-bold text-sm text-on-surface leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {vibe.title}
          </h3>
          {vibe.description && (
            <p className="text-[11px] text-on-surface/35 mt-0.5 line-clamp-1">{vibe.description}</p>
          )}
          <span
            className="text-xs text-on-surface/60 mt-1 hover:text-on-surface transition-colors truncate"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/u/${encodeURIComponent(vibe.author_name)}`);
            }}
          >
            @{vibe.author_name}
          </span>
          <div className="flex items-center text-[11px] text-on-surface/40 mt-0.5">
            <span>{formatViews(vibe.views)} views</span>
            <span className="mx-1.5">·</span>
            <span>{timeAgo(vibe.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

