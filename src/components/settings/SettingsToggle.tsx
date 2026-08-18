import React from "react";
import { motion } from "framer-motion";
import { SettingsRow } from "./SettingsRow";

interface SettingsToggleProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  isLast?: boolean;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  icon,
  title,
  description,
  value,
  onChange,
  isLast = false,
}) => {
  return (
    <SettingsRow
      icon={icon}
      title={title}
      description={description}
      isLast={isLast}
      onClick={() => onChange(!value)}
      trailing={<Toggle value={value} />}
    />
  );
};

// ── Animated Toggle Switch ────────────────────────────────────
const Toggle: React.FC<{ value: boolean }> = ({ value }) => {
  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: value ? "var(--accent)" : "rgba(255,255,255,0.12)",
        transition: "background 0.25s ease",
        boxShadow: value ? "0 0 12px var(--accent-glow)" : "none",
      }}
    >
      <motion.div
        className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full"
        style={{ background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
        animate={{ x: value ? 18 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    </div>
  );
};
