import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, toSlug, Vibe } from '../lib/api';
import VibeCard from '../components/VibeCard';
import Footer from '../components/Footer';

const FILTERS = ['All Vibes', '3D Effects', 'SaaS UI', 'Micro-interactions', 'Tailwind Magic', 'Data Viz', 'Shaders', 'Typography', 'Layouts', 'Canvas Art'];

export default function Home() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All Vibes');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.getVibes().then(data => {
      setVibes(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelectVibe = (vibe: Vibe) => {
    navigate(`/@${encodeURIComponent(vibe.author_name)}/${toSlug(vibe.title)}`);
  };

  // Determine which feed we are on based on the query param
  const isTrending = location.search.includes('feed=trending');
  const isFollowing = location.search.includes('feed=following');

  let filteredVibes = activeFilter === 'All Vibes'
    ? vibes
    : vibes.filter(v => v.tags?.toLowerCase().includes(activeFilter.replace(' ', '').toLowerCase()));

  // Apply feed sorting/filtering logic
  if (isTrending) {
    filteredVibes = [...filteredVibes].sort((a, b) => b.id - a.id); 
  } else if (isFollowing) {
    filteredVibes = filteredVibes.filter(v => typeof v.author_name === 'string' && ['小仔', '陰陽'].includes(v.author_name));
  }

  return (
    <main className="md:ml-16 pt-16 min-h-screen bg-surface">
      {/* Hero Section */}
      <div className="px-6 pt-8 pb-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface font-headline tracking-tight">
            Discover Creative Code
          </h1>
          <p className="text-sm text-on-surface/50 mt-2 leading-relaxed">
            Explore interactive experiments, remix and build on the work of other creators.
          </p>
        </div>
      </div>

      {/* Scrolling Tag Bar */}
      <div className="sticky top-16 z-40 bg-surface/90 backdrop-blur-md px-6 py-3">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar whitespace-nowrap hide-scrollbar">
          {FILTERS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveFilter(tag)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === tag
                  ? 'bg-[#E5E2E1] text-[#131313]'
                  : 'bg-surface-container-high text-[#E5E2E1]/80 hover:bg-surface-container-highest'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Vibe Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video bg-surface-container-highest rounded-lg animate-pulse" />
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
      
      {/* Footer */}
      <Footer />
    </main>
  );
}


