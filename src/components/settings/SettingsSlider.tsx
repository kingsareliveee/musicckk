import React from "react";

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
      {/* Header row: icon, title, current value */}
      <div className="flex items-center gap-3.5 mb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <span className="text-white/60 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        </div>

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

        <span
          className="text-xs font-semibold flex-shrink-0 tabular-nums"
          style={{ color: "var(--accent)" }}
        >
          {value}{unit}
        </span>
      </div>

      {/* Slider — indented to align with text */}
      <div className="pl-[44px] pr-1">
        {/* Custom track wrapper */}
        <div className="relative w-full" style={{ height: 20 }}>
          {/* Background track */}
          <div
            className="absolute top-1/2 left-0 right-0 rounded-full pointer-events-none"
            style={{
              height: 3,
              background: "rgba(255,255,255,0.10)",
              transform: "translateY(-50%)",
            }}
          />
          {/* Filled track */}
          <div
            className="absolute top-1/2 left-0 rounded-full pointer-events-none transition-none"
            style={{
              height: 3,
              width: `${percent}%`,
              background: "var(--accent)",
              transform: "translateY(-50%)",
            }}
          />
          {/* The range input — fully transparent, sits on top */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            style={{ height: "100%" }}
          />
          {/* Visual thumb */}
          <div
            className="absolute top-1/2 pointer-events-none"
            style={{
              left: `calc(${percent}% - 6px)`,
              transform: "translateY(-50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent-glow)",
              transition: "left 0s",
            }}
          />
        </div>
      </div>
    </div>
  );
};
