import React, { useEffect, useState } from 'react';
import { Search, Plus, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase, signInWithGitHub, signOut } from '../lib/supabase';

interface NavbarProps {
  onNavigate: (page: 'home' | 'workspace' | 'lab') => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => onNavigate('home')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Zap className="text-white w-6 h-6 fill-current" />
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tighter">
            VibeJam
          </span>
        </div>

        <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 w-80 focus-within:bg-white/10 transition-colors">
          <Search className="w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search vibes, authors, #tags..."
            className="bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-white/20 w-full ml-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('home')}
          className="text-white/60 hover:text-white text-sm font-medium transition-colors"
        >
          Explore
        </button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('workspace')}
          className="relative group px-6 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full text-white font-bold text-sm shadow-[0_0_20px_rgba(129,140,248,0.4)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 -translate-x-full" />
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Jam It!
          </span>
        </motion.button>

        {user ? (
          <div className="flex items-center gap-2">
            <img
              src={user.user_metadata?.avatar_url}
              alt={user.user_metadata?.user_name}
              className="w-10 h-10 rounded-full border border-white/20 cursor-pointer hover:border-white/40 transition-colors"
              title={user.user_metadata?.user_name}
            />
            <button
              onClick={signOut}
              className="text-white/40 hover:text-white text-xs transition-colors"
            >
              登出
            </button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={signInWithGitHub}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white text-sm font-bold transition-all"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
            GitHub 登入
          </motion.button>
        )}
      </div>
    </nav>
  );
}
