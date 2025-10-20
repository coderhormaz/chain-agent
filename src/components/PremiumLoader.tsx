import React from 'react';
import { motion } from 'framer-motion';
import { IoFlash } from 'react-icons/io5';

const PremiumLoader: React.FC = () => {
  return (
    <div className="premium-loader-container">
      <div className="premium-loader">
        <motion.div
          className="loader-ring"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="url(#loaderGradient)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="170 170"
            />
          </svg>
        </motion.div>
        
        <motion.div
          className="loader-logo"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <IoFlash size={80} />
        </motion.div>
      </div>
      
      <motion.div
        className="loader-text"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3>opBNB AI Assistant</h3>
        <p>Loading your blockchain workspace...</p>
      </motion.div>
    </div>
  );
};

export default PremiumLoader;