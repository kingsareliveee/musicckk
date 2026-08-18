import React from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface SettingsDangerRowProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
  isLast?: boolean;
}

export const SettingsDangerRow: React.FC<SettingsDangerRowProps> = ({
  icon,
  title,
  description,
  onClick,
  isLast = false,
}) => {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ backgroundColor: "rgba(255,60,60,0.06)" }}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors"
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,60,60,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Icon container — red tint */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,60,60,0.10)" }}
      >
        <span
          className="[&>svg]:w-4 [&>svg]:h-4"
          style={{ color: "rgba(255,90,90,0.85)" }}
        >
          {icon}
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-snug"
          style={{ color: "rgba(255,90,90,0.90)" }}
        >
          {title}
        </p>
        {description && (
          <p
            className="text-xs mt-0.5 leading-snug"
            style={{ color: "rgba(255,90,90,0.45)" }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight
        className="w-4 h-4 flex-shrink-0"
        style={{ color: "rgba(255,90,90,0.35)" }}
      />
    </motion.button>
  );
};
