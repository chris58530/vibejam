import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { api, toSlug, Vibe } from '../lib/api';
import VibeCard from '../components/VibeCard';

export default function Home() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getVibes().then(data => {
      setVibes(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const featuredVibes = vibes.slice(0, 3);

  const handleSelectVibe = (vibe: Vibe) => {
    navigate(`/@${encodeURIComponent(vibe.author_name)}/${toSlug(vibe.title)}`);
  };

  return (
    <div className="pt-20 pb-20 px-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="mb-16 relative h-[60vh] rounded-3xl overflow-hidden border border-white/10 group">
        {featuredVibes.length > 0 ? (
          <div className="absolute inset-0">
            <iframe
              srcDoc={featuredVibes[0].latest_code}
              className="w-full h-full border-none pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity"
              title="Featured"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-12 left-12 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="text-indigo-400 font-bold text-sm uppercase tracking-[0.3em] mb-4 block">
                  Featured Vibe
                </span>
                <h1 className="text-6xl md:text-8xl font-black text-white leading-none mb-6 tracking-tighter">
                  {featuredVibes[0].title}
                </h1>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleSelectVibe(featuredVibes[0])}
                    className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-indigo-500 hover:text-white transition-all transform hover:scale-105"
                  >
                    View Project
                  </button>
                  <div className="flex items-center gap-2">
                    <img src={featuredVibes[0].author_avatar} className="w-10 h-10 rounded-full border border-white/20" />
                    <span className="text-white/60 font-medium">by {featuredVibes[0].author_name}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <span className="text-white/20 font-bold text-2xl">Discovering Vibes...</span>
          </div>
        )}
      </section>

      {/* Filter Bar */}
      <div className="flex gap-4 mb-12 overflow-x-auto pb-4 no-scrollbar">
        {['All', '3D Effects', 'SaaS Dashboards', 'Micro-interactions', 'Pure CSS', 'Generative Art'].map(tag => (
          <button
            key={tag}
            className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white hover:border-white/20 transition-all whitespace-nowrap"
          >
            #{tag.replace(' ', '')}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-white/5 rounded-2xl animate-pulse" />
          ))
        ) : (
          vibes.map(vibe => (
            <VibeCard
              key={vibe.id}
              vibe={vibe}
              onClick={() => handleSelectVibe(vibe)}
            />
          ))
        )}
      </div>
    </div>
  );
}
