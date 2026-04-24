export interface User {
  id: number;
  username: string;
  display_name?: string;
  avatar: string;
  credit: number;
  email?: string;
  supabase_id?: string;
  auth_provider?: string;
  provider_account_id?: string;
  motto?: string;
  followers_count?: number;
  likes_count?: number;
  is_vip?: boolean;
  is_approved?: boolean;
  created_at?: string;
}

export interface AuthSyncPayload {
  supabase_id: string;
  email?: string;
  avatar: string;
  display_name: string;
  provider?: string;
  provider_account_id?: string;
}

export interface Asset {
  id: number;
  owner_id: number;
  supabase_path: string;
  public_url: string;
  sha256: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  category: string;
  created_at: string;
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

export interface AccessLog {
  id: number;
  path: string;
  ip: string | null;
  country: string | null;
  user_agent: string | null;
  referer: string | null;
  supabase_id: string | null;
  username: string | null;
  is_approved: boolean | null;
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
  visibility?: 'public' | 'private';
  description?: string;
  cover_image?: string;
  has_password?: boolean;
  user_role?: 'owner' | 'collaborator' | 'viewer' | 'none';
  collaborators?: Collaborator[];
  latest_code?: string;
  latest_version?: number;
  comment_count?: number;
  remix_count?: number;
  like_count?: number;
  user_liked?: boolean;
  parent_vibe_id?: number;
  parent_vibe_title?: string;
  parent_author_name?: string;
  parent_version_number?: number;
  versions?: Version[];
  comments?: Comment[];
}

export interface VibeChild {
  id: number;
  title: string;
  author_name: string;
  author_avatar: string;
  created_at: string;
  remix_count?: number;
}

export interface VibeAncestor {
  id: number;
  title: string;
  author_name: string;
  author_avatar: string;
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

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data && typeof data.error === 'string' && data.error.trim()) {
    return data.error;
  }
  const text = await res.text().catch(() => '');
  return text.slice(0, 200) || fallback;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 15000, signal, ...init } = options;
  const controller = new AbortController();
  let timeoutId: number | undefined;

  const abortFromSignal = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', abortFromSignal, { once: true });
    }
  }

  if (timeoutMs > 0) {
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
    if (signal) {
      signal.removeEventListener('abort', abortFromSignal);
    }
  }
}

export async function apiJson<T>(path: string, options: ApiFetchOptions = {}, fallbackError = 'Request failed'): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `${fallbackError} (${res.status})`));
  }
  return res.json();
}

