import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { api, Vibe } from '../lib/api';
import Footer from '../components/Footer';

type FeedTab = 'movers' | 'new' | 'market-cap' | 'oldest';

const FEED_TABS: { key: FeedTab; label: string; dotClass?: string }[] = [
  { key: 'movers', label: 'For You', dotClass: 'bg-primary' },
  { key: 'new', label: 'Recent', dotClass: 'bg-tertiary' },
  { key: 'market-cap', label: 'Popular', dotClass: 'bg-primary-container' },
  { key: 'oldest', label: 'Archive' },
];

const FEED_COPY: Record<FeedTab, { eyebrow: string; description: string }> = {
  movers: {
    eyebrow: 'Remix Momentum',
    description: 'Projects pulling the most remixes and repeat visits across the public feed.',
  },
  new: {
    eyebrow: 'Fresh Drop',
    description: 'The latest community builds, surfaced before the feed gets crowded.',
  },
  'market-cap': {
    eyebrow: 'Audience Magnet',
    description: 'The most-viewed work on BeaverKit right now, ranked by attention.',
  },
  oldest: {
    eyebrow: 'Archive Highlight',
    description: 'Older experiments worth another pass instead of disappearing into history.',
  },
};

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

function getPreviewCode(rawCode: string, isLive: boolean): string {
  if (isLive) return rawCode;
  return rawCode.includes('<head>')
    ? rawCode.replace('<head>', '<head>' + FREEZE_SCRIPT)
    : FREEZE_SCRIPT + rawCode;
}

function getAvatarSrc(vibe: Vibe): string {
  return vibe.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(vibe.author_name)}`;
}

function parseTags(tags?: string): string[] {
  if (!tags) return [];

  const seen = new Set<string>();
  return tags
    .split(/[\n,]+/)
    .flatMap((part) => part.split(/\s+/))
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/^#+/, ''))
    .filter((tag) => {
      const normalized = tag.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 3)
    .map((tag) => `#${tag}`);
}

