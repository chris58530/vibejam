import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { devLog } from './devLog';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/** Thrown when the Supabase client is not initialized (missing env vars). */
export class SupabaseNotInitializedError extends Error {
  constructor() {
    super('Supabase 未初始化，請確認環境變數 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY 已正確設定');
    this.name = 'SupabaseNotInitializedError';
  }
}

/** Thrown when signUp returns a null user, meaning the email is already
 *  registered but the user has not confirmed it yet. */
export class AlreadyRegisteredUnconfirmedError extends Error {
  constructor() {
    super('此電子郵件已被使用但尚未確認');
    this.name = 'AlreadyRegisteredUnconfirmedError';
  }
}

function getSupabase(): SupabaseClient {
  if (!supabase) throw new SupabaseNotInitializedError();
  return supabase;
}

export async function signInWithGitHub() {
  devLog.info('[GitHub OAuth] ① 開始登入流程');
  devLog.info(`[GitHub OAuth] ② env: SUPABASE_URL=${supabaseUrl ? supabaseUrl.slice(0, 35) + '…' : '(空！)'} | KEY=${supabaseAnonKey ? '已設定' : '(空！)'}`);

  let client: SupabaseClient;
  try {
    client = getSupabase();
    devLog.info('[GitHub OAuth] ③ Supabase client 取得成功');
  } catch (e: any) {
    devLog.error(`[GitHub OAuth] ③ Supabase client 取得失敗: ${e.message}`);
    throw e;
  }

  devLog.info(`[GitHub OAuth] ④ 呼叫 signInWithOAuth (redirectTo=${window.location.origin})`);
  // 將跳轉前的診斷資訊存入 sessionStorage，供跳轉返回後復原到 DevLog
  // 注意：必須在 signInWithOAuth 之前存，因為呼叫後可能立即跳轉
  try {
    sessionStorage.setItem('__oauth_debug_redirected_at', String(Date.now()));
    sessionStorage.setItem('__oauth_debug_origin', window.location.origin);
  } catch { /* sessionStorage 不可用時靜默 */ }

  let error: any;
  try {
    // 不使用 skipBrowserRedirect，讓 SDK 自行處理 PKCE code_verifier 存入 localStorage 並跳轉
    ({ error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    }));
  } catch (e: any) {
    devLog.error(`[GitHub OAuth] ④ signInWithOAuth 拋出例外: ${e.message}`);
    throw e;
  }

  devLog.info(`[GitHub OAuth] ⑤ signInWithOAuth 完成 | error=${error?.message ?? 'none'}`);
  console.log('[Auth] GitHub OAuth response:', { error });

  if (error) {
    devLog.error(`[GitHub OAuth] ⑥ Supabase 回傳錯誤: ${error.message}`);
    throw error;
  }

  // SDK 會自行跳轉，此行之後的程式碼不會執行
  devLog.info('[GitHub OAuth] ⑥ SDK 正在跳轉至 GitHub…');
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string,
  avatarUrl?: string,
) {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        user_name: username,
        name: username,
        avatar_url:
          avatarUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
      },
    },
  });
  if (error) throw error;
  if (!data.user) {
    throw new AlreadyRegisteredUnconfirmedError();
  }
  return data;
}

export async function resendConfirmationEmail(email: string) {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function resetPasswordForEmail(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

export async function getSession() {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}
