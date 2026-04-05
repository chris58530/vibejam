import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Vibe } from '../lib/api';

interface VibeCardProps {
  key?: string | number;
  vibe: Vibe;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export default function VibeCard({ vibe, onClick }: VibeCardProps) {
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
          sandbox="allow-scripts allow-same-origin"
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
              navigate(`/@${encodeURIComponent(vibe.author_name)}`);
            }}
          />
        </div>
        
        {/* Text */}
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="font-mono font-bold text-sm text-[#E5E2E1] leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {vibe.title}
          </h3>
          {vibe.description && (
            <p className="text-[11px] text-[#E5E2E1]/35 mt-0.5 line-clamp-1">{vibe.description}</p>
          )}
          <span
            className="text-xs text-[#E5E2E1]/60 mt-1 hover:text-[#E5E2E1] transition-colors truncate"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/@${encodeURIComponent(vibe.author_name)}`);
            }}
          >
            @{vibe.author_name}
          </span>
          <div className="flex items-center text-[11px] text-[#E5E2E1]/40 mt-0.5">
            <span>{vibe.views} views</span>
            <span className="mx-1.5">•</span>
            <span>{timeAgo(vibe.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

