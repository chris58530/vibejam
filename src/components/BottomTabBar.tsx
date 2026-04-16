import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import AuthModal from './AuthModal';

export default function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleProfileClick = () => {
    if (!currentUser) {
      setAuthOpen(true);
      return;
    }
    const username = currentUser?.user_metadata?.user_name || currentUser?.user_metadata?.name;
    if (username) {
      navigate(`/@${username}`);
    } else {
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-surface-container-low h-16 md:hidden flex items-center justify-around z-50 border-t border-outline-variant/10">
      <button
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-primary' : 'text-on-surface/60 hover:text-on-surface'}`}
      >
        <span className="material-symbols-outlined" style={isActive('/') ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
        <span className="text-[10px] font-medium font-body">{t('tab_home')}</span>
      </button>

      <button
        onClick={() => navigate('/ai-chat')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/ai-chat') ? 'text-primary' : 'text-on-surface/60 hover:text-on-surface'}`}
      >
        <span className="material-symbols-outlined" style={isActive('/ai-chat') ? { fontVariationSettings: "'FILL' 1" } : {}}>smart_toy</span>
        <span className="text-[10px] font-medium font-body">{t('tab_ai_chat')}</span>
      </button>

      <button
        onClick={() => navigate('/workspace')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/workspace') ? 'text-primary' : 'text-on-surface/60 hover:text-on-surface'}`}
      >
        <span className="material-symbols-outlined">add_circle</span>
        <span className="text-[10px] font-medium font-body">{t('tab_create')}</span>
      </button>

      <button
        onClick={() => navigate('/')}
        className="flex flex-col items-center gap-1 text-on-surface/60 hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined">subscriptions</span>
        <span className="text-[10px] font-medium font-body">{t('tab_subs')}</span>
      </button>

      <button
        onClick={handleProfileClick}
        className="flex flex-col items-center gap-1 text-on-surface/60 hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] font-medium font-body">{t('tab_you')}</span>
      </button>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </nav>
  );
}

