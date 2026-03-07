import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useAuthModalStore } from '../store';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

/* ── animation config ── */
const ease = [0.22, 1, 0.36, 1] as const;

const wordVariants = {
  hidden: { y: 40, opacity: 0, filter: 'blur(6px)' },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 1.2, ease, delay: 0.5 + i * 0.12 },
  }),
};

const fadeUp = (delay = 0) => ({
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.9, ease, delay },
  },
});

/* ── component ── */
export const Hero: React.FC = () => {
  const { openLogin } = useAuthModalStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);

  /* scroll‑driven parallax */
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });
  const bgY = useTransform(smoothProgress, [0, 1], ['0%', '30%']);
  const contentY = useTransform(smoothProgress, [0, 1], ['0%', '18%']);
  const contentOpacity = useTransform(smoothProgress, [0, 0.6], [1, 0]);
  const orb1Y = useTransform(smoothProgress, [0, 1], ['0%', '50%']);
  const orb2Y = useTransform(smoothProgress, [0, 1], ['0%', '-40%']);

  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      openLogin();
    }
  };

  /* title words — accent words get a special class */
  const titleLines: { text: string; accent?: boolean }[][] = [
    [
      { text: 'Build' },
      { text: 'on' },
      { text: 'blockchain', accent: true },
    ],
    [
      { text: 'with' },
      { text: 'a' },
      { text: 'single' },
      { text: 'command', accent: true },
    ],
  ];

  let wordIndex = 0;

  return (
    <section id="hero" className="hero-section" ref={heroRef}>
      {/* ── background layers ── */}
      <motion.div className="hero-bg" style={{ y: bgY }} />

      {/* gradient orbs */}
      <motion.div className="hero-orb hero-orb--1" style={{ y: orb1Y }} />
      <motion.div className="hero-orb hero-orb--2" style={{ y: orb2Y }} />

      {/* noise / grain overlay */}
      <div className="hero-noise" />

      {/* fine grid */}
      <div className="hero-grid" />

      {/* ── content ── */}
      <div className="container">
        <motion.div
          className="hero-content"
          style={{ y: contentY, opacity: contentOpacity }}
        >
          {/* badge */}
          <motion.div
            className="hero-badge"
            variants={fadeUp(0.2)}
            initial="hidden"
            animate="visible"
          >
            <span className="hero-badge__dot" />
            <span>Powered by opBNB</span>
          </motion.div>

          {/* title */}
          <h1 className="hero-title">
            {titleLines.map((line, li) => (
              <span className="hero-title__line" key={li}>
                {line.map((w) => {
                  const i = wordIndex++;
                  return (
                    <motion.span
                      key={i}
                      className={`hero-title__word${w.accent ? ' hero-title__accent' : ''}`}
                      variants={wordVariants}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                    >
                      {w.text}
                    </motion.span>
                  );
                })}
              </span>
            ))}
          </h1>

          {/* subtitle */}
          <motion.p
            className="hero-subtitle"
            variants={fadeUp(1.6)}
            initial="hidden"
            animate="visible"
          >
            Deploy smart contracts, create tokens, and mint NFTs using
            AI&nbsp;&mdash;&nbsp;with ultra&#8209;low fees and lightning&#8209;fast
            transactions.
          </motion.p>

          {/* actions */}
          <motion.div
            className="hero-actions"
            variants={fadeUp(1.9)}
            initial="hidden"
            animate="visible"
          >
            <motion.button
              className="hero-btn hero-btn--primary"
              onClick={handlePrimaryAction}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            </motion.button>

            <motion.button
              className="hero-btn hero-btn--ghost"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Explore Features
            </motion.button>
          </motion.div>

          {/* scroll indicator */}
          <motion.div
            className="hero-scroll-indicator"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6, duration: 0.8, ease }}
          >
            <span className="hero-scroll-indicator__line" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
