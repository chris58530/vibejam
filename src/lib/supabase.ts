import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
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
