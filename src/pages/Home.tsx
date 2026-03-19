import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, toSlug, Vibe } from '../lib/api';
import VibeCard from '../components/VibeCard';

const FILTERS = ['All', '3D Effects', 'SaaS Dashboards', 'Micro-interactions', 'Pure CSS', 'Generative Art'];

export default function Home() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    api.getVibes().then(data => {
      setVibes(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelectVibe = (vibe: Vibe) => {
    navigate(`/@${encodeURIComponent(vibe.author_name)}/${toSlug(vibe.title)}`);
  };

  const filteredVibes = activeFilter === 'All'
    ? vibes
    : vibes.filter(v => v.tags?.toLowerCase().includes(activeFilter.toLowerCase()));

  const trendingVibes = vibes.slice(0, 6);
  const latestVibes = vibes.slice(6, 12).length > 0 ? vibes.slice(6, 12) : vibes.slice(0, 6);

  return (
    <div className="pt-20 pb-20 max-w-7xl mx-auto">
      {/* Shelves */}
      {!loading && vibes.length > 0 && (
        <>
          {/* Trending Today shelf */}
          <section className="mb-8 px-0 sm:px-6">
            <h2 className="text-lg font-bold text-white mb-3 px-4 sm:px-0">🔥 Trending Today</h2>
            <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar px-4 sm:px-0">
              {trendingVibes.map(vibe => (
                <div key={vibe.id} className="w-64 flex-shrink-0">
                  <VibeCard vibe={vibe} onClick={() => handleSelectVibe(vibe)} />
                </div>
              ))}
            </div>
          </section>

          {/* Latest Uploads shelf */}
          <section className="mb-8 px-0 sm:px-6">
            <h2 className="text-lg font-bold text-white mb-3 px-4 sm:px-0">✨ Latest Uploads</h2>
            <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar px-4 sm:px-0">
              {latestVibes.map(vibe => (
                <div key={vibe.id} className="w-64 flex-shrink-0">
                  <VibeCard vibe={vibe} onClick={() => handleSelectVibe(vibe)} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Filter Bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar px-4 sm:px-6">
        {FILTERS.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === tag
                ? 'bg-white text-black'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            {tag === 'All' ? 'All' : `#${tag.replace(' ', '')}`}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 sm:gap-6 px-0 sm:px-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-white/5 sm:rounded-2xl animate-pulse" />
          ))
        ) : (
          filteredVibes.map(vibe => (
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
