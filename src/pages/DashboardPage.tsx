import { Navigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard/Dashboard';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your opBNB AI Assistant...</p>
        </div>
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Dashboard />;
}
