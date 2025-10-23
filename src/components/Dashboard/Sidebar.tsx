import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Box, Image, Wallet, Moon, Sun, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/dashboard.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { id: 'chat', label: 'AI Chat', icon: <Zap size={20} strokeWidth={2.5} /> },
    { id: 'tokens', label: 'My Tokens', icon: <Box size={20} strokeWidth={2.5} /> },
    { id: 'nfts', label: 'My NFTs', icon: <Image size={20} strokeWidth={2.5} /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={20} strokeWidth={2.5} /> }
  ];

  const handleSignOut = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <motion.aside 
      className="dashboard-sidebar"
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo Section */}
      <div className="sidebar-header">
        <motion.div 
          className="sidebar-logo"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <span className="logo-icon">⚡</span>
          <h2 className="logo-text">opBNB AI</h2>
        </motion.div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-details">
            <p className="user-name">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</p>
            <p className="user-email">{user?.email}</p>
            <p className="user-status">Connected</p>
          </div>
        </div>
        
        {/* Theme Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={18} strokeWidth={2.5} />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={18} strokeWidth={2.5} />
              <span>Dark Mode</span>
            </>
          )}
        </button>
        
        <button
          className="sign-out-btn"
          onClick={handleSignOut}
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
