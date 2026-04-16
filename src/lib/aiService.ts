/**
 * Frontend AI Service — unified interface for calling AI providers via backend proxy.
 * Automatically reads keys from Zustand store, tracks usage, checks limits.
 */
import { useAIKeyStore, AIProvider } from './aiKeyStore';
import { api } from './api';

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

  try {
    const data = await api.ai.chat({
      provider,
      apiKey,
      messages,
      model: options?.model,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2048,
    });

    store.incrementUsage(provider);

    return {
      text: data.text,
      provider,
      tokensUsed: data.tokensUsed,
    };
  } catch (err: any) {
    throw new AIServiceError(err.message || 'AI 服務回應錯誤', provider);
  }
}

/**
 * Streaming version — calls onChunk for each incoming text chunk.
 * `accumulated` is the full text so far.
 */
export async function chatWithAIStream(
  provider: AIProvider,
  messages: ChatMessage[],
  onChunk: (chunk: string, accumulated: string) => void,
  options?: { model?: string; temperature?: number; maxTokens?: number; signal?: AbortSignal }
): Promise<void> {
  const store = useAIKeyStore.getState();
  const apiKey = store.getKey(provider);

  if (!apiKey) throw new AIServiceError('未設定 API Key，請先至設定頁面輸入。', provider);
  if (store.isOverLimit(provider)) throw new AIServiceError('已達到今日使用上限。', provider);

  let res: Response;
  try {
    res = await api.ai.chatStream({
      provider,
      apiKey,
      messages,
      model: options?.model,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 8192,
    }, options?.signal);
  } catch (err: any) {
    throw new AIServiceError(err.message || 'AI 串流服務錯誤', provider);
  }

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new AIServiceError(err.error || `AI 服務錯誤 (${res.status})`, provider, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let accumulated = '';

  // 當外部 signal 觸發 abort 時，取消 reader
  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      reader.cancel().catch(() => {});
    }, { once: true });
  }

  while (true) {
    if (options?.signal?.aborted) break;
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
