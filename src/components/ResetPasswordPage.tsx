"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { EyeIcon, EyeOffIcon, CheckCircle, AlertCircle } from "lucide-react";

interface ResetPasswordPageProps {
  onBack: () => void;
}

export default function ResetPasswordPage({ onBack }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifyResetSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenHash = urlParams.get('token_hash');
        const type = urlParams.get('type');
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Handle error returned in the redirect
        if (errorParam) {
          if (isMounted) {
            setError(errorDescription || 'Password reset link is invalid or has expired.');
            setIsTokenValid(false);
            setIsValidating(false);
          }
          return;
        }

        // Legacy / implicit flow — token_hash in URL
        if (tokenHash && type === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (!isMounted) return;

          if (error || !data.session) {
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsTokenValid(false);
            setIsValidating(false);
            return;
          }

          setIsValidating(false);
          return;
        }

        // PKCE flow — code in URL
        if (code) {
          // First check if detectSessionInUrl already exchanged the code
          const { data: { session: existing } } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (existing) {
            setIsValidating(false);
            return;
          }

          // Try explicit exchange (needs the code_verifier stored when the
          // reset was requested — only available on the same origin).
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!isMounted) return;

          if (!exchangeError && data.session) {
            setIsValidating(false);
            return;
          }

          // Exchange failed — most likely the code_verifier is missing
          // (user opened the link on a different browser/domain).
          console.error('Code exchange failed:', exchangeError);
          setError(
            'Reset link could not be verified. Please make sure you open the link in the same browser where you requested the reset.'
          );
          setIsTokenValid(false);
          setIsValidating(false);
          return;
        }

        // No URL params — check if session was already exchanged before
        // this component mounted (e.g. Supabase processed the URL earlier)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) setIsValidating(false);
          return;
        }

        // Nothing found
        if (isMounted) {
          setError('Invalid or missing reset link. Please request a new password reset link.');
          setIsTokenValid(false);
          setIsValidating(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to verify reset link. Please try again.');
          setIsTokenValid(false);
          setIsValidating(false);
        }
      }
    };

    verifyResetSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (pwd.length > 72) {
      return 'Password must be less than 72 characters';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    // Client-side validation
    if (!password) {
      setError('Please enter a new password');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // The session is already established from the verifyOtp in useEffect
      // Now just update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        
        if (updateError.message.includes('session')) {
          setError('Your session has expired. Please request a new password reset link.');
        } else {
          setError(updateError.message || 'Failed to update password. Please try again.');
        }
      } else {
        console.log('✅ Password updated successfully');
        setIsSuccess(true);
        
        // Sign out to clear the recovery session
        await supabase.auth.signOut();
        
        // Redirect to home after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-white dark:bg-black p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-white dark:bg-black p-4">
      <Card 
        className="w-full max-w-md shadow-2xl"
        style={{ borderColor: '#4ade80', borderWidth: '1px', borderStyle: 'solid' }}
      >
        <CardHeader className="space-y-1 text-center">
          {isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold" style={{ color: '#4ade80' }}>
                Password Reset Successful
              </h2>
              <p className="text-muted-foreground text-sm">
                Your password has been updated successfully. Redirecting to login...
              </p>
            </>
          ) : !isTokenValid ? (
            <>
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-16 w-16 text-red-400" />
              </div>
              <h2 className="text-2xl font-semibold text-red-400">
                Invalid Reset Link
              </h2>
              <p className="text-muted-foreground text-sm">
                {error}
              </p>
              <Button 
                onClick={onBack}
                className="mt-4"
              >
                Return to Sign In
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold" style={{ color: '#4ade80' }}>
                Set New Password
              </h2>
              <p className="text-muted-foreground text-sm">
                Enter your new password below
              </p>
            </>
          )}
        </CardHeader>

        {!isSuccess && isTokenValid && (
          <CardContent className="space-y-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="new-password" style={{ color: '#4ade80' }}>
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    placeholder="Enter new password (min. 6 characters)"
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    required
                    disabled={isSubmitting}
                    minLength={6}
                    maxLength={72}
                  />
                  <button
                    className="absolute right-0 top-0 h-full px-3 flex items-center justify-center"
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  >
                    {isPasswordVisible ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" style={{ color: '#4ade80' }}>
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    placeholder="Confirm new password"
                    type={isConfirmVisible ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    className="absolute right-0 top-0 h-full px-3 flex items-center justify-center"
                    type="button"
                    onClick={() => setIsConfirmVisible(!isConfirmVisible)}
                    aria-label={isConfirmVisible ? "Hide password" : "Show password"}
                  >
                    {isConfirmVisible ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div 
                  role="alert"
                  className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md"
                >
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating Password...' : 'Reset Password'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
