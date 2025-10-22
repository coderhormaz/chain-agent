import { Header } from './components/ui/header-2';
import { Hero } from './components/Hero';
import { Features } from './components/ui/Features';
import { Extra } from './components/Extra';
import { ContactUs } from './components/ContactUs';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ResetPasswordPage from './components/ResetPasswordPage';
import Dashboard from './components/Dashboard/Dashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/authStore';
import { useAuthModalStore } from './store';
import { useState, useEffect } from 'react';
import './index.css';
import './styles/globals.css';
import './styles/components.css';

function App() {
  useAuth(); // Initialize authentication
  const { isAuthenticated, isLoading, isInitialized } = useAuthStore();
  const { isLoginOpen, isSignupOpen } = useAuthModalStore();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen for URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

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

  // Handle password reset page
  if (currentPath === '/reset-password' || window.location.pathname === '/reset-password') {
    return (
      <ThemeProvider>
        <div className="App">
          <ResetPasswordPage onBack={() => {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
          }} />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        {isAuthenticated ? (
          <Dashboard />
        ) : (
          <>
            <Header />
            <Hero />
            <Features />
            <Extra />
            <ContactUs />
            {isLoginOpen && <SignIn />}
            {isSignupOpen && <SignUp />}
          </>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
