import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Vibe } from '../lib/api';

interface VibeCardProps {
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
      className="rounded-none sm:rounded-2xl overflow-hidden group cursor-pointer flex flex-col sm:bg-zinc-900/50 sm:border sm:border-white/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-zinc-950 overflow-hidden w-full">
        <div className={`absolute inset-0 z-10 transition-opacity duration-300 pointer-events-none ${isHovered ? 'bg-transparent' : 'bg-black/20 backdrop-grayscale-[0.5]'}`} />

        <iframe
          srcDoc={previewCode}
          className="absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left border-none pointer-events-none bg-white"
          title={vibe.title}
          sandbox="allow-scripts allow-same-origin"
        />

        {/* Version badge - bottom right */}
        <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
          <div className="bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            V{vibe.latest_version}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex gap-3 p-3 sm:p-4">
        {/* Author avatar */}
        <img
          src={vibe.author_avatar}
          alt={vibe.author_name}
          className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5 object-cover"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/@${encodeURIComponent(vibe.author_name)}`);
          }}
        />
        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white line-clamp-2 leading-snug mb-1 group-hover:text-indigo-400 transition-colors">
            {vibe.title}
          </h3>
          <p className="text-xs text-white/50 truncate">
            {vibe.author_name} · {vibe.views} views · {timeAgo(vibe.created_at)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
