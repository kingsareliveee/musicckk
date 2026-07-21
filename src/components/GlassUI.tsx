import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { COLORS, GLASS, SHADOWS } from '../constants/design';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  interactive?: boolean;
}

export const GlassCard = ({
  children,
  className = '',
  variant = 'md',
  onClick,
  interactive = true,
}: GlassCardProps) => {
  const glassVariant = {
    sm: GLASS.sm,
    md: GLASS.md,
    lg: GLASS.lg,
  };

  const glassClass = glassVariant[variant];

  return (
    <motion.div
      className={`${glassClass} rounded-xl transition-all duration-300 ${
        interactive ? 'hover:bg-white/[0.06] cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
      whileHover={interactive ? { y: -2 } : {}}
      whileTap={interactive ? { scale: 0.98 } : {}}
      style={{
        boxShadow: SHADOWS.md,
      }}
    >
      {children}
    </motion.div>
  );
};

interface PremiumButtonProps {
  children: ReactNode;
  onClick?: (e?: React.FormEvent | React.MouseEvent) => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const PremiumButton = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
}: PremiumButtonProps) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: `bg-gradient-to-r from-[${COLORS.accent}] to-[${COLORS.accentDark}] text-black font-semibold hover:shadow-lg shadow-md`,
    secondary: `${GLASS.md} text-white hover:bg-white/[0.08]`,
    ghost: 'text-white hover:bg-white/[0.1]',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick as any}
      disabled={disabled || loading}
      className={`
        relative rounded-full font-semibold
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </span>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>{children}</span>
    </motion.button>
  );
};

interface GradientBackgroundProps {
  children: ReactNode;
  className?: string;
}

export const GradientBackground = ({
  children,
  className = '',
}: GradientBackgroundProps) => {
  return (
    <div className={`relative w-full h-screen overflow-hidden ${className}`}>
      {/* Animated background gradients */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 20% 50%, ${COLORS.accent}20 0%, transparent 50%)`,
        }}
        animate={{
          x: [0, 20, 0],
          y: [0, 10, 0],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 80% 80%, ${COLORS.purple}20 0%, transparent 50%)`,
        }}
        animate={{
          x: [0, -20, 0],
          y: [0, -10, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
      />
      {/* Main content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const BlurImage = ({ src, alt, className = '' }: BlurImageProps) => {
  return (
    <div
      className={`
        relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5
        ${className}
      `}
    >
      <motion.img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      {/* Overlay blur effect */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />
    </div>
  );
};

interface AnimatedInputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  className?: string;
  name?: string;
}

export const AnimatedInput = ({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  className = '',
  name,
}: AnimatedInputProps) => {
  return (
    <div className="relative">
      <motion.input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        name={name}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-white/[0.05] backdrop-blur-md
          border border-white/[0.1]
          text-white placeholder:text-white/40
          focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08]
          transition-all duration-300
          ${error ? 'border-red-500/50' : ''}
          ${className}
        `}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      />
      {error && (
        <motion.p
          className="text-red-500 text-sm mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export const FloatingLabel = ({ children, label }: { children: ReactNode; label: string }) => {
  return (
    <div className="relative">
      <label className="absolute left-4 top-2 text-xs font-medium text-white/60 pointer-events-none">
        {label}
      </label>
      {children}
    </div>
  );
};
