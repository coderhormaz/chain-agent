import React from 'react';
import { motion } from 'framer-motion';
import { useAuthModalStore, useWalletStore } from '../store';
import { ParticleBackground } from './ParticleBackground';

export const Hero: React.FC = () => {
  const { openSignup } = useAuthModalStore();
  const { user, wallet, balance } = useWalletStore();

  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0]; // First name only
    }
    return null;
  };

  const userName = getUserName();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99] as const
      }
    }
  };

  return (
    <section id="hero" className="hero premium-hero">
      <ParticleBackground />
      
      <div className="hero-gradient-overlay"></div>
      
      <div className="container">
        <motion.div
          className="hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {userName && (
            <motion.div
              className="welcome-badge"
              variants={itemVariants}
            >
              <span className="welcome-text">Welcome back, {userName}!</span>
              {wallet && (
                <span className="balance-text">{balance} BNB</span>
              )}
            </motion.div>
          )}

          <motion.h1 
            className="hero-title premium-title"
            variants={itemVariants}
          >
            Build <span className="gradient-text-green">blockchain apps</span><br />
            with a single <span className="gradient-text-green">command</span>
          </motion.h1>
          
          <motion.p 
            className="hero-subtitle premium-subtitle"
            variants={itemVariants}
          >
            Deploy smart contracts, create tokens, and mint NFTs using AI on opBNB.<br />
            Experience ultra-low fees and lightning-fast transactions with our intelligent assistant.
          </motion.p>
          
          <motion.div 
            className="hero-actions premium-actions"
            variants={itemVariants}
          >
            <motion.button 
              className="btn-hero-primary"
              onClick={openSignup}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <span>Get Started Free</span>
            </motion.button>
            <motion.button 
              className="btn-hero-secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              <span>Watch Demo</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
