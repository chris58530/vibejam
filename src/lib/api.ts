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

export interface Collaborator {
  id: number;
  user_id: number;
  username: string;
  avatar: string;
  created_at: string;
}

export interface InviteLink {
  id: number;
  vibe_id: number;
  token: string;
  created_by: number;
  revoked: boolean;
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
  visibility?: 'public' | 'unlisted' | 'private';
  user_role?: 'owner' | 'collaborator' | 'viewer' | 'none';
  collaborators?: Collaborator[];
  latest_code?: string;
  latest_version?: number;
  comment_count?: number;
  remix_count?: number;
  parent_vibe_id?: number;
  parent_vibe_title?: string;
  parent_author_name?: string;
  parent_version_number?: number;
  versions?: Version[];
  comments?: Comment[];
}

export class AccessDeniedError extends Error {
  code: string;
  constructor(code = 'PRIVATE_VIBE') {
    super('Access denied');
    this.code = code;
  }
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
  async getVibes(supabaseId?: string): Promise<Vibe[]> {
    const params = supabaseId ? `?supabase_id=${encodeURIComponent(supabaseId)}` : '';
    const res = await fetch(`${API_BASE}/vibes${params}`);
    return res.json();
  },
  async getVibeBySlug(username: string, slug: string, supabaseId?: string): Promise<Vibe> {
    const params = supabaseId ? `?supabase_id=${encodeURIComponent(supabaseId)}` : '';
    const res = await fetch(`${API_BASE}/vibes/by-slug/${encodeURIComponent(username)}/${encodeURIComponent(slug)}${params}`);
    if (res.status === 403) throw new AccessDeniedError();
    if (!res.ok) throw new Error('Vibe not found');
    return res.json();
  },
  async getVibe(id: string | number, supabaseId?: string): Promise<Vibe> {
    const params = supabaseId ? `?supabase_id=${encodeURIComponent(supabaseId)}` : '';
    const res = await fetch(`${API_BASE}/vibes/${id}${params}`);
    if (res.status === 403) throw new AccessDeniedError();
    return res.json();
  },
  async createVibe(data: { title: string; tags: string; code: string; author_id?: number; parent_vibe_id?: number; parent_version_number?: number; visibility?: 'public' | 'unlisted' | 'private' }): Promise<{ id: number }> {
    const res = await fetch(`${API_BASE}/vibes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateTitle(vibeId: number, supabaseId: string, title: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, title }),
    });
    if (!res.ok) throw new Error('Failed to update title');
    return res.json();
  },
  async updateVisibility(vibeId: number, supabaseId: string, visibility: 'public' | 'unlisted' | 'private'): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, visibility }),
    });
    if (!res.ok) throw new Error('Failed to update visibility');
    return res.json();
  },
  async addCollaborator(vibeId: number, supabaseId: string, username: string): Promise<Collaborator> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, username }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add collaborator');
    }
    return res.json();
  },
  async removeCollaborator(vibeId: number, userId: number, supabaseId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/collaborators/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    });
    if (!res.ok) throw new Error('Failed to remove collaborator');
    return res.json();
  },
  async createInviteLink(vibeId: number, supabaseId: string): Promise<{ token: string }> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/invite-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    });
    if (!res.ok) throw new Error('Failed to create invite link');
    return res.json();
  },
  async getInviteLinks(vibeId: number, supabaseId: string): Promise<InviteLink[]> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/invite-links?supabase_id=${encodeURIComponent(supabaseId)}`);
    if (!res.ok) throw new Error('Failed to get invite links');
    return res.json();
  },
  async revokeInviteLink(vibeId: number, token: string, supabaseId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/vibes/${vibeId}/invite-link/${token}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    });
    if (!res.ok) throw new Error('Failed to revoke invite link');
    return res.json();
  },
  async resolveInviteLink(token: string): Promise<{ valid: boolean; vibe_id?: number; vibe_title?: string; author_name?: string }> {
    const res = await fetch(`${API_BASE}/invite/${token}`);
    return res.json();
  },
  async acceptInviteLink(token: string, supabaseId: string): Promise<{ success: boolean; vibe_id: number; already_owner?: boolean }> {
    const res = await fetch(`${API_BASE}/invite/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to accept invite');
    }
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
