import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAIKeyStore, AI_PROVIDERS, AIProvider } from '../lib/aiKeyStore';

export default function Settings() {
  const navigate = useNavigate();
  const { keys, testResults, testMessages, usage, dailyLimits, initialized, initialize, setKey, removeKey, testKey, setDailyLimit, getUsage } = useAIKeyStore();

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [editingLimit, setEditingLimit] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  useEffect(() => {
    // Sync stored keys into input fields (masked)
    const vals: Record<string, string> = {};
    for (const p of AI_PROVIDERS) {
      vals[p.id] = keys[p.id] || '';
    }
    setInputValues(vals);
  }, [keys]);

  const handleSave = async (provider: AIProvider) => {
    const val = inputValues[provider]?.trim();
    if (val) {
      await setKey(provider, val);
    } else {
      await removeKey(provider);
    }
  };

  const handleTest = async (provider: AIProvider) => {
    // Ensure test uses the latest typed key instead of a stale stored value.
    const val = inputValues[provider]?.trim();
    if (val && val !== keys[provider]) {
      await setKey(provider, val);
    }
    await testKey(provider);
  };

  const handleLimitSave = (provider: AIProvider) => {
    const val = parseInt(editingLimit[provider], 10);
    setDailyLimit(provider, isNaN(val) ? 0 : val);
  };

  const getStatusColor = (provider: string) => {
    const status = testResults[provider];
    if (status === 'success') return 'bg-tertiary';
    if (status === 'error') return 'bg-error';
    if (status === 'testing') return 'bg-yellow-400 animate-pulse';
    return keys[provider] ? 'bg-[#E5E2E1]/30' : 'bg-[#E5E2E1]/10';
  };

  const getStatusText = (provider: string) => {
    const status = testResults[provider];
    if (status === 'success') return '已連線';
    if (status === 'error') return '連線失敗';
    if (status === 'testing') return '測試中...';
    return keys[provider] ? '已儲存' : '未設定';
  };

  const maskedKey = (key: string, show: boolean) => {
    if (!key) return '';
    if (show) return key;
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:ml-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold font-headline text-on-surface">AI 設定中心</h1>
          <p className="text-sm text-on-surface-variant mt-1">管理你的 API Key，啟用平台內所有 AI 功能</p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 mb-8">
        <span className="material-symbols-outlined text-tertiary text-xl mt-0.5">shield</span>
        <div>
          <p className="text-sm font-semibold text-on-surface">BYOK 安全模式</p>
          <p className="text-xs text-on-surface-variant mt-1">
            所有 API Key 皆透過 AES-256 加密後儲存於瀏覽器 LocalStorage，不會傳送至我們的伺服器。
            API 呼叫透過後端 Proxy 轉發，確保 Key 不暴露於前端網路請求中。
          </p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {AI_PROVIDERS.map((provider) => {
          const hasKey = !!keys[provider.id];
          const todayUsage = getUsage(provider.id);
          const limit = dailyLimits[provider.id] || 0;

          return (
            <div
              key={provider.id}
              className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-5 transition-all hover:border-outline-variant/20"
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(provider.id)}`} />
                  <h3 className="font-semibold text-on-surface font-headline">{provider.label}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                    {getStatusText(provider.id)}
                  </span>
                </div>
                {hasKey && (
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">analytics</span>
                    今日：{todayUsage}{limit > 0 ? `/${limit}` : ''} 次
                  </div>
                )}
              </div>

              {/* Key Input */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type={visibility[provider.id] ? 'text' : 'password'}
                    className="w-full bg-surface-container-high border border-outline-variant/10 rounded-lg px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder={provider.placeholder}
                    value={inputValues[provider.id] || ''}
                    onChange={(e) => setInputValues(prev => ({ ...prev, [provider.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => setVisibility(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {visibility[provider.id] ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <button
                  onClick={() => handleSave(provider.id)}
                  className="px-4 py-2.5 bg-primary/10 text-primary text-sm font-semibold rounded-lg hover:bg-primary/20 transition-colors"
                >
                  儲存
                </button>
                {hasKey && (
                  <button
                    onClick={() => handleTest(provider.id)}
                    disabled={testResults[provider.id] === 'testing'}
                    className="px-4 py-2.5 bg-tertiary/10 text-tertiary text-sm font-semibold rounded-lg hover:bg-tertiary/20 transition-colors disabled:opacity-50"
                  >
                    測試
                  </button>
                )}
              </div>

              {/* Error message */}
              {testResults[provider.id] === 'error' && testMessages[provider.id] && (
                <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-error/8 border border-error/20 rounded-lg">
                  <span className="material-symbols-outlined text-error text-[14px] mt-0.5 flex-shrink-0">error</span>
                  <p className="text-error text-xs font-mono break-all">{testMessages[provider.id]}</p>
                </div>
              )}

              {/* Daily Limit */}
              {hasKey && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant/5">
                  <span className="text-xs text-on-surface-variant">每日上限：</span>
                  <input
                    type="number"
                    min="0"
                    className="w-20 bg-surface-container-high border border-outline-variant/10 rounded-md px-2 py-1 text-xs font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="不限"
                    value={editingLimit[provider.id] ?? (limit || '')}
                    onChange={(e) => setEditingLimit(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    onBlur={() => handleLimitSave(provider.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLimitSave(provider.id)}
                  />
                  <span className="text-xs text-on-surface-variant/50">次（0 = 不限制）</span>

                  {/* Usage bar */}
                  {limit > 0 && (
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${todayUsage >= limit ? 'bg-error' : 'bg-tertiary'}`}
                          style={{ width: `${Math.min((todayUsage / limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delete key */}
              {hasKey && (
                <div className="mt-3 pt-3 border-t border-outline-variant/5 flex justify-end">
                  <button
                    onClick={() => {
                      removeKey(provider.id);
                      setInputValues(prev => ({ ...prev, [provider.id]: '' }));
                    }}
                    className="text-xs text-error/60 hover:text-error transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    移除 Key
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-surface-container-low border border-outline-variant/10 rounded-xl p-5">
        <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">info</span>
          如何取得 API Key？
        </h3>
        <div className="space-y-2 text-sm text-on-surface-variant">
          <p>• <strong>Google Gemini</strong>：前往 <span className="text-primary">aistudio.google.com</span> → 取得 API Key</p>
          <p>• <strong>OpenAI</strong>：前往 <span className="text-primary">platform.openai.com/api-keys</span> → 建立 Key</p>
          <p>• <strong>Replicate</strong>：前往 <span className="text-primary">replicate.com/account/api-tokens</span></p>
          <p>• <strong>Stability AI</strong>：前往 <span className="text-primary">platform.stability.ai/account/keys</span></p>
        </div>
      </div>
    </div>
  );
}
