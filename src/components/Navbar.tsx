import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, signOut } from '../lib/supabase';
import AuthModal from './AuthModal';
import { useI18n, Language } from '../lib/i18n';
import { useWorkspaceStore } from '../lib/workspaceStore';

interface NavbarProps {
  savePanelOpen?: boolean;
  onToggleSavePanel?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
];

export default function Navbar({ savePanelOpen, onToggleSavePanel, sidebarOpen = true, onToggleSidebar }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { saveStatus } = useWorkspaceStore();

  const isWorkspace = location.pathname.includes('/workspace');
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAuth = () => {
    setAuthOpen(true);
  };

  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];

  return (
    <>
      <header className={`fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl flex items-center justify-between pr-6 h-16 pl-6 transition-[padding] duration-300 ${sidebarOpen ? 'md:pl-60' : 'md:pl-20'} ${!isWorkspace ? 'border-b border-transparent' : 'border-b border-outline-variant/10'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-8">
            {isWorkspace ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/studio')}
                  className="flex items-center gap-1.5 text-on-surface/50 hover:text-on-surface transition-colors cursor-pointer rounded-lg px-2 py-1 hover:bg-surface-container-high"
                  title="Back to Studio"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div
                  className="text-xl font-bold tracking-tighter text-on-surface flex items-center gap-2 cursor-pointer font-headline"
                  onClick={() => navigate('/studio')}
                >
                  <img src="/Icon.png" alt="BeaverKit" className="w-8 h-8" />
                  BeaverKit Studio
                </div>
              </div>
            ) : (
              /* Mobile only — hidden on desktop to avoid ghost gap-8 space */
              <div className="flex items-center gap-4 md:hidden">
                <span className="material-symbols-outlined text-on-surface/60 cursor-pointer hover:bg-surface-container-high p-2 rounded-lg transition-colors">menu</span>
                <h1
                  className="text-xl font-bold tracking-tighter text-on-surface font-headline cursor-pointer flex items-center gap-2"
                  onClick={() => navigate('/')}
                >
                  <img src="/Icon.png" alt="BeaverKit" className="w-8 h-8" />
                  BeaverKit
                </h1>
              </div>
            )}

            {!isWorkspace && (
              <div className="hidden md:flex items-center gap-2">
                {!isHome && (
                  <button
                    onClick={() => navigate(-1)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors ring-1 ring-black/[0.06]"
                    aria-label="Go back"
                  >
                    <span className="material-symbols-outlined text-on-surface/70 text-[20px]">chevron_left</span>
                  </button>
                )}
                <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-xl gap-3 w-48 lg:w-72 xl:w-96 group transition-all duration-300 ring-1 ring-black/[0.06] focus-within:ring-primary/30 h-10">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
                  <input
                    className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-on-surface-variant/50 outline-none"
                    placeholder={t('nav_search_placeholder')}
                    type="text"
                  />
                </div>
              </div>
            )}


          </div>
        </div>

        <div className="flex items-center gap-4">
          {isWorkspace ? (
            <>
              <button
                onClick={onToggleSavePanel}
                className={`p-2 rounded-lg transition-colors ${savePanelOpen ? 'text-primary bg-surface-container-high' : 'text-on-surface/60 hover:bg-surface-container-high hover:text-on-surface'}`}
                title="我的專案"
              >
                <span className="material-symbols-outlined text-[20px]" style={savePanelOpen ? { fontVariationSettings: "'FILL' 1" } : {}}>folder</span>
              </button>
              <div className="h-6 w-px bg-outline-variant/20 mx-2"></div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${saveStatus === 'unsaved'
                  ? 'bg-amber-500/10 text-amber-400'
                  : saveStatus === 'saving'
                    ? 'bg-surface-container-low text-on-surface/50'
                    : 'bg-surface-container-low text-tertiary'
                }`}>
                {saveStatus === 'unsaved' ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                ) : saveStatus === 'saving' ? (
                  <span className="w-2 h-2 rounded-full bg-on-surface/30 animate-pulse"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                )}
                {saveStatus === 'unsaved' ? '未儲存' : saveStatus === 'saving' ? '儲存中...' : '已儲存'}
              </div>
            </>
          ) : null}

          {!isWorkspace && (
            <button
              onClick={() => navigate('/workspace')}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold tracking-wide hover:bg-primary-fixed active:scale-[0.98] transition-all whitespace-nowrap"
            >
              +Create
            </button>
          )}

          {/* Language Switcher */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-on-surface/60 hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 text-sm font-body"
              title={t('lang_switcher_label')}
            >
              <span className="material-symbols-outlined text-[18px]">language</span>
              <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
              <span className="sm:hidden">{currentLang.flag}</span>
              <span className="material-symbols-outlined text-[14px] hidden sm:inline">expand_more</span>
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-xl overflow-hidden z-50 min-w-[140px]">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-body transition-colors ${language === lang.code
                        ? 'text-primary bg-primary/10'
                        : 'text-on-surface/70 hover:bg-surface-container-high hover:text-on-surface'
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
            <div className="relative ml-2" ref={userMenuRef}>
              {/* Avatar trigger */}
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className={`h-8 w-8 rounded-full border-2 overflow-hidden bg-surface-container-high transition-all ${userMenuOpen ? 'border-primary' : 'border-outline-variant/30 hover:border-outline-variant/60'}`}
              >
                <img
                  src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt="User Profile"
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden z-50">

                  {/* User info header */}
                  <div className="px-4 py-3.5 border-b border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                        alt="avatar"
                        className="w-10 h-10 rounded-full border border-outline-variant/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {user.user_metadata?.user_name || user.user_metadata?.name || '使用者'}
                        </p>
                        <p className="text-[11px] text-on-surface-variant truncate">
                          @{user.user_metadata?.user_name || user.user_metadata?.name || user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    {[
                      { icon: 'settings', label: t('nav_settings'), action: () => { navigate('/settings'); setUserMenuOpen(false); } },
                      { icon: 'terminal', label: 'Workspace', action: () => { navigate('/workspace'); setUserMenuOpen(false); } },
                      { icon: 'smart_toy', label: 'AI Chat', action: () => { navigate('/ai-chat'); setUserMenuOpen(false); } },
                    ].map(({ icon, label, action }) => (
                      <button
                        key={icon}
                        onClick={action}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface/70 hover:bg-surface-container-high hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Divider + Sign out */}
                  <div className="border-t border-outline-variant/10 py-1.5">
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface/70 hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">logout</span>
                      {t('nav_signout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuth}
              className="ml-2 px-4 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-lg text-on-surface text-sm font-semibold transition-all font-body"
            >
              {t('nav_signin')}
            </button>
          )}

        </div>
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
      />


    </>
  );
}

