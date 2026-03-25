import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useI18n } from './lib/i18n';
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
import AIChat from './pages/AIChat';
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

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/30">
      <Navbar debugMode={debugMode} onDebugToggle={() => setDebugMode(d => !d)} />
      <div className="flex w-full min-h-screen">
        <Sidebar savePanelOpen={savePanelOpen} onToggleSavePanel={() => setSavePanelOpen(p => !p)} dbUser={currentUser ?? undefined} />
        <main className="flex-1 pb-16 md:pb-0 relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workspace" element={<Workspace currentUser={currentUser ?? undefined} savePanelOpen={savePanelOpen} />} />
            <Route path="/remix" element={<RemixStudio currentUser={currentUser ?? undefined} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/:username/:vibeSlug" element={<VibeDetail currentUser={currentUser ?? undefined} />} />
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