function ProjectMetaRow({ vibe }: { vibe: Vibe }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={`Open ${vibe.author_name} profile`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/@${encodeURIComponent(vibe.author_name)}`);
        }}
        className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-high transition-colors duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <img
          src={getAvatarSrc(vibe)}
          alt={vibe.author_name}
          className="h-full w-full object-cover"
        />
      </button>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-on-surface">{vibe.author_name}</p>
        <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/45">{timeAgo(vibe.created_at)}</p>
      </div>
    </div>
  );
}

function SideRailCard({ vibe, label, onSelect }: { vibe: Vibe; label: string; onSelect: (v: Vibe) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article
      onClick={() => onSelect(vibe)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative cursor-pointer overflow-hidden rounded-3xl border border-outline-variant/15 transition-colors duration-200 hover:border-primary/25"
    >
      {/* Full-bleed preview background */}
      <div className="relative aspect-video overflow-hidden bg-surface-container-lowest">
        <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100 bg-black/20'}`} />
        <iframe
          srcDoc={getPreviewCode(vibe.latest_code || '', isHovered)}
          className="absolute top-0 left-0 h-[200%] w-[200%] origin-top-left scale-50 border-none pointer-events-none transition-transform duration-500 group-hover:scale-[0.51]"
          title={vibe.title}
          sandbox="allow-scripts"
          loading="lazy"
        />
        {/* Bottom gradient for text readability */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
      </div>

      {/* Overlay text content */}
      <div className="absolute inset-x-0 bottom-0 z-20 space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-on-primary">
            {label}
          </span>
          <span className="text-[11px] font-medium text-white/60">{formatViews(vibe.views)} views</span>
        </div>
        <h3 className="line-clamp-1 text-base font-bold tracking-tight text-white transition-colors duration-200 group-hover:text-primary-container">
          {vibe.title}
        </h3>
        <div className="flex items-center gap-2">
          <img
            src={getAvatarSrc(vibe)}
            alt={vibe.author_name}
            className="h-5 w-5 rounded-full object-cover border border-white/20 flex-shrink-0"
          />
          <span className="text-[11px] text-white/65 truncate">{vibe.author_name}</span>
          <span className="text-[10px] text-white/35 flex-shrink-0">{timeAgo(vibe.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function FeaturedShowcase({
  featured,
  supporting,
  feed,
  totalProjects,
  totalViews,
  totalRemixes,
  onSelect,
}: {
  featured: Vibe;
  supporting: Vibe[];
  feed: FeedTab;
  totalProjects: number;
  totalViews: number;
  totalRemixes: number;
  onSelect: (v: Vibe) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const tags = parseTags(featured.tags);
  const feedCopy = FEED_COPY[feed];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.5fr)] xl:items-start">
      {/* Featured Hero — full-bleed preview with overlay */}
      <article
        onClick={() => onSelect(featured)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative cursor-pointer overflow-hidden rounded-3xl border border-outline-variant/15"
      >
        {/* Full-bleed iframe preview */}
        <div className="relative min-h-[520px] overflow-hidden bg-surface-container-lowest md:min-h-[620px] xl:min-h-[75vh]">
          <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100 bg-black/18'}`} />
          <iframe
            srcDoc={getPreviewCode(featured.latest_code || '', isHovered)}
            className="absolute top-0 left-0 h-[200%] w-[200%] origin-top-left scale-50 border-none pointer-events-none transition-transform duration-700 group-hover:scale-[0.515]"
            title={featured.title}
            sandbox="allow-scripts"
            loading="lazy"
          />

          {/* Top gradient */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent z-20" />

          {/* Bottom gradient for text overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20" />

          {/* Top-left badges */}
          <div className="absolute left-5 top-5 z-30 flex items-center gap-2.5">
            <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary">
              {feedCopy.eyebrow}
            </span>
            <span className="text-[11px] font-medium text-white/70">
              {timeAgo(featured.created_at)}
            </span>
          </div>

          {/* Top-right view count */}
          <div className="absolute right-5 top-5 z-30 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-md">
            {formatViews(featured.views)} views
          </div>

          {/* Bottom overlay text content */}
          <div className="absolute inset-x-0 bottom-0 z-30 p-6 xl:p-8">
            <div className="max-w-2xl space-y-4">
              <h1 className="text-3xl font-black tracking-tight text-white xl:text-4xl xl:leading-[1.08]" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                {featured.title}
              </h1>

              <p className="line-clamp-2 max-w-lg text-sm leading-relaxed text-white/70">
                {featured.description || feedCopy.description}
              </p>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom row: author + actions */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <button
                  type="button"
                  aria-label={`Open ${featured.author_name} profile`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/@${encodeURIComponent(featured.author_name)}`);
                  }}
                  className="flex items-center gap-3 transition-opacity duration-200 hover:opacity-80"
                >
                  <img
                    src={getAvatarSrc(featured)}
                    alt={featured.author_name}
                    className="h-9 w-9 rounded-full border border-white/20 object-cover"
                  />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{featured.author_name || 'Anonymous'}</p>
                  </div>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(featured);
                    }}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Open Project
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (navigator.share) {
                        navigator.share({ title: featured.title, url: `${window.location.origin}/p/${featured.id}` }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(`${window.location.origin}/p/${featured.id}`).catch(() => {});
                      }
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Right rail: supporting cards */}
      <div className="grid gap-5">
        {supporting.map((vibe, index) => (
          <SideRailCard
            key={vibe.id}
            vibe={vibe}
            label={index === 0 ? 'Next In Queue' : 'Keep Watching'}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function HomeCard({ vibe, onSelect }: { vibe: Vibe; onSelect: (v: Vibe) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article
      onClick={() => onSelect(vibe)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group cursor-pointer overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface-container-low transition-colors duration-200 hover:border-primary/25 hover:bg-surface-container"
    >
      <div className="relative aspect-video overflow-hidden rounded-t-3xl bg-surface-container-lowest">
        <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100 bg-black/24'}`} />
        <iframe
          srcDoc={getPreviewCode(vibe.latest_code || '', isHovered)}
          className="absolute top-0 left-0 h-[200%] w-[200%] origin-top-left scale-50 border-none pointer-events-none transition-transform duration-500 group-hover:scale-[0.512]"
          title={vibe.title}
          sandbox="allow-scripts"
          loading="lazy"
        />
        <div className="absolute right-3 top-3 z-20 rounded-full border border-outline-variant/20 bg-surface/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface/72 backdrop-blur-md">
          {formatViews(vibe.views)}
        </div>
      </div>

      <div className="space-y-3 border-t border-outline-variant/12 p-5 pt-4">
        <ProjectMetaRow vibe={vibe} />

        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-base font-bold tracking-tight text-on-surface transition-colors duration-200 group-hover:text-primary">
            {vibe.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-on-surface/55">
            {vibe.description || 'Open the project to inspect the interaction, code structure, and version history.'}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/12 pt-4 text-on-surface/50">
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">favorite</span>
              {formatViews(vibe.like_count ?? 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
              {vibe.comment_count ?? 0}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">fork_right</span>
              {vibe.remix_count ?? 0}
            </span>
          </div>
          <span className="material-symbols-outlined text-[20px] transition-colors duration-200 group-hover:text-primary">more_horiz</span>
        </div>
      </div>
    </article>
  );
}

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

  const filteredVibes = [...vibes];
  if (activeFeed === 'movers') {
    filteredVibes.sort((a, b) => (b.remix_count ?? 0) - (a.remix_count ?? 0) || b.views - a.views);
  } else if (activeFeed === 'new') {
    filteredVibes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (activeFeed === 'market-cap') {
    filteredVibes.sort((a, b) => b.views - a.views);
  } else if (activeFeed === 'oldest') {
    filteredVibes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const featuredVibe = filteredVibes[0];
  const supportingVibes = filteredVibes.slice(1, 3);
  const gridVibes = filteredVibes.length > 3 ? filteredVibes.slice(3) : filteredVibes.slice(1);
  const totalViews = vibes.reduce((sum, vibe) => sum + vibe.views, 0);
  const totalRemixes = vibes.reduce((sum, vibe) => sum + (vibe.remix_count ?? 0), 0);

  return (
    <section className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface overflow-x-hidden transition-[margin] duration-300">
      <div className="space-y-10 px-4 pb-16 pt-24 md:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.5fr)]">
            <div className="min-h-[520px] rounded-3xl border border-outline-variant/15 bg-surface-container-highest animate-pulse md:min-h-[620px] xl:min-h-[75vh]" />
            <div className="grid gap-5">
              <div className="aspect-video rounded-3xl bg-surface-container-highest animate-pulse" />
              <div className="aspect-video rounded-3xl bg-surface-container-highest animate-pulse" />
            </div>
          </div>
        ) : featuredVibe ? (
          <FeaturedShowcase
            featured={featuredVibe}
            supporting={supportingVibes}
            feed={activeFeed}
            totalProjects={vibes.length}
            totalViews={totalViews}
            totalRemixes={totalRemixes}
            onSelect={handleSelectVibe}
          />
        ) : null}

        <section className="space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface/45">Discover</p>
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">Community projects</h2>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-surface-container-low p-1">
                {FEED_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFeed(tab.key)}
                    className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                      activeFeed === tab.key
                        ? 'text-on-primary'
                        : 'text-on-surface/65 hover:text-on-surface'
                    }`}
                  >
                    {activeFeed === tab.key && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 rounded-full bg-primary"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {tab.dotClass && <span className={`h-2 w-2 rounded-full ${tab.dotClass}`} />}
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="hidden rounded-full bg-surface-container-low px-4 py-2.5 text-sm font-medium text-on-surface/45 xl:flex">
                {filteredVibes.length} results
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="max-w-2xl text-sm leading-relaxed text-on-surface/60">
              {FEED_COPY[activeFeed].description}
            </p>
            <button
              type="button"
              className="hidden items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container-low px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface/50 transition-colors duration-200 hover:border-primary/30 hover:text-primary lg:flex"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              Filters
            </button>
          </div>
        </section>

        <section className="pb-8">
          {error && !loading && vibes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-outline-variant/15 bg-surface-container-low py-20 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface/20">cloud_off</span>
              <p className="text-sm text-on-surface/50">無法載入內容，請檢查網路連線</p>
              <button
                type="button"
                onClick={() => fetchVibes()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90"
              >
                重新載入
              </button>
            </div>
          ) : !loading && filteredVibes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-outline-variant/15 bg-surface-container-low py-20 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface/20">explore</span>
              <p className="text-sm text-on-surface/50">還沒有任何作品，去 Workspace 建立第一個吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-video rounded-3xl bg-surface-container-highest animate-pulse" />
                  ))
                : gridVibes.map((vibe) => (
                    <HomeCard
                      key={vibe.id}
                      vibe={vibe}
                      onSelect={handleSelectVibe}
                    />
                  ))}
            </div>
          )}
        </section>

        <Footer />
      </div>
    </section>
  );
}

