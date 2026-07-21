import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'text' | 'avatar';
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'card',
  count = 1,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`skeleton-card ${className}`}>
            <div className="aspect-square skeleton rounded-2xl" />
            <div className="p-4 flex flex-col gap-2">
              <div className="skeleton h-4 rounded-full w-3/4" />
              <div className="skeleton h-3 rounded-full w-1/2" />
            </div>
          </div>
        );
      case 'list':
        return (
          <div className={`flex items-center gap-3 p-3 ${className}`}>
            <div className="w-12 h-12 skeleton rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="skeleton h-4 rounded-full w-3/4" />
              <div className="skeleton h-3 rounded-full w-1/2" />
            </div>
          </div>
        );
      case 'text':
        return (
          <div className={`flex flex-col gap-2 ${className}`}>
            <div className="skeleton h-4 rounded-full w-full" />
            <div className="skeleton h-3 rounded-full w-2/3" />
          </div>
        );
      case 'avatar':
        return (
          <div className={`w-12 h-12 skeleton rounded-full ${className}`} />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          {renderSkeleton()}
        </motion.div>
      ))}
    </>
  );
};
