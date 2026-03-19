import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Vibe, User, toSlug } from '../lib/api';
import VibeCard from '../components/VibeCard';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [userVibes, setUserVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Works');
  
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [mottoDraft, setMottoDraft] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const navigate = useNavigate();

  const rawUsername = username?.startsWith('@') ? username.substring(1) : username;
  const decodedUsername = rawUsername ? decodeURIComponent(rawUsername) : 'Guest Creator';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null));
  }, []);

  const isOwner = currentUser && (
    currentUser.user_metadata?.user_name === decodedUsername ||
    currentUser.user_metadata?.name === decodedUsername ||
    currentUser.email === decodedUsername
  );

  useEffect(() => {
    Promise.all([
      api.getUserProfile(decodedUsername).catch(() => null),
      api.getVibes().catch(() => [])
    ]).then(([profile, allVibes]) => {
      setUserProfile(profile);
      setMottoDraft(profile?.motto || 'INIT. DEV. VIBE. System online.');
      
      const filtered = Array.isArray(allVibes)
        ? allVibes.filter(v => v.author_name === decodedUsername)
        : [];
      setUserVibes(filtered);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [decodedUsername]);

  const handleSaveMotto = async () => {
    try {
      await api.updateUserProfile(decodedUsername, { motto: mottoDraft });
      setUserProfile(prev => prev ? { ...prev, motto: mottoDraft } : null);
      setIsEditingMotto(false);
    } catch (err) {
      console.error('Failed to update motto', err);
    }
  };

  const followersCount = userProfile?.followers_count || 0;
  const likesCount = userProfile?.likes_count || 0;

  return (
    <main className="md:ml-64 pt-[64px] min-h-screen bg-surface">
      {/* Banner */}
      <div className="w-full h-32 md:h-56 bg-surface-container border-b border-outline-variant/10 relative overflow-hidden flex items-center justify-center editor-well">
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        <span className="material-symbols-outlined absolute text-[200px] text-surface-container-high/20 opacity-50 font-bold -bottom-10 right-10 z-0 select-none">terminal</span>
      </div>

      <div className="max-w-[70rem] mx-auto px-6 lg:px-12 relative z-10 w-full mb-12">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-[40px] md:-mt-[50px] mb-8"
        >
          {/* Avatar */}
          <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-surface-container-lowest border-4 border-surface rounded-xl overflow-hidden shadow-2xl relative">
            <img
              src={userProfile?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${decodedUsername}`}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
            />
            {isOwner && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-white text-lg">edit</span>
              </div>
            )}
          </div>

          {/* Info & Stats */}
          <div className="flex-1 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6 w-full">
            <div>
              <h2 className="text-2xl font-sans font-bold text-on-surface tracking-tight">{decodedUsername}</h2>
              <p className="text-on-surface/40 font-mono text-[10px] mt-1 uppercase tracking-widest">Creator Profile</p>
            </div>

            <div className="flex justify-center md:justify-end gap-8 bg-surface-container-low px-6 py-4 rounded-xl border border-outline-variant/10 shadow-sm">
              <div className="text-center">
                <span className="block font-mono font-bold text-lg text-on-surface">{userVibes.length}</span>
                <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest">Posts</span>
              </div>
              <div className="text-center">
                <span className="block font-mono font-bold text-lg text-primary">{followersCount}</span>
                <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest">Followers</span>
              </div>
              <div className="text-center">
                <span className="block font-mono font-bold text-lg text-tertiary">{likesCount}</span>
                <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest">Likes</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Channel Tabs */}
        <div className="border-b border-outline-variant/10 mb-8 flex gap-8">
          {['Works', 'Remixes', 'About'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-xs font-mono font-bold tracking-widest uppercase transition-colors border-b-2 -mb-px px-2 ${
                activeTab === tab
                  ? 'text-primary border-primary'
                  : 'text-on-surface/30 border-transparent hover:text-on-surface/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Works' && (
          loading ? (
            <div className="flex justify-center py-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
              {userVibes.map((vibe) => (
                <VibeCard
                  key={vibe.id}
                  vibe={vibe}
                  onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}/${toSlug(vibe.title)}`)}
                />
              ))}
              {userVibes.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-on-surface/20 border border-dashed border-outline-variant/10 rounded-xl bg-surface-container-lowest">
                  <span className="material-symbols-outlined text-4xl mb-4">folder_off</span>
                  <p className="font-mono text-sm">No works uploaded yet.</p>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'Remixes' && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-on-surface/20 border border-dashed border-outline-variant/10 rounded-xl bg-surface-container-lowest">
             <span className="material-symbols-outlined text-2xl mb-2 opacity-50">account_tree</span>
             <p className="font-mono text-xs uppercase tracking-widest">Remixes offline</p>
          </div>
        )}

        {activeTab === 'About' && (
          <div className="max-w-xl py-6 p-8 bg-surface-container-lowest border border-outline-variant/10 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-on-surface/40 text-[18px]">info</span>
              <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/40">Status / Motto</p>
              {isOwner && !isEditingMotto && (
                <button onClick={() => setIsEditingMotto(true)} className="ml-auto flex items-center justify-center w-6 h-6 text-on-surface/30 hover:text-primary transition-colors bg-surface-container hover:bg-surface-container-high rounded decoration-none shadow-none focus:outline-none">
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
              )}
            </div>
            
            {isEditingMotto ? (
              <div className="flex flex-col gap-3">
                <textarea
                  value={mottoDraft}
                  onChange={(e) => setMottoDraft(e.target.value)}
                  className="w-full bg-surface border border-outline-variant/20 rounded p-4 text-on-surface text-sm focus:outline-none focus:border-primary font-mono placeholder:text-on-surface/20"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditingMotto(false)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-container rounded transition-colors border border-outline-variant/10">
                    <span className="material-symbols-outlined text-[16px] text-on-surface/40 hover:text-on-surface">close</span>
                  </button>
                  <button onClick={handleSaveMotto} className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary-fixed rounded transition-colors text-on-primary">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-on-surface/80 text-sm leading-relaxed font-sans border-l-2 border-primary/40 pl-4 py-1">
                {userProfile?.motto || 'INIT. DEV. VIBE. System online.'}
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="flex justify-between items-center px-8 py-12 bg-[#131313] border-t border-outline-variant/10 mt-auto">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[#E5E2E1] font-sans">VibeJam</span>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#E5E2E1]/40 mt-1">© 2024 VibeJam Editorial</p>
        </div>
        <div className="flex gap-8">
          <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-[#E5E2E1]/40 hover:text-[#FFB3B6] transition-colors">Terms</a>
          <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-[#E5E2E1]/40 hover:text-[#FFB3B6] transition-colors">Privacy</a>
        </div>
      </footer>
    </main>
  );
}

