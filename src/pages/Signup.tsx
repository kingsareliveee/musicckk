import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { COLORS } from '../constants/design';
import { GlassCard, PremiumButton, AnimatedInput, GradientBackground } from '../components/GlassUI';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      // Log complete error object during development
      if (error) {
        console.error('[Signup] Complete error object:', JSON.stringify(error, null, 2));
        console.error('[Signup] Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        toast.error(error.message || 'Failed to create account');
        setErrors({ email: error.message });
      } else if (data.user) {
        toast.success('Account created! Check your email to verify.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        // Case: signup succeeded but no user returned (email confirmation required)
        toast.success('Account created! Check your email to verify.');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err: any) {
      console.error('[Signup] Unexpected error:', JSON.stringify(err, null, 2));
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
            <p style={{ color: COLORS.textSecondary }}>Create your account</p>
          </motion.div>

          {/* Signup Card */}
          <motion.div variants={itemVariants}>
            <GlassCard variant="lg" className="p-8 border border-white/5" interactive={false}>
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Full Name */}
                <motion.div variants={itemVariants}>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: COLORS.textSecondary }}
                  >
                    Full Name
                  </label>
                  <AnimatedInput
                    type="text"
                    placeholder="John Doe"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    error={errors.fullName}
                  />
                </motion.div>

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
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                  />
                </motion.div>

                {/* Confirm Password */}
                <motion.div variants={itemVariants}>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: COLORS.textSecondary }}
                  >
                    Confirm Password
                  </label>
                  <AnimatedInput
                    type="password"
                    placeholder="••••••••"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                  />
                </motion.div>

                {/* Create Account Button */}
                <motion.div variants={itemVariants} className="pt-2">
                  <PremiumButton
                    type="submit"
                    size="lg"
                    className="w-full bg-[#7CFF5B] text-black hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    disabled={loading}
                    loading={loading}
                  >
                    Create Account
                  </PremiumButton>
                </motion.div>
              </form>
            </GlassCard>
          </motion.div>

          {/* Sign In Link */}
          <motion.p
            className="text-center mt-6"
            style={{ color: COLORS.textSecondary }}
            variants={itemVariants}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: COLORS.accent }}
              className="font-semibold hover:opacity-80 transition-opacity"
            >
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </GradientBackground>
  );
};
