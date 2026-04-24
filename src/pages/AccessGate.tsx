import React, { useState } from 'react';
import { signInWithGitHub, signInWithGoogle } from '../lib/supabase';
import { User } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface Props {
  currentUser: User | null;
}

export default function AccessGate({ currentUser }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState<'github' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGitHub = async () => {
    setLoading('github');
    setError(null);
    try {
      await signInWithGitHub();
    } catch (e: any) {
      setError(e.message || t('accessgate_err_github'));
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || t('accessgate_err_google'));
      setLoading(null);
    }
  };

  const isPending = currentUser && currentUser.is_approved === false;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0f1f3d_0%,_#060810_60%)] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">

      {/* Background decorative orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md" />
            <div className="relative w-10 h-10 rounded-xl bg-surface-container-high border border-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px] text-primary">code_blocks</span>
            </div>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">BeaverKit</span>
        </div>

        {/* Main card */}
        <div className="bg-surface-container/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">

          {isPending ? (
            // ── Pending state ──────────────────────────────────────────────
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <img
                    src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`}
                    alt={currentUser.username}
                    className="w-16 h-16 rounded-full ring-2 ring-primary/30"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[13px] text-amber-400">schedule</span>
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  {t('accessgate_pending_hi')}，@{currentUser.username}！
                </h2>
                <p className="text-sm text-white/50">{t('accessgate_pending_submitted')}</p>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                <span className="material-symbols-outlined text-[18px] text-amber-400 mt-0.5 shrink-0">pending</span>
                <div>
                  <p className="text-sm font-medium text-amber-300 mb-1">{t('accessgate_pending_title')}</p>
                  <p className="text-xs text-white/45 leading-relaxed">
                    {t('accessgate_pending_desc')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-white/30">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[13px] text-emerald-500/60">check_circle</span>
                  <span>{t('accessgate_pending_step_verified')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[13px] text-amber-500/60">radio_button_unchecked</span>
                  <span>{t('accessgate_pending_step_waiting')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[13px] text-white/20">radio_button_unchecked</span>
                  <span>{t('accessgate_pending_step_access')}</span>
                </div>
              </div>
            </>
          ) : (
            // ── Apply / Login state ────────────────────────────────────────
            <>
              <div className="text-center mb-7">
                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                  {t('accessgate_apply_title')}
                </h1>
                <p className="text-sm text-white/45 leading-relaxed">
                  {t('accessgate_apply_desc')}
                </p>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-2 gap-2 mb-7">
                {[
                  { icon: 'smart_toy', label: t('accessgate_feature_ai') },
                  { icon: 'preview', label: t('accessgate_feature_preview') },
                  { icon: 'history', label: t('accessgate_feature_version') },
                  { icon: 'share', label: t('accessgate_feature_share') },
                ].map(f => (
                  <div key={f.icon} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <span className="material-symbols-outlined text-[16px] text-primary/70">{f.icon}</span>
                    <span className="text-xs text-white/50">{f.label}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-white/35 text-center mb-4">
                {t('accessgate_apply_hint')}
              </p>

              {/* OAuth buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleGitHub}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] hover:border-white/[0.20] text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading === 'github' ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  )}
                  {t('accessgate_apply_github')}
                </button>

                <button
                  onClick={handleGoogle}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] hover:border-white/[0.20] text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading === 'google' ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {t('accessgate_apply_google')}
                </button>
              </div>

              {error && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          {t('accessgate_footer')}
        </p>
      </div>
    </div>
  );
}
