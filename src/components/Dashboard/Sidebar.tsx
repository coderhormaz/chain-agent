import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Box, Image, Wallet, Moon, Sun, LogOut, CircleDot } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';

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
      className="sidebar-root"
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">⚡</div>
        <h2 className="sidebar-brand-text">opBNB AI</h2>
      </div>

      {/* Navigation */}
      <nav className="sidebar-navigation">
        <div className="sidebar-section-label">Menu</div>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${activeTab === item.id ? 'sidebar-nav-item--active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {activeTab === item.id && (
              <motion.div
                className="sidebar-nav-pill"
                layoutId="activeTab"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
            {activeTab === item.id && (
              <motion.div
                className="sidebar-nav-dot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-bottom">
        {/* User Card */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{displayName}</span>
            <span className="sidebar-user-status">
              <CircleDot size={8} />
              Connected
            </span>
          </div>
        </div>

        {/* Action Row */}
        <div className="sidebar-action-row">
          <button
            className="sidebar-action-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
          </button>
          <button
            className="sidebar-action-btn sidebar-action-btn--logout"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
