import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { cn } from "../utils/cn";
import { SongContextMenu } from "./SongContextMenu";
import type { Song } from "../store/usePlayerStore";

interface GlassCardProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  className?: string;
  onClick?: () => void;
  song?: Song;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  title,
  subtitle,
  imageUrl,
  className,
  onClick,
  song,
}) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn("group relative p-3 rounded-2xl cursor-pointer overflow-hidden", className)}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "background 0.2s ease, box-shadow 0.2s ease",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Artwork */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
        <img
          src={imageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=300&background=1a1a2e&color=fff&bold=true`;
          }}
        />

        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Context menu (top right) */}
        {song && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <SongContextMenu
              song={song}
              className="[&>button]:bg-black/50 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:shadow-lg"
            />
          </div>
        )}

        {/* Play button (bottom right) */}
        <motion.div
          className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center text-black shadow-xl"
          style={{ background: "var(--accent)" }}
          initial={{ opacity: 0, y: 8, scale: 0.8 }}
          whileHover={{ scale: 1 }}
          animate={{ opacity: 0, y: 8, scale: 0.8 }}
          variants={{}}
          custom={{}}
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </motion.div>

        {/* Play button via CSS group-hover (more reliable) */}
        <div
          className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center text-black shadow-xl
                     opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0
                     transition-all duration-300"
          style={{ background: "var(--accent)" }}
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col px-0.5 pb-0.5">
        <h3 className="text-sm font-semibold text-white truncate leading-tight mb-0.5">
          {title}
        </h3>
        <p className="text-xs text-white/40 truncate">{subtitle}</p>
      </div>
    </motion.div>
  );
};
