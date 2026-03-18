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
  
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [mottoDraft, setMottoDraft] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const navigate = useNavigate();

  // Decode username in case it's URL-encoded, and remove leading @
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
    // Fetch profile and vibes
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
    <div className="max-w-4xl mx-auto px-4 py-20">
      {/* Profile Header (IG Style) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12"
      >
        {/* Avatar */}
        <div className="w-32 h-32 md:w-40 md:h-40 shrink-0">
          <img
            src={userProfile?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${decodedUsername}`}
            alt="Profile Avatar"
            className="w-full h-full rounded-full object-cover border-4 border-gray-800 shadow-xl"
          />
        </div>

        {/* Info & Stats */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold mb-4">{decodedUsername}</h2>

          <div className="flex justify-center md:justify-start gap-6 text-sm mb-6">
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

          <div className="text-sm text-gray-300 max-w-md mx-auto md:mx-0">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <p className="font-medium text-white">Motto</p>
              {isOwner && !isEditingMotto && (
                <button onClick={() => setIsEditingMotto(true)} className="text-gray-400 hover:text-white transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {isEditingMotto ? (
              <div className="flex flex-col gap-2 mt-2">
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
              <p>"{userProfile?.motto || 'Keep it simple, make it vibe. Exploring the intersection between minimal design and raw code.'}"</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Grid Divider */}
      <div className="border-t border-gray-800 mb-8 pt-4 flex justify-center">
        <span className="text-xs tracking-widest uppercase text-gray-500 font-semibold border-t-2 border-white pt-2 -mt-4">
          Works
        </span>
      </div>

      {/* Works Grid */}
      {loading ? (
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
      )}
    </div>
  );
}
