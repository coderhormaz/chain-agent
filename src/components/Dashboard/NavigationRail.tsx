import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { NAVIGATION_ITEMS } from '../../constants/navigation';

interface NavigationRailProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NavigationRail: React.FC<NavigationRailProps> = ({ activeTab, setActiveTab }) => {
  const { logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSignOut = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <motion.aside
      initial={{ width: 80 }}
      animate={{ width: isExpanded ? 280 : 80 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="hidden md:flex flex-col fixed left-0 top-0 h-screen bg-white dark:bg-[#1E293B] border-r border-[#E2E8F0] dark:border-[#334155] z-40"
    >
      {/* Logo Section */}
      <div className="flex items-center justify-center h-16 border-b border-[#E2E8F0] dark:border-[#334155] px-4">
        <motion.div
          className="flex items-center gap-3 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-bold text-lg shadow-md">
            ⚡
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.h2
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap overflow-hidden"
              >
                opBNB AI
              </motion.h2>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center gap-4 px-4 py-3 rounded-lg
                transition-all duration-200 relative overflow-hidden
                ${isActive
                  ? 'bg-[#10B981]/10 dark:bg-[#10B981]/20 text-[#10B981]'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                }
              `}
              whileHover={{ x: isExpanded ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBackground"
                  className="absolute inset-0 bg-[#10B981]/10 dark:bg-[#10B981]/20 rounded-lg"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-4 w-full">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={`text-sm font-medium whitespace-nowrap ${isActive ? 'font-semibold' : ''}`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {isActive && !isExpanded && (
                <motion.div
                  layoutId="activeIndicatorRail"
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-[#10B981] rounded-l-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-[#E2E8F0] dark:border-[#334155] p-3 space-y-2">
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-all duration-200"
          whileHover={{ x: isExpanded ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm font-medium whitespace-nowrap"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Sign Out */}
        <motion.button
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-all duration-200"
          whileHover={{ x: isExpanded ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
          title="Sign Out"
        >
          <LogOut size={20} />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm font-medium whitespace-nowrap"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Expand/Collapse Toggle */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-4 px-4 py-2 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-all duration-200"
          whileTap={{ scale: 0.98 }}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default NavigationRail;
