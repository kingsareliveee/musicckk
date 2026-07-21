import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { COLORS } from '../constants/design';
import { GlassCard, PremiumButton, AnimatedInput, GradientBackground } from '../components/GlassUI';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Google Font: Righteous
const fontLink = document.getElementById('login-font-link') || (() => {
  const link = document.createElement('link');
  link.id = 'login-font-link';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Righteous&display=swap';
  document.head.appendChild(link);
  return link;
})();
void fontLink;

export const GUEST_MODE_KEY = 'musick-guest-mode';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestEntry = () => {
    setGuestLoading(true);
    try {
      sessionStorage.setItem(GUEST_MODE_KEY, '1');
      toast.success('Browsing as guest');
      navigate('/');
    } finally {
      setGuestLoading(false);
    }
  };
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || 'Failed to login');
        setErrors({ email: error.message });
      } else if (data.user) {
        toast.success('Welcome back!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    },
  };

  return (
    <GradientBackground className="bg-gradient-to-br from-[#000000] via-[#000000] to-[#000000]">
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-md"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div className="text-center mb-8" variants={itemVariants}>
            {/* Rotating Logo */}
            <div
              style={{
                display: 'inline-block',
                marginBottom: '12px',
                animation: 'spin-logo 4s linear infinite',
              }}
            >
              <img
                src="/favicon.png"
                alt="Musick logo"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
            <style>{`
              @keyframes spin-logo {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
              }
            `}</style>
            <motion.h1
              className="text-5xl font-black mb-2 tracking-wide"
              style={{ color: COLORS.text, fontFamily: "'Righteous', cursive", letterSpacing: '0.05em' }}
            >
              Musick
            </motion.h1>
            <p style={{ color: COLORS.textSecondary, fontFamily: "'Righteous', cursive", letterSpacing: '0.03em' }}>Sign in to continue</p>
          </motion.div>

          {/* Login Card */}
          <motion.div variants={itemVariants}>
            <GlassCard variant="lg" className="p-8 border border-white/5" interactive={false}>
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <motion.div variants={itemVariants}>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: COLORS.textSecondary }}
                  >
                    Email
                  </label>
                  <AnimatedInput
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                  />
                </motion.div>

                {/* Password */}
                <motion.div variants={itemVariants}>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: COLORS.textSecondary }}
                  >
                    Password
                  </label>
                  <AnimatedInput
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                  />
                </motion.div>

                {/* Forgot Password Link */}
                <motion.div className="text-right" variants={itemVariants}>
                  <Link
                    to="/forgot-password"
                    className="text-sm transition-colors duration-200"
                    style={{
                      color: COLORS.accent,
                    }}
                  >
                    Forgot password?
                  </Link>
                </motion.div>

                {/* Sign In Button */}
                <motion.div variants={itemVariants} className="pt-2">
                  <PremiumButton
                    type="submit"
                    size="lg"
                    className="w-full bg-[#7CFF5B] text-black hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    disabled={loading}
                    loading={loading}
                  >
                    Sign In
                  </PremiumButton>
                </motion.div>
              </form>
            </GlassCard>
          </motion.div>

          {/* Sign Up Link */}
          <motion.p
            className="text-center mt-6"
            style={{ color: COLORS.textSecondary }}
            variants={itemVariants}
          >
            Don't have an account?{' '}
            <Link
              to="/signup"
              style={{ color: COLORS.accent }}
              className="font-semibold hover:opacity-80 transition-opacity"
            >
              Create one
            </Link>
          </motion.p>

          {/* Divider */}
          <motion.div
            className="flex items-center gap-3 mt-2"
            variants={itemVariants}
          >
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: COLORS.textTertiary }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </motion.div>

          {/* Guest Entry */}
          <motion.div variants={itemVariants}>
            <PremiumButton
              type="button"
              size="lg"
              className="w-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white hover:scale-[1.01] active:scale-[0.99] transition-all"
              disabled={guestLoading}
              loading={guestLoading}
              onClick={handleGuestEntry}
            >
              Continue as Guest
            </PremiumButton>
            <p className="text-center text-[11px] mt-2" style={{ color: COLORS.textTertiary }}>
              Browse music without an account. Some features limited.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </GradientBackground>
  );
};
