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

  // Navigation abstraction to keep URL and state in sync
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Listen for URL changes (both popstate and programmatic navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Patch history.pushState and history.replaceState to dispatch custom event
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      window.dispatchEvent(new Event('pushstate'));
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      window.dispatchEvent(new Event('replacestate'));
    };

    // Listen for all navigation events
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('pushstate', handleLocationChange);
    window.addEventListener('replacestate', handleLocationChange);

    return () => {
      // Cleanup: restore original methods and remove listeners
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange);
      window.removeEventListener('replacestate', handleLocationChange);
    };
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
  if (currentPath === '/reset-password') {
    return (
      <ThemeProvider>
        <div className="App">
          <ResetPasswordPage onBack={() => navigateTo('/')} />
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
