import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('🔗 Connecting to Supabase:', supabaseUrl);

// Storage constants
const STORAGE_KEY = 'opbnb-ai-auth';
const REMEMBER_ME_KEY = 'opbnb-ai-remember-me';

// Custom storage adapter that can switch between localStorage and sessionStorage
const createCustomStorage = () => {
  return {
    getItem: (key: string) => {
      // Check if user wants to be remembered (default to sessionStorage if not set)
      const rememberMeValue = localStorage.getItem(REMEMBER_ME_KEY);
      const rememberMe = rememberMeValue === 'true';
      
      const primaryStorage = rememberMe ? localStorage : sessionStorage;
      const alternateStorage = rememberMe ? sessionStorage : localStorage;
      
      // Try to get from primary storage first
      let value = primaryStorage.getItem(key);
      
      // If not found in primary storage, check alternate storage
      if (value === null) {
        value = alternateStorage.getItem(key);
        
        // If found in alternate storage, migrate it to primary storage
        if (value !== null) {
          try {
            primaryStorage.setItem(key, value);
            alternateStorage.removeItem(key);
          } catch (error) {
            // If migration fails (e.g., quota exceeded), still return the value
            console.warn('Failed to migrate session storage:', error);
          }
        }
      }
      
      return value;
    },
    setItem: (key: string, value: string) => {
      // Check if user wants to be remembered
      const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(key, value);
    },
    removeItem: (key: string) => {
      // Remove from both storages to ensure cleanup
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: STORAGE_KEY,
    storage: createCustomStorage(),
    flowType: 'pkce',
    // Custom lock that prevents infinite hangs.
    // The default GoTrueClient calls getSession() with acquireTimeout = -1
    // (infinite). If a slow token refresh holds the navigator lock, every
    // subsequent REST query blocks forever because _getAccessToken() also
    // calls getSession(-1). We cap the effective timeout at 5 s and fall
    // back to running without a lock so the app can still function.
    lock: async (
      name: string,
      acquireTimeout: number,
      fn: () => Promise<unknown>
    ) => {
      const effectiveTimeout = acquireTimeout <= 0 ? 5000 : acquireTimeout;

      if (typeof navigator !== 'undefined' && navigator?.locks) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), effectiveTimeout);
        try {
          return await navigator.locks.request(
            name,
            { mode: 'exclusive', signal: controller.signal },
            async (lock) => {
              if (lock) return await fn();
              // Shouldn't happen, but run anyway as fallback
              return await fn();
            }
          );
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') {
            // Lock acquisition timed out — run unprotected to avoid deadlock
            console.warn('[Supabase] Lock acquire timed out, running without lock');
            return await fn();
          }
          throw e;
        } finally {
          clearTimeout(timer);
        }
      }

      // No navigator locks available — just run fn
      return await fn();
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'opbnb-ai-assistant@1.0.0',
    }
  },
  db: {
    schema: 'public',
  }
});

// Add session recovery mechanism
let sessionRecoveryAttempted = false;

export const ensureSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log('Session not found, attempting recovery...');
      
      if (!sessionRecoveryAttempted) {
        sessionRecoveryAttempted = true;
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshedSession) {
          console.log('Session recovered successfully');
          sessionRecoveryAttempted = false;
          return refreshedSession;
        }
      }
      
      return null;
    }
    
    sessionRecoveryAttempted = false;
    return session;
  } catch (error) {
    console.error('Error ensuring session:', error);
    return null;
  }
};

// Connection health checker
export const testConnection = async (): Promise<{ success: boolean; latency: number; error?: string }> => {
  const startTime = Date.now();
  try {
    // Try a simple query to test connection
    const { error } = await supabase
      .from('user_wallets')
      .select('count')
      .limit(1);
    
    const latency = Date.now() - startTime;
    
    if (error) {
      return { success: false, latency, error: error.message };
    }
    
    return { success: true, latency };
  } catch (error) {
    const latency = Date.now() - startTime;
    return { 
      success: false, 
      latency, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
};

// Database types
export interface UserWallet {
  id: string;
  user_id: string;
  wallet_address: string;
  encrypted_private_key: string;
  created_at: string;
  updated_at: string;
}
