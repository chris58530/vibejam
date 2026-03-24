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
  { id: 'minimax', label: 'MiniMax', placeholder: 'sk-cp-... 或 eyJ...', testEndpoint: '/api/ai/test' },
  { id: 'replicate', label: 'Replicate', placeholder: 'r8_...', testEndpoint: '/api/ai/test' },
  { id: 'stability', label: 'Stability AI', placeholder: 'sk-...', testEndpoint: '/api/ai/test' },
];

export interface AIModelOption {
  id: string;
  label: string;
}

export const AI_PROVIDER_MODELS: Partial<Record<AIProvider, AIModelOption[]>> = {
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  minimax: [
    { id: 'MiniMax-M2.5', label: 'MiniMax M2.5' },
    { id: 'MiniMax-M2', label: 'MiniMax M2' },
  ],
};

export interface UsageRecord {
  count: number;
  date: string; // YYYY-MM-DD
}

interface AIKeyState {
  // Key storage (decrypted, in-memory only)
  keys: Record<string, string>;
  // Persisted validity status from latest key test
  validated: Record<string, boolean>;
  // Connection test results
  testResults: Record<string, 'idle' | 'testing' | 'success' | 'error'>;
  // Error messages from test
  testMessages: Record<string, string>;
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
const VALID_PREFIX = 'vibejam_valid_';

function sanitizeApiKey(raw: string): string {
  // Remove wrapping quotes and invisible whitespace that often appears when copying keys.
  return raw
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, '')
    .replace(/^['"`]+|['"`]+$/g, '')
    .trim();
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAIKeyStore = create<AIKeyState>((set, get) => ({
  keys: {},
  validated: {},
  testResults: {},
  testMessages: {},
  usage: {},
  dailyLimits: {},
  initialized: false,

  initialize: async () => {
    const keys: Record<string, string> = {};
    const validated: Record<string, boolean> = {};
    const usage: Record<string, UsageRecord> = {};
    const dailyLimits: Record<string, number> = {};
    const today = todayStr();

    for (const p of AI_PROVIDERS) {
      // Load encrypted key
      const stored = localStorage.getItem(STORAGE_PREFIX + p.id);
      if (stored) {
        try {
          const decrypted = await decrypt(stored);
          const cleaned = sanitizeApiKey(decrypted);
          if (cleaned) keys[p.id] = cleaned;
          else localStorage.removeItem(STORAGE_PREFIX + p.id);
        } catch {
          // Corrupted — remove
          localStorage.removeItem(STORAGE_PREFIX + p.id);
        }
      }

      // Load validity
      validated[p.id] = localStorage.getItem(VALID_PREFIX + p.id) === '1';

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

    set({ keys, validated, usage, dailyLimits, initialized: true });
  },

  setKey: async (provider, key) => {
    const cleaned = sanitizeApiKey(key);
    if (!cleaned) {
      await get().removeKey(provider);
      return;
    }
    const previousKey = get().keys[provider];
    const encrypted = await encrypt(cleaned);
    localStorage.setItem(STORAGE_PREFIX + provider, encrypted);
    if (previousKey !== cleaned) {
      localStorage.removeItem(VALID_PREFIX + provider);
    }
    set(state => ({
      keys: { ...state.keys, [provider]: cleaned },
      validated: { ...state.validated, [provider]: previousKey === cleaned ? !!state.validated[provider] : false },
      testResults: { ...state.testResults, [provider]: 'idle' },
      testMessages: { ...state.testMessages, [provider]: '' },
    }));
  },

  removeKey: async (provider) => {
    localStorage.removeItem(STORAGE_PREFIX + provider);
    localStorage.removeItem(VALID_PREFIX + provider);
    set(state => {
      const keys = { ...state.keys };
      const validated = { ...state.validated };
      const testResults = { ...state.testResults };
      const testMessages = { ...state.testMessages };
      delete keys[provider];
      delete validated[provider];
      delete testResults[provider];
      delete testMessages[provider];
      return { keys, validated, testResults, testMessages };
    });
  },

  getKey: (provider) => get().keys[provider],

  testKey: async (provider) => {
    const key = sanitizeApiKey(get().keys[provider] || '');
    if (!key) return false;

    set(state => ({ testResults: { ...state.testResults, [provider]: 'testing' }, testMessages: { ...state.testMessages, [provider]: '' } }));

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok;
      localStorage.setItem(VALID_PREFIX + provider, ok ? '1' : '0');
      set(state => ({
        validated: { ...state.validated, [provider]: ok },
        testResults: { ...state.testResults, [provider]: ok ? 'success' : 'error' },
        testMessages: { ...state.testMessages, [provider]: ok ? '' : (data.error || '連線失敗，請確認 Key 是否正確') },
      }));
      return ok;
    } catch (err: any) {
      localStorage.setItem(VALID_PREFIX + provider, '0');
      set(state => ({
        validated: { ...state.validated, [provider]: false },
        testResults: { ...state.testResults, [provider]: 'error' },
        testMessages: { ...state.testMessages, [provider]: err.message || '網路錯誤' },
      }));
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
