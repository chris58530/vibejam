export interface User {
  id: number;
  username: string;
  avatar: string;
  credit: number;
  motto?: string;
  followers_count?: number;
  likes_count?: number;
}

export interface Version {
  id: number;
  vibe_id: number;
  version_number: number;
  author_id?: number;
  author_name?: string;
  author_avatar?: string;
  code: string;
  update_log: string;
  created_at: string;
}

export interface Comment {
  id: number;
  vibe_id: number;
  version_id: number;
  author_id: number;
  author_name: string;
  author_avatar: string;
  content: string;
  code_snippet: string;
  is_adopted: number;
  created_at: string;
  /** True when this comment has been added optimistically and not yet confirmed by the server */
  optimistic?: boolean;
}

export interface Vibe {
  id: number;
  title: string;
  author_id: number;
  author_name: string;
  author_avatar: string;
  tags: string;
  views: number;
  created_at: string;
  latest_code?: string;
  latest_version?: number;
  comment_count?: number;
  remix_count?: number;
  versions?: Version[];
  comments?: Comment[];
}

// Converts a vibe title to a URL-friendly slug.
// Preserves CJK characters (\u4e00-\u9fff) to support Chinese titles.
export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');
}

const API_BASE = '/api';

export const api = {
  async syncUser(data: { supabase_id: string; username: string; avatar: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getUserProfile(username: string): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error('User not found');
    return res.json();
  },
  async updateUserProfile(username: string, data: { motto: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },
  async getVibes(): Promise<Vibe[]> {
    const res = await fetch(`${API_BASE}/vibes`);
    return res.json();
  },
  async getVibe(id: string | number): Promise<Vibe> {
    const res = await fetch(`${API_BASE}/vibes/${id}`);
    return res.json();
  },
  async createVibe(data: { title: string; tags: string; code: string; author_id?: number; parent_vibe_id?: number }): Promise<{ id: number }> {
    const res = await fetch(`${API_BASE}/vibes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async addVersion(vibeId: number, data: { code: string; update_log: string; author_id?: number }): Promise<{ success: boolean; version: number }> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async addComment(vibeId: number, data: { content: string; code_snippet?: string; version_id: number; author_id?: number }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteVibe(vibeId: number, supabaseId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    });
    if (!res.ok) throw new Error('Failed to delete vibe');
    return res.json();
  },
};
