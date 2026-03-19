import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Vibe, User, toSlug } from '../lib/api';
import VibeCard from '../components/VibeCard';
import { supabase } from '../lib/supabase';
import { Edit2, Check, X } from 'lucide-react';

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
      setMottoDraft(profile?.motto || 'Keep it simple, make it vibe. Exploring the intersection between minimal design and raw code.');
      
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
    <div className="pb-20">
      {/* Channel Banner */}
      <div className="w-full h-32 md:h-48 bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden mt-16">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(120,80,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,80,120,0.6) 0%, transparent 50%)',
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 -mt-16 mb-6"
        >
          {/* Avatar overlapping banner */}
          <div className="w-28 h-28 md:w-36 md:h-36 shrink-0">
            <img
              src={userProfile?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${decodedUsername}`}
              alt="Profile Avatar"
              className="w-full h-full rounded-full object-cover border-4 border-black shadow-xl"
            />
          </div>

          {/* Info & Stats */}
          <div className="flex-1 text-center md:text-left pb-2">
            <h2 className="text-2xl font-bold mb-3">{decodedUsername}</h2>

            <div className="flex justify-center md:justify-start gap-6 text-sm">
              <div className="text-center">
                <span className="block font-bold text-xl">{userVibes.length}</span>
                <span className="text-gray-400">Posts</span>
              </div>
              <div className="text-center cursor-pointer hover:text-white transition-colors">
                <span className="block font-bold text-xl text-pink-500">{followersCount}</span>
                <span className="text-gray-400">Followers</span>
              </div>
              <div className="text-center cursor-pointer hover:text-white transition-colors">
                <span className="block font-bold text-xl text-red-500">{likesCount}</span>
                <span className="text-gray-400">Likes</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Channel Tabs */}
        <div className="border-b border-white/10 mb-6 flex gap-6">
          {['Works', 'Remixes', 'About'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-white border-white'
                  : 'text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Works' && (
          loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userVibes.map((vibe) => (
                <VibeCard
                  key={vibe.id}
                  vibe={vibe}
                  onClick={() => navigate(`/@${encodeURIComponent(vibe.author_name)}/${toSlug(vibe.title)}`)}
                />
              ))}
              {userVibes.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-500">
                  No works yet.
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'Remixes' && (
          <div className="text-center py-20 text-white/40">
            <p className="text-lg font-semibold mb-2">Coming soon</p>
            <p className="text-sm">Remixes will appear here.</p>
          </div>
        )}

        {activeTab === 'About' && (
          <div className="max-w-lg py-6">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-semibold text-white">Motto</p>
              {isOwner && !isEditingMotto && (
                <button onClick={() => setIsEditingMotto(true)} className="text-gray-400 hover:text-white transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {isEditingMotto ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={mottoDraft}
                  onChange={(e) => setMottoDraft(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditingMotto(false)} className="p-1 hover:bg-white/10 rounded">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={handleSaveMotto} className="p-1 hover:bg-white/10 rounded">
                    <Check className="w-4 h-4 text-green-500" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 text-sm leading-relaxed">
                "{userProfile?.motto || 'Keep it simple, make it vibe. Exploring the intersection between minimal design and raw code.'}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
