import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { signInWithGitHub, signInWithGoogle } from '../lib/supabase';

export default function Whitelist() {
  const [loading, setLoading] = useState<'github' | 'google' | null>(null);
  const [error, setError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / 1920);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const tl = (e.currentTarget.contentWindow as any)?.__timelines?.['beaverkit-promo'];
      tl?.play();
    } catch {}
  };

  const handleGoogle = async () => {
    setLoading('google');
    setError('');
    try { await signInWithGoogle(); } catch (e: any) { setError(e.message || 'Failed'); setLoading(null); }
  };

  const handleGitHub = async () => {
    setLoading('github');
    setError('');
    try { await signInWithGitHub(); } catch (e: any) { setError(e.message || 'Failed'); setLoading(null); }
  };

  return (
    <div className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface flex flex-col lg:flex-row transition-[margin] duration-300 overflow-hidden">

      {/* ── Left: Promo Video ── */}
      <div className="relative flex-1 min-h-[45vw] lg:min-h-screen overflow-hidden bg-[#0b1326]">
        {/* scaled iframe container */}
        <div ref={containerRef} className="absolute inset-0">
          <iframe
            src="/promo-video/index.html"
            title="BeaverKit Preview"
            onLoad={handleIframeLoad}
            className="border-0 pointer-events-none"
            style={{
              width: '1920px',
              height: '1080px',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
        {/* right-edge fade into form panel */}
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-surface to-transparent hidden lg:block" />
        {/* bottom-edge fade on mobile */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface to-transparent lg:hidden" />
      </div>

      {/* ── Right: Whitelist Form ── */}
      <div className="relative w-full lg:w-[440px] shrink-0 flex flex-col justify-center px-8 py-16 lg:py-0 bg-surface">
        {/* subtle left-edge glow */}
        <div className="absolute -left-24 top-1/2 -translate-y-1/2 w-48 h-96 rounded-full bg-primary/10 blur-[80px] pointer-events-none hidden lg:block" />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-sm mx-auto"
        >
          {/* badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary/80">Early Access</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight leading-tight mb-2">
            Request<br /><span style={{ color: '#2665fd' }}>Whitelist</span> Access
          </h1>
          <p className="text-on-surface/40 text-sm mb-8 leading-relaxed">
            Join the first wave of creators on BeaverKit. Build, share, and remix interactive Vibes powered by AI.
          </p>

          {/* card */}
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 shadow-2xl shadow-black/20">
            <div className="h-0.5 w-full bg-primary rounded-full mb-6" />

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGitHub}
                disabled={!!loading}
                className="w-full py-3.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer shadow-lg shadow-primary/20"
              >
                {loading === 'github' ? (
                  <div className="w-4 h-4 border-2 border-on-primary/50 border-t-on-primary rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
                Apply with GitHub
              </button>

              <button
                onClick={handleGoogle}
                disabled={!!loading}
                className="w-full py-3.5 bg-white/5 border border-outline-variant/15 rounded-xl text-on-surface text-sm font-medium hover:bg-white/10 hover:border-outline-variant/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {loading === 'google' ? (
                  <div className="w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Apply with Google
              </button>
            </div>

            <p className="text-center text-on-surface/20 text-[11px] mt-5">
              Free to join · No credit card required
            </p>
          </div>

          {/* feature pills */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['AI Code Gen', 'Remix Any Vibe', 'Instant Preview', '5 AI Providers'].map(f => (
              <span key={f} className="text-[11px] font-mono text-on-surface/30 bg-surface-container-low border border-outline-variant/10 px-3 py-1 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
