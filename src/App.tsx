import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import VibeDetail from './pages/VibeDetail';
import Profile from './pages/Profile';
import { api, User } from './lib/api';
import { supabase } from './lib/supabase';

export default function App() {
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

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="h-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace" element={<Workspace currentUser={currentUser ?? undefined} />} />
          <Route path="/@:username/:vibeSlug" element={<VibeDetail currentUser={currentUser ?? undefined} />} />
          <Route path="/profile" element={<Profile user={currentUser} />} />
        </Routes>
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
