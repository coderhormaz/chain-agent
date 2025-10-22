import { Header } from './components/ui/header-2';
import { Hero } from './components/Hero';
import { Features } from './components/ui/Features';
import { Extra } from './components/Extra';
import { ContactUs } from './components/ContactUs';
import { MultiStepAuthModal } from './components/MultiStepAuthModal';
import Dashboard from './components/Dashboard/Dashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/authStore';
import './index.css';
import './styles/globals.css';
import './styles/components.css';

function App() {
  useAuth(); // Initialize authentication
  const { isAuthenticated, isLoading, isInitialized } = useAuthStore();

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
        {isAuthenticated ? (
          <Dashboard />
        ) : (
          <>
            <Header />
            <Hero />
            <Features />
            <Extra />
            <ContactUs />
            <MultiStepAuthModal />
          </>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
