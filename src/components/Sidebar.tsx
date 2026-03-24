import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const navItems = [
  { label: 'Home', icon: 'home', path: '/' },
  { label: 'Trending', icon: 'trending_up', path: '/?feed=trending' },
  { label: 'Following', icon: 'subscriptions', path: '/?feed=following' },
  { label: 'Workspace', icon: 'terminal', path: '/workspace' },
  { label: 'AI Chat', icon: 'smart_toy', path: '/ai-chat' },
  { label: 'Settings', icon: 'settings', path: '/settings' },
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

  // Regular Sidebar — collapsed by default, expands on hover
  return (
    <aside className="group/sidebar fixed left-0 top-16 h-[calc(100vh-64px)] w-16 hover:w-64 bg-[#1C1B1B] flex flex-col pt-4 pb-2 hidden md:flex z-40 border-r border-outline-variant/5 transition-all duration-300 overflow-hidden">
      <nav className="space-y-1 px-2">
        {navItems.map(({ label, icon, path }) => {
          const isActive = 
            (label === 'Trending' && location.search.includes('feed=trending')) ||
            (label === 'Following' && location.search.includes('feed=following')) ||
            (label === 'Home' && location.pathname === '/' && !location.search) ||
            (label === 'Workspace' && location.pathname === '/workspace') ||
            (label === 'AI Chat' && location.pathname === '/ai-chat') ||
            (label === 'Settings' && location.pathname === '/settings');
          
          return (
            <button
              key={label}
              onClick={() => handleNavClick(label, path)}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-300 ease-in-out font-body font-medium text-sm tracking-normal cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'text-[#FFB3B6] bg-[#2A2A2A]' 
                  : 'text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1]'
              }`}
              title={label}
            >
              <span className="material-symbols-outlined shrink-0" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="my-4 h-px bg-[#584142]/10 mx-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200"></div>

      <div className="px-6 mb-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#E5E2E1]/30 font-bold whitespace-nowrap">Your Library</span>
      </div>
      
      <nav className="space-y-1 px-2 flex-1 overflow-y-auto hide-scrollbar opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
        <button onClick={() => alert('機能建構中 (WIP)')} className="w-full flex items-center gap-4 px-3 py-2 text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] rounded-lg transition-colors text-sm font-body whitespace-nowrap">
          <span className="material-symbols-outlined text-sm shrink-0">history</span>
          <span>History</span>
        </button>
        <button onClick={() => alert('機能建構中 (WIP)')} className="w-full flex items-center gap-4 px-3 py-2 text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] rounded-lg transition-colors text-sm font-body whitespace-nowrap">
          <span className="material-symbols-outlined text-sm shrink-0">playlist_play</span>
          <span>Saved Vibes</span>
        </button>
        <button onClick={() => alert('機能建構中 (WIP)')} className="w-full flex items-center gap-4 px-3 py-2 text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] rounded-lg transition-colors text-sm font-body whitespace-nowrap">
          <span className="material-symbols-outlined text-sm shrink-0">thumb_up</span>
          <span>Liked Code</span>
        </button>
      </nav>

      <div className="mt-auto pt-4 space-y-3 border-t border-outline-variant/10 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-4">
          <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">Terms</a>
          <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">Privacy</a>
          <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">About</a>
        </div>
        <div className="px-4 pb-1">
          <p className="text-[10px] text-[#E5E2E1]/20 font-medium font-body whitespace-nowrap">© 2024 VIBEJAM EDITORIAL</p>
        </div>
      </div>

      {/* User avatar — always visible at bottom */}
      {currentUser && (
        <div className="flex items-center gap-3 px-3 py-2 mt-1 shrink-0">
          <div 
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/30 cursor-pointer shrink-0"
            onClick={() => handleNavClick('Profile', null)}
          >
            <img 
              src={currentUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}`} 
              alt="User Profile" 
              className="w-full h-full object-cover" 
            />
          </div>
          <span className="text-xs text-[#E5E2E1]/60 font-body truncate opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            {currentUser.user_metadata?.user_name || currentUser.user_metadata?.name || ''}
          </span>
        </div>
      )}
    </aside>
  );
}

