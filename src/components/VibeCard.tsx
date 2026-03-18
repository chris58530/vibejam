import React, { useState } from 'react';
import { Eye, MessageSquare, Repeat, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Vibe } from '../lib/api';

interface VibeCardProps {
  vibe: Vibe;
  onClick: () => void;
}

export default function VibeCard({ vibe, onClick }: VibeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  // We can freeze JS and CSS animations when not hovered by injecting a script
  // and style, to simulate a "static" preview state.
  const freezeScript = `
    <style>*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }</style>
    <script>
      // Override requestAnimationFrame to freeze canvas
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = function(cb) {
        // Only run once to render initial state, then freeze
        if (!window.hasRenderedFirstFrame) {
          window.hasRenderedFirstFrame = true;
          return originalRaf(cb);
        }
        return 0;
      };
      // Override setInterval for canvas loops
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

  // Inject the freeze script to disable animations when not hovered
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
      whileHover={{ y: -8 }}
      className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden group cursor-pointer flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden w-full">
        {/* Always render iframe, but show static state when not hovered */}
        <div className={`absolute inset-0 z-10 transition-opacity duration-300 pointer-events-none ${isHovered ? 'bg-transparent' : 'bg-black/20 backdrop-grayscale-[0.5]'}`} />

        <iframe
          srcDoc={previewCode}
          className="absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left border-none pointer-events-none bg-white"
          title={vibe.title}
          sandbox="allow-scripts allow-same-origin"
        />

        <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/@${encodeURIComponent(vibe.author_name)}`);
            }}
            className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 cursor-pointer hover:bg-black/80 transition-colors"
          >
            <img src={vibe.author_avatar} alt={vibe.author_name} className="w-4 h-4 rounded-full" />
            <span className="text-[10px] text-white/80 font-medium">{vibe.author_name}</span>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <div className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
            V{vibe.latest_version}
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-2 group-hover:text-indigo-400 transition-colors">
          {vibe.title}
        </h3>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-3">
            <div className="flex items-center gap-1 text-white/40 text-[11px]">
              <Eye className="w-3 h-3" />
              {vibe.views}
            </div>
            <div className="flex items-center gap-1 text-white/40 text-[11px]">
              <MessageSquare className="w-3 h-3" />
              {vibe.comment_count}
            </div>
            <div className="flex items-center gap-1 text-white/40 text-[11px]">
              <Repeat className="w-3 h-3" />
              {vibe.remix_count}
            </div>
          </div>

          <div className="flex gap-1">
            {vibe.tags?.split(',').slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] text-white/30 uppercase tracking-wider">
                #{tag.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
