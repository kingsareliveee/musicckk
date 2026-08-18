import React from "react";
import { ChevronRight } from "lucide-react";
import { SettingsRow } from "./SettingsRow";

interface SettingsSelectProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  value: string;
  onClick: () => void;
  isLast?: boolean;
}

export const SettingsSelect: React.FC<SettingsSelectProps> = ({
  icon,
  title,
  description,
  value,
  onClick,
  isLast = false,
}) => {
  return (
    <SettingsRow
      icon={icon}
      title={title}
      description={description}
      isLast={isLast}
      onClick={onClick}
      trailing={
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--accent)" }}
          >
            {value}
          </span>
          <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
        </div>
      }
    />
  );
};
