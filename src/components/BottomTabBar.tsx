import React, { useState, useEffect } from 'react';
import { Home, Compass, Plus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function BottomTabBar() {
  const navigate = useNavigate();
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
      navigate(`/@${username}`);
    }
  };

  return (
    <div className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur border-t border-white/10">
      <button
        onClick={() => navigate('/')}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-white/60 hover:text-white transition-colors"
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-medium">Home</span>
      </button>

      <button
        onClick={() => navigate('/')}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-white/60 hover:text-white transition-colors"
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px] font-medium">Explore</span>
      </button>

      <button
        onClick={() => navigate('/workspace')}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-white/60 hover:text-white transition-colors"
      >
        <div className="w-9 h-9 -mt-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Plus className="w-5 h-5 text-white" />
        </div>
        <span className="text-[10px] font-medium">Upload</span>
      </button>

      <button
        onClick={handleProfileClick}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-white/60 hover:text-white transition-colors"
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-medium">Profile</span>
      </button>
    </div>
  );
}
