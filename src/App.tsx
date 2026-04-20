import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useI18n } from './lib/i18n';
import './lib/themeStore'; // bootstrap: apply dark palette CSS vars on load
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomTabBar from './components/BottomTabBar';
import DebugOverlay from './components/DebugOverlay';
import DevLogPanel from './components/DevLogPanel';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import RemixStudio from './pages/RemixStudio';
import VibeDetail from './pages/VibeDetail';
import Settings from './pages/Settings';
import InviteAccept from './pages/InviteAccept';
import Warehouse from './pages/Warehouse';
import Studio from './pages/Studio';
import QALab from './pages/QALab';
import YourLibrary from './pages/YourLibrary';
import AuthCallback from './pages/AuthCallback';
import { api, User } from './lib/api';
import { supabase } from './lib/supabase';
import { useAIKeyStore } from './lib/aiKeyStore';
import { devLog } from './lib/devLog';

const SCROLL_TARGET_SELECTOR =
  '[data-scroll-root], [class*="overflow-y-auto"], [class*="overflow-auto"], [class*="overflow-scroll"]';
const RESET_TICK_MS = 50;
const RESET_TICK_LIMIT = 40;
const RESET_OBSERVER_WINDOW_MS = 2500;

function disableScrollRestoration() {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
}

function stripHash(pathname: string, search: string) {
  if (!window.location.hash) return;
  // Supabase OAuth callback uses hash params - don't strip them or the session won't be detected
  const hash = window.location.hash;
  if (hash.includes('access_token') || hash.includes('error_description') || hash.includes('refresh_token')) return;
  window.history.replaceState(window.history.state, document.title, `${pathname}${search}`);
}

function resetAllScrollPositions() {
  const targets = new Set<HTMLElement>();

  if (document.scrollingElement instanceof HTMLElement) {
    targets.add(document.scrollingElement);
  }
  targets.add(document.documentElement);
  if (document.body) targets.add(document.body);

  document.querySelectorAll<HTMLElement>(SCROLL_TARGET_SELECTOR).forEach((el) => {
    targets.add(el);
  });

  targets.forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
    el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  });

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function ScrollToTop() {
  const location = useLocation();
  const handledInitialLoadRef = useRef(false);

  useLayoutEffect(() => {
    disableScrollRestoration();
    if (!handledInitialLoadRef.current) {
      handledInitialLoadRef.current = true;
      stripHash(location.pathname, location.search);
    }

    let stoppedByUser = false;
    let lastObserverReset = 0;
    const stopOnUserInput = () => {
      stoppedByUser = true;
    };
    const reset = () => {
      if (!stoppedByUser) resetAllScrollPositions();
    };
    const scheduleReset = () => {
      if (stoppedByUser) return;

      const now = window.performance.now();
      if (now - lastObserverReset < 32) return;
      lastObserverReset = now;
      window.requestAnimationFrame(reset);
    };

    reset();
    const raf = window.requestAnimationFrame(reset);
    const raf2 = window.requestAnimationFrame(() => window.requestAnimationFrame(reset));
    const t0 = window.setTimeout(reset, 0);
    const t1 = window.setTimeout(reset, 120);
    const t2 = window.setTimeout(reset, 600);
    const handlePageShow = () => reset();
    const handleLoad = () => reset();

    const mutationObserver = new MutationObserver(scheduleReset);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleReset);
    resizeObserver?.observe(document.documentElement);
    const scrollRoot = document.querySelector<HTMLElement>('[data-scroll-root]');
    if (scrollRoot) resizeObserver?.observe(scrollRoot);
    const observerTimeout = window.setTimeout(() => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    }, RESET_OBSERVER_WINDOW_MS);

    void document.fonts?.ready.then(() => reset()).catch(() => undefined);

    let ticks = 0;
    const interval = window.setInterval(() => {
      if (stoppedByUser || ticks >= RESET_TICK_LIMIT) {
        window.clearInterval(interval);
        return;
      }
      ticks += 1;
      reset();
    }, RESET_TICK_MS);

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('load', handleLoad);
    window.addEventListener('wheel', stopOnUserInput, { passive: true });
    window.addEventListener('touchstart', stopOnUserInput, { passive: true });
    window.addEventListener('keydown', stopOnUserInput);

    return () => {
      window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(observerTimeout);
      window.clearInterval(interval);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('wheel', stopOnUserInput);
      window.removeEventListener('touchstart', stopOnUserInput);
      window.removeEventListener('keydown', stopOnUserInput);
    };
  }, [location.key, location.pathname, location.search, location.hash]);

  return null;
}

