import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, SkipBack, SkipForward,
  Heart, Shuffle, Repeat, Repeat1, Mic2,
  ListMusic,
} from "lucide-react";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { InteractiveSeekBar } from "./InteractiveSeekBar";

interface NowPlayingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NowPlayingPanel: React.FC<NowPlayingPanelProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { isLiked, toggleLike } = useLikedSongs();

  const {
    currentSong,
    isPlaying,
    isShuffle,
    repeatMode,
    queue,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();


  if (!currentSong) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed inset-x-4 bottom-4 md:inset-auto md:right-6 md:bottom-28 md:w-[380px] z-[101] rounded-3xl overflow-hidden"
            style={{
              background: "rgba(10,10,10,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 120px rgba(var(--ambient-r),var(--ambient-g),var(--ambient-b),0.10)",
            }}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            {/* Ambient gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(var(--ambient-r),var(--ambient-g),var(--ambient-b),0.12) 0%, transparent 60%)",
              }}
            />

            {/* Content */}
            <div className="relative z-10 p-6 flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
                  Now Playing
                </span>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Artwork */}
              <div className="flex justify-center">
                <motion.div
                  className="relative w-52 h-52 rounded-2xl overflow-hidden"
                  style={{
                    boxShadow:
                      "0 16px 48px rgba(var(--ambient-r),var(--ambient-g),var(--ambient-b),0.30), 0 8px 24px rgba(0,0,0,0.6)",
                  }}
                  animate={{ scale: isPlaying ? 1 : 0.94 }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                >
                  <img
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </div>

              {/* Song info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-lg font-bold text-white truncate leading-tight">
                    {currentSong.title}
                  </span>
                  <span className="text-sm text-white/40 mt-0.5">{currentSong.artist}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleLike(currentSong)}
                  className="flex-shrink-0 pt-0.5"
                  style={{ color: isLiked(currentSong.videoId) ? "var(--accent)" : "rgba(255,255,255,0.30)" }}
                >
                  <Heart
                    className="w-6 h-6"
                    fill={isLiked(currentSong.videoId) ? "currentColor" : "none"}
                  />
                </motion.button>
              </div>

              {/* Seekbar */}
              <InteractiveSeekBar showLabels={true} className="w-full" />

              {/* Playback controls */}
              <div className="flex items-center justify-between px-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleShuffle}
                  style={{ color: isShuffle ? "var(--accent)" : "rgba(255,255,255,0.35)" }}
                >
                  <Shuffle className="w-5 h-5" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={playPrevious}
                  style={{ color: "rgba(255,255,255,0.70)" }}
                >
                  <SkipBack className="w-6 h-6 fill-current" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    togglePlay();
                  }}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-black"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 24px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={playNext}
                  style={{ color: "rgba(255,255,255,0.70)" }}
                >
                  <SkipForward className="w-6 h-6 fill-current" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleRepeat}
                  style={{ color: repeatMode !== "none" ? "var(--accent)" : "rgba(255,255,255,0.35)" }}
                >
                  {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </motion.button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { navigate(`/song/${currentSong.videoId}`); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <Mic2 className="w-4 h-4" />
                  Lyrics
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <ListMusic className="w-4 h-4" />
                  Queue ({queue.length})
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
