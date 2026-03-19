import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const navItems = [
  { label: 'Home', icon: 'home', path: '/' },
  { label: 'Trending', icon: 'trending_up', path: '/' },
  { label: 'Following', icon: 'subscriptions', path: '/' },
  { label: 'Workspace', icon: 'terminal', path: '/workspace' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isWorkspace = location.pathname.includes('/workspace');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavClick = (label: string, path: string | null) => {
    if (label === 'Profile') {
      const username = currentUser?.user_metadata?.user_name || currentUser?.user_metadata?.name;
      if (username) {
        navigate(`/@${username}`);
      }
      return;
    }
    if (path) navigate(path);
  };

  // If in workspace, render the minimal utility strip
  if (isWorkspace) {
    return (
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-16 bg-[#1C1B1B] flex flex-col items-center py-4 gap-6 border-r border-outline-variant/10 z-40 hidden md:flex">
        <button onClick={() => navigate('/')} className="text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] p-2.5 rounded-xl transition-all duration-300" title="Home">
          <span className="material-symbols-outlined">home</span>
        </button>
        <button onClick={() => navigate('/workspace')} className="text-[#FFB3B6] bg-[#2A2A2A] p-2.5 rounded-xl transition-all duration-300" title="Workspace">
          <span className="material-symbols-outlined">workspace_premium</span>
        </button>
        <button className="text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] p-2.5 rounded-xl transition-all duration-300" title="Files">
          <span className="material-symbols-outlined">folder</span>
        </button>
        <button className="text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] p-2.5 rounded-xl transition-all duration-300" title="Search">
          <span className="material-symbols-outlined">search</span>
        </button>
        <button className="text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] p-2.5 rounded-xl transition-all duration-300" title="History">
          <span className="material-symbols-outlined">history</span>
        </button>
        
        <div className="mt-auto flex flex-col gap-6 items-center">
          <button className="text-[#E5E2E1]/70 hover:text-[#FFB3B6] transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          {currentUser && (
            <div 
              className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/30 cursor-pointer"
              onClick={() => handleNavClick('Profile', null)}
            >
              <img 
                src={currentUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}`} 
                alt="User Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Regular Sidebar
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-[#1C1B1B] flex flex-col p-4 gap-2 hidden md:flex z-40 border-r border-outline-variant/5">
      <nav className="space-y-1">
        {navItems.map(({ label, icon, path }) => {
          const isActive = location.pathname === path && label !== 'Trending' && label !== 'Following'; 
          return (
            <a
              key={label}
              onClick={(e) => { e.preventDefault(); handleNavClick(label, path); }}
              href={path || "#"}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 ease-in-out font-body font-medium text-sm tracking-normal cursor-pointer ${
                isActive 
                  ? 'text-[#FFB3B6] bg-[#2A2A2A]' 
                  : 'text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1]'
              }`}
            >
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
              </span>
              <span>{label}</span>
            </a>
          );
        })}
      </nav>

      <div className="my-4 h-px bg-[#584142]/10 mx-4"></div>

      <div className="px-4 mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#E5E2E1]/30 font-bold">Your Library</span>
      </div>
      
      <nav className="space-y-1 flex-1 overflow-y-auto hide-scrollbar">
        <a href="#" className="flex items-center gap-4 px-4 py-2 text-[#E5E2E1]/70 hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm font-body">
          <span className="material-symbols-outlined text-sm">history</span>
          <span>History</span>
        </a>
        <a href="#" className="flex items-center gap-4 px-4 py-2 text-[#E5E2E1]/70 hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm font-body">
          <span className="material-symbols-outlined text-sm">playlist_play</span>
          <span>Saved Vibes</span>
        </a>
        <a href="#" className="flex items-center gap-4 px-4 py-2 text-[#E5E2E1]/70 hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm font-body">
          <span className="material-symbols-outlined text-sm">thumb_up</span>
          <span>Liked Code</span>
        </a>
      </nav>

      <div className="mt-auto pt-4 space-y-4 border-t border-outline-variant/10">
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-4">
          <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">Terms</a>
          <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">Privacy</a>
          <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">About</a>
        </div>
        <div className="px-4 pb-2">
          <p className="text-[10px] text-[#E5E2E1]/20 font-medium font-body">© 2024 VIBEJAM EDITORIAL</p>
        </div>
      </div>
    </aside>
  );
}

