import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api, Vibe, User } from '../lib/api';
import { EditorMode } from '../lib/codeUtils';
import VibeCard from '../components/VibeCard';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { devLog } from '../lib/devLog';

interface SaveSlot {
  id: string;
  title: string;
  tags: string;
  editorMode: EditorMode;
  code: { html: string; css: string; js: string };
  savedAt: string;
}

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
  const [saves, setSaves] = useState<SaveSlot[]>([]);

  const navigate = useNavigate();
  const { search } = useLocation();

  const rawUsername = username?.startsWith('@') ? username.substring(1) : username;
  const decodedUsername = rawUsername ? decodeURIComponent(rawUsername) : 'Guest Creator';

  devLog.info(`[Profile] render | path=${window.location.pathname} | param=${username ?? '(undefined)'} | decoded=${decodedUsername} | loading=${loading} | hasProfile=${!!userProfile} | vibes=${userVibes.length}`);

  useEffect(() => {
    devLog.info(`[Profile] mount effect — getSession start`);
    if (!supabase) {
      devLog.warn(`[Profile] supabase client is null (env not configured)`);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      devLog.info(`[Profile] getSession → ${data.session?.user ? `user=${data.session.user.email ?? data.session.user.id.slice(0,8)}` : 'no session'}`);
      setCurrentUser(data.session?.user ?? null);
    }).catch((e: any) => {
      devLog.error(`[Profile] getSession failed: ${e?.message ?? e}`);
    });
  }, []);

  const isOwner = currentUser && (
    currentUser.user_metadata?.user_name === decodedUsername ||
    currentUser.user_metadata?.name === decodedUsername ||
    currentUser.email === decodedUsername
  );

  // ?tab=saves 自動切換
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get('tab') === 'saves') setActiveTab('Saves');
  }, [search]);

  // 載入存檔（用 userProfile.id 對應 Workspace 的 key）
  useEffect(() => {
    if (!userProfile?.id) return;
    const key = `beaverkit_saves_${userProfile.id}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setSaves(JSON.parse(stored));
      else setSaves([]);
    } catch { setSaves([]); }
  }, [userProfile?.id]);

  useEffect(() => {
    const supabaseId = currentUser?.id;
    devLog.info(`[Profile] data effect fired | decodedUsername=${decodedUsername} | supabaseId=${supabaseId ? supabaseId.slice(0,8) : '(none)'}`);
    const t0 = Date.now();
    Promise.all([
      api.getUserProfile(decodedUsername)
        .then(p => { devLog.info(`[Profile] getUserProfile ok | id=${p?.id} | motto=${(p?.motto ?? '').slice(0,30)}`); return p; })
        .catch(e => { devLog.error(`[Profile] getUserProfile failed: ${e?.message ?? e}`); return null; }),
      api.getVibes(supabaseId)
        .then(v => { devLog.info(`[Profile] getVibes ok | count=${Array.isArray(v) ? v.length : 'not-array'} | elapsed=${Date.now()-t0}ms`); return v; })
        .catch(e => { devLog.error(`[Profile] getVibes failed: ${e?.message ?? e}`); return []; })
    ]).then(([profile, allVibes]) => {
      setUserProfile(profile);
      setMottoDraft(profile?.motto || 'INIT. DEV. VIBE. System online.');

      const filtered = Array.isArray(allVibes)
        ? allVibes.filter(v => v.author_name === decodedUsername)
        : [];
      devLog.info(`[Profile] filter vibes | total=${Array.isArray(allVibes) ? allVibes.length : 0} | filtered=${filtered.length} | authors=${Array.isArray(allVibes) ? [...new Set(allVibes.slice(0,5).map(v => v.author_name))].join(',') : ''}`);
      setUserVibes(filtered);
      setLoading(false);
      devLog.info(`[Profile] data effect done | total=${Date.now()-t0}ms`);
    }).catch((e: any) => {
      devLog.error(`[Profile] data effect Promise.all failed: ${e?.message ?? e}`);
      setLoading(false);
    });
  }, [decodedUsername, currentUser]);

  // 切回分頁時自動刷新個人作品列表
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const supabaseId = currentUser?.id;
        api.getVibes(supabaseId).then(allVibes => {
          const filtered = Array.isArray(allVibes)
            ? allVibes.filter(v => v.author_name === decodedUsername)
            : [];
          setUserVibes(filtered);
        }).catch(() => { });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedUsername, currentUser]);

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

  const handleLoadSave = (slot: SaveSlot) => {
    sessionStorage.setItem('beaverkit_pending_load', JSON.stringify(slot));
    navigate('/workspace');
  };

  const handleDeleteSave = (id: string) => {
    if (!userProfile?.id) return;
    const key = `beaverkit_saves_${userProfile.id}`;
    const updated = saves.filter(s => s.id !== id);
    setSaves(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const followersCount = userProfile?.followers_count || 0;
  const likesCount = userProfile?.likes_count || 0;
  const totalViews = userVibes.reduce((sum, v) => sum + (v.views || 0), 0);

  return (
    <main className="md:ml-[var(--app-sidebar-width)] min-h-screen bg-surface flex flex-col transition-[margin] duration-300">

      {/* ── Hero Banner ── */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden shrink-0">
        {/* base dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1a38] via-surface to-surface" />
        {/* large glow orb — top-left (promo scene 1) */}
        <div className="absolute -top-24 -left-16 w-[560px] h-[560px] rounded-full bg-primary/10 blur-[120px]" />
        {/* small glow — bottom-right */}
        <div className="absolute -bottom-10 right-20 w-72 h-72 rounded-full bg-primary/8 blur-[80px]" />
        {/* mid accent glow */}
        <div className="absolute top-6 right-1/3 w-56 h-56 rounded-full bg-secondary/8 blur-[60px]" />
        {/* hairlines — horizontal & vertical (promo scene 1 style) */}
        <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(38,101,253,0.07)' }} />
        <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(38,101,253,0.07)' }} />
        {/* dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(38,101,253,1) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        {/* fade to surface at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-surface to-transparent" />
      </div>

      <div className="max-w-[68rem] mx-auto px-4 md:px-8 lg:px-12 relative z-10 w-full flex-1">

        {/* ── Profile Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="-mt-20 md:-mt-24 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-7">

            {/* Avatar */}
            <div className="relative shrink-0 self-center md:self-auto">
              {/* glow bloom behind avatar */}
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl scale-125 -z-10" />
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl ring-2 ring-primary/30 shadow-2xl shadow-primary/20 overflow-hidden bg-surface-container relative">
                <img
                  src={userProfile?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${decodedUsername}`}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                />
                {isOwner && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                  </div>
                )}
              </div>
              {/* online badge */}
              <div className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 ring-2 ring-surface shadow-lg" title="Active" />
            </div>

            {/* Username + Motto + Actions */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  {/* creator badge pill (promo scene 1 badge style) */}
                  <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[11px] font-semibold tracking-widest uppercase text-primary/80">Creator</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-on-surface tracking-tight leading-none">{decodedUsername}</h1>

                  {/* Motto inline */}
                  <div className="mt-3 group flex items-start gap-2">
                    {isEditingMotto ? (
                      <div className="flex flex-col gap-2 w-full max-w-lg">
                        <textarea
                          value={mottoDraft}
                          onChange={(e) => setMottoDraft(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-on-surface text-sm focus:outline-none focus:border-primary font-sans placeholder:text-on-surface/20 resize-none"
                          rows={2}
                          placeholder="Say something about yourself..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setIsEditingMotto(false)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-on-surface/50 hover:text-on-surface bg-surface-container-high rounded-lg transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-sm">close</span> Cancel
                          </button>
                          <button onClick={handleSaveMotto} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-sm">check</span> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-on-surface/55 leading-relaxed max-w-md">
                          {userProfile?.motto || 'INIT. DEV. VIBE. System online.'}
                        </p>
                        {isOwner && (
                          <button
                            onClick={() => setIsEditingMotto(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 text-on-surface/30 hover:text-primary hover:bg-surface-container-high rounded-lg cursor-pointer"
                            title="Edit bio"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Action row (owner) */}
                {isOwner && (
                  <div className="flex gap-2 justify-center md:justify-end shrink-0">
                    <button
                      onClick={() => navigate('/settings')}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-on-surface/60 hover:text-on-surface bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 rounded-xl transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">settings</span>
                      Settings
                    </button>
                    <button
                      onClick={() => navigate('/workspace')}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-on-primary bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      New Vibe
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats Strip (promo scene 4 style: large numbers + dividers) ── */}
          <div className="mt-8 flex flex-wrap md:flex-nowrap items-stretch bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
            {([
              { label: 'Vibes', value: userVibes.length, color: 'text-on-surface' },
              { label: 'Views', value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews, color: 'text-secondary' },
              { label: 'Followers', value: followersCount, color: 'text-primary' },
              { label: 'Likes', value: likesCount, color: 'text-tertiary' },
            ] as const).map((stat, i, arr) => (
              <div
                key={stat.label}
                className={`flex-1 basis-1/2 md:basis-auto flex flex-col items-center justify-center py-5 px-6 gap-1.5 ${i < arr.length - 1 ? 'border-b border-r-0 md:border-b-0 md:border-r border-outline-variant/10' : ''}`}
              >
                <p className={`font-mono font-black text-3xl md:text-4xl leading-none tabular-nums ${stat.color}`}>{stat.value}</p>
                <p className="font-mono text-[10px] text-on-surface/35 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="relative border-b border-outline-variant/10 mb-8 flex gap-0.5">
          {(['Published', 'Remixes', ...(isOwner ? ['Saves'] : [])] as string[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-3 text-[11px] font-mono font-bold uppercase tracking-widest transition-all duration-200 rounded-t-xl cursor-pointer ${activeTab === tab
                ? 'text-primary bg-primary/5'
                : 'text-on-surface/30 hover:text-on-surface/60 hover:bg-surface-container-low'
              }`}
            >
              {tab}
              {tab === 'Saves' && saves.length > 0 && (
                <span className="ml-1.5 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{saves.length}/5</span>
              )}
              {activeTab === tab && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'Published' && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-xs text-on-surface/30 uppercase tracking-widest">Loading works...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {userVibes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-on-surface/20 border border-dashed border-outline-variant/10 rounded-2xl bg-surface-container-lowest">
                  <span className="material-symbols-outlined text-5xl">grid_off</span>
                  <p className="font-mono text-sm">No vibes yet</p>
                  {isOwner && (
                    <button
                      onClick={() => navigate('/workspace')}
                      className="mt-2 flex items-center gap-2 px-4 py-2 text-xs font-bold text-on-primary bg-primary hover:bg-primary/90 rounded-xl transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      Create your first Vibe
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 pb-12">
                  {userVibes.map((vibe) => (
                    <div key={vibe.id} className="relative group/card">
                      <VibeCard
                        vibe={vibe}
                        onClick={() => navigate(`/p/${vibe.id}`)}
                      />
                      {isOwner && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(vibe.id); }}
                          className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity bg-error/80 hover:bg-error text-white rounded-lg p-1.5 shadow-lg z-10 cursor-pointer"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )
        )}

        {activeTab === 'Remixes' && (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface/20 border border-dashed border-outline-variant/10 rounded-2xl bg-surface-container-lowest gap-3">
            <span className="material-symbols-outlined text-5xl">repeat</span>
            <p className="font-mono text-sm">No remixes yet</p>
          </div>
        )}

        {activeTab === 'Saves' && isOwner && (
          <div className="pb-12">
            {saves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-on-surface/20 border border-dashed border-outline-variant/10 rounded-2xl bg-surface-container-lowest">
                <span className="material-symbols-outlined text-5xl">folder_open</span>
                <p className="font-mono text-sm">No saves yet</p>
                <p className="font-mono text-xs text-on-surface/15">Save a project in Workspace first</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {saves.map(slot => (
                  <div key={slot.id} className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/20 hover:bg-surface-container transition-all group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{slot.title}</p>
                        {slot.tags && <p className="text-[11px] text-on-surface/40 truncate mt-0.5">{slot.tags}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteSave(slot.id)}
                        className="shrink-0 text-on-surface/20 hover:text-error transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-error/10 cursor-pointer"
                        title="Delete save"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-surface-container-highest px-2 py-0.5 rounded-lg font-mono text-on-surface/40">{slot.editorMode}</span>
                      <span className="text-[10px] text-on-surface/30 font-mono ml-auto">
                        {new Date(slot.savedAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleLoadSave(slot)}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/25 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Load in Workspace
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />

      {/* ── Delete Confirm Dialog ── */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface border border-outline-variant/20 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error text-xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-on-surface font-bold">Confirm Delete</h3>
                <p className="text-on-surface-variant text-xs mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
              Delete this vibe? All versions and comments will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors rounded-xl hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteVibe(deleteConfirm)}
                className="px-5 py-2 bg-error text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}

