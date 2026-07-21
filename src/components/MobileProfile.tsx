import React, { useState, useRef, useEffect } from "react";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme, THEMES, type ThemeKey } from "../contexts/ThemeContext";
import { InstallAppButton } from "./InstallAppButton";

export const MobileProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name || "User";
  const email = user?.email;

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center focus:outline-none"
        style={{ border: "2px solid var(--accent)" }}
      >
        {user ? (
          avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-black text-xs font-bold"
              style={{ background: "var(--accent)" }}
            >
              {fullName[0].toUpperCase()}
            </div>
          )
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white/50 hover:text-white"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <UserIcon className="w-4 h-4 text-white/60" />
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="dropdown"
            className="absolute right-0 mt-2 w-56 rounded-xl py-2 z-50 flex flex-col gap-1"
            style={{
              background: "rgba(12,12,12,0.97)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
              backdropFilter: "blur(20px)",
            }}
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* User info / Sign in */}
            {user ? (
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Signed in as</p>
                <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                {email && <p className="text-xs text-white/30 truncate mt-0.5">{email}</p>}
              </div>
            ) : (
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Guest User</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setIsOpen(false); navigate("/login"); }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-black transition-all"
                  style={{ background: "var(--accent)" }}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </motion.button>
              </div>
            )}

            {/* Theme switcher */}
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 mb-3">
                Theme
              </span>
              <div className="flex items-center gap-2.5">
                {THEMES.map((t) => (
                  <motion.button
                    key={t.key}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setTheme(t.key as ThemeKey)}
                    title={t.label}
                    className="relative w-5 h-5 rounded-full flex-shrink-0"
                    style={{ background: t.color }}
                  >
                    {theme.key === t.key && (
                      <motion.div
                        layoutId="theme-ring-mobile"
                        className="absolute inset-[-3px] rounded-full border-2 border-white/60"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Install PWA App */}
            <div className="px-4 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <InstallAppButton />
            </div>

            {/* Logout */}
            {user && (
              <button
                onClick={() => { setIsOpen(false); logout(); }}
                className="w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 transition-colors rounded-b-xl"
                style={{ color: "rgba(255,80,80,0.80)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,80,80,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
