import React from "react";
import { motion } from "framer-motion";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  index?: number;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
  index = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.055, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-2"
    >
      {/* Section label */}
      <span
        className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "rgba(255,255,255,0.30)" }}
      >
        {title}
      </span>

      {/* Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {children}
      </div>
    </motion.div>
  );
};
