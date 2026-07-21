import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { COLORS } from '../constants/design';
import { GlassCard, PremiumButton, AnimatedInput, GradientBackground } from '../components/GlassUI';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        toast.error(error.message || 'Failed to send reset link');
        setError(error.message);
      } else {
        toast.success('Reset link sent! Please check your email.');
        setSuccess(true);
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
            <motion.h1
              className="text-5xl font-black mb-2 tracking-tight"
              style={{ color: COLORS.text, fontFamily: 'Outfit, sans-serif' }}
            >
              Musick
            </motion.h1>
            <p style={{ color: COLORS.textSecondary }}>Reset your password</p>
          </motion.div>

          {/* Card */}
          <motion.div variants={itemVariants}>
            <GlassCard variant="lg" className="p-8 border border-white/5" interactive={false}>
              {success ? (
                <div className="text-center space-y-4">
                  <p style={{ color: COLORS.text }}>
                    We've sent a password reset link to <strong className="text-white">{email}</strong>.
                  </p>
                  <p style={{ color: COLORS.textSecondary }} className="text-sm">
                    Please check your inbox and follow the instructions to reset your password.
                  </p>
                  <div className="pt-4">
                    <Link to="/login">
                      <PremiumButton size="md" className="w-full bg-[#7CFF5B] text-black">
                        Back to Login
                      </PremiumButton>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: COLORS.textSecondary }}
                    >
                      Email Address
                    </label>
                    <AnimatedInput
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={error}
                    />
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div variants={itemVariants} className="pt-2">
                    <PremiumButton
                      type="submit"
                      size="lg"
                      className="w-full bg-[#7CFF5B] text-black hover:scale-[1.02] active:scale-[0.98] transition-transform"
                      disabled={loading}
                      loading={loading}
                    >
                      Send Reset Link
                    </PremiumButton>
                  </motion.div>
                </form>
              )}
            </GlassCard>
          </motion.div>

          {/* Sign In Link */}
          {!success && (
            <motion.p
              className="text-center mt-6"
              style={{ color: COLORS.textSecondary }}
              variants={itemVariants}
            >
              Remember your password?{' '}
              <Link
                to="/login"
                style={{ color: COLORS.accent }}
                className="font-semibold hover:opacity-80 transition-opacity"
              >
                Sign in
              </Link>
            </motion.p>
          )}
        </motion.div>
      </div>
    </GradientBackground>
  );
};
