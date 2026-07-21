/**
 * Musick Design System
 * Premium color palette, spacing, and animation constants
 */

export const COLORS = {
  // Core palette - Pure AMOLED Black
  background: '#000000',
  secondary: '#0a0a0a',
  card: '#0f0f0f',
  
  // Accent
  accent: '#7CFF5B', // Neon Green
  accentDark: '#5FD63D',
  accentLight: '#9FFF8F',
  
  // Secondary accent
  purple: '#B084FF',
  purpleDark: '#8B5FFF',
  purpleLight: '#D4B5FF',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#757575',
  
  // Borders & dividers
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.04)',
  
  // Semantic
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
};

export const BORDER_RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  full: '9999px',
};

export const ANIMATION = {
  fast: '0.15s',
  base: '0.3s',
  slow: '0.5s',
  verySlow: '0.8s',
  easeInOutCubic: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

export const GLASS = {
  sm: 'backdrop-blur-md bg-white/[0.02] border border-white/[0.08]',
  md: 'backdrop-blur-lg bg-white/[0.04] border border-white/[0.08]',
  lg: 'backdrop-blur-xl bg-white/[0.05] border border-white/[0.08]',
  blur: 'backdrop-blur-2xl',
};

export const SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.6)',
  glow: '0 0 24px rgba(124, 255, 91, 0.2)',
  glowPurple: '0 0 24px rgba(176, 132, 255, 0.15)',
};

export const TRANSITIONS = {
  default: `all ${ANIMATION.base} ${ANIMATION.easeInOutCubic}`,
  fast: `all ${ANIMATION.fast} ${ANIMATION.easeInOutCubic}`,
  slow: `all ${ANIMATION.slow} ${ANIMATION.easeInOutCubic}`,
  spring: `all ${ANIMATION.verySlow} ${ANIMATION.spring}`,
  transform: `transform ${ANIMATION.base} ${ANIMATION.easeOutCubic}`,
  opacity: `opacity ${ANIMATION.base} ${ANIMATION.easeInOutCubic}`,
};

export const FONTS = {
  heading: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
};

// Gradient presets
export const GRADIENTS = {
  accentGlow: 'linear-gradient(135deg, rgba(124, 255, 91, 0.2) 0%, rgba(124, 255, 91, 0) 100%)',
  purpleGlow: 'linear-gradient(135deg, rgba(176, 132, 255, 0.2) 0%, rgba(176, 132, 255, 0) 100%)',
  premium: 'linear-gradient(135deg, rgba(124, 255, 91, 0.1) 0%, rgba(176, 132, 255, 0.1) 100%)',
  darkGradient: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
  accentGradient: 'linear-gradient(135deg, #7CFF5B 0%, #5FD63D 100%)',
  purpleGradient: 'linear-gradient(135deg, #B084FF 0%, #8B5FFF 100%)',
};
