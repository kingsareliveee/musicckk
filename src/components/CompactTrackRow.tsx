import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { SongContextMenu } from "./SongContextMenu";
import { usePlayerStore } from "../store/usePlayerStore";
import type { Song } from "../store/usePlayerStore";
import { cn } from "../utils/cn";

interface CompactTrackRowProps {
  song: Song;
  index?: number;
  onClick: () => void;
}

export const CompactTrackRow: React.FC<CompactTrackRowProps> = ({
  song,
  index,
  onClick,
}) => {
  const { currentSong, isPlaying } = usePlayerStore();
  const isActive = currentSong?.videoId === song.videoId;

  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onClick}
      className="flex items-center gap-3 md:gap-4 p-2.5 rounded-xl cursor-pointer group transition-colors relative"
      style={{ transition: "background 0.15s" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
    >
      {/* Index / Equalizer */}
      <div
        className="w-8 text-center flex-shrink-0 flex items-center justify-center"
        style={{ minWidth: 28 }}
      >
        {isActive ? (
          <div className="flex items-end gap-[2px]" style={{ height: 14 }}>
            <div className={cn("eq-bar-1 w-[3px] bg-current rounded-sm", isPlaying ? "" : "eq-bar-paused")} style={{ height: "100%", color: "var(--accent)" }} />
            <div className={cn("eq-bar-2 w-[3px] bg-current rounded-sm", isPlaying ? "" : "eq-bar-paused")} style={{ height: "65%", color: "var(--accent)" }} />
            <div className={cn("eq-bar-3 w-[3px] bg-current rounded-sm", isPlaying ? "" : "eq-bar-paused")} style={{ height: "80%", color: "var(--accent)" }} />
          </div>
        ) : (
          <span className="text-xs text-white/25 group-hover:hidden">
            {index !== undefined ? index + 1 : ""}
          </span>
        )}
        {!isActive && (
          <Play className="w-3.5 h-3.5 fill-current text-white/60 hidden group-hover:block" />
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-11 h-11 rounded-lg overflow-hidden relative flex-shrink-0">
        <img
          src={song.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&size=128&background=1a1a2e&color=fff&bold=true`}
          alt={song.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const t = e.currentTarget;
            t.onerror = null;
            t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&size=128&background=1a1a2e&color=fff&bold=true`;
          }}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className={cn(
            "text-sm font-semibold truncate transition-colors",
            isActive ? "" : "text-white"
          )}
          style={isActive ? { color: "var(--accent)" } : {}}
        >
          {song.title}
        </span>
        <span className="text-xs text-white/35 truncate mt-0.5">{song.artist}</span>
      </div>

      {/* Duration */}
      <span className="text-xs text-white/25 tabular-nums flex-shrink-0 hidden sm:block mr-2">
        {song.duration}
      </span>

      {/* Context menu */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <SongContextMenu song={song} />
      </div>
    </motion.div>
  );
};
