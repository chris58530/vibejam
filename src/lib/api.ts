export interface User {
  id: number;
  username: string;
  avatar: string;
  credit: number;
}

export interface Version {
  id: number;
  vibe_id: number;
  version_number: number;
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
  async addVersion(vibeId: number, data: { code: string; update_log: string }): Promise<{ success: boolean; version: number }> {
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
};
