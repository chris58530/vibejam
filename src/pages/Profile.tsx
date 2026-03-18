import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { api, Vibe, User } from '../lib/api';
import VibeCard from '../components/VibeCard';

interface ProfileProps {
  user: User | null;
  onSelectVibe: (id: number) => void;
}

export default function Profile({ user, onSelectVibe }: ProfileProps) {
  const [userVibes, setUserVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock metrics for vanity
  const followersCount = 1337;
  const likesCount = 8964;

  useEffect(() => {
    // Ideally this would fetch only the user's vibes. For now, we'll fetch all and filter or just show all if no API support.
    api.getVibes().then(data => {
      // Mock filtering if user exists, otherwise just show some data
      const filtered = Array.isArray(data) 
        ? data.filter(v => !user || v.author_id === user.id)
        : [];
      setUserVibes(filtered.length > 0 ? filtered : (Array.isArray(data) ? data.slice(0, 9) : []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header (IG Style) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12"
      >
        {/* Avatar */}
        <div className="w-32 h-32 md:w-40 md:h-40 shrink-0">
          <img 
            src={user?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.username || 'vibe'}`} 
            alt="Profile Avatar" 
            className="w-full h-full rounded-full object-cover border-4 border-gray-800 shadow-xl"
          />
        </div>

        {/* Info & Stats */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold mb-4">{user?.username || 'Guest Creator'}</h2>
          
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
            <p className="font-medium text-white mb-1">Motto</p>
            <p>"Keep it simple, make it vibe. Exploring the intersection between minimal design and raw code."</p>
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
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {userVibes.map((vibe) => (
            <div 
              key={vibe.id} 
              onClick={() => onSelectVibe(vibe.id)}
              className="aspect-square bg-gray-900 overflow-hidden cursor-pointer relative group"
            >
              {/* Fallback pattern if no thumbnail */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/50 to-purple-900/50 flex items-center justify-center p-4 text-center">
                <span className="text-xs font-mono text-indigo-300 opacity-50 group-hover:opacity-100 transition-opacity line-clamp-3">
                  {vibe.title}
                </span>
              </div>
              
              {/* Hover overlay stats (IG style) */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <div className="flex items-center gap-1 font-bold">
                  <span>❤️</span> {(vibe.likes_count || 0) + Math.floor(Math.random() * 100)}
                </div>
              </div>
            </div>
          ))}
          {userVibes.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-500">
              No works yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
