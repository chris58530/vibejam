import React, { useState } from 'react';
import { motion } from 'motion/react';
import { signInWithGitHub, signInWithGoogle } from '../lib/supabase';

export default function Register() {
  const [loading, setLoading] = useState<'github' | 'google' | null>(null);
  const [error, setError] = useState('');

  const handleGitHub = async () => {
    setLoading('github');
    setError('');
    try { await signInWithGitHub(); } catch (e: any) { setError(e.message || 'Failed'); setLoading(null); }
  };

  const handleGoogle = async () => {
    setLoading('google');
    setError('');
    try { await signInWithGoogle(); } catch (e: any) { setError(e.message || 'Failed'); setLoading(null); }
  };

  return (
    <main className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface flex flex-col transition-[margin] duration-300 relative overflow-hidden">

      {/* ── Background (promo scene 1 style) ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1a38] via-surface to-surface" />
        <div className="absolute -top-32 -left-24 w-[700px] h-[700px] rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute -bottom-20 right-16 w-96 h-96 rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-secondary/8 blur-[70px]" />
        <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(38,101,253,0.07)' }} />
        <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(38,101,253,0.07)' }} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(38,101,253,1) 1px, transparent 1px)', backgroundSize: '36px 36px' }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-primary/80">Join BeaverKit</span>
            </div>
          </div>

          {/* headline */}
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight text-center leading-none mb-3">
            Start <span style={{ color: '#2665fd' }}>Creating</span>.
          </h1>
          <p className="text-center text-on-surface/45 text-sm mb-10">
            Build, share, and remix interactive Vibes — no setup required.
          </p>

          {/* card */}
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-8 shadow-2xl shadow-black/30">
            <div className="h-0.5 w-full bg-primary rounded-full mb-8 -mt-0.5" />

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoogle}
                disabled={!!loading}
                className="w-full py-3.5 bg-white/5 border border-outline-variant/15 rounded-xl text-on-surface text-sm font-medium hover:bg-white/10 hover:border-outline-variant/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {loading === 'google' ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </button>

              <button
                onClick={handleGitHub}
                disabled={!!loading}
                className="w-full py-3.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer shadow-lg shadow-primary/20"
              >
                {loading === 'github' ? (
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
                Continue with GitHub
              </button>
            </div>

            <p className="text-center text-on-surface/25 text-[11px] mt-6">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>

          {/* feature hints */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: 'grid_view', label: 'Build Vibes' },
              { icon: 'auto_awesome', label: 'AI-Powered' },
              { icon: 'repeat', label: 'Remix Freely' },
            ].map(f => (
              <div key={f.label} className="flex flex-col items-center gap-2 py-4 px-3 bg-surface-container-low/50 border border-outline-variant/10 rounded-xl">
                <span className="material-symbols-outlined text-primary/60 text-[22px]">{f.icon}</span>
                <span className="text-[11px] font-mono text-on-surface/35 uppercase tracking-wider">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
