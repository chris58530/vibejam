import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      className="group grid cursor-pointer gap-4 rounded-3xl border border-outline-variant/15 bg-surface-container-low p-4 transition-colors duration-200 hover:border-primary/25 hover:bg-surface-container sm:grid-cols-[200px_minmax(0,1fr)] sm:items-stretch"
    >
      <div className="relative w-full overflow-hidden rounded-2xl bg-surface-container-lowest aspect-[4/3] sm:aspect-auto sm:h-full sm:min-h-[140px]">
        <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100 bg-black/25'}`} />
        <iframe
          srcDoc={getPreviewCode(vibe.latest_code || '', isHovered)}
          className="absolute top-0 left-0 h-[200%] w-[200%] origin-top-left scale-50 border-none pointer-events-none transition-transform duration-500 group-hover:scale-[0.51]"
          title={vibe.title}
          sandbox="allow-scripts"
          loading="lazy"
        />
      </div>

      <div className="min-w-0 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/85">{label}</p>
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-on-surface transition-colors duration-200 group-hover:text-primary">
            {vibe.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-on-surface/60">
            {vibe.description || 'Open the project to inspect the interaction, code structure, and version history.'}
          </p>
        </div>
        <ProjectMetaRow vibe={vibe} />
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-on-surface/55">
          <span>{formatViews(vibe.views)} views</span>
          <span>{vibe.comment_count ?? 0} comments</span>
          <span>{vibe.remix_count ?? 0} remixes</span>
        </div>
      </div>
    </article>
  );
}

function PlatformPulseCard({ totalProjects, totalViews, totalRemixes }: { totalProjects: number; totalViews: number; totalRemixes: number }) {
  return (
    <section className="rounded-3xl border border-outline-variant/15 bg-surface-container-low p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-tertiary">Platform Pulse</p>
          <h3 className="text-xl font-bold tracking-tight text-on-surface">Real projects, no placeholder filler</h3>
          <p className="text-sm leading-relaxed text-on-surface/60">
            This rail stays tied to live BeaverKit data so the layout reads full without inventing fake content.
          </p>
        </div>
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-tertiary/15 text-tertiary">
          <span className="material-symbols-outlined text-[20px]">equalizer</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/45">Projects</p>
          <p className="mt-2 text-xl font-bold text-on-surface">{totalProjects}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/45">Views</p>
          <p className="mt-2 text-xl font-bold text-on-surface">{formatViews(totalViews)}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/45">Remixes</p>
          <p className="mt-2 text-xl font-bold text-on-surface">{formatViews(totalRemixes)}</p>
        </div>
      </div>
    </section>
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
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.58fr)] xl:items-stretch">
      <article
        onClick={() => onSelect(featured)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface-container-low cursor-pointer"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-tertiary/8" />
        <div className="grid min-h-[480px] xl:grid-cols-[1.2fr_1fr] xl:min-h-[540px]">
          <div className="relative min-h-[280px] overflow-hidden bg-surface-container-lowest xl:min-h-full">
            <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100 bg-black/22'}`} />
            <iframe
              srcDoc={getPreviewCode(featured.latest_code || '', isHovered)}
              className="absolute top-0 left-0 h-[200%] w-[200%] origin-top-left scale-50 border-none pointer-events-none transition-transform duration-700 group-hover:scale-[0.515]"
              title={featured.title}
              sandbox="allow-scripts"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/65 via-background/18 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/80 via-background/20 to-transparent xl:hidden" />
            <div className="absolute left-4 top-4 z-20 rounded-full border border-outline-variant/20 bg-surface/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface/70 backdrop-blur-md">
              {feedCopy.eyebrow}
            </div>
            <div className="absolute right-4 top-4 z-20 rounded-full border border-outline-variant/20 bg-surface/80 px-3 py-1 text-xs font-semibold text-on-surface/75 backdrop-blur-md">
              {formatViews(featured.views)} views
            </div>
          </div>

          <div className="relative z-10 flex flex-col justify-between gap-6 border-t border-outline-variant/15 bg-surface-container-low p-6 xl:border-l xl:border-t-0 xl:p-8">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/85">{feedCopy.eyebrow}</p>
                <h1 className="text-3xl font-black tracking-tight text-on-surface xl:text-4xl xl:leading-[1.1]">
                  {featured.title}
                </h1>
                <p className="text-sm leading-relaxed text-on-surface/65">
                  {featured.description || feedCopy.description}
                </p>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-outline-variant/18 bg-surface-container px-3 py-1 text-xs font-medium text-on-surface/72"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Open ${featured.author_name} profile`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/@${encodeURIComponent(featured.author_name)}`);
                  }}
                  className="h-12 w-12 overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-high transition-colors duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <img
                    src={getAvatarSrc(featured)}
                    alt={featured.author_name}
                    className="h-full w-full object-cover"
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{featured.author_name || 'Anonymous'}</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/45">Published {timeAgo(featured.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/45">Views</p>
                  <p className="mt-2 text-xl font-bold text-on-surface">{formatViews(featured.views)}</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/45">Likes</p>
                  <p className="mt-2 text-xl font-bold text-on-surface">{formatViews(featured.like_count ?? 0)}</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface/45">Remixes</p>
                  <p className="mt-2 text-xl font-bold text-on-surface">{formatViews(featured.remix_count ?? 0)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(featured);
                  }}
                  className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Open Project
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/@${encodeURIComponent(featured.author_name)}`);
                  }}
                  className="rounded-full border border-outline-variant/20 bg-surface-container px-5 py-3 text-sm font-semibold text-on-surface transition-colors duration-200 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  View Author
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-6">
        {supporting.map((vibe, index) => (
          <SideRailCard
            key={vibe.id}
            vibe={vibe}
            label={index === 0 ? 'Next In Queue' : 'Keep Watching'}
            onSelect={onSelect}
          />
        ))}
        <PlatformPulseCard
          totalProjects={totalProjects}
          totalViews={totalViews}
          totalRemixes={totalRemixes}
        />
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
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-3xl bg-surface-container-lowest">
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
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-on-surface transition-colors duration-200 group-hover:text-primary">
            {vibe.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-on-surface/60">
            {vibe.description || 'Open the project to inspect the interaction, code structure, and version history.'}
          </p>
        </div>

        <ProjectMetaRow vibe={vibe} />

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
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.58fr)]">
            <div className="min-h-[480px] rounded-3xl border border-outline-variant/15 bg-surface-container-highest animate-pulse xl:min-h-[540px]" />
            <div className="grid gap-6">
              <div className="min-h-[200px] rounded-3xl bg-surface-container-highest animate-pulse" />
              <div className="min-h-[200px] rounded-3xl bg-surface-container-highest animate-pulse" />
              <div className="min-h-[220px] rounded-3xl bg-surface-container-highest animate-pulse" />
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
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide transition-colors duration-200 ${
                      activeFeed === tab.key
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface/65 hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    {tab.dotClass && <span className={`h-2 w-2 rounded-full ${tab.dotClass}`} />}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="hidden rounded-full bg-surface-container-low px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface/45 xl:flex">
                {filteredVibes.length} visible
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

