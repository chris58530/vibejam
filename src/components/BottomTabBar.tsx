import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleProfileClick = () => {
    const username = currentUser?.user_metadata?.user_name || currentUser?.user_metadata?.name;
    if (username) {
      navigate(\`/@\${username}\`);
    } else {
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#1C1B1B] h-16 md:hidden flex items-center justify-around z-50 border-t border-outline-variant/10">
      <button
        onClick={() => navigate('/')}
        className={\`flex flex-col items-center gap-1 transition-colors \${isActive('/') ? 'text-[#FFB3B6]' : 'text-[#E5E2E1]/60 hover:text-[#E5E2E1]'}\`}
      >
        <span className="material-symbols-outlined" style={isActive('/') ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
        <span className="text-[10px] font-medium font-body">Home</span>
      </button>

      <button
        onClick={() => navigate('/')}
        className="flex flex-col items-center gap-1 text-[#E5E2E1]/60 hover:text-[#E5E2E1] transition-colors"
      >
        <span className="material-symbols-outlined">trending_up</span>
        <span className="text-[10px] font-medium font-body">Explore</span>
      </button>

      <button
        onClick={() => navigate('/workspace')}
        className={\`flex flex-col items-center gap-1 transition-colors \${isActive('/workspace') ? 'text-[#FFB3B6]' : 'text-[#E5E2E1]/60 hover:text-[#E5E2E1]'}\`}
      >
        <span className="material-symbols-outlined">add_circle</span>
        <span className="text-[10px] font-medium font-body">Create</span>
      </button>

      <button
        onClick={() => navigate('/')}
        className="flex flex-col items-center gap-1 text-[#E5E2E1]/60 hover:text-[#E5E2E1] transition-colors"
      >
        <span className="material-symbols-outlined">subscriptions</span>
        <span className="text-[10px] font-medium font-body">Subs</span>
      </button>

      <button
        onClick={handleProfileClick}
        className="flex flex-col items-center gap-1 text-[#E5E2E1]/60 hover:text-[#E5E2E1] transition-colors"
      >
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] font-medium font-body">You</span>
      </button>
    </nav>
  );
}
