import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { User } from '../lib/api';
import { signInWithGitHub, signInWithGoogle } from '../lib/supabase';

interface Props {
  currentUser?: User;
  authLoading?: boolean;
}

interface OAuthButtonProps {
  busy: boolean;
  disabled: boolean;
  hint: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: 'primary' | 'secondary';
}

const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

function OAuthButton({ busy, disabled, hint, icon, label, onClick, tone }: OAuthButtonProps) {
  const isPrimary = tone === 'primary';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        isPrimary
          ? 'border-primary/45 bg-primary text-on-primary shadow-[0_20px_54px_rgba(239,97,111,0.18)] hover:bg-primary/92'
          : 'border-outline-variant/20 bg-surface-container-high text-on-surface hover:border-primary/25 hover:bg-surface-container',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
          isPrimary ? 'bg-black/10 text-on-primary' : 'bg-primary/10 text-primary',
        ].join(' ')}
      >
        {busy ? (
          <span
            className={[
              'h-4 w-4 rounded-full border-2 animate-spin',
              isPrimary ? 'border-on-primary/25 border-t-on-primary' : 'border-primary/25 border-t-primary',
            ].join(' ')}
          />
        ) : (
          icon
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold tracking-[-0.01em]">{label}</span>
        <span className={['mt-1 block text-xs', isPrimary ? 'text-on-primary/68' : 'text-on-surface/50'].join(' ')}>
          {hint}
        </span>
      </span>

      <svg
        className={['h-4 w-4 shrink-0', isPrimary ? 'text-on-primary/70' : 'text-on-surface/34'].join(' ')}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 4H12V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function Whitelist({ currentUser, authLoading = false }: Props) {
  const [loading, setLoading] = useState<'github' | 'google' | null>(null);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const isPending = currentUser?.is_approved === false;
  const isApproved = currentUser?.is_approved === true;
  const pendingUsername = currentUser?.username ?? 'pending-user';
  const pendingAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingUsername}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const nextScale = Math.max(
        entry.contentRect.width / FRAME_WIDTH,
        entry.contentRect.height / FRAME_HEIGHT,
      );
      setScale(nextScale || 1);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const tl = (e.currentTarget.contentWindow as any)?.__timelines?.['beaverkit-promo'];
      tl?.play?.();
    } catch {
      // Decorative iframe only.
    }
  };

  const handleGoogle = async () => {
    setLoading('google');
    setError('');
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
      setLoading(null);
    }
  };

  const handleGitHub = async () => {
    setLoading('github');
    setError('');
    try {
      await signInWithGitHub();
    } catch (e: any) {
      setError(e.message || 'GitHub sign-in failed');
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-on-surface">
      <div ref={containerRef} className="absolute inset-0 overflow-hidden">
        <iframe
          src="/promo-video/index.html"
          title="BeaverKit Preview"
          onLoad={handleIframeLoad}
          className="pointer-events-none absolute left-1/2 top-1/2 border-0"
          style={{
            width: `${FRAME_WIDTH}px`,
            height: `${FRAME_HEIGHT}px`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,12,0.18)_0%,rgba(5,7,12,0.7)_58%,rgba(5,7,12,0.95)_100%)] lg:bg-[linear-gradient(90deg,rgba(5,7,12,0.14)_0%,rgba(5,7,12,0.44)_42%,rgba(5,7,12,0.86)_76%,rgba(5,7,12,0.97)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(239,97,111,0.14),transparent_28%)]" />

      <div className="relative z-10 flex min-h-screen items-end justify-center px-4 py-6 sm:px-6 sm:py-8 lg:items-center lg:justify-end lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[468px] rounded-[32px] border border-outline-variant/20 bg-surface/88 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.52)] backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-on-surface/52">BeaverKit</p>
              <h1 className="mt-4 text-[30px] font-semibold leading-[0.98] tracking-[-0.045em] text-on-surface sm:text-[40px]">
                {isPending ? 'Application received.' : isApproved ? 'Access enabled.' : 'Start with GitHub or Google.'}
              </h1>
            </div>

            <div className="rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-on-surface/56">
              whitelist
            </div>
          </div>

          <p className="mt-5 max-w-sm text-sm leading-6 text-on-surface/64">
            {isPending
              ? 'Your account is authenticated and waiting for manual approval. We will unlock full access once review is complete.'
              : isApproved
                ? 'Your account already has access. You can go straight into the workspace.'
                : 'Choose the account you want attached to BeaverKit. One sign-in submits your whitelist request for manual review.'}
          </p>

          {authLoading && (
            <div className="mt-6 rounded-3xl border border-outline-variant/15 bg-surface-container-low px-4 py-3 text-xs text-on-surface/50">
              Checking account status...
            </div>
          )}

          {isPending ? (
            <div className="mt-8 rounded-[28px] border border-primary/16 bg-primary/6 p-5">
              <div className="flex items-center gap-3">
                <img
                  src={pendingAvatar}
                  alt={pendingUsername}
                  className="h-11 w-11 rounded-full border border-outline-variant/20 bg-surface-container-low object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-on-surface">@{pendingUsername}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">pending review</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-on-surface/60">
                <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                  <span>Identity verified</span>
                  <span className="text-on-surface/82">Done</span>
                </div>
                <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                  <span>Manual approval</span>
                  <span className="text-primary">In queue</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Workspace access</span>
                  <span className="text-on-surface/36">Locked</span>
                </div>
              </div>
            </div>
          ) : isApproved ? (
            <div className="mt-8 space-y-3">
              <Link
                to="/"
                className="flex w-full items-center justify-center rounded-[24px] bg-primary px-5 py-4 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Enter BeaverKit
              </Link>
              <p className="text-center text-xs text-on-surface/42">You can still revisit this page at beaverkit.io/whitelist.</p>
            </div>
          ) : (
            <div className="mt-8">
              <div className="rounded-[28px] border border-outline-variant/15 bg-surface-container-low/80 p-3 sm:p-4">
                <div className="rounded-[22px] bg-surface-container px-4 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary">Continue to apply</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface/58">
                    Use the same account you want to keep once access is approved.
                  </p>
                </div>

                <div className="mt-3 space-y-3">
                  <OAuthButton
                    busy={loading === 'github'}
                    disabled={loading !== null}
                    hint="Best if you already build with GitHub"
                    icon={(
                      <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    )}
                    label="Continue with GitHub"
                    onClick={handleGitHub}
                    tone="primary"
                  />

                  <OAuthButton
                    busy={loading === 'google'}
                    disabled={loading !== null}
                    hint="Use your existing Google identity"
                    icon={(
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    )}
                    label="Continue with Google"
                    onClick={handleGoogle}
                    tone="secondary"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-3 rounded-3xl border border-red-500/22 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface/42">
                <span>No invite code</span>
                <span className="text-on-surface/18">/</span>
                <span>No payment step</span>
                <span className="text-on-surface/18">/</span>
                <span>Manual review before access</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
