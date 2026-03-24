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
  const [activeTab, setActiveTab] = useState('Published');
  
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [mottoDraft, setMottoDraft] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

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

  const handleDeleteVibe = async (vibeId: number) => {
    if (!currentUser?.id) return;
    try {
      await api.deleteVibe(vibeId, currentUser.id);
      setUserVibes(prev => prev.filter(v => v.id !== vibeId));
    } catch (err) {
      console.error('Failed to delete vibe', err);
    } finally {
      setDeleteConfirm(null);
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

        {/* Motto / About — always visible below header */}
        <div className="mb-8 px-1">
          <div className="flex items-start gap-3 group">
            <div className="flex-1">
              {isEditingMotto ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={mottoDraft}
                    onChange={(e) => setMottoDraft(e.target.value)}
                    className="w-full max-w-xl bg-surface-container-low border border-outline-variant/20 rounded-lg p-3 text-on-surface text-sm focus:outline-none focus:border-primary font-sans placeholder:text-on-surface/20 resize-none"
                    rows={3}
                    placeholder="Write something about yourself..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingMotto(false)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-on-surface/50 hover:text-on-surface bg-surface-container-high rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-sm">close</span> Cancel
                    </button>
                    <button onClick={handleSaveMotto} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                      <span className="material-symbols-outlined text-sm">check</span> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <p className="text-on-surface/70 text-sm leading-relaxed font-sans border-l-2 border-primary/40 pl-4 py-0.5 max-w-xl">
                    {userProfile?.motto || 'INIT. DEV. VIBE. System online.'}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditingMotto(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 p-1.5 text-on-surface/30 hover:text-primary hover:bg-surface-container-high rounded-lg"
                      title="Edit about"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channel Tabs */}
        <div className="border-b border-outline-variant/10 mb-8 flex gap-8">
          {['Published', 'Remixes'].map(tab => (
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
        {activeTab === 'Published' && (
          loading ? (
            <div className="flex justify-center py-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
              {userVibes.map((vibe) => (
                <div key={vibe.id} className="relative group/card">
                  <VibeCard
                    vibe={vibe}
                    onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}/${toSlug(vibe.title)}`)}
                  />
                  {isOwner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(vibe.id); }}
                      className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity bg-error/80 hover:bg-error text-white rounded-lg p-1.5 shadow-lg z-10"
                      title="刪除這個專案"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
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
             <span className="material-symbols-outlined text-2xl mb-2 opacity-50">repeat</span>
             <p className="font-mono text-xs uppercase tracking-widest">No remixes yet</p>
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

      {/* 刪除確認對話框 */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-outline-variant/20 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error text-xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-on-surface font-bold">確認刪除</h3>
                <p className="text-on-surface-variant text-xs mt-0.5">此操作不可復原</p>
              </div>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
              確定要刪除這個專案嗎？所有版本、評論都會一並刪除。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteVibe(deleteConfirm)}
                className="px-5 py-2 bg-error text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

