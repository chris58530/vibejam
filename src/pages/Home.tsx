import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Vibe } from '../lib/api';
import Footer from '../components/Footer';

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

const FREEZE_SCRIPT = `
  <style>*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }</style>
  <script>
    const orig = window.requestAnimationFrame;
    window.requestAnimationFrame = function(cb) {
      if (!window.hasRenderedFirstFrame) { window.hasRenderedFirstFrame = true; return orig(cb); }
      return 0;
    };
  </script>
`;

// ─── HomeCard ─────────────────────────────────────────────────────────────────
function HomeCard({ vibe, onSelect }: { vibe: Vibe; onSelect: (v: Vibe) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const rawCode = vibe.latest_code || '';
  const previewCode = isHovered
    ? rawCode
    : (rawCode.includes('<head>') ? rawCode.replace('<head>', '<head>' + FREEZE_SCRIPT) : FREEZE_SCRIPT + rawCode);

  const avatarSrc = vibe.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(vibe.author_name)}`;

  return (
    <div
      onClick={() => onSelect(vibe)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group cursor-pointer bg-white/[0.03] backdrop-blur-sm rounded-2xl overflow-hidden border border-white/5 hover:border-primary/20 transition-all duration-250"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-surface-container-lowest">
        <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100 bg-black/25'}`} />
        <iframe
          srcDoc={previewCode}
          className="absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left border-none pointer-events-none group-hover:scale-[0.51] transition-transform duration-500"
          title={vibe.title}
          sandbox="allow-scripts"
          loading="lazy"
        />
        {/* Views badge */}
        <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 z-20 pointer-events-none text-on-surface/80">
          {formatViews(vibe.views)}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-4">
          <button
            className="w-10 h-10 rounded-full border border-primary/30 p-0.5 flex-shrink-0 cursor-pointer hover:border-primary/60 transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/@${encodeURIComponent(vibe.author_name)}`); }}
          >
            <img
              src={avatarSrc}
              alt={vibe.author_name}
              className="w-full h-full rounded-full object-cover"
            />
          </button>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-on-surface truncate">{vibe.author_name}</h4>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{timeAgo(vibe.created_at)}</p>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold tracking-tight mb-1.5 text-on-surface group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug">
          {vibe.title}
        </h3>

        {/* Description */}
        {vibe.description && (
          <p className="text-sm text-zinc-400 mb-5 leading-relaxed line-clamp-2">{vibe.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <span className="material-symbols-outlined text-[18px]">favorite</span>
              <span className="text-xs font-bold">{formatViews(vibe.like_count ?? 0)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
              <span className="text-xs font-bold">{vibe.comment_count ?? 0}</span>
            </div>
            {(vibe.remix_count ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <span className="material-symbols-outlined text-[18px]">fork_right</span>
                <span className="text-xs font-bold">{vibe.remix_count}</span>
              </div>
            )}
          </div>
          <span className="material-symbols-outlined text-zinc-600 cursor-pointer hover:text-primary transition-colors duration-200 text-[20px]">
            more_horiz
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Trending Hero ──────────────────────────────────────────────────────────────
function TrendingHero({ vibe, onSelect }: { vibe?: Vibe; onSelect: (v: Vibe) => void }) {
  if (!vibe) return null;

  const rawCode = vibe.latest_code || '';
  const code = rawCode.includes('<head>') ? rawCode.replace('<head>', '<head>' + FREEZE_SCRIPT) : FREEZE_SCRIPT + rawCode;

  return (
    <section 
      onClick={() => onSelect(vibe)}
      className="relative aspect-[21/9] lg:aspect-[16/6] rounded-2xl overflow-hidden mb-8 lg:mb-12 group cursor-pointer border border-white/5 shadow-2xl"
    >
      <div className="absolute inset-0 bg-surface-container-lowest transition-transform duration-700 transform scale-105 group-hover:scale-100 pointer-events-none">
        <iframe
          srcDoc={code}
          className="absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left border-none pointer-events-none"
          title={vibe.title}
          sandbox="allow-scripts"
          loading="lazy"
        />
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none"></div>
      
      <div className="absolute bottom-0 left-0 p-6 lg:p-12 w-full bg-white/[0.02] backdrop-blur-md border-t border-white/5">
        <div className="max-w-3xl">
          <span className="bg-primary-container text-on-primary text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3 md:mb-4 inline-block">
            Trending Now
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-6xl font-black tracking-tighter text-on-surface mb-2 font-headline drop-shadow-lg line-clamp-2">
            {vibe.title}
          </h1>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-primary/30 p-0.5 bg-surface">
              <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center text-primary font-bold text-xs md:text-sm">
                {vibe.author_name ? vibe.author_name.charAt(0).toUpperCase() : '?'}
              </div>
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-bold text-on-surface">{vibe.author_name || 'Anonymous'}</h4>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{formatViews(vibe.views)} Views</p>
            </div>
          </div>

          <div className="flex gap-3 md:gap-4">
            <button className="px-6 py-2.5 md:px-8 md:py-3 bg-primary-container text-on-primary rounded-full font-bold text-sm md:text-base hover:shadow-[0_0_32px_rgba(255,179,182,0.4)] transition-all active:scale-95 cursor-pointer">
              Explore Project
            </button>
            <button className="hidden md:block px-8 py-3 bg-white/5 border border-white/10 text-on-surface rounded-full font-bold hover:bg-white/10 transition-all active:scale-95 cursor-pointer backdrop-blur-md">
              Save to Library
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFeed, setActiveFeed] = useState<FeedTab>('movers');
  const navigate = useNavigate();

  const fetchVibes = async (retries = 3) => {
    setLoading(true);
    setError(false);
    for (let i = 0; i < retries; i++) {
      try {
        const data = await api.getVibes();
        if (Array.isArray(data)) {
          setVibes(data);
          setLoading(false);
          return;
        }
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } catch {
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    setLoading(false);
    setError(true);
  };

  useEffect(() => {
    fetchVibes();
  }, []);

  // 切回分頁時自動刷新列表
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        api.getVibes().then(data => {
          if (Array.isArray(data) && data.length > 0) setVibes(data);
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleSelectVibe = (vibe: Vibe) => navigate(`/p/${vibe.id}`);

  // Trending = top 10 by views
  const trendingVibes = [...vibes].sort((a, b) => b.views - a.views).slice(0, 8);

  let filteredVibes = [...vibes];

  if (activeFeed === 'movers') {
    filteredVibes.sort((a, b) => (b.remix_count ?? 0) - (a.remix_count ?? 0) || b.views - a.views);
  } else if (activeFeed === 'new') {
    filteredVibes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (activeFeed === 'market-cap') {
    filteredVibes.sort((a, b) => b.views - a.views);
  } else if (activeFeed === 'oldest') {
    filteredVibes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  return (
    <main className="md:ml-56 md:w-[calc(100vw-14rem)] min-h-screen bg-surface flex flex-col overflow-x-hidden pt-24 pb-12 px-6 lg:px-12 max-w-[1600px] mx-auto">

      {/* ── Trending Hero Section ── */}
      {!loading && trendingVibes.length > 0 && (
        <TrendingHero vibe={trendingVibes[0]} onSelect={handleSelectVibe} />
      )}
      {loading && (
        <div className="aspect-[21/9] lg:aspect-[16/6] bg-surface-container-highest rounded-2xl animate-pulse mb-8 lg:mb-12 border border-white/5" />
      )}

      {/* ── Feed Tabs ── */}
      <div className="flex items-center justify-between mb-8 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-2xl rounded-full border border-white/5 flex-shrink-0">
          {FEED_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFeed(tab.key)}
              className={`px-5 py-2 md:px-6 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeFeed === tab.key
                  ? 'bg-primary-container text-on-primary'
                  : 'text-zinc-400 hover:text-on-surface'
              }`}
            >
              {tab.dot && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tab.dot }} />
              )}
              {tab.label}
            </button>
          ))}
        </div>
        
        <button className="hidden md:flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-on-surface transition-all cursor-pointer flex-shrink-0">
          <span className="material-symbols-outlined text-lg">tune</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
        </button>
      </div>

      {/* ── Card Grid ── */}
      <div className="flex-1 overflow-x-hidden pb-8">
        {error && !loading && vibes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="material-symbols-outlined text-[48px] text-on-surface/20">cloud_off</span>
            <p className="text-on-surface/40 text-sm">無法載入內容，請檢查網路連線</p>
            <button
              onClick={() => fetchVibes()}
              className="px-4 py-2 rounded-full bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors cursor-pointer"
            >
              重新載入
            </button>
          </div>
        ) : !loading && filteredVibes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="material-symbols-outlined text-[48px] text-on-surface/20">explore</span>
            <p className="text-on-surface/40 text-sm">還沒有任何作品，去 Workspace 建立第一個吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-video bg-surface-container-highest rounded-xl animate-pulse" />
                ))
              : filteredVibes.map(vibe => (
                  <HomeCard
                    key={vibe.id}
                    vibe={vibe}
                    onSelect={handleSelectVibe}
                  />
                ))
            }
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}

