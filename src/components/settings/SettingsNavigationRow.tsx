import React from "react";
import { ChevronRight } from "lucide-react";
import { SettingsRow } from "./SettingsRow";

interface SettingsNavigationRowProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  value?: string;
  onClick: () => void;
  isLast?: boolean;
}

export const SettingsNavigationRow: React.FC<SettingsNavigationRowProps> = ({
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
          {value && (
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {value}
            </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
        </div>
      }
    />
  );
};
