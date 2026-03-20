import { create } from 'zustand';
import { encrypt, decrypt } from './crypto';

export type AIProvider = 'gemini' | 'openai' | 'replicate' | 'stability' | 'minimax';

export interface AIProviderConfig {
  id: AIProvider;
  label: string;
  placeholder: string;
  testEndpoint: string;
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...', testEndpoint: '/api/ai/test' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...', testEndpoint: '/api/ai/test' },
  { id: 'minimax', label: 'MiniMax', placeholder: 'eyJ...', testEndpoint: '/api/ai/test' },
  { id: 'replicate', label: 'Replicate', placeholder: 'r8_...', testEndpoint: '/api/ai/test' },
  { id: 'stability', label: 'Stability AI', placeholder: 'sk-...', testEndpoint: '/api/ai/test' },
];

export interface UsageRecord {
  count: number;
  date: string; // YYYY-MM-DD
}

interface AIKeyState {
  // Key storage (decrypted, in-memory only)
  keys: Record<string, string>;
  // Connection test results
  testResults: Record<string, 'idle' | 'testing' | 'success' | 'error'>;
  // Daily usage counters
  usage: Record<string, UsageRecord>;
  // Daily limit per provider
  dailyLimits: Record<string, number>;
  // Loading state
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setKey: (provider: AIProvider, key: string) => Promise<void>;
  removeKey: (provider: AIProvider) => Promise<void>;
  getKey: (provider: AIProvider) => string | undefined;
  testKey: (provider: AIProvider) => Promise<boolean>;
  incrementUsage: (provider: AIProvider) => void;
  getUsage: (provider: AIProvider) => number;
  setDailyLimit: (provider: AIProvider, limit: number) => void;
  isOverLimit: (provider: AIProvider) => boolean;
}

const STORAGE_PREFIX = 'vibejam_aikey_';
const USAGE_PREFIX = 'vibejam_usage_';
const LIMIT_PREFIX = 'vibejam_limit_';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAIKeyStore = create<AIKeyState>((set, get) => ({
  keys: {},
  testResults: {},
  usage: {},
  dailyLimits: {},
  initialized: false,

  initialize: async () => {
    const keys: Record<string, string> = {};
    const usage: Record<string, UsageRecord> = {};
    const dailyLimits: Record<string, number> = {};
    const today = todayStr();

    for (const p of AI_PROVIDERS) {
      // Load encrypted key
      const stored = localStorage.getItem(STORAGE_PREFIX + p.id);
      if (stored) {
        try {
          keys[p.id] = await decrypt(stored);
        } catch {
          // Corrupted — remove
          localStorage.removeItem(STORAGE_PREFIX + p.id);
        }
      }

      // Load usage
      const usageRaw = localStorage.getItem(USAGE_PREFIX + p.id);
      if (usageRaw) {
        try {
          const parsed = JSON.parse(usageRaw) as UsageRecord;
          usage[p.id] = parsed.date === today ? parsed : { count: 0, date: today };
        } catch {
          usage[p.id] = { count: 0, date: today };
        }
      } else {
        usage[p.id] = { count: 0, date: today };
      }

      // Load limits
      const limitRaw = localStorage.getItem(LIMIT_PREFIX + p.id);
      if (limitRaw) dailyLimits[p.id] = parseInt(limitRaw, 10) || 0;
    }

    set({ keys, usage, dailyLimits, initialized: true });
  },

  setKey: async (provider, key) => {
    const encrypted = await encrypt(key);
    localStorage.setItem(STORAGE_PREFIX + provider, encrypted);
    set(state => ({ keys: { ...state.keys, [provider]: key } }));
  },

  removeKey: async (provider) => {
    localStorage.removeItem(STORAGE_PREFIX + provider);
    set(state => {
      const keys = { ...state.keys };
      delete keys[provider];
      return { keys };
    });
  },

  getKey: (provider) => get().keys[provider],

  testKey: async (provider) => {
    const key = get().keys[provider];
    if (!key) return false;

    set(state => ({ testResults: { ...state.testResults, [provider]: 'testing' } }));

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key }),
      });
      const ok = res.ok;
      set(state => ({ testResults: { ...state.testResults, [provider]: ok ? 'success' : 'error' } }));
      return ok;
    } catch {
      set(state => ({ testResults: { ...state.testResults, [provider]: 'error' } }));
      return false;
    }
  },

  incrementUsage: (provider) => {
    const today = todayStr();
    set(state => {
      const current = state.usage[provider];
      const updated: UsageRecord =
        current && current.date === today
          ? { count: current.count + 1, date: today }
          : { count: 1, date: today };
      localStorage.setItem(USAGE_PREFIX + provider, JSON.stringify(updated));
      return { usage: { ...state.usage, [provider]: updated } };
    });
  },

  getUsage: (provider) => {
    const record = get().usage[provider];
    if (!record || record.date !== todayStr()) return 0;
    return record.count;
  },

  setDailyLimit: (provider, limit) => {
    localStorage.setItem(LIMIT_PREFIX + provider, String(limit));
    set(state => ({ dailyLimits: { ...state.dailyLimits, [provider]: limit } }));
  },

  isOverLimit: (provider) => {
    const limit = get().dailyLimits[provider];
    if (!limit) return false;
    return get().getUsage(provider) >= limit;
  },
}));
