import React from "react";
import { motion } from "framer-motion";

interface SettingsSliderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  isLast?: boolean;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({
  icon,
  title,
  description,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  isLast = false,
}) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div
      className="px-4 py-3.5"
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center gap-3.5 mb-3">
        {/* Icon */}
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

        {/* Current value */}
        <span
          className="text-xs font-semibold flex-shrink-0 tabular-nums"
          style={{ color: "var(--accent)" }}
        >
          {value}{unit}
        </span>
      </div>

      {/* Slider */}
      <div className="pl-[44px] pr-1 relative">
        {/* Track fill */}
        <motion.div
          className="absolute top-1/2 pointer-events-none rounded-full"
          style={{
            left: 44,
            height: 3,
            background: "var(--accent)",
            transform: "translateY(-50%)",
          }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full relative z-10"
        />
      </div>
    </div>
  );
};
