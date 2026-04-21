import type { AuthSyncPayload } from './api';

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getEmailLocalPart(email?: string): string | undefined {
  if (!email) return undefined;
  const localPart = email.split('@')[0]?.trim();
  return localPart || undefined;
}

export function buildAuthSyncPayload(user: any): AuthSyncPayload {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const provider =
    asNonEmptyString(user?.app_metadata?.provider) ||
    asNonEmptyString(identities[0]?.provider) ||
    'email';

  const matchingIdentity = identities.find((identity: any) => identity?.provider === provider) || identities[0];
  const providerAccountId =
    asNonEmptyString(matchingIdentity?.id) ||
    asNonEmptyString(matchingIdentity?.identity_id) ||
    asNonEmptyString(matchingIdentity?.user_id) ||
    asNonEmptyString(matchingIdentity?.provider_id) ||
    user?.id;

  const email = asNonEmptyString(user?.email);
  const displayName =
    asNonEmptyString(user?.user_metadata?.user_name) ||
    asNonEmptyString(user?.user_metadata?.name) ||
    getEmailLocalPart(email) ||
    `user-${String(user?.id || '').slice(0, 8)}` ||
    'anonymous';

  return {
    supabase_id: user.id,
    email,
    avatar: asNonEmptyString(user?.user_metadata?.avatar_url) || '',
    display_name: displayName,
    provider,
    provider_account_id: providerAccountId,
  };
}
