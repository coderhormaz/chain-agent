import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Box, Image, Wallet, Moon, Sun, LogOut, CircleDot } from 'lucide-react';
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
    { id: 'chat', label: 'AI Chat', icon: <Zap size={18} strokeWidth={2} /> },
    { id: 'tokens', label: 'Tokens', icon: <Box size={18} strokeWidth={2} /> },
    { id: 'nfts', label: 'NFTs', icon: <Image size={18} strokeWidth={2} /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={18} strokeWidth={2} /> }
  ];

  const handleSignOut = () => {
    logout();
    window.location.href = '/';
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <motion.aside 
      className="dashboard-sidebar"
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">⚡</span>
          <h2 className="logo-text">opBNB AI</h2>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Menu</div>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {activeTab === item.id && (
              <motion.div
                className="nav-active-indicator"
                layoutId="activeTab"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* User Card */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">{displayName}</span>
            <span className="sidebar-user-status">
              <CircleDot size={10} />
              Connected
            </span>
          </div>
        </div>

        {/* Action Row */}
        <div className="sidebar-actions">
          <button
            className="sidebar-action-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
          </button>
          <button
            className="sidebar-action-btn sidebar-action-btn--danger"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
