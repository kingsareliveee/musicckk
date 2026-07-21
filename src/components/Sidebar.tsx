import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Search, Library, LogIn, LogOut, Plus, Music } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";
import { useAuth } from "../hooks/useAuth";
import { usePlaylists } from "../hooks/usePlaylists";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { useTheme, THEMES, type ThemeKey } from "../contexts/ThemeContext";

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { playlists } = usePlaylists();
  const { theme, setTheme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col py-7 px-4 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-10">
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none" className="flex-shrink-0">
          <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
          <circle cx="24" cy="24" r="14" stroke="rgba(255,255,255,0.20)" strokeWidth="1"/>
          <circle cx="24" cy="24" r="4" fill="var(--accent)"/>
          <line x1="24" y1="2" x2="24" y2="10" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="24" y1="38" x2="24" y2="46" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="2" y1="24" x2="10" y2="24" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="38" y1="24" x2="46" y2="24" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span
          className="font-bold tracking-[0.18em] text-white uppercase"
          style={{ fontSize: 16, fontFamily: "'Outfit', sans-serif" }}
        >
          MUSICK
        </span>
      </div>

      {/* Primary Nav */}
      <nav className="flex flex-col gap-1">
        <NavItem to="/" icon={<Home className="w-[18px] h-[18px]" />} label="Home" />
        <NavItem to="/search" icon={<Search className="w-[18px] h-[18px]" />} label="Search" />
        <NavItem to="/library" icon={<Library className="w-[18px] h-[18px]" />} label="Library" />
      </nav>

      {/* Divider */}
      <div className="my-6 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Playlists Section */}
      <div className="flex items-center justify-between px-3 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">
          Your Playlists
        </span>
        {user && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Plus className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>

      {/* Playlist list */}
      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-0.5">
        {!user ? (
          <div className="px-3 py-2 text-xs text-white/25">
            Sign in to see your playlists
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 px-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Music className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-xs text-white/25 text-center leading-relaxed">
              No playlists yet.{"\n"}Create one above.
            </p>
          </div>
        ) : (
          playlists.map((playlist) => (
            <motion.div
              key={playlist.id}
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={() => navigate(`/playlist/${playlist.id}`)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group"
              style={{ transition: "background 0.15s" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                {playlist.songs && playlist.songs.length > 0 ? (
                  <img
                    src={playlist.songs[0].thumbnail}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-4 h-4 text-white/30 m-2" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors truncate">
                  {playlist.name}
                </span>
                <span className="text-xs text-white/30">
                  {playlist.songs?.length ?? 0} songs
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Bottom section */}
      <div className="mt-auto pt-5 flex flex-col gap-4">
        {/* Theme switcher */}
        <div className="px-3">
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
                    layoutId="theme-ring"
                    className="absolute inset-[-3px] rounded-full border-2 border-white/60"
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Profile / Auth */}
        <div className="px-3">
          {user ? (
            <div className="flex items-center gap-3 group">
              <div className="relative flex-shrink-0">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name ?? "User"}
                    className="w-8 h-8 rounded-full object-cover"
                    style={{ border: "2px solid var(--accent)" }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: "var(--accent)" }}
                  >
                    {(user.user_metadata?.full_name ?? user.email ?? "U")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.user_metadata?.full_name ?? "User"}
                </p>
                <p className="text-xs text-white/35 truncate">{user.email}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-white/40 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-semibold text-black transition-all"
              style={{ background: "var(--accent)" }}
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </motion.button>
          )}
        </div>
      </div>

      <CreatePlaylistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

// ─── Nav Item ────────────────────────────────────────────────
const NavItem = ({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <NavLink
    to={to}
    end={to === "/"}
    className={({ isActive }) =>
      cn(
        "relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        isActive
          ? "text-white"
          : "text-white/40 hover:text-white/70"
      )
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-xl"
            style={{ background: "rgba(255,255,255,0.06)" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        )}
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ background: "var(--accent)" }}
          />
        )}
        <span className="relative z-10">{icon}</span>
        <span className="relative z-10">{label}</span>
      </>
    )}
  </NavLink>
);
