import React from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const InstallAppButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstalled, installApp } = usePWAInstall();

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 ${className}`}>
        <CheckCircle className="w-4 h-4" />
        <span>App Installed</span>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={installApp}
      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 transition-all shadow-sm ${className}`}
      title="Download & Install Musick App"
    >
      <Download className="w-4 h-4 text-[var(--accent)] animate-bounce" />
      <span>Download App</span>
    </motion.button>
  );
};
