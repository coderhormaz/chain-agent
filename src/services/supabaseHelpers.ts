import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

/**
 * Ensure the Supabase client has a valid session before making queries.
 * Races against a short timeout so it never blocks the UI for too long.
 * If this fails, queries still run — the Supabase client will attempt its
 * own internal refresh via autoRefreshToken.
 */
export async function ensureSession(): Promise<void> {
  try {
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const sessionPromise = supabase.auth.getSession().then(({ data }) => data.session);
    const session = await Promise.race([sessionPromise, timeoutPromise]);

    if (!session) {
      const refreshPromise = supabase.auth.refreshSession().then(({ data }) => data.session);
      const refreshed = await Promise.race([refreshPromise, timeoutPromise]);
      if (refreshed?.user) {
        useAuthStore.getState().setUser(refreshed.user);
      }
    }
  } catch (e) {
    console.warn('[ensureSession] failed (non-fatal):', e);
  }
}

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
