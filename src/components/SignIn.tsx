"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { JSX, SVGProps } from "react";
import { AuthService } from '../services/auth';
import { useWalletStore, useAuthModalStore } from '../store';
import type { UserWallet } from '../lib/supabase';
import { X } from 'lucide-react';
import PasswordResetModal from './PasswordResetModal';

const Logo = (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
  <svg
    fill="currentColor"
    height="48"
    viewBox="0 0 40 48"
    width="40"
    {...props}
  >
    <clipPath id="a">
      <path d="m0 0h40v48h-40z" />
    </clipPath>
    <g clipPath="url(#a)">
      <path d="m25.0887 5.05386-3.933-1.05386-3.3145 12.3696-2.9923-11.16736-3.9331 1.05386 3.233 12.0655-8.05262-8.0526-2.87919 2.8792 8.83271 8.8328-10.99975-2.9474-1.05385625 3.933 12.01860625 3.2204c-.1376-.5935-.2104-1.2119-.2104-1.8473 0-4.4976 3.646-8.1436 8.1437-8.1436 4.4976 0 8.1436 3.646 8.1436 8.1436 0 .6313-.0719 1.2459-.2078 1.8359l10.9227 2.9267 1.0538-3.933-12.0664-3.2332 11.0005-2.9476-1.0539-3.933-12.0659 3.233 8.0526-8.0526-2.8792-2.87916-8.7102 8.71026z" />
      <path d="m27.8723 26.2214c-.3372 1.4256-1.0491 2.7063-2.0259 3.7324l7.913 7.9131 2.8792-2.8792z" />
      <path d="m25.7665 30.0366c-.9886 1.0097-2.2379 1.7632-3.6389 2.1515l2.8794 10.746 3.933-1.0539z" />
      <path d="m21.9807 32.2274c-.65.1671-1.3313.2559-2.0334.2559-.7522 0-1.4806-.102-2.1721-.2929l-2.882 10.7558 3.933 1.0538z" />
      <path d="m17.6361 32.1507c-1.3796-.4076-2.6067-1.1707-3.5751-2.1833l-7.9325 7.9325 2.87919 2.8792z" />
      <path d="m13.9956 29.8973c-.9518-1.019-1.6451-2.2826-1.9751-3.6862l-10.95836 2.9363 1.05385 3.933z" />
    </g>
  </svg>
);

export default function SignIn() {
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const { setUser, setWallet, setLoading } = useWalletStore();
  const { closeModals, openSignup } = useAuthModalStore();

  // Refs for accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const togglePasswordVisibility = () => setIsPasswordVisible((prev) => !prev);

  const handleClose = () => {
    closeModals();
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleSignUpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    closeModals();
    openSignup();
  };

  const handleResetPassword = () => {
    setShowResetModal(true);
  };

  const handleSignUp = () => {
    openSignup();
  };

  // Focus management and accessibility
  useEffect(() => {
    // Save the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Set initial focus to the email input
    emailInputRef.current?.focus();

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    // Focus trap implementation
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    // Prevent background scroll
    document.body.style.overflow = 'hidden';

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = '';
      
      // Restore focus to previously focused element
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    setLoading(true);

    // Create AbortController for proper cancellation
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      console.log('🔐 Attempting login...');
      
      // Set up timeout that aborts the request
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000); // 15 seconds

      // Await sign in directly with abort signal
      const result = await AuthService.signIn(email, password, rememberMe, controller.signal);
      
      // Clear timeout on success
      if (timeoutId) clearTimeout(timeoutId);
      
      const { user, wallet } = result;
      
      console.log('✅ Login successful');
      setUser(user);
      setWallet(wallet as UserWallet | null);
      
      // Clear form and close modal
      handleClose();
    } catch (error: unknown) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      
      // Handle abort/timeout separately
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('cancelled')) {
          setError('Connection timeout - please try again');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to sign in. Please check your credentials and try again.');
      }
      console.error('❌ Login failed:', error);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div 
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <Card 
        className="w-full max-w-md mx-4 pb-0 relative shadow-2xl"
        style={{ borderColor: '#4ade80', borderWidth: '1px', borderStyle: 'solid' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <CardHeader className="space-y-1 text-center mb-2 mt-4">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div>
            <h2 id="signin-title" className="text-2xl font-semibold" style={{ color: '#4ade80' }}>Sign in to opBNB AI</h2>
            <p className="text-muted-foreground text-sm">
              Welcome back! Please enter your details.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: '#4ade80' }}>Email address</Label>
              <Input 
                ref={emailInputRef}
                id="email" 
                type="email" 
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-0">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="password" style={{ color: '#4ade80' }}>Password</Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-sm hover:underline text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  Reset password
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  placeholder="Enter your password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="password-toggle-btn absolute right-0 top-0 h-full px-3 flex items-center justify-center bg-transparent border-0 focus:outline-none focus:ring-0 active:outline-none"
                  style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', boxShadow: 'none' }}
                  type="button"
                  onClick={togglePasswordVisibility}
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
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative h-4 w-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 peer-checked:border-gray-900 dark:peer-checked:border-white peer-focus:ring-0 peer-focus:outline-none transition-all">
                  <svg
                    className={`absolute inset-0 w-full h-full text-gray-900 dark:text-white transition-opacity ${
                      rememberMe ? 'opacity-100' : 'opacity-0'
                    }`}
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.3333 4L6 11.3333L2.66667 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="ml-2 text-sm font-normal select-none">
                  Remember me
                </span>
              </label>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center !py-4">
          <p className="text-center text-sm text-muted-foreground">
            New to opBNB AI?{" "}
            <button
              type="button"
              onClick={handleSignUp}
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              style={{ color: '#4ade80' }}
            >
              Sign up
            </button>
          </p>
        </CardFooter>
      </Card>
      
      {/* Password Reset Modal */}
      {showResetModal && (
        <PasswordResetModal onClose={() => setShowResetModal(false)} />
      )}
    </div>
  );
}
