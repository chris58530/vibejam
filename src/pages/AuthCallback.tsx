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

    // ── 先檢查 SDK 是否已自動 exchange（detectSessionInUrl = true 預設行為）──
    // 當 ?code= 在 URL 裡，Supabase SDK 可能在我們的 useEffect 執行前就已完成 exchange
    // 並透過 history.replaceState 清除 ?code=，此時 getSession() 應已有 session
    const checkExisting = supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        devLog.info(`[AuthCallback] ✅ SDK 已自動處理登入 → ${data.session.user.email ?? data.session.user.id}`);
        navigate('/', { replace: true });
        return true;
      }
      return false;
    });

    // ── 訂閱 onAuthStateChange，處理 SDK 異步 exchange 完成的情況 ─────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      devLog.info(`[AuthCallback] onAuthStateChange: event=${event} | session=${session ? session.user.email ?? session.user.id : 'null'}`);
      if (event === 'SIGNED_IN' && session) {
        devLog.info('[AuthCallback] ✅ SIGNED_IN via onAuthStateChange → 跳轉首頁');
        navigate('/', { replace: true });
      }
    });

    // ── OAuth error params ──────────────────────────────────────────────────
    const params = new URLSearchParams(search);
    const code   = params.get('code');
    const errCode = params.get('error');
    const errDesc = params.get('error_description');

    if (errCode) {
      devLog.error(`[AuthCallback] ❌ OAuth error: ${errCode} — ${errDesc}`);
      subscription.unsubscribe();
      setStatus('error');
      setErrorMsg(`${errCode}: ${decodeURIComponent(errDesc ?? '')}`);
      return;
    }

    // ── PKCE flow: ?code=xxx ────────────────────────────────────────────────
    if (code) {
      devLog.info(`[AuthCallback] ✅ 收到 ?code=, 呼叫 exchangeCodeForSession...`);
      supabase.auth.exchangeCodeForSession(search).then(({ data, error }) => {
        if (error) {
          devLog.error(`[AuthCallback] exchangeCodeForSession 失敗: ${error.message}`);
          subscription.unsubscribe();
          setStatus('error');
          setErrorMsg(error.message);
        } else {
          devLog.info(`[AuthCallback] ✅ 登入成功 → ${data.session?.user.email ?? data.session?.user.id}`);
          navigate('/', { replace: true });
        }
      });
      return () => subscription.unsubscribe();
    }

    // ── Implicit flow: #access_token=xxx ───────────────────────────────────
    if (hash.includes('access_token')) {
      devLog.info('[AuthCallback] ✅ hash 含 access_token, 等待 SDK 處理後跳轉...');
      return () => subscription.unsubscribe();
    }

    // ── 無任何 auth 參數：可能 SDK 已先處理，等待 onAuthStateChange 或 timeout ──
    devLog.warn('[AuthCallback] ⚠️ 無 ?code= 也無 #access_token= → 等待 SDK onAuthStateChange (3s)...');
    checkExisting.then((alreadyHandled) => {
      if (alreadyHandled) return;
      // 等待 3 秒，讓 SDK 有機會完成異步 exchange
      const t = setTimeout(() => {
        supabase!.auth.getSession().then(({ data }) => {
          if (data.session) {
            devLog.info('[AuthCallback] ✅ 3s 後偵測到 session → 跳轉');
            navigate('/', { replace: true });
          } else {
            devLog.warn('[AuthCallback] 3s 後仍無 session → 顯示錯誤');
            subscription.unsubscribe();
            setStatus('error');
            setErrorMsg('沒有收到授權碼。請確認 Supabase Dashboard 的 Redirect URLs 已加入 https://beaverkit.io/auth/callback，以及 Site URL 設為 https://beaverkit.io');
          }
        });
      }, 3000);
      return () => clearTimeout(t);
    });

    return () => subscription.unsubscribe();
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
