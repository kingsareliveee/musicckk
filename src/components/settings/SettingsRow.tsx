import React from "react";
import { motion } from "framer-motion";

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  isLast?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  description,
  trailing,
  onClick,
  isLast = false,
}) => {
  const rowStyle: React.CSSProperties = {
    borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
  };

  const inner = (
    <>
      {/* Icon container */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <span className="text-white/60 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-snug">{title}</p>
        {description && (
          <p
            className="text-xs mt-0.5 leading-snug"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Trailing */}
      {trailing && (
        <div className="flex-shrink-0 flex items-center">{trailing}</div>
      )}
    </>
  );

  if (onClick) {
    return (
      <motion.button
        whileTap={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        onClick={onClick}
        className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors"
        style={{ ...rowStyle, cursor: "pointer" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5"
      style={rowStyle}
    >
      {inner}
    </div>
  );
};
