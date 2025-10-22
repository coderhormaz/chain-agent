"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { AuthService } from '../services/auth';
import { X, CheckCircle } from 'lucide-react';

interface PasswordResetModalProps {
  onClose: () => void;
}

export default function PasswordResetModal({ onClose }: PasswordResetModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Refs for accessibility and timeout management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus management and accessibility
  useEffect(() => {
    // Save the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Set initial focus to the email input
    emailInputRef.current?.focus();

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
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

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      
      // Clear any pending auto-close timeout
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      
      // Restore focus to previously focused element (with safety checks)
      if (
        previousFocusRef.current &&
        document.contains(previousFocusRef.current) &&
        typeof previousFocusRef.current.focus === 'function'
      ) {
        try {
          previousFocusRef.current.focus();
        } catch {
          // Fallback to body if focus fails
          document.body.focus();
        }
      } else {
        // Fallback to body if element is not attached or not focusable
        document.body.focus();
      }
    };
  }, [onClose, isSubmitting]);

  const validateEmail = (email: string): boolean => {
    // Trim and normalize the email
    const normalizedEmail = email.trim().toLowerCase();
    
    // More robust email validation regex
    // Rejects: consecutive dots, leading/trailing dots, invalid characters
    const emailRegex = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
    
    // Additional checks
    if (normalizedEmail.length > 254) return false; // RFC 5321 max length
    if (normalizedEmail.includes('..')) return false; // Consecutive dots
    
    const [localPart, domainPart] = normalizedEmail.split('@');
    if (!localPart || !domainPart) return false;
    if (localPart.length > 64) return false; // RFC 5321 local part max
    
    return emailRegex.test(normalizedEmail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    // Trim and normalize email
    const trimmedEmail = email.trim();

    // Client-side validation
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await AuthService.resetPassword(trimmedEmail);
      setIsSuccess(true);
      setError('');
      
      // Auto-close after 3 seconds on success
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to send password reset email. Please try again.';
      setError(errorMessage);
      console.error('Password reset failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Clear any pending auto-close timeout
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      onClose();
    }
  };

  return (
    <div 
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <Card 
        className="w-full max-w-md mx-4 pb-0 relative shadow-2xl"
        style={{ borderColor: '#4ade80', borderWidth: '1px', borderStyle: 'solid' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        <CardHeader className="space-y-1 text-center mb-2 mt-4">
          {isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-400" />
              </div>
              <h2 id="reset-password-title" className="text-2xl font-semibold" style={{ color: '#4ade80' }}>
                Check Your Email
              </h2>
              <p className="text-muted-foreground text-sm">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                This window will close automatically...
              </p>
            </>
          ) : (
            <>
              <h2 id="reset-password-title" className="text-2xl font-semibold" style={{ color: '#4ade80' }}>
                Reset Password
              </h2>
              <p className="text-muted-foreground text-sm">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </>
          )}
        </CardHeader>

        {!isSuccess && (
          <CardContent className="space-y-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reset-email" style={{ color: '#4ade80' }}>Email address</Label>
                <Input 
                  ref={emailInputRef}
                  id="reset-email" 
                  type="email" 
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(''); // Clear error on input change
                  }}
                  required
                  disabled={isSubmitting}
                  aria-describedby={error ? "reset-error" : undefined}
                />
              </div>

              {error && (
                <div 
                  id="reset-error"
                  role="alert"
                  className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md"
                >
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
