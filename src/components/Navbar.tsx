import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, signOut } from '../lib/supabase';
import AuthModal, { AuthView } from './AuthModal';
import { useI18n, Language } from '../lib/i18n';
import { useWorkspaceStore } from '../lib/workspaceStore';

interface NavbarProps {
}

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
];

export default function Navbar({}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useI18n();
  const { publishFn, isPublishing } = useWorkspaceStore();
  const [user, setUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const isWorkspace = location.pathname.includes('/workspace');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('change-password');
        setAuthOpen(true);
      }
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAuth = (view: AuthView = 'login') => {
    setAuthView(view);
    setAuthOpen(true);
  };

  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];

  return (
    <>
      <header className={`fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl flex items-center justify-between px-6 h-16 ${!isWorkspace ? 'border-b border-transparent' : 'border-b border-outline-variant/10'}`}>
        <div className="flex items-center gap-8">
          {isWorkspace ? (
            <div
              className="text-xl font-bold tracking-tighter text-[#E5E2E1] flex items-center gap-2 cursor-pointer font-headline"
              onClick={() => navigate('/')}
            >
              <span className="material-symbols-outlined text-primary">terminal</span>
              The Bower Studio
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-[#E5E2E1]/60 cursor-pointer hover:bg-[#2A2A2A] p-2 rounded-lg transition-colors md:hidden">menu</span>
              <h1
                className="text-xl font-bold tracking-tighter text-[#E5E2E1] font-headline cursor-pointer"
                onClick={() => navigate('/')}
              >
                The Bower
              </h1>
            </div>
          )}

          {!isWorkspace && (
            <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-full gap-3 w-96 group transition-all duration-300 ring-1 ring-black/[0.06] focus-within:ring-primary/30">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-on-surface-variant/50 outline-none"
                placeholder={t('nav_search_placeholder')}
                type="text"
              />
            </div>
          )}

          {isWorkspace && (
            <nav className="hidden md:flex items-center bg-surface-container-low p-1 rounded-lg">
              <button className="px-3 py-1.5 rounded-md text-primary font-semibold bg-surface-container-high transition-all text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">desktop_windows</span>
                {t('nav_desktop')}
              </button>
              <button className="px-3 py-1.5 rounded-md text-[#E5E2E1]/60 hover:bg-surface-container-high transition-colors text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">smartphone</span>
                {t('nav_mobile')}
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isWorkspace ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg text-xs font-mono text-tertiary">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                {t('nav_live_sync')}
              </div>
              <div className="h-6 w-px bg-outline-variant/20 mx-2"></div>
              <button className="material-symbols-outlined text-[#E5E2E1]/30 p-2 rounded-lg cursor-not-allowed" title={t('nav_coming_soon')}>notifications</button>
              <button onClick={() => navigate('/settings')} className="material-symbols-outlined text-[#E5E2E1]/60 hover:text-on-background transition-colors p-2 rounded-lg" title={t('nav_settings')}>settings</button>
            </>
          ) : (
            <div className="flex items-center gap-1 hidden sm:flex">
              <button className="p-2 rounded-lg text-[#E5E2E1]/30 cursor-not-allowed" title={t('nav_coming_soon')}>
                <span className="material-symbols-outlined">notifications</span>
              </button>
<button className="p-2 rounded-lg text-[#E5E2E1]/60 hover:bg-[#2A2A2A] transition-colors duration-200">
                <span className="material-symbols-outlined">apps</span>
              </button>
            </div>
          )}

          {/* Language Switcher */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#E5E2E1]/60 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] transition-colors duration-200 text-sm font-body"
              title={t('lang_switcher_label')}
            >
              <span className="material-symbols-outlined text-[18px]">language</span>
              <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
              <span className="sm:hidden">{currentLang.flag}</span>
              <span className="material-symbols-outlined text-[14px] hidden sm:inline">expand_more</span>
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-[#1C1B1B] border border-outline-variant/20 rounded-xl shadow-xl overflow-hidden z-50 min-w-[140px]">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-body transition-colors ${
                      language === lang.code
                        ? 'text-primary bg-primary/10'
                        : 'text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1]'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                    {language === lang.code && (
                      <span className="material-symbols-outlined text-[16px] ml-auto text-primary">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <div
                className="h-8 w-8 rounded-full border border-outline-variant/30 overflow-hidden bg-surface-container-high cursor-pointer"
                onClick={() => {
                  const username = user.user_metadata?.user_name || user.user_metadata?.name || user.email || 'anonymous';
                  navigate(`/@${encodeURIComponent(username)}`);
                }}
              >
                <img
                  src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt="User Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <button onClick={signOut} className="text-[#E5E2E1]/40 hover:text-[#E5E2E1] text-xs transition-colors p-2" title={t('nav_signout')}>
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuth('login')}
              className="ml-2 px-4 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-lg text-on-surface text-sm font-semibold transition-all font-body"
            >
              {t('nav_signin')}
            </button>
          )}

          {isWorkspace && (
            <button
              onClick={() => publishFn?.()}
              disabled={isPublishing || !publishFn}
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-1.5 rounded-lg text-sm font-bold active:scale-95 transition-transform ml-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isPublishing ? t('nav_publishing') : t('nav_publish')}
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialView={authView}
      />
    </>
  );
}

