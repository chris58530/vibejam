import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { devLog } from './devLog';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
    },
  })
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

export async function signInWithGoogle() {
  let client: SupabaseClient;
  try {
    client = getSupabase();
  } catch (e: any) {
    throw e;
  }

  let error: any;
  try {
    ({ error } = await client.auth.signInWithOAuth({
      provider: 'google',
    }));
  } catch (e: any) {
    throw e;
  }

  if (error) throw error;
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

  // 不指定 redirectTo，讓 Supabase 使用 Dashboard 設定的 Site URL (https://beaverkit.io)
  // implicit flow 會把 #access_token= 附在 Site URL 後面
  devLog.info(`[GitHub OAuth] ④ 呼叫 signInWithOAuth (implicit flow, Site URL)`);
  try {
    sessionStorage.setItem('__oauth_debug_redirected_at', String(Date.now()));
    sessionStorage.setItem('__oauth_debug_origin', 'Site URL (no redirectTo)');
  } catch { /* sessionStorage 不可用時靜默 */ }

  let error: any;
  try {
    ({ error } = await client.auth.signInWithOAuth({
      provider: 'github',
    }));
  } catch (e: any) {
    devLog.error(`[GitHub OAuth] ④ signInWithOAuth 拋出例外: ${e.message}`);
    throw e;
  }

  devLog.info(`[GitHub OAuth] ⑤ signInWithOAuth 完成 | error=${error?.message ?? 'none'}`);

  if (error) {
    devLog.error(`[GitHub OAuth] ⑥ Supabase 回傳錯誤: ${error.message}`);
    throw error;
  }

  // SDK 會自行跳轉
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
