import React, { useState, useEffect } from 'react';
import { Zap, Home, Flame, Bookmark, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const navItems = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Trending', icon: Flame, path: '/' },
  { label: 'Saved', icon: Bookmark, path: '/' },
  { label: 'Profile', icon: User, path: null },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-56 z-40 bg-zinc-950/80 backdrop-blur border-r border-white/10 pt-4">
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer group mb-4"
        onClick={() => navigate('/')}
      >
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Zap className="text-white w-5 h-5 fill-current" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tighter">
          VibeJamer
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map(({ label, icon: Icon, path }) => (
          <button
            key={label}
            onClick={() => handleNavClick(label, path)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium text-left"
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
