import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { devLog } from '../lib/devLog';

/**
 * OAuth callback handler.
 * Supabase redirects here after GitHub OAuth with ?code=xxx (PKCE)
 * or #access_token=xxx (implicit flow).
 *
 * redirectTo in supabase.ts must point to:
 *   https://beaverkit.io/auth/callback
 *
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
 * must include:
 *   https://beaverkit.io/auth/callback
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const search = window.location.search;
    const hash   = window.location.hash;
    devLog.info(`[AuthCallback] 載入`);
    devLog.info(`[AuthCallback] search=${search.slice(0, 120) || '(無)'}`);
    devLog.info(`[AuthCallback] hash=${hash ? hash.slice(0, 80) : '(無)'}`);

    if (!supabase) {
      devLog.error('[AuthCallback] Supabase 未初始化');
      setStatus('error');
      setErrorMsg('Supabase 未初始化');
      return;
    }

    // ── PKCE flow: ?code=xxx ────────────────────────────────────────────────
    const params = new URLSearchParams(search);
    const code   = params.get('code');
    const errCode = params.get('error');
    const errDesc = params.get('error_description');

    if (errCode) {
      devLog.error(`[AuthCallback] ❌ OAuth error: ${errCode} — ${errDesc}`);
      setStatus('error');
      setErrorMsg(`${errCode}: ${decodeURIComponent(errDesc ?? '')}`);
      return;
    }

    if (code) {
      devLog.info(`[AuthCallback] ✅ 收到 ?code=, 呼叫 exchangeCodeForSession...`);
      supabase.auth.exchangeCodeForSession(search).then(({ data, error }) => {
        if (error) {
          devLog.error(`[AuthCallback] exchangeCodeForSession 失敗: ${error.message}`);
          setStatus('error');
          setErrorMsg(error.message);
        } else {
          devLog.info(`[AuthCallback] ✅ 登入成功 → ${data.session?.user.email ?? data.session?.user.id}`);
          navigate('/', { replace: true });
        }
      });
      return;
    }

    // ── Implicit flow: #access_token=xxx ───────────────────────────────────
    if (hash.includes('access_token')) {
      devLog.info('[AuthCallback] ✅ hash 含 access_token, 等待 SDK 處理後跳轉...');
      // The Supabase SDK detects and processes the hash automatically via onAuthStateChange.
      // Just wait briefly then redirect home.
      const t = setTimeout(() => navigate('/', { replace: true }), 1000);
      return () => clearTimeout(t);
    }

    // ── 無任何 auth 參數 ────────────────────────────────────────────────────
    devLog.warn('[AuthCallback] ⚠️ 無 ?code= 也無 #access_token= → Supabase 沒帶 token 回來');
    devLog.warn('[AuthCallback] 請確認 Supabase Dashboard → Redirect URLs 包含 https://beaverkit.io/auth/callback');
    setStatus('error');
    setErrorMsg('沒有收到授權碼。請確認 Supabase Dashboard 的 Redirect URLs 已加入 https://beaverkit.io/auth/callback');
  }, [navigate]);

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <p className="text-red-400 text-sm max-w-sm">{errorMsg}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-surface-container-high rounded-xl text-on-surface/70 hover:text-on-surface text-sm transition-colors"
        >
          返回首頁
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen gap-3 text-on-surface/40">
      <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
      <span className="text-sm font-mono">正在處理登入...</span>
    </div>
  );
}
