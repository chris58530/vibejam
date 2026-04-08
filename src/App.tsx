import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    // 重置所有可能的捲動容器
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // 找到 App 內的 main content 容器也一併 reset
    document.querySelectorAll('[data-scroll-root]').forEach(el => {
      el.scrollTop = 0;
    });
  }, [pathname]);
  return null;
}
import { useI18n } from './lib/i18n';
import './lib/themeStore'; // bootstrap: apply dark palette CSS vars on load
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomTabBar from './components/BottomTabBar';
import DebugOverlay from './components/DebugOverlay';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import RemixStudio from './pages/RemixStudio';
import VibeDetail from './pages/VibeDetail';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import InviteAccept from './pages/InviteAccept';
import QALab from './pages/QALab';
import { api, User } from './lib/api';
import { supabase } from './lib/supabase';
import { useAIKeyStore } from './lib/aiKeyStore';

export default function App() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [savePanelOpen, setSavePanelOpen] = useState(false);

  // Initialize AI Key Store
  useEffect(() => {
    useAIKeyStore.getState().initialize();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    // Check existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) syncUser(data.session.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUser = async (supabaseUser: any) => {
    try {
      const user = await api.syncUser({
        supabase_id: supabaseUser.id,
        username: supabaseUser.user_metadata?.user_name || supabaseUser.user_metadata?.name || supabaseUser.email || 'anonymous',
        avatar: supabaseUser.user_metadata?.avatar_url || '',
      });
      setCurrentUser(user);
    } catch (e) {
      console.error('Failed to sync user:', e);
    }
  };

  const location = useLocation();

  // QA Lab 獨立視窗，不套主 layout
  if (location.pathname === '/qa-lab') {
    return <QALab />;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/30">
      <ScrollToTop />
      <Navbar />
      <div className="flex w-full min-h-screen pt-16">
        <Sidebar savePanelOpen={savePanelOpen} onToggleSavePanel={() => setSavePanelOpen(p => !p)} dbUser={currentUser ?? undefined} />
        <main className="flex-1 pb-16 md:pb-0 relative" data-scroll-root>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workspace" element={<Workspace currentUser={currentUser ?? undefined} savePanelOpen={savePanelOpen} />} />
            <Route path="/remix" element={<RemixStudio currentUser={currentUser ?? undefined} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="/p/:id" element={<VibeDetail currentUser={currentUser ?? undefined} />} />
            <Route path="/:username" element={<Profile />} />
            <Route path="*" element={
              <div className="flex items-center justify-center h-full text-white/50">
                {t('app_not_found')}
              </div>
            } />
          </Routes>
        </main>
      </div>
      <BottomTabBar />

      {/* ── Debug FAB（所有頁面浮空顯示）── */}
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
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[199] w-11 h-11 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 ${
          debugMode
            ? 'bg-red-500 text-white ring-4 ring-red-500/30 scale-110'
            : 'bg-surface-container-high text-on-surface/50 hover:text-red-400 hover:bg-red-500/10 hover:ring-2 hover:ring-red-500/20'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">bug_report</span>
      </button>

      {debugMode && <DebugOverlay onClose={() => setDebugMode(false)} />}

      {/* Global Styles for custom scrollbar */}
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
      `}} />
    </div>
  );
}

