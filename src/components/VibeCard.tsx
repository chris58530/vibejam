import React, { useState } from 'react';
import { Eye, MessageSquare, Repeat, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Vibe } from '../lib/api';

interface VibeCardProps {
  vibe: Vibe;
  onClick: () => void;
}

export default function VibeCard({ vibe, onClick }: VibeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] bg-zinc-800 overflow-hidden">
        {isHovered ? (
          <iframe
            srcDoc={vibe.latest_code}
            className="w-full h-full border-none pointer-events-none scale-[0.5] origin-top-left w-[200%] h-[200%]"
            title={vibe.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
             <div className="text-white/10 font-bold text-4xl uppercase tracking-widest select-none">
               {vibe.title.split(' ')[0]}
             </div>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
            <img src={vibe.author_avatar} alt={vibe.author_name} className="w-4 h-4 rounded-full" />
            <span className="text-[10px] text-white/80 font-medium">{vibe.author_name}</span>
          </div>
        </div>

        <div className="absolute bottom-3 left-3">
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
