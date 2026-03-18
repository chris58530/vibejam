import React, { useEffect, useState } from 'react';
import { Search, Plus, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase, signOut } from '../lib/supabase';
import AuthModal, { AuthView } from './AuthModal';

interface NavbarProps {
  onNavigate: (page: 'home' | 'workspace' | 'lab') => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const [user, setUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('change-password');
        setAuthOpen(true);
      }
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const openAuth = (view: AuthView = 'login') => {
    setAuthView(view);
    setAuthOpen(true);
  };

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
              alt={user.user_metadata?.user_name || user.user_metadata?.name || user.email}
              className="w-10 h-10 rounded-full border border-white/20 cursor-pointer hover:border-white/40 transition-colors object-cover"
              title={user.user_metadata?.user_name || user.user_metadata?.name || user.email}
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
            onClick={() => openAuth('login')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white text-sm font-bold transition-all"
          >
            登入 / 註冊
          </motion.button>
        )}
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialView={authView}
      />
    </nav>
  );
}
