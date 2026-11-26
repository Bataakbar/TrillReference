import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export const AUTH_EMAIL_DOMAIN = 'trillreference.app';

function readEnv(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    if (env && typeof env[key] === 'string') {
      return env[key]!.trim();
    }
  } catch {
    // Fallback for non-Vite runtimes (e.g. Node unit tests)
  }
  return '';
}

export const SUPABASE_URL = readEnv('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = readEnv('VITE_SUPABASE_ANON_KEY');
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Converts a plain username (e.g. "trilltrader") into the synthetic Supabase Auth email,
 * while preserving explicit email addresses as-is.
 */
export function normalizeLoginIdentifier(rawIdentifier: string): string {
  const cleaned = rawIdentifier.trim().toLowerCase();
  if (!cleaned) return '';
  if (cleaned.includes('@')) return cleaned;
  return `${cleaned}@${AUTH_EMAIL_DOMAIN}`;
}

export function resolveUsernameFromUser(user: User | null | undefined, profileUsername?: string | null): string {
  if (profileUsername && profileUsername.trim()) return profileUsername.trim();
  const metaUsername =
    typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '';
  if (metaUsername) return metaUsername;
  const email = user?.email ?? '';
  if (email.endsWith(`@${AUTH_EMAIL_DOMAIN}`)) {
    return email.slice(0, -(`@${AUTH_EMAIL_DOMAIN}`.length));
  }
  return email || 'trader';
}
