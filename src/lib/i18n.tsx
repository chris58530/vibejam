import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh-TW';

export const translations = {
  en: {
    // Navbar
    nav_signin: 'Sign In',
    nav_signout: 'Sign Out',
    nav_publish: 'Publish',
    nav_publishing: 'Publishing...',
    nav_settings: 'Settings',
    nav_coming_soon: 'Coming soon',
    nav_live_sync: 'LIVE SYNC',
    nav_search_placeholder: 'Search vibes, code, or creators...',
    nav_debug_on: 'Enable Debug Mode (Layout Tool)',
    nav_debug_off: 'Disable Debug Mode',
    nav_desktop: 'Desktop',
    nav_mobile: 'Mobile',
    // Sidebar
    sidebar_home: 'Home',
    sidebar_trending: 'Trending',
    sidebar_following: 'Following',
    sidebar_workspace: 'Workspace',
    sidebar_ai_chat: 'AI Chat',
    sidebar_settings: 'Settings',
    sidebar_your_library: 'Your Library',
    sidebar_history: 'History',
    sidebar_saved_vibes: 'Saved Vibes',
    sidebar_liked_code: 'Liked Code',
    sidebar_wip: 'Feature under construction (WIP)',
    sidebar_terms: 'Terms',
    sidebar_privacy: 'Privacy',
    sidebar_about: 'About',
    sidebar_copyright: '© 2024 THE BOWER EDITORIAL',
    // Bottom Tab Bar
    tab_home: 'Home',
    tab_ai_chat: 'AI Chat',
    tab_create: 'Create',
    tab_subs: 'Subs',
    tab_you: 'You',
    // App
    app_not_found: '404 | Page not found.',
    // Auth Modal
    auth_welcome_back: 'Welcome Back',
    auth_signin_subtitle: 'Sign in to your account to continue creating',
    auth_create_account: 'Create Account',
    auth_register_subtitle: 'Join The Bower community and start creating',
    auth_email: 'Email',
    auth_password: 'Password',
    auth_forgot_password: 'Forgot password?',
    auth_signin_btn: 'Sign In',
    auth_signing_in: 'Signing in…',
    auth_no_account: "Don't have an account?",
    auth_register_now: 'Register now',
    auth_github_signin: 'Sign in with GitHub',
    auth_display_name: 'Display Name *',
    auth_your_name: 'Your name',
    auth_email_in_use: 'This email is already in use, please sign in directly',
    auth_upload_avatar: 'Click to upload avatar (optional)',
    auth_remove_avatar: 'Remove avatar',
    auth_confirm_password: 'Confirm Password',
    auth_reenter_password: 'Re-enter password',
    auth_password_min: 'Password must be at least 6 characters',
    auth_creating: 'Creating…',
    auth_have_account: 'Already have an account?',
    auth_back_login: 'Back to login',
    auth_new_password: 'New Password',
    auth_update_password: 'Update Password',
    auth_forgot_title: 'Forgot Password',
    auth_send_reset: 'Send Reset Link',
    auth_resend_confirm: '📧 Resend confirmation email',
    auth_success_register: '🎉 Registration successful! Please check your email to verify your account.',
    auth_success_password: '✅ Password updated successfully!',
    auth_success_resend: '✉️ Confirmation email resent! Please check your inbox.',
    auth_success_reset: '✉️ Password reset link sent to your inbox. Please check your email.',
    auth_err_password_mismatch: 'Passwords do not match',
    auth_err_password_update: 'Password update failed, please try again later',
    auth_err_confirm_email: 'Please confirm your email address before signing in. Check your inbox.',
    auth_err_invalid_credentials: 'Incorrect email or password',
    auth_err_fill_fields: 'Please fill in all fields',
    auth_err_image_size: 'Image size cannot exceed 5MB',
    auth_err_image_process: 'Image processing failed, please choose a different image',
    // Language switcher
    lang_switcher_label: 'Language',
    // Misc
    misc_or: 'or',
    misc_upload: 'Upload',
    auth_forgot_subtitle: 'Enter your email and we will send a reset link',
    auth_change_pwd_subtitle: 'Please enter the new password you want to use',
    auth_sending: 'Sending…',
    auth_updating: 'Updating…',
  },
  'zh-TW': {
    // Navbar
    nav_signin: '登入',
    nav_signout: '登出',
    nav_publish: '發布',
    nav_publishing: '發布中...',
    nav_settings: '設定',
    nav_coming_soon: '即將推出',
    nav_live_sync: '即時同步',
    nav_search_placeholder: '搜尋作品、程式碼或創作者...',
    nav_debug_on: '開啟 Debug 模式（定位工具）',
    nav_debug_off: '關閉 Debug 模式',
    nav_desktop: '桌面版',
    nav_mobile: '手機版',
    // Sidebar
    sidebar_home: '首頁',
    sidebar_trending: '趨勢',
    sidebar_following: '追蹤中',
    sidebar_workspace: '工作區',
    sidebar_ai_chat: 'AI 聊天',
    sidebar_settings: '設定',
    sidebar_your_library: '我的收藏',
    sidebar_history: '歷史記錄',
    sidebar_saved_vibes: '已收藏作品',
    sidebar_liked_code: '已按讚程式碼',
    sidebar_wip: '機能建構中 (WIP)',
    sidebar_terms: '使用條款',
    sidebar_privacy: '隱私政策',
    sidebar_about: '關於',
    sidebar_copyright: '© 2024 THE BOWER 編輯部',
    // Bottom Tab Bar
    tab_home: '首頁',
    tab_ai_chat: 'AI 聊天',
    tab_create: '創建',
    tab_subs: '訂閱',
    tab_you: '我',
    // App
    app_not_found: '404 | 找不到該頁面。',
    // Auth Modal
    auth_welcome_back: '歡迎回來',
    auth_signin_subtitle: '登入您的帳號繼續創作',
    auth_create_account: '建立帳號',
    auth_register_subtitle: '加入 The Bower 社群，開始創作',
    auth_email: '電子郵件',
    auth_password: '密碼',
    auth_forgot_password: '忘記密碼？',
    auth_signin_btn: '登入',
    auth_signing_in: '登入中…',
    auth_no_account: '還沒有帳號？',
    auth_register_now: '立即註冊',
    auth_github_signin: '使用 GitHub 登入',
    auth_display_name: '顯示名稱 *',
    auth_your_name: '您的名字',
    auth_email_in_use: '此電子郵件已被使用，請直接登入',
    auth_upload_avatar: '點擊上傳頭像（選填）',
    auth_remove_avatar: '移除頭像',
    auth_confirm_password: '確認密碼',
    auth_reenter_password: '再次輸入密碼',
    auth_password_min: '密碼至少需要 6 個字元',
    auth_creating: '建立中…',
    auth_have_account: '已有帳號？',
    auth_back_login: '返回登入',
    auth_new_password: '新密碼',
    auth_update_password: '更新密碼',
    auth_forgot_title: '忘記密碼',
    auth_send_reset: '發送重設連結',
    auth_resend_confirm: '📧 重新發送確認信',
    auth_success_register: '🎉 註冊成功！請查收電子郵件以驗證您的帳號。',
    auth_success_password: '✅ 密碼已成功更新！',
    auth_success_resend: '✉️ 確認信已重新發送！請查收您的信箱。',
    auth_success_reset: '✉️ 重設密碼連結已寄至您的信箱，請查收電子郵件。',
    auth_err_password_mismatch: '兩次密碼輸入不一致',
    auth_err_password_update: '密碼更新失敗，請稍後再試',
    auth_err_confirm_email: '請先確認您的電子郵件後再登入，請查收信箱。',
    auth_err_invalid_credentials: '電子郵件或密碼不正確',
    auth_err_fill_fields: '請填寫所有欄位',
    auth_err_image_size: '圖片大小不能超過 5MB',
    auth_err_image_process: '圖片處理失敗，請選擇其他圖片',
    // Language switcher
    lang_switcher_label: '語言',
    // Misc
    misc_or: '或',
    misc_upload: '上傳',
    auth_forgot_subtitle: '輸入您的電子郵件，我們將寄送重設連結',
    auth_change_pwd_subtitle: '請輸入您想要使用的新密碼',
    auth_sending: '發送中…',
    auth_updating: '更新中…',
  },
} as const;

export type TranslationKey = keyof typeof translations['en'];

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'vibejam_language';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh-TW') return stored;
    const browserLang = navigator.language;
    return browserLang.startsWith('zh') ? 'zh-TW' : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = (key: TranslationKey): string => translations[language][key];

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
