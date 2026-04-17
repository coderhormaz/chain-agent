import { supabase } from '../lib/supabase';

/**
 * Check whether a Supabase error is an auth/RLS error that might be
 * recovered by refreshing the session.
 */
export function isAuthError(error: { message?: string; code?: string }): boolean {
  return (
    error?.message?.includes('JWT expired') ||
    error?.code === 'PGRST301' ||
    error?.code === '42501' ||
    error?.message?.includes('policy')
  ) ?? false;
}

/**
 * Execute a Supabase query with automatic retry on auth/RLS errors.
 * If the first attempt fails with a JWT/RLS error, refreshes the session
 * once and retries. This replaces the old `ensureSession()` pre-call pattern
 * which raced with Supabase's built-in `autoRefreshToken`.
 */
export async function withAuthRetry<T>(
  fn: () => PromiseLike<{ data: T; error: { message?: string; code?: string } | null }>
): Promise<{ data: T; error: { message?: string; code?: string } | null }> {
  const result = await fn();

  if (result.error && isAuthError(result.error)) {
    console.log('[withAuthRetry] Auth error detected, refreshing session and retrying...');
    try {
      await supabase.auth.refreshSession();
    } catch (e) {
      console.error('[withAuthRetry] Session refresh failed:', e);
      return result; // Return original error
    }
    return fn();
  }

  return result;
}
