import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import IterationLab from './pages/IterationLab';
import { Vibe, api, User } from './lib/api';
import { supabase } from './lib/supabase';

type Page = 'home' | 'workspace' | 'lab';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedVibeId, setSelectedVibeId] = useState<number | null>(null);
  const [remixData, setRemixData] = useState<{ id: number; code: string; title: string } | undefined>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  const handleNavigate = (page: Page) => {
    if (page !== 'workspace') setRemixData(undefined);
    setCurrentPage(page);
  };

  const handleSelectVibe = (id: number) => {
    setSelectedVibeId(id);
    setCurrentPage('lab');
  };

  const handleRemix = (vibe: Vibe, code: string) => {
    setRemixData({ id: vibe.id, code, title: vibe.title });
    setCurrentPage('workspace');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
      <Navbar onNavigate={handleNavigate} />

      <main className="h-full">
        {currentPage === 'home' && (
          <Home onSelectVibe={handleSelectVibe} />
        )}

        {currentPage === 'workspace' && (
          <Workspace
            onPublish={() => setCurrentPage('home')}
            remixFrom={remixData}
            currentUserId={currentUser?.id}
          />
        )}

        {currentPage === 'lab' && selectedVibeId && (
          <IterationLab
            vibeId={selectedVibeId}
            onBack={() => setCurrentPage('home')}
            onRemix={handleRemix}
            currentUserId={currentUser?.id}
          />
        )}
      </main>

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

