import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { motion } from 'motion/react';
import {
    signInWithGitHub,
    signUpWithEmail,
    signInWithEmail,
    resetPasswordForEmail,
    updatePassword,
    resendConfirmationEmail,
    AlreadyRegisteredUnconfirmedError,
} from '../lib/supabase';
import { useI18n } from '../lib/i18n';

export type AuthView = 'login' | 'register' | 'forgot' | 'change-password';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialView?: AuthView;
}

async function compressImage(file: File, maxDimension = 120): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Image load failed'));
        };
        img.src = objectUrl;
    });
}

export default function AuthModal({ isOpen, onClose, initialView = 'login' }: AuthModalProps) {
    const { t } = useI18n();
    const [view, setView] = useState<AuthView>(initialView);

    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPwd, setShowLoginPwd] = useState(false);

    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');
    const [regAvatarPreview, setRegAvatarPreview] = useState('');
    const [regAvatarData, setRegAvatarData] = useState('');
    const [showRegPwd, setShowRegPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    const [forgotEmail, setForgotEmail] = useState('');

    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showNewConfirmPwd, setShowNewConfirmPwd] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [unconfirmedEmail, setUnconfirmedEmail] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setError('');
            setSuccess('');
        }
    }, [isOpen, initialView]);

    const switchView = (v: AuthView) => {
        setView(v);
        setError('');
        setSuccess('');
        setUnconfirmedEmail('');
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError(t('auth_err_image_size'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError(t('auth_err_image_size'));
            return;
        }
        try {
            const data = await compressImage(file);
            setRegAvatarData(data);
            setRegAvatarPreview(data);
            setError('');
        } catch {
            setError(t('auth_err_image_process'));
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword) {
            setError(t('auth_err_fill_fields'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signInWithEmail(loginEmail.trim(), loginPassword);
            onClose();
        } catch (err: any) {
            const msg: string = err.message || '';
            if (msg.includes('Invalid login credentials')) setError(t('auth_err_invalid_credentials'));
            else if (msg.includes('Email not confirmed')) {
                setUnconfirmedEmail(loginEmail.trim());
                setError(t('auth_err_confirm_email'));
            }
            else setError(msg || t('auth_err_invalid_credentials'));
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regName.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
            setError(t('auth_err_fill_fields'));
            return;
        }
        if (regPassword !== regConfirm) {
            setError(t('auth_err_password_mismatch'));
            return;
        }
        if (regPassword.length < 6) {
            setError(t('auth_password_min'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signUpWithEmail(regEmail.trim(), regPassword, regName.trim(), regAvatarData || undefined);
            setSuccess('');
            // Immediately show success view without error
            setView('login');
            setError('');
            // Use a custom success message shown in login view
            setSuccess(t('auth_success_register'));
        } catch (err: any) {
            const msg: string = err.message || '';
            if (msg.includes('already registered') || msg.includes('already been registered')) {
                // Email is confirmed and in use — direct to login
                setError(t('auth_email_in_use'));
            } else if (err instanceof AlreadyRegisteredUnconfirmedError) {
                // Email is registered but unconfirmed — offer to resend confirmation
                setUnconfirmedEmail(regEmail.trim());
                setError(t('auth_err_confirm_email'));
            } else setError(msg || t('auth_err_fill_fields'));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail.trim()) {
            setError(t('auth_err_fill_fields'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            await resetPasswordForEmail(forgotEmail.trim());
            setSuccess(t('auth_success_reset'));
        } catch (err: any) {
            setError(err.message || t('auth_err_fill_fields'));
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !newPasswordConfirm) {
            setError(t('auth_err_fill_fields'));
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            setError(t('auth_err_password_mismatch'));
            return;
        }
        if (newPassword.length < 6) {
            setError(t('auth_password_min'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            await updatePassword(newPassword);
            setSuccess(t('auth_success_password'));
            setTimeout(() => onClose(), 2000);
        } catch (err: any) {
            setError(err.message || t('auth_err_password_update'));
        } finally {
            setLoading(false);
        }
    };

    const handleResendConfirmation = async () => {
        if (!unconfirmedEmail) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await resendConfirmationEmail(unconfirmedEmail);
            setSuccess(t('auth_success_resend'));
            setUnconfirmedEmail('');
        } catch (err: any) {
            setError(err.message || t('auth_err_fill_fields'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const portalRoot = typeof document !== 'undefined' ? document.body : null;
    if (!portalRoot) return null;

    const inputClass =
        'w-full bg-surface-container border border-outline-variant/10 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface/30 text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono';
    const passwordInputClass =
        'w-full bg-surface-container border border-outline-variant/10 rounded-lg px-4 py-3 pr-11 text-on-surface placeholder:text-on-surface/30 text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono';
    const submitBtnClass =
        'w-full py-3 bg-primary text-on-primary font-mono tracking-widest uppercase hover:bg-primary-fixed rounded-xl text-on-surface font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50';

    const confirmBorderClass = (value: string, match: boolean) => {
        if (!value) return 'border-outline-variant/10 focus:border-primary/50';
        return match ? 'border-green-500/40' : 'border-red-500/40';
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
                className="bg-surface-container-low border border-outline-variant/20 rounded-xl w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top gradient bar */}
                <div className="h-0.5 w-full bg-primary text-on-primary font-mono tracking-widest uppercase hover:bg-primary-fixed" />

                <div className="p-8">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 text-on-surface/30 hover:text-on-surface transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>

                    {/* ─── HEADER ─── */}
                    <div className="mb-6">
                        {view === 'login' && (
                            <>
                                <h2 className="text-2xl font-bold text-on-surface">{t('auth_welcome_back')}</h2>
                                <p className="text-on-surface/40 text-sm mt-1">{t('auth_signin_subtitle')}</p>
                            </>
                        )}
                        {view === 'register' && (
                            <>
                                <h2 className="text-2xl font-bold text-on-surface">{t('auth_create_account')}</h2>
                                <p className="text-on-surface/40 text-sm mt-1">{t('auth_register_subtitle')}</p>
                            </>
                        )}
                        {view === 'forgot' && (
                            <>
                                <button
                                    onClick={() => switchView('login')}
                                    className="flex items-center gap-1 text-on-surface/40 hover:text-on-surface text-sm mb-3 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                    {t('auth_back_login')}
                                </button>
                                <h2 className="text-2xl font-bold text-on-surface">{t('auth_forgot_title')}</h2>
                                <p className="text-on-surface/40 text-sm mt-1">
                                    {t('auth_forgot_subtitle')}
                                </p>
                            </>
                        )}
                        {view === 'change-password' && (
                            <>
                                <h2 className="text-2xl font-bold text-on-surface">{t('auth_new_password')}</h2>
                                <p className="text-on-surface/40 text-sm mt-1">{t('auth_change_pwd_subtitle')}</p>
                            </>
                        )}
                    </div>

                    {/* ─── ALERTS ─── */}
                    {error && (
                        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    {unconfirmedEmail && (
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={handleResendConfirmation}
                                disabled={loading}
                                className="w-full py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                            >
                                {loading ? t('auth_sending') : t('auth_resend_confirm')}
                            </button>
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    {/* ─── LOGIN FORM ─── */}
                    {view === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">{t('auth_email')}</label>
                                <input
                                    type="email"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className={inputClass}
                                    autoComplete="email"
                                />
                            </div>
                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">{t('auth_password')}</label>
                                <div className="relative">
                                    <input
                                        type={showLoginPwd ? 'text' : 'password'}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={passwordInputClass}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginPwd((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/70 transition-colors"
                                    >
                                        {showLoginPwd ? <span className="material-symbols-outlined text-[16px]">visibility_off</span> : <span className="material-symbols-outlined text-[16px]">visibility</span>}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => switchView('forgot')}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 transition-colors"
                                >
                                    {t('auth_forgot_password')}
                                </button>
                            </div>

                            <button type="submit" disabled={loading} className={submitBtnClass}>
                                {loading ? t('auth_signing_in') : t('auth_signin_btn')}
                            </button>

                            <div className="relative flex items-center gap-3 my-1">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-on-surface/20 text-xs">{t('misc_or')}</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    setLoading(true);
                                    setError('');
                                    try {
                                        await signInWithGitHub();
                                    } catch (err: any) {
                                        setError(err.message || 'GitHub 登入失敗');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="w-full py-3 bg-white/5 border border-outline-variant/10 rounded-xl text-on-surface text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                {t('auth_github_signin')}
                            </button>

                            <p className="text-center text-on-surface/30 text-sm">
                                {t('auth_no_account')}{' '}
                                <button
                                    type="button"
                                    onClick={() => switchView('register')}
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                                >
                                    {t('auth_register_now')}
                                </button>
                            </p>
                        </form>
                    )}

                    {/* ─── REGISTER FORM ─── */}
                    {view === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Avatar uploader */}
                            <div className="flex flex-col items-center gap-1">
                                <div
                                    className="w-20 h-20 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-colors overflow-hidden relative group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {regAvatarPreview ? (
                                        <>
                                            <img
                                                src={regAvatarPreview}
                                                alt="preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-[20px] text-on-surface">upload</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <span className="material-symbols-outlined text-[24px] text-on-surface/30 mx-auto">upload</span>
                                            <span className="text-on-surface/20 text-xs mt-0.5 block">{t('misc_upload')}</span>
                                        </div>
                                    )}
                                </div>
                                {regAvatarPreview && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRegAvatarPreview('');
                                            setRegAvatarData('');
                                        }}
                                        className="text-xs text-on-surface/30 hover:text-red-400 transition-colors"
                                    >
                                        {t('auth_remove_avatar')}
                                    </button>
                                )}
                                {!regAvatarPreview && (
                                    <p className="text-xs text-on-surface/25">{t('auth_upload_avatar')}</p>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">
                                    {t('auth_display_name')}
                                </label>
                                <input
                                    type="text"
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    placeholder={t('auth_your_name')}
                                    className={inputClass}
                                    autoComplete="name"
                                />
                            </div>

                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">
                                    {t('auth_email')} <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className={inputClass}
                                    autoComplete="email"
                                />
                            </div>

                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">
                                    {t('auth_password')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showRegPwd ? 'text' : 'password'}
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        placeholder="至少 6 個字元"
                                        className={passwordInputClass}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowRegPwd((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/70 transition-colors"
                                    >
                                        {showRegPwd ? <span className="material-symbols-outlined text-[16px]">visibility_off</span> : <span className="material-symbols-outlined text-[16px]">visibility</span>}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">
                                    {t('auth_confirm_password')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPwd ? 'text' : 'password'}
                                        value={regConfirm}
                                        onChange={(e) => setRegConfirm(e.target.value)}
                                        placeholder={t('auth_reenter_password')}
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-on-surface placeholder:text-on-surface/20 text-sm focus:outline-none transition-colors ${confirmBorderClass(
                                            regConfirm,
                                            regPassword === regConfirm,
                                        )}`}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPwd((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/70 transition-colors"
                                    >
                                        {showConfirmPwd ? <span className="material-symbols-outlined text-[16px]">visibility_off</span> : <span className="material-symbols-outlined text-[16px]">visibility</span>}
                                    </button>
                                    {regConfirm && regPassword === regConfirm && (
                                        <span className="material-symbols-outlined absolute right-9 top-[40%] -translate-y-1/2 text-[16px] text-green-400 pointer-events-none">check</span>
                                    )}
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className={submitBtnClass}>
                                {loading ? t('auth_creating') : t('auth_create_account')}
                            </button>

                            <p className="text-center text-on-surface/30 text-sm">
                                {t('auth_have_account')}{' '}
                                <button
                                    type="button"
                                    onClick={() => switchView('login')}
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                                >
                                    {t('auth_signin_btn')}
                                </button>
                            </p>
                        </form>
                    )}

                    {/* ─── FORGOT PASSWORD FORM ─── */}
                    {view === 'forgot' && !success && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">{t('auth_email')}</label>
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className={inputClass}
                                    autoComplete="email"
                                />
                            </div>
                            <button type="submit" disabled={loading} className={submitBtnClass}>
                                {loading ? t('auth_sending') : t('auth_send_reset')}
                            </button>
                        </form>
                    )}

                    {/* ─── CHANGE PASSWORD FORM ─── */}
                    {view === 'change-password' && !success && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">{t('auth_new_password')}</label>
                                <div className="relative">
                                    <input
                                        type={showNewPwd ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="至少 6 個字元"
                                        className={passwordInputClass}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPwd((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/70 transition-colors"
                                    >
                                        {showNewPwd ? <span className="material-symbols-outlined text-[16px]">visibility_off</span> : <span className="material-symbols-outlined text-[16px]">visibility</span>}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-on-surface/60 text-sm mb-1.5">{t('auth_confirm_password')}</label>
                                <div className="relative">
                                    <input
                                        type={showNewConfirmPwd ? 'text' : 'password'}
                                        value={newPasswordConfirm}
                                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                        placeholder={t('auth_reenter_password')}
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-on-surface placeholder:text-on-surface/20 text-sm focus:outline-none transition-colors ${confirmBorderClass(
                                            newPasswordConfirm,
                                            newPassword === newPasswordConfirm,
                                        )}`}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewConfirmPwd((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/70 transition-colors"
                                    >
                                        {showNewConfirmPwd ? (
                                            <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                                        )}
                                    </button>
                                    {newPasswordConfirm && newPassword === newPasswordConfirm && (
                                        <span className="material-symbols-outlined absolute right-9 top-[40%] -translate-y-1/2 text-[16px] text-green-400 pointer-events-none">check</span>
                                    )}
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className={submitBtnClass}>
                                {loading ? t('auth_updating') : t('auth_update_password')}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, portalRoot);
}



