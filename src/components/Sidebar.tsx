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
    <aside className="group/sidebar fixed left-0 top-16 h-[calc(100vh-64px)] w-16 hover:w-64 bg-[#1C1B1B] flex flex-col pt-3 pb-2 hidden md:flex z-40 border-r border-outline-variant/5 transition-[width] duration-300 overflow-hidden">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 font-body font-medium text-sm cursor-pointer ${
                isActive 
                  ? 'text-[#FFB3B6] bg-[#2A2A2A]' 
                  : 'text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1]'
              }`}
              title={label}
            >
              <span className="material-symbols-outlined shrink-0 text-[22px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
              </span>
              <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover/sidebar:max-w-[160px] transition-[max-width] duration-300 opacity-0 group-hover/sidebar:opacity-100">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Divider + Library — only visible when expanded */}
      <div className="overflow-hidden max-h-0 group-hover/sidebar:max-h-48 transition-[max-height] duration-300">
        <div className="my-3 h-px bg-[#584142]/10 mx-4"></div>
        <div className="px-5 mb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#E5E2E1]/30 font-bold whitespace-nowrap">Your Library</span>
        </div>
        <nav className="space-y-0.5 px-2">
          {[
            { icon: 'history', label: 'History' },
            { icon: 'playlist_play', label: 'Saved Vibes' },
            { icon: 'thumb_up', label: 'Liked Code' },
          ].map(({ icon, label }) => (
            <button key={label} onClick={() => alert('機能建構中 (WIP)')} className="w-full flex items-center gap-3 px-3 py-2 text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] rounded-lg transition-colors text-sm font-body whitespace-nowrap">
              <span className="material-symbols-outlined text-[18px] shrink-0">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Footer — only visible when expanded */}
      <div className="mt-auto overflow-hidden max-h-0 group-hover/sidebar:max-h-24 transition-[max-height] duration-300 border-t border-outline-variant/10">
        <div className="pt-3 space-y-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-4">
            <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">Terms</a>
            <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">Privacy</a>
            <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">About</a>
          </div>
          <div className="px-4 pb-2">
            <p className="text-[10px] text-[#E5E2E1]/20 font-medium font-body whitespace-nowrap">© 2024 VIBEJAM EDITORIAL</p>
          </div>
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
          <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover/sidebar:max-w-[140px] transition-[max-width] duration-300 text-xs text-[#E5E2E1]/60 font-body opacity-0 group-hover/sidebar:opacity-100">
            {currentUser.user_metadata?.user_name || currentUser.user_metadata?.name || ''}
          </span>
        </div>
      )}
    </aside>
  );
}

