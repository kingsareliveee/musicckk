import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, Library } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Library, label: "Library", path: "/library" },
];

export const BottomNavBar: React.FC = () => {
  const location = useLocation();

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 h-[68px] z-50 flex items-center justify-around px-2"
      style={{
        background: "rgba(5,5,5,0.94)",
        backdropFilter: "blur(32px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center justify-center w-full h-full gap-1 relative"
          >
            <div className="relative flex flex-col items-center gap-1">
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                  style={{ background: "var(--accent)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              <item.icon
                className={cn(
                  "w-[22px] h-[22px] transition-all duration-200",
                  isActive ? "text-white" : "text-white/35"
                )}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  isActive ? "text-white" : "text-white/35"
                )}
              >
                {item.label}
              </span>
            </div>
          </NavLink>
        );
      })}
    </div>
  );
};