export default function App() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (sidebarOpen) {
      root.classList.remove('sidebar-collapsed');
      root.style.setProperty('--app-sidebar-width', '14rem');
    } else {
      root.classList.add('sidebar-collapsed');
      root.style.setProperty('--app-sidebar-width', '4rem');
    }
  }, [sidebarOpen]);

  useEffect(() => {
    useAIKeyStore.getState().initialize();
  }, []);

  // OAuth 失敗時（?error=access_denied …），清除 URL 並停在首頁
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('error')) {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      devLog.warn('[Auth] Supabase 未初始化（env 未設定），跳過 auth 監聽');
      return;
    }

    // ── 復原 OAuth 跳轉前的診斷資訊 ──────────────────────────────────────
    try {
      const redirectedAt = sessionStorage.getItem('__oauth_debug_redirected_at');
      if (redirectedAt) {
        const elapsed = Date.now() - Number(redirectedAt);
        const redirectOrigin = sessionStorage.getItem('__oauth_debug_origin') ?? '(unknown)';
        devLog.info(`[Auth] ✅ 偵測到 OAuth redirect 返回（${elapsed}ms 前跳轉）`);
        devLog.info(`[Auth]    redirectTo 使用值: ${redirectOrigin}`);
        sessionStorage.removeItem('__oauth_debug_redirected_at');
        sessionStorage.removeItem('__oauth_debug_origin');
      }
    } catch { /* ignore */ }

    // ── 讀取 boot-time URL（devLog.ts 在 createClient 前捕捉）────────────
    const bootHref = (() => { try { const v = sessionStorage.getItem('__boot_href'); sessionStorage.removeItem('__boot_href'); return v; } catch { return null; } })();
    devLog.info(`[Auth] 頁面初始 href (boot): ${bootHref ? bootHref.slice(0, 200) : '(未記錄)'}`);
    const bootHadCode = bootHref?.includes('?code=') || bootHref?.includes('&code=');
    const bootHadToken = bootHref?.includes('access_token');
    if (bootHadCode) devLog.info('[Auth] ✅ Boot URL 含 ?code= → SDK 應處理 PKCE exchange');
    if (bootHadToken) devLog.info('[Auth] ✅ Boot URL 含 access_token → SDK 應處理 implicit flow');
    if (!bootHadCode && !bootHadToken && bootHref && bootHref !== window.location.origin + '/') {
      devLog.warn('[Auth] ⚠️ Boot URL 無 auth 參數 → Supabase 未將 token 帶回 redirect，確認 Redirect URL 設定');
    }

    // ── 記錄目前 URL ──────────────────────────────────────────────────────
    const search = window.location.search;
    const hash = window.location.hash;
    devLog.info(`[Auth] 當前 URL: ${window.location.pathname}${search ? search.slice(0, 80) : '(無 search)'}${hash ? hash.slice(0, 40) : ''}`);
    if (bootHadCode && !search.includes('code=')) {
      devLog.warn('[Auth] ⚠️ ?code= 存在於 boot URL 但現在消失 → SDK 已嘗試處理（可能 exchange 失敗）');
    }

    // ── 檢查 localStorage + sessionStorage 的 Supabase key ────────────────
    try {
      const lsKeys = Object.keys(localStorage).filter(k => k.toLowerCase().includes('supabase') || k.startsWith('sb-'));
      const ssKeys = Object.keys(sessionStorage).filter(k => k.toLowerCase().includes('supabase') || k.startsWith('sb-'));
      devLog.info(`[Auth] localStorage sb key (${lsKeys.length}): ${lsKeys.join(' | ') || '(無)'}`);
      devLog.info(`[Auth] sessionStorage sb key (${ssKeys.length}): ${ssKeys.join(' | ') || '(無)'}`);
      const verifier = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
        .find(k => k.includes('code-verifier') || k.includes('pkce') || k.includes('code_verifier'));
      devLog.info(`[Auth] PKCE verifier key: ${verifier ?? '(找不到！exchange 將失敗)'}`);
    } catch (e: any) {
      devLog.warn(`[Auth] 無法讀取 storage: ${e.message}`);
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      devLog.info(`[Auth] getSession → ${u ? `有 session (${u.email ?? u.id.slice(0, 8)})` : '無 session'}`);
      if (u) syncUser(u);
    }).catch((e: any) => {
      devLog.error(`[Auth] getSession 失敗: ${e.message}`);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      devLog.info(`[Auth] onAuthStateChange: event=${_event} | session=${session ? `yes (${session.user.email ?? session.user.id.slice(0, 8)})` : 'null'}`);
      if (session?.user) {
        syncUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUser = async (supabaseUser: any) => {
    const uid = supabaseUser.id?.slice(0, 8) ?? '?';
    const email = supabaseUser.email ?? '(no email)';
    devLog.info(`[Auth] syncUser 開始 → id=${uid}… email=${email}`);
    try {
      const user = await api.syncUser({
        supabase_id: supabaseUser.id,
        username: supabaseUser.user_metadata?.user_name || supabaseUser.user_metadata?.name || supabaseUser.email || 'anonymous',
        avatar: supabaseUser.user_metadata?.avatar_url || '',
      });
      devLog.info(`[Auth] syncUser 成功 → username=${user.username}`);
      setCurrentUser(user);
    } catch (e: any) {
      devLog.error(`[Auth] syncUser 失敗: ${e?.message ?? e}`);
      console.error('Failed to sync user:', e);
    }
  };

  const location = useLocation();

  if (location.pathname === '/qa-lab') {
    return <QALab />;
  }

  const routeContent = location.pathname === '/library'
    ? <YourLibrary currentUser={currentUser ?? undefined} />
    : (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workspace" element={<Workspace currentUser={currentUser ?? undefined} savePanelOpen={savePanelOpen} />} />
        <Route path="/studio" element={<Studio currentUser={currentUser ?? undefined} />} />
        <Route path="/remix" element={<RemixStudio currentUser={currentUser ?? undefined} />} />
        <Route path="/library" element={<YourLibrary currentUser={currentUser ?? undefined} />} />
        <Route path="/warehouse" element={<Warehouse currentUser={currentUser ?? undefined} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="/p/:id" element={<VibeDetail currentUser={currentUser ?? undefined} />} />
        <Route path="*" element={
          <div className="flex items-center justify-center h-full text-white/50">
            {t('app_not_found')}
          </div>
        } />
      </Routes>
    );

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/30">
      <ScrollToTop />
      <Navbar
        savePanelOpen={savePanelOpen}
        onToggleSavePanel={() => setSavePanelOpen(p => !p)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(p => !p)}
      />
      <div className="flex w-full min-h-screen pt-16">
        <Sidebar
          dbUser={currentUser ?? undefined}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(p => !p)}
        />
        <main className="flex-1 pb-16 md:pb-0 relative" data-scroll-root>
          {routeContent}
        </main>
      </div>
      <BottomTabBar />

      <button
        onClick={() => window.open('/qa-lab', '_blank')}
        title="開啟 QA 測試頁面"
        className="fixed bottom-20 right-[4.25rem] md:bottom-6 md:right-[5.5rem] z-[199] w-11 h-11 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 bg-surface-container-high text-on-surface/50 hover:text-purple-400 hover:bg-purple-500/10 hover:ring-2 hover:ring-purple-500/20"
      >
        <span className="material-symbols-outlined text-[20px]">science</span>
      </button>
      <button
        onClick={() => setDebugMode(d => !d)}
        title={debugMode ? '關閉 Debug 模式' : '開啟 Debug 模式'}
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[199] w-11 h-11 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 ${debugMode
          ? 'bg-red-500 text-white ring-4 ring-red-500/30 scale-110'
          : 'bg-surface-container-high text-on-surface/50 hover:text-red-400 hover:bg-red-500/10 hover:ring-2 hover:ring-red-500/20'
          }`}
      >
        <span className="material-symbols-outlined text-[20px]">bug_report</span>
      </button>

      {debugMode && <DebugOverlay onClose={() => setDebugMode(false)} />}
      <DevLogPanel />

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        @media (min-width: 768px) {
          html.sidebar-collapsed .md\\:ml-56 { margin-left: 4rem !important; }
          html.sidebar-collapsed .md\\:pl-60 { padding-left: 5rem !important; }
          html.sidebar-collapsed .md\\:ml-\\[28rem\\] { margin-left: 18rem !important; }
        }
      ` }} />
    </div>
  );
}
