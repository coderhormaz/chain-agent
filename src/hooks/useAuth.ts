import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWalletStore } from '../store';
import { useAuthStore } from '../store/authStore';
import { useWalletStore as useNewWalletStore } from '../store/walletStore';
import { AuthService } from '../services/auth';
import { WalletService } from '../lib/wallet';

export const useAuth = () => {
  const { setUser, setWallet, setLoading, setBalance, wallet } = useWalletStore();
  const { setUser: setAuthUser, setLoading: setAuthLoading, setInitialized, isInitialized } = useAuthStore();
  const { setWallet: setNewWallet } = useNewWalletStore();

  useEffect(() => {
    // Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (!isInitialized) {
        console.log('Auth initialization timeout - forcing initialization');
        setInitialized(true);
        setLoading(false);
        setAuthLoading(false);
      }
    }, 5000); // 5 second timeout

    // Get initial session
    const initializeAuth = async () => {
      // On /reset-password, skip heavy session init — the ResetPasswordPage
      // component handles the PKCE code exchange itself.  Running
      // refreshSession() here would race / deadlock with detectSessionInUrl
      // which is already exchanging the ?code= parameter.
      if (window.location.pathname === '/reset-password') {
        setLoading(false);
        setAuthLoading(false);
        setInitialized(true);
        clearTimeout(timeout);
        return;
      }

      // If already initialized AND user is present, skip re-init
      // but still populate the dashboard wallet store if needed.
      const authState = useAuthStore.getState();
      if (authState.isInitialized && authState.user) {
        // Ensure dashboard wallet store is populated
        const dashboardWallet = useNewWalletStore.getState().wallet;
        if (!dashboardWallet) {
          try {
            const userWallet = await AuthService.getUserWallet(authState.user.id);
            if (userWallet) {
              setWallet(userWallet);
              setNewWallet({
                address: userWallet.wallet_address,
                privateKey: userWallet.encrypted_private_key
              });
              const balance = await WalletService.getBalance(userWallet.wallet_address);
              setBalance(balance);
            }
          } catch (e) {
            console.error('Error fetching wallet on rehydration:', e);
          }
        }
        setLoading(false);
        setAuthLoading(false);
        clearTimeout(timeout);
        return;
      }

      setLoading(true);
      setAuthLoading(true);
      
      try {
        const { user, wallet } = await AuthService.getCurrentSession();
        setUser(user);
        setAuthUser(user);
        setWallet(wallet);
        
        // Set wallet for dashboard components
        if (wallet) {
          setNewWallet({
            address: wallet.wallet_address,
            privateKey: wallet.encrypted_private_key // This would need decryption in real app
          });
          
          const balance = await WalletService.getBalance(wallet.wallet_address);
          setBalance(balance);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
        setAuthLoading(false);
        setInitialized(true);
        clearTimeout(timeout);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setAuthUser(session.user);

        // Wallet may not be inserted yet during signup (race condition).
        // Retry once after a short delay if the first fetch returns null.
        let userWallet = await AuthService.getUserWallet(session.user.id);
        if (!userWallet) {
          await new Promise(r => setTimeout(r, 2000));
          userWallet = await AuthService.getUserWallet(session.user.id);
        }

        setWallet(userWallet);
        
        if (userWallet) {
          setNewWallet({
            address: userWallet.wallet_address,
            privateKey: userWallet.encrypted_private_key
          });
          
          const balance = await WalletService.getBalance(userWallet.wallet_address);
          setBalance(balance);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthUser(null);
        setWallet(null);
        setNewWallet(null);
        setBalance('0');
      }
    });

    // Handle page visibility change — refresh session when user comes back.
    // IMPORTANT: never clear auth state on transient errors (lock timeouts,
    // network hiccups). Only clear when Supabase explicitly tells us the
    // refresh token is invalid.
    let visibilityCheckInFlight = false;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (visibilityCheckInFlight) return;           // de-dup concurrent calls
      visibilityCheckInFlight = true;

      console.log('Page became visible, checking session...');
      try {
        // Fast path — cached session may still be valid
        const { data: { session: cachedSession }, error: getError } = await supabase.auth.getSession();

        if (!getError && cachedSession?.user) {
          console.log('Valid cached session found');
          setAuthUser(cachedSession.user);
          setUser(cachedSession.user);

          const userWallet = await AuthService.getUserWallet(cachedSession.user.id);
          if (userWallet) {
            setWallet(userWallet);
            setNewWallet({
              address: userWallet.wallet_address,
              privateKey: userWallet.encrypted_private_key
            });
          }
          return;
        }

        // Slow path — attempt token refresh
        console.log('Cached session invalid, refreshing...');
        const { data: { session }, error } = await supabase.auth.refreshSession();

        if (session?.user) {
          console.log('Session refreshed successfully');
          setAuthUser(session.user);
          setUser(session.user);

          const userWallet = await AuthService.getUserWallet(session.user.id);
          if (userWallet) {
            setWallet(userWallet);
            setNewWallet({
              address: userWallet.wallet_address,
              privateKey: userWallet.encrypted_private_key
            });
          }
          return;
        }

        // Only clear state when the server explicitly rejects the refresh
        // token (e.g. "Invalid Refresh Token" / status 400). Lock timeouts,
        // network failures, etc. should NOT log the user out.
        if (error) {
          const msg = error.message?.toLowerCase() ?? '';
          const isHardAuthFailure =
            msg.includes('invalid refresh token') ||
            msg.includes('refresh token not found') ||
            msg.includes('user not found') ||
            msg.includes('session not found') ||
            error.status === 401 ||
            error.status === 403;

          if (isHardAuthFailure) {
            console.warn('Session expired (server rejected refresh), signing out');
            setAuthUser(null);
            setUser(null);
            setWallet(null);
            setNewWallet(null);
            setBalance('0');
          } else {
            console.warn('Session check failed with transient error, keeping user signed in:', error.message);
          }
        }
      } catch (err) {
        // Transient / lock-timeout errors — do NOT clear state
        console.warn('Visibility session check threw, keeping user signed in:', err);
      } finally {
        visibilityCheckInFlight = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setUser, setAuthUser, setWallet, setNewWallet, setLoading, setAuthLoading, setBalance, setInitialized, isInitialized]);

  // Update balance periodically
  useEffect(() => {
    if (!wallet) return;

    const updateBalance = async () => {
      try {
        const balance = await WalletService.getBalance(wallet.wallet_address);
        setBalance(balance);
      } catch (error) {
        console.error('Error updating balance:', error);
      }
    };

    // Update balance immediately
    updateBalance();

    // Update balance every 30 seconds
    const interval = setInterval(updateBalance, 30000);

    return () => clearInterval(interval);
  }, [wallet, setBalance]);
};
