import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAuthModalStore } from '../store';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuthStore();
  const { openLogin } = useAuthModalStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      // Navigate to home and open login modal
      navigate('/', { replace: true });
      // Small delay to ensure navigation completes before opening modal
      setTimeout(() => {
        openLogin();
      }, 100);
    }
  }, [isAuthenticated, navigate, openLogin]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
