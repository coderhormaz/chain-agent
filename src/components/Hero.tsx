import React from 'react';
import { motion } from 'framer-motion';
import { ParticleBackground } from './ParticleBackground';
import { useAuthModalStore } from '../store';
import ShinyText from './ShinyText';

export const Hero: React.FC = () => {
  const { openLogin } = useAuthModalStore();

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

  const titleVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.25,
        delayChildren: 0.6
      }
    }
  };

  const wordVariants = {
    hidden: { 
      y: 60, 
      opacity: 0,
      filter: 'blur(4px)'
    },
    visible: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 1.5,
        ease: [0.22, 1, 0.36, 1] as const
      }
    }
  };

  const renderAnimatedWords = (text: string, className?: string) => {
    const words = text.split(' ');
    return words.map((word, index) => (
      <motion.span
        key={`${word}-${index}`}
        variants={wordVariants}
        style={{ 
          display: 'inline-block', 
          marginRight: '0.3em',
          position: 'relative'
        }}
        className={className}
      >
        {word}
      </motion.span>
    ));
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
          <motion.h1 
            className="hero-title premium-title"
            variants={titleVariants}
            initial="hidden"
            animate="visible"
            style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                width: '0%',
              }}
              animate={{
                width: ['0%', '100%'],
              }}
              transition={{
                duration: 2,
                delay: 2.5,
                ease: "easeInOut",
              }}
            >
              <motion.div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '30%',
                  background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent)',
                  filter: 'blur(8px)',
                }}
                animate={{
                  left: ['-30%', '100%', '-30%'],
                }}
                transition={{
                  duration: 5,
                  delay: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
            <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              {renderAnimatedWords('Build on')}
              {renderAnimatedWords('blockchain', 'gradient-text-green')}
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              {renderAnimatedWords('with a single')}
              {renderAnimatedWords('command', 'gradient-text-green')}
            </span>
          </motion.h1>
          
          <motion.p 
            className="hero-subtitle premium-subtitle"
            variants={itemVariants}
          >
            <ShinyText text="Deploy smart contracts, create tokens, and mint NFTs using AI on opBNB." speed={6} />
            <br />
            <ShinyText text="Experience ultra-low fees and lightning-fast transactions with our intelligent assistant." speed={6} />
          </motion.p>
          
          <motion.div 
            className="hero-actions premium-actions"
            variants={itemVariants}
          >
            <motion.button 
              className="btn-hero-primary"
              onClick={openLogin}
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
