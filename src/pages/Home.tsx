import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Vibe } from '../lib/api';
import VibeCard from '../components/VibeCard';
import Footer from '../components/Footer';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

// ─── Tag filters (keep existing categories) ───────────────────────────────────
const TAG_FILTERS = ['All Kits', '3D Effects', 'SaaS UI', 'Micro-interactions', 'Tailwind Magic', 'Data Viz', 'Shaders', 'Typography', 'Layouts', 'Canvas Art'];

// ─── Feed tabs ────────────────────────────────────────────────────────────────
type FeedTab = 'movers' | 'new' | 'market-cap' | 'oldest';
const FEED_TABS: { key: FeedTab; label: string; dot?: string }[] = [
  { key: 'movers',     label: 'Movers',     dot: '#F97316' },
  { key: 'new',        label: 'New',        dot: '#22C55E' },
  { key: 'market-cap', label: 'Market Cap' },
  { key: 'oldest',     label: 'Oldest' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Trending Carousel ────────────────────────────────────────────────────────
function TrendingCarousel({ vibes, onSelect }: { vibes: Vibe[]; onSelect: (v: Vibe) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHoveredId, setIsHoveredId] = useState<number | null>(null);

  const freezeScript = `
    <style>*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }</style>
    <script>
      const orig = window.requestAnimationFrame;
      window.requestAnimationFrame = function(cb) {
        if (!window.hasRenderedFirstFrame) { window.hasRenderedFirstFrame = true; return orig(cb); }
        return 0;
      };
    </script>
  `;

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -290 : 290, behavior: 'smooth' });
  };

  if (vibes.length === 0) return null;

  return (
    <div className="relative px-4 pt-3 pb-1">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-semibold text-[#E5E2E1]/50 tracking-widest uppercase">Trending</span>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1 rounded-md hover:bg-white/[0.07] text-[#E5E2E1]/40 hover:text-[#E5E2E1]/80 transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 rounded-md hover:bg-white/[0.07] text-[#E5E2E1]/40 hover:text-[#E5E2E1]/80 transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {vibes.map((vibe) => {
          const isHovered = isHoveredId === vibe.id;
          const rawCode = vibe.latest_code || '';
          const code = isHovered
            ? rawCode
            : (rawCode.includes('<head>') ? rawCode.replace('<head>', '<head>' + freezeScript) : freezeScript + rawCode);

          return (
            <div
              key={vibe.id}
              onClick={() => onSelect(vibe)}
              onMouseEnter={() => setIsHoveredId(vibe.id)}
              onMouseLeave={() => setIsHoveredId(null)}
              className="flex-shrink-0 w-[220px] group cursor-pointer"
            >
              {/* Preview thumbnail */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-container-lowest ring-1 ring-white/[0.06] group-hover:ring-primary/30 transition-all duration-200">
                <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100 bg-black/30'}`} />
                <iframe
                  srcDoc={code}
                  className="absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left border-none pointer-events-none"
                  title={vibe.title}
                  sandbox="allow-scripts allow-same-origin"
                />
                {/* Views badge */}
                <div className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-[#E5E2E1]/80 z-20 pointer-events-none">
                  {formatViews(vibe.views)}
                </div>
              </div>
              {/* Card info below */}
              <div className="mt-1.5 px-0.5">
                <p className="text-xs font-bold text-[#E5E2E1] truncate group-hover:text-primary transition-colors duration-150 leading-tight">
                  {vibe.title}
                </p>
                <p className="text-[10px] text-[#E5E2E1]/40 truncate mt-0.5">
                  {vibe.author_name.slice(0, 8).toUpperCase()} · {vibe.author_name}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFeed, setActiveFeed] = useState<FeedTab>('movers');
  const [activeTag, setActiveTag] = useState('All Kits');
  const navigate = useNavigate();

  useEffect(() => {
    api.getVibes().then(data => {
      setVibes(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelectVibe = (vibe: Vibe) => navigate(`/p/${vibe.id}`);

  // Trending = top 10 by views
  const trendingVibes = [...vibes].sort((a, b) => b.views - a.views).slice(0, 8);

  // Tag filter first, then feed sort
  let filteredVibes = activeTag === 'All Kits'
    ? [...vibes]
    : vibes.filter(v => v.tags?.toLowerCase().includes(activeTag.replace(/\s+/g, '').toLowerCase()));

  if (activeFeed === 'movers') {
    filteredVibes.sort((a, b) => (b.remix_count ?? 0) - (a.remix_count ?? 0) || b.views - a.views);
  } else if (activeFeed === 'new') {
    filteredVibes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (activeFeed === 'market-cap') {
    filteredVibes.sort((a, b) => b.views - a.views);
  } else if (activeFeed === 'oldest') {
    filteredVibes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const maxViews = filteredVibes.reduce((max, v) => Math.max(max, v.views), 1);

  return (
    <main className="md:ml-56 pt-16 min-h-screen bg-surface flex flex-col">

      {/* ── Trending Carousel ── */}
      <TrendingCarousel vibes={trendingVibes} onSelect={handleSelectVibe} />

      {/* ── Feed Tab Bar + Tag filters ── */}
      <div className="sticky top-16 z-30 bg-surface/95 backdrop-blur-md border-b border-white/[0.05]">
        <div className="flex items-center gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {/* Feed tabs */}
          {FEED_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFeed(tab.key)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap cursor-pointer
                border-b-2 transition-all duration-150
                ${activeFeed === tab.key
                  ? 'border-primary text-[#E5E2E1]'
                  : 'border-transparent text-[#E5E2E1]/45 hover:text-[#E5E2E1]/75 hover:border-white/20'}
              `}
            >
              {tab.dot && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tab.dot }} />
              )}
              {tab.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-white/[0.1] mx-1 flex-shrink-0" />

          {/* Category tag filters */}
          {TAG_FILTERS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`
                px-3 py-2.5 text-xs font-medium whitespace-nowrap cursor-pointer
                border-b-2 transition-all duration-150
                ${activeTag === tag && activeFeed === 'movers'
                  ? 'border-primary/50 text-[#E5E2E1]/90'
                  : 'border-transparent text-[#E5E2E1]/35 hover:text-[#E5E2E1]/60 hover:border-white/10'}
              `}
            >
              {tag}
            </button>
          ))}

          {/* Filter icon */}
          <div className="ml-auto pr-3 pl-2 flex items-center flex-shrink-0">
            <button
              className="p-1.5 rounded-md hover:bg-white/[0.07] text-[#E5E2E1]/35 hover:text-[#E5E2E1]/70 transition-colors cursor-pointer"
              aria-label="Filter"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Card Grid ── */}
      <div className="px-4 py-3 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-video bg-surface-container-highest rounded-xl animate-pulse" />
              ))
            : filteredVibes.map(vibe => (
                <VibeCard
                  key={vibe.id}
                  vibe={vibe}
                  onClick={() => handleSelectVibe(vibe)}
                />
              ))
          }
        </div>
      </div>

      <Footer />
    </main>
  );
}

