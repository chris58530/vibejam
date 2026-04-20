import { Vibe } from './api';

export interface SavedVibe {
  id: number;
  title: string;
  author_name: string;
  author_avatar: string;
  description?: string;
  views: number;
  like_count?: number;
  comment_count?: number;
  remix_count?: number;
  created_at: string;
  savedAt: string;
}

const getKey = (userId?: string | number) => `bk_saved_vibes_${userId ?? 'guest'}`;

export function getSavedVibes(userId?: string | number): SavedVibe[] {
  try {
    const raw = localStorage.getItem(getKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveVibe(vibe: Vibe, userId?: string | number): void {
  const existing = getSavedVibes(userId);
  if (existing.some(v => v.id === vibe.id)) return;
  const entry: SavedVibe = {
    id: vibe.id,
    title: vibe.title,
    author_name: vibe.author_name,
    author_avatar: vibe.author_avatar,
    description: vibe.description,
    views: vibe.views,
    like_count: vibe.like_count,
    comment_count: vibe.comment_count,
    remix_count: vibe.remix_count,
    created_at: vibe.created_at,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(getKey(userId), JSON.stringify([entry, ...existing]));
}

export function unsaveVibe(vibeId: number, userId?: string | number): void {
  const existing = getSavedVibes(userId);
  localStorage.setItem(getKey(userId), JSON.stringify(existing.filter(v => v.id !== vibeId)));
}

export function isVibeSaved(vibeId: number, userId?: string | number): boolean {
  return getSavedVibes(userId).some(v => v.id === vibeId);
}
