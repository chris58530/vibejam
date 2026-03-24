/**
 * Frontend AI Service — unified interface for calling AI providers via backend proxy.
 * Automatically reads keys from Zustand store, tracks usage, checks limits.
 */
import { useAIKeyStore, AIProvider } from './aiKeyStore';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  text: string;
  provider: AIProvider;
  tokensUsed?: number;
}

export class AIServiceError extends Error {
  constructor(message: string, public provider: AIProvider, public statusCode?: number) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export async function chatWithAI(
  provider: AIProvider,
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<AIResponse> {
  const store = useAIKeyStore.getState();
  const apiKey = store.getKey(provider);

  if (!apiKey) {
    throw new AIServiceError('未設定 API Key，請先至設定頁面輸入。', provider);
  }

  if (store.isOverLimit(provider)) {
    throw new AIServiceError('已達到今日使用上限，請調整配額或明天再試。', provider);
  }

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      apiKey,
      messages,
      model: options?.model,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new AIServiceError(
      err.error || `AI 服務回應錯誤 (${res.status})`,
      provider,
      res.status
    );
  }

  // Track usage
  store.incrementUsage(provider);

  const data = await res.json();
  return {
    text: data.text,
    provider,
    tokensUsed: data.tokensUsed,
  };
}

/**
 * Streaming version — calls onChunk for each incoming text chunk.
 * `accumulated` is the full text so far.
 */
export async function chatWithAIStream(
  provider: AIProvider,
  messages: ChatMessage[],
  onChunk: (chunk: string, accumulated: string) => void,
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<void> {
  const store = useAIKeyStore.getState();
  const apiKey = store.getKey(provider);

  if (!apiKey) throw new AIServiceError('未設定 API Key，請先至設定頁面輸入。', provider);
  if (store.isOverLimit(provider)) throw new AIServiceError('已達到今日使用上限。', provider);

  const res = await fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      apiKey,
      messages,
      model: options?.model,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 8192,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new AIServiceError(err.error || `AI 服務錯誤 (${res.status})`, provider, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const obj = JSON.parse(data);
        if (obj.error) throw new AIServiceError(obj.error, provider);
        if (obj.text) {
          accumulated += obj.text;
          onChunk(obj.text, accumulated);
        }
      } catch (e) {
        if (e instanceof AIServiceError) throw e;
      }
    }
  }

  store.incrementUsage(provider);
}
