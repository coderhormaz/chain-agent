import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ResetPasswordPageWrapper from './pages/ResetPasswordPageWrapper';
import './index.css';
import './styles/globals.css';
import './styles/components.css';

function App() {
  useAuth(); // Initialize authentication
  const { isInitialized, isLoading } = useAuthStore();

  // Show loading screen only if not initialized or still loading
  if (!isInitialized || isLoading) {
    return (
      <ThemeProvider>
        <div className="loading-screen">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading your opBNB AI Assistant...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/reset-password" element={<ResetPasswordPageWrapper />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
