import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Eye, EyeOff, Upload, Check, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import {
    signInWithGitHub,
    signUpWithEmail,
    signInWithEmail,
    resetPasswordForEmail,
    updatePassword,
} from '../lib/supabase';

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
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('請選擇圖片檔案');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('圖片大小不能超過 5MB');
            return;
        }
        try {
            const data = await compressImage(file);
            setRegAvatarData(data);
            setRegAvatarPreview(data);
            setError('');
        } catch {
            setError('圖片處理失敗，請選擇其他圖片');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword) {
            setError('請填寫所有欄位');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signInWithEmail(loginEmail.trim(), loginPassword);
            onClose();
        } catch (err: any) {
            const msg: string = err.message || '';
            if (msg.includes('Invalid login credentials')) setError('電子郵件或密碼不正確');
            else if (msg.includes('Email not confirmed')) setError('請先確認您的電子郵件後再登入');
            else setError(msg || '登入失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regName.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
            setError('請填寫所有必填欄位');
            return;
        }
        if (regPassword !== regConfirm) {
            setError('兩次密碼輸入不一致');
            return;
        }
        if (regPassword.length < 6) {
            setError('密碼至少需要 6 個字元');
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
            setSuccess('🎉 註冊成功！請查收電子郵件並點擊確認連結，確認後即可登入。');
        } catch (err: any) {
            const msg: string = err.message || '';
            if (msg.includes('already registered') || msg.includes('already been registered'))
                setError('此電子郵件已被使用，請直接登入');
            else setError(msg || '註冊失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail.trim()) {
            setError('請輸入電子郵件');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await resetPasswordForEmail(forgotEmail.trim());
            setSuccess('✉️ 重設密碼連結已寄至您的信箱，請檢查電子郵件（包含垃圾郵件夾）。');
        } catch (err: any) {
            setError(err.message || '操作失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !newPasswordConfirm) {
            setError('請填寫所有欄位');
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            setError('兩次密碼輸入不一致');
            return;
        }
        if (newPassword.length < 6) {
            setError('密碼至少需要 6 個字元');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await updatePassword(newPassword);
            setSuccess('✅ 密碼已成功更新！');
            setTimeout(() => onClose(), 2000);
        } catch (err: any) {
            setError(err.message || '密碼更新失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const portalRoot = typeof document !== 'undefined' ? document.body : null;
    if (!portalRoot) return null;

    const inputClass =
        'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors';
    const passwordInputClass =
        'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors';
    const submitBtnClass =
        'w-full py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50';

    const confirmBorderClass = (value: string, match: boolean) => {
        if (!value) return 'border-white/10 focus:border-indigo-500/50';
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
                className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top gradient bar */}
                <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="p-8">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* ─── HEADER ─── */}
                    <div className="mb-6">
                        {view === 'login' && (
                            <>
                                <h2 className="text-2xl font-bold text-white">歡迎回來</h2>
                                <p className="text-white/40 text-sm mt-1">登入您的帳號繼續創作</p>
                            </>
                        )}
                        {view === 'register' && (
                            <>
                                <h2 className="text-2xl font-bold text-white">建立帳號</h2>
                                <p className="text-white/40 text-sm mt-1">加入 VibeJam 社群，開始創作</p>
                            </>
                        )}
                        {view === 'forgot' && (
                            <>
                                <button
                                    onClick={() => switchView('login')}
                                    className="flex items-center gap-1 text-white/40 hover:text-white text-sm mb-3 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    返回登入
                                </button>
                                <h2 className="text-2xl font-bold text-white">忘記密碼</h2>
                                <p className="text-white/40 text-sm mt-1">
                                    輸入您的電子郵件，我們將寄送重設連結
                                </p>
                            </>
                        )}
                        {view === 'change-password' && (
                            <>
                                <h2 className="text-2xl font-bold text-white">設定新密碼</h2>
                                <p className="text-white/40 text-sm mt-1">請輸入您想要使用的新密碼</p>
                            </>
                        )}
                    </div>

                    {/* ─── ALERTS ─── */}
                    {error && (
                        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
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
                                <label className="block text-white/60 text-sm mb-1.5">電子郵件</label>
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
                                <label className="block text-white/60 text-sm mb-1.5">密碼</label>
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                    >
                                        {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => switchView('forgot')}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 transition-colors"
                                >
                                    忘記密碼？
                                </button>
                            </div>

                            <button type="submit" disabled={loading} className={submitBtnClass}>
                                {loading ? '登入中…' : '登入'}
                            </button>

                            <div className="relative flex items-center gap-3 my-1">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-white/20 text-xs">或</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            <button
                                type="button"
                                onClick={signInWithGitHub}
                                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                使用 GitHub 登入
                            </button>

                            <p className="text-center text-white/30 text-sm">
                                還沒有帳號？{' '}
                                <button
                                    type="button"
                                    onClick={() => switchView('register')}
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                                >
                                    立即註冊
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
                                                <Upload className="w-5 h-5 text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <Upload className="w-6 h-6 text-white/30 mx-auto" />
                                            <span className="text-white/20 text-xs mt-0.5 block">上傳</span>
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
                                        className="text-xs text-white/30 hover:text-red-400 transition-colors"
                                    >
                                        移除頭像
                                    </button>
                                )}
                                {!regAvatarPreview && (
                                    <p className="text-xs text-white/25">點擊上傳頭像（選填）</p>
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
                                <label className="block text-white/60 text-sm mb-1.5">
                                    顯示名稱 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    placeholder="您的名字"
                                    className={inputClass}
                                    autoComplete="name"
                                />
                            </div>

                            <div>
                                <label className="block text-white/60 text-sm mb-1.5">
                                    電子郵件 <span className="text-red-400">*</span>
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
                                <label className="block text-white/60 text-sm mb-1.5">
                                    密碼 <span className="text-red-400">*</span>
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                    >
                                        {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-white/60 text-sm mb-1.5">
                                    確認密碼 <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPwd ? 'text' : 'password'}
                                        value={regConfirm}
                                        onChange={(e) => setRegConfirm(e.target.value)}
                                        placeholder="再次輸入密碼"
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-white placeholder:text-white/20 text-sm focus:outline-none transition-colors ${confirmBorderClass(
                                            regConfirm,
                                            regPassword === regConfirm,
                                        )}`}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPwd((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                    >
                                        {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    {regConfirm && regPassword === regConfirm && (
                                        <Check className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400 pointer-events-none" />
                                    )}
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className={submitBtnClass}>
                                {loading ? '建立中…' : '建立帳號'}
                            </button>

                            <p className="text-center text-white/30 text-sm">
                                已有帳號？{' '}
                                <button
                                    type="button"
                                    onClick={() => switchView('login')}
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                                >
                                    登入
                                </button>
                            </p>
                        </form>
                    )}

                    {/* ─── FORGOT PASSWORD FORM ─── */}
                    {view === 'forgot' && !success && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-white/60 text-sm mb-1.5">電子郵件</label>
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
                                {loading ? '發送中…' : '發送重設連結'}
                            </button>
                        </form>
                    )}

                    {/* ─── CHANGE PASSWORD FORM ─── */}
                    {view === 'change-password' && !success && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-white/60 text-sm mb-1.5">新密碼</label>
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                    >
                                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-white/60 text-sm mb-1.5">確認新密碼</label>
                                <div className="relative">
                                    <input
                                        type={showNewConfirmPwd ? 'text' : 'password'}
                                        value={newPasswordConfirm}
                                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                        placeholder="再次輸入新密碼"
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-white placeholder:text-white/20 text-sm focus:outline-none transition-colors ${confirmBorderClass(
                                            newPasswordConfirm,
                                            newPassword === newPasswordConfirm,
                                        )}`}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewConfirmPwd((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                    >
                                        {showNewConfirmPwd ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                    {newPasswordConfirm && newPassword === newPasswordConfirm && (
                                        <Check className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400 pointer-events-none" />
                                    )}
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className={submitBtnClass}>
                                {loading ? '更新中…' : '更新密碼'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, portalRoot);
}
