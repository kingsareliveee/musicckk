import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../constants/design';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        const isLoggedIn = localStorage.getItem('auth_token');
        navigate(isLoggedIn ? '/home' : '/login');
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate, onComplete]);

  return (
    <div
      className="w-full h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${COLORS.background} 0%, ${COLORS.secondary} 100%)`,
      }}
    >
      {/* Animated gradient backgrounds */}
      <motion.div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${COLORS.accent}15 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${COLORS.purple}15 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center space-y-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.8,
          ease: 'easeOut',
        }}
      >
        {/* Logo Container */}
        <motion.div
          className="relative"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background: `radial-gradient(circle, ${COLORS.accent}40 0%, transparent 70%)`,
              width: 120,
              height: 120,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />

          {/* Logo */}
          <motion.div
            className="relative w-28 h-28 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${COLORS.accent}20 0%, ${COLORS.purple}20 100%)`,
              border: `2px solid ${COLORS.accent}40`,
              boxShadow: SHADOWS.glow,
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <motion.img
              src="/favicon.png"
              alt="Musick Logo"
              className="w-16 h-16 object-cover rounded-full"
              animate={{
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Brand text */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.3,
          }}
        >
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight"
            style={{ color: COLORS.text }}
          >
            Musick
          </h1>
          <motion.p
            className="text-lg mt-3 font-light tracking-wide"
            style={{ color: COLORS.textSecondary }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Your Music. Your World.
          </motion.p>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: COLORS.accent }}
                animate={{
                  y: [0, -6, 0],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

