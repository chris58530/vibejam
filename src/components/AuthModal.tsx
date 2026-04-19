import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'motion/react';
import { signInWithGitHub, signInWithGoogle } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const portalRoot = typeof document !== 'undefined' ? document.body : null;
    if (!portalRoot) return null;

    const handleGitHubSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithGitHub();
        } catch (err: any) {
            console.error('[Auth] GitHub login error:', err);
            setError(err.message || 'GitHub 登入失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithGoogle();
        } catch (err: any) {
            console.error('[Auth] Google login error:', err);
            setError(err.message || 'Google 登入失敗');
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.80)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 12 }}
                transition={{ duration: 0.18 }}
                className="bg-surface-container-low border border-outline-variant/20 rounded-xl w-full max-w-md relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-0.5 w-full bg-primary" />

                <div className="p-8">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 text-on-surface/30 hover:text-on-surface transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-on-surface">{t('auth_welcome_back')}</h2>
                        <p className="text-on-surface/40 text-sm mt-1">{t('auth_signin_subtitle')}</p>
                    </div>

                    {error && (
                        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full py-3 bg-white/5 border border-outline-variant/10 rounded-xl text-on-surface text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {loading ? t('auth_signing_in') : t('auth_google_signin')}
                        </button>

                        <button
                            type="button"
                            onClick={handleGitHubSignIn}
                            disabled={loading}
                            className="w-full py-3 bg-white/5 border border-outline-variant/10 rounded-xl text-on-surface text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            {loading ? t('auth_signing_in') : t('auth_github_signin')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, portalRoot);
}
