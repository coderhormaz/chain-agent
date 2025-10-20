import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <motion.div
        className="theme-toggle-track"
        animate={{ 
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="theme-toggle-thumb"
          animate={{
            x: theme === 'dark' ? 2 : 22,
          }}
          transition={{ 
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        >
          <AnimatePresence mode="wait">
            {theme === 'dark' ? (
              <motion.svg
                key="moon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </motion.svg>
            ) : (
              <motion.svg
                key="sun"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      
      {/* Ripple effect on click */}
      <motion.span
        className="theme-toggle-ripple"
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.4 }}
      />
    </motion.button>
  );
};