export const api = {
  async syncUser(data: AuthSyncPayload): Promise<User> {
    return apiJson<User>('/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, 'syncUser failed');
  },
  async getUserProfile(username: string): Promise<User> {
    return apiJson<User>(`/users/${encodeURIComponent(username)}`, {}, 'User not found');
  },
  async updateUserProfile(username: string, data: { motto: string }): Promise<User> {
    return apiJson<User>(`/users/${encodeURIComponent(username)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, 'Failed to update user');
  },
  async getVibes(supabaseId?: string): Promise<Vibe[]> {
    const params = supabaseId ? `?supabase_id=${encodeURIComponent(supabaseId)}` : '';
    const data = await apiJson<unknown>(`/vibes${params}`, { timeoutMs: 15000 }, 'Failed to fetch vibes');
    return Array.isArray(data) ? data as Vibe[] : [];
  },
  async getVibeBySlug(username: string, slug: string, supabaseId?: string, password?: string): Promise<Vibe> {
    let params = supabaseId ? `?supabase_id=${encodeURIComponent(supabaseId)}` : '';
    if (password) params += `${params ? '&' : '?'}password=${encodeURIComponent(password)}`;
    const res = await apiFetch(`/vibes/by-slug/${encodeURIComponent(username)}/${encodeURIComponent(slug)}${params}`);
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      throw new AccessDeniedError(data.code || 'PRIVATE_VIBE');
    }
    if (!res.ok) throw new Error('Vibe not found');
    return res.json();
  },
  async getVibe(id: string | number, supabaseId?: string, password?: string): Promise<Vibe> {
    let params = supabaseId ? `?supabase_id=${encodeURIComponent(supabaseId)}` : '';
    if (password) params += `${params ? '&' : '?'}password=${encodeURIComponent(password)}`;
    const res = await apiFetch(`/vibes/${id}${params}`);
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      throw new AccessDeniedError(data.code || 'PRIVATE_VIBE');
    }
    return res.json();
  },
  async createVibe(data: { title: string; tags: string; code: string; description?: string; author_id?: number; parent_vibe_id?: number; parent_version_number?: number; visibility?: 'public' | 'private' }): Promise<{ id: number }> {
    return apiJson<{ id: number }>('/vibes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, 'Failed to create vibe');
  },
  async updateTitle(vibeId: number, supabaseId: string, title: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/vibes/${vibeId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, title }),
    }, 'Failed to update title');
  },
  async updateVisibility(vibeId: number, supabaseId: string, visibility: 'public' | 'private'): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/vibes/${vibeId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, visibility }),
    }, 'Failed to update visibility');
  },
  async setVibePassword(vibeId: number, supabaseId: string, password: string | null): Promise<{ success: boolean; has_password: boolean }> {
    return apiJson<{ success: boolean; has_password: boolean }>(`/vibes/${vibeId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, password }),
    }, 'Failed to set password');
  },
  async verifyVibePassword(vibeId: number, password: string): Promise<{ valid: boolean }> {
    return apiJson<{ valid: boolean }>(`/vibes/${vibeId}/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }, 'Failed to verify password');
  },
  async updateDescription(vibeId: number, supabaseId: string, description: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/vibes/${vibeId}/description`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, description }),
    }, 'Failed to update description');
  },
  async updateCoverImage(vibeId: number, supabaseId: string, coverImageUrl: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/vibes/${vibeId}/cover-image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, cover_image: coverImageUrl }),
    }, 'Failed to update cover image');
  },
  async addCollaborator(vibeId: number, supabaseId: string, username: string): Promise<Collaborator> {
    return apiJson<Collaborator>(`/vibes/${vibeId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId, username }),
    }, 'Failed to add collaborator');
  },
  async removeCollaborator(vibeId: number, userId: number, supabaseId: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/vibes/${vibeId}/collaborators/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    }, 'Failed to remove collaborator');
  },
  async createInviteLink(vibeId: number, supabaseId: string): Promise<{ token: string }> {
    return apiJson<{ token: string }>(`/vibes/${vibeId}/invite-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    }, 'Failed to create invite link');
  },
  async getInviteLinks(vibeId: number, supabaseId: string): Promise<InviteLink[]> {
    return apiJson<InviteLink[]>(`/vibes/${vibeId}/invite-links?supabase_id=${encodeURIComponent(supabaseId)}`, {}, 'Failed to get invite links');
  },
  async revokeInviteLink(vibeId: number, token: string, supabaseId: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/vibes/${vibeId}/invite-link/${token}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    }, 'Failed to revoke invite link');
  },
  async resolveInviteLink(token: string): Promise<{ valid: boolean; vibe_id?: number; vibe_title?: string; author_name?: string }> {
    return apiJson<{ valid: boolean; vibe_id?: number; vibe_title?: string; author_name?: string }>(`/invite/${token}`);
  },
  async acceptInviteLink(token: string, supabaseId: string): Promise<{ success: boolean; vibe_id: number; already_owner?: boolean }> {
    return apiJson<{ success: boolean; vibe_id: number; already_owner?: boolean }>(`/invite/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    }, 'Failed to accept invite');
  },
  async addVersion(vibeId: number, data: { code: string; update_log: string; author_id?: number }): Promise<{ success: boolean; version: number }> {
    return apiJson<{ success: boolean; version: number }>(`/vibes/${vibeId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, 'Failed to add version');
  },
  async addComment(vibeId: number, data: { content: string; code_snippet?: string; version_id: number; author_id?: number }): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/vibes/${vibeId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, 'Failed to add comment');
  },
  async deleteVibe(vibeId: number, supabaseId: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/vibes/${vibeId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    }, 'Failed to delete vibe');
  },
  async getVibeChildren(vibeId: number): Promise<VibeChild[]> {
    return apiJson<VibeChild[]>(`/vibes/${vibeId}/children`);
  },
  async getVibeAncestry(vibeId: number): Promise<VibeAncestor[]> {
    return apiJson<VibeAncestor[]>(`/vibes/${vibeId}/ancestry`);
  },
  async toggleLike(vibeId: number, supabaseId: string): Promise<{ liked: boolean; like_count: number }> {
    return apiJson<{ liked: boolean; like_count: number }>(`/vibes/${vibeId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    }, 'Failed to toggle like');
  },
  async toggleFollow(username: string, supabaseId: string): Promise<{ following: boolean; followers_count: number }> {
    return apiJson<{ following: boolean; followers_count: number }>(`/users/${encodeURIComponent(username)}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_id: supabaseId }),
    }, 'Failed to toggle follow');
  },
  async getFollowStatus(username: string, supabaseId?: string): Promise<{ following: boolean; followers_count: number }> {
    const params = supabaseId ? `?supabase_id=${encodeURIComponent(supabaseId)}` : '';
    return apiJson<{ following: boolean; followers_count: number }>(`/users/${encodeURIComponent(username)}/follow${params}`, {}, 'Failed to get follow status');
  },
  assets: {
    async listAssets(supabaseId: string): Promise<Asset[]> {
      const data = await apiJson<unknown>(`/assets?supabase_id=${encodeURIComponent(supabaseId)}`, {}, 'Failed to fetch assets');
      return Array.isArray(data) ? data as Asset[] : [];
    },
    async checkDedup(supabaseId: string, sha256: string): Promise<{ exists: boolean; asset?: Asset }> {
      return apiJson<{ exists: boolean; asset?: Asset }>('/assets/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabase_id: supabaseId, sha256 }),
      }, 'Dedup check failed');
    },
    async saveAssetMetadata(data: {
      supabase_id: string; supabase_path: string; public_url: string; sha256: string;
      filename: string; original_name: string; mime_type: string; file_size: number; category: string;
    }): Promise<Asset> {
      return apiJson<Asset>('/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, 'Failed to save asset');
    },
    async deleteAsset(assetId: number, supabaseId: string): Promise<{ success: boolean }> {
      return apiJson<{ success: boolean }>(`/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabase_id: supabaseId }),
      }, 'Failed to delete asset');
    },
  },
  ai: {
    async testKey(provider: string, apiKey: string): Promise<{ ok: boolean; provider: string }> {
      return apiJson<{ ok: boolean; provider: string }>('/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      }, 'AI key test failed');
    },
    async chat(data: { provider: string; apiKey: string; messages: Array<{ role: string; content: string }>; model?: string; temperature?: number; maxTokens?: number }): Promise<{ text: string; tokensUsed?: number }> {
      return apiJson<{ text: string; tokensUsed?: number }>('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        timeoutMs: 30000,
      }, 'AI chat failed');
    },
    async chatStream(data: { provider: string; apiKey: string; messages: Array<{ role: string; content: string }>; model?: string; temperature?: number; maxTokens?: number }, signal?: AbortSignal): Promise<Response> {
      return apiFetch('/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal,
        timeoutMs: 0,
      });
    },
  },

  whitelist: {
    async getPending(): Promise<User[]> {
      return apiJson<User[]>('/whitelist/pending', {}, 'Failed to fetch pending users');
    },
    async getApproved(): Promise<User[]> {
      return apiJson<User[]>('/whitelist/approved', {}, 'Failed to fetch approved users');
    },
    async approve(id: number): Promise<User> {
      return apiJson<User>(`/whitelist/${id}/approve`, { method: 'PATCH' }, 'Approve failed');
    },
    async revoke(id: number): Promise<User> {
      return apiJson<User>(`/whitelist/${id}/revoke`, { method: 'PATCH' }, 'Revoke failed');
    },
    async reject(id: number): Promise<{ ok: boolean }> {
      return apiJson<{ ok: boolean }>(`/whitelist/${id}`, { method: 'DELETE' }, 'Reject failed');
    },
    async approveAll(): Promise<{ count: number }> {
      return apiJson<{ count: number }>('/whitelist/approve-all', { method: 'POST' }, 'Approve all failed');
    },
  },

  accessLogs: {
    async record(data: { path: string; supabase_id?: string; username?: string; is_approved?: boolean }): Promise<{ ok: boolean; ip?: string; country?: string }> {
      return apiJson<{ ok: boolean; ip?: string; country?: string }>('/access-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, 'Failed to record access log');
    },
    async getAll(limit = 100, offset = 0): Promise<AccessLog[]> {
      return apiJson<AccessLog[]>(`/access-logs?limit=${limit}&offset=${offset}`, {}, 'Failed to fetch access logs');
    },
  },
};
