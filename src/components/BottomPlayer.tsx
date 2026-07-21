import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play, Pause, SkipBack, SkipForward, Heart,
  Shuffle, Repeat, Repeat1, Volume2, VolumeX,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { extractDominantColor, applyAmbientColor } from "../utils/colorExtractor";
import { NowPlayingPanel } from "./NowPlayingPanel";
import { InteractiveSeekBar } from "./InteractiveSeekBar";


/**
 * BottomPlayer — visual-only playback controls.
 * All audio logic lives in AudioProvider + AudioEngine + usePlayerStore.
 */
export const BottomPlayer: React.FC = () => {
  const navigate = useNavigate();
  const [showNowPlaying, setShowNowPlaying] = useState(false);

  const { isLiked, toggleLike } = useLikedSongs();

  const {
    currentSong,
    isPlaying,
    volume,
    isShuffle,
    repeatMode,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();

  // ── Ambient color extraction ──
  useEffect(() => {
    if (!currentSong?.thumbnail) return;
    extractDominantColor(currentSong.thumbnail).then(applyAmbientColor);
  }, [currentSong?.thumbnail]);




  // ── Volume ──
  const [isMuted, setIsMuted] = useState(false);
  const prevVolume = useRef(volume);
  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolume.current);
      setIsMuted(false);
    } else {
      prevVolume.current = volume;
      setVolume(0);
      setIsMuted(true);
    }
  };



  if (!currentSong) return null;

  return (
    <>
      <NowPlayingPanel
        isOpen={showNowPlaying}
        onClose={() => setShowNowPlaying(false)}
      />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative overflow-hidden rounded-2xl glass-player"
        style={{
          boxShadow:
            "0 -4px 40px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.5), 0 0 80px rgba(var(--ambient-r),var(--ambient-g),var(--ambient-b),0.08)",
        }}
      >
        {/* Ambient glow under player */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 130%, rgba(var(--ambient-r),var(--ambient-g),var(--ambient-b),0.06) 0%, transparent 70%)",
          }}
        />

        {/* ── Progress bar (top edge of player) ── */}
        <div className="absolute top-0 left-0 right-0 h-[3px] z-10 cursor-pointer group">
          <InteractiveSeekBar className="!block w-full [&>div]:!h-[3px] [&>div]:!rounded-none" />
        </div>

        {/* ── Player body ── */}
        <div className="relative z-[1] px-4 py-3 md:px-5 md:py-3.5">
          {/* Three-column layout */}
          <div className="flex items-center gap-3 md:gap-4">

            {/* ── LEFT: Song info ── */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Thumbnail (click to open Now Playing) */}
              <motion.div
                className="relative w-11 h-11 md:w-13 md:h-13 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowNowPlaying(true)}
                style={{
                  boxShadow: "0 4px 16px rgba(var(--ambient-r),var(--ambient-g),var(--ambient-b),0.30)",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentSong.videoId}
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>
                {/* Expand icon overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ChevronUp className="w-4 h-4 text-white" />
                </div>
              </motion.div>

              {/* Title + Artist */}
              <div className="flex flex-col min-w-0">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentSong.videoId + "-title"}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-semibold text-white truncate cursor-pointer hover:underline"
                    onClick={() => navigate(`/song/${currentSong.videoId}`)}
                  >
                    {currentSong.title}
                  </motion.span>
                </AnimatePresence>
                <span
                  className="text-xs truncate cursor-pointer hover:text-white transition-colors"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  onClick={() => navigate(`/song/${currentSong.videoId}`)}
                >
                  {currentSong.artist}
                </span>
              </div>

              {/* Like — mobile visible */}
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleLike(currentSong)}
                className="flex-shrink-0 p-1.5 ml-1"
                style={{ color: isLiked(currentSong.videoId) ? "var(--accent)" : "rgba(255,255,255,0.30)" }}
              >
                <Heart
                  className="w-4 h-4"
                  fill={isLiked(currentSong.videoId) ? "currentColor" : "none"}
                />
              </motion.button>
            </div>

            {/* ── CENTER: Controls (desktop) / Play only (mobile) ── */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {/* Top row: shuffle + skip + play + skip + repeat */}
              <div className="flex items-center gap-2 md:gap-4">
                {/* Shuffle (desktop only) */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleShuffle}
                  className="hidden md:flex p-1.5 transition-colors"
                  style={{ color: isShuffle ? "var(--accent)" : "rgba(255,255,255,0.35)" }}
                >
                  <Shuffle className="w-4 h-4" />
                </motion.button>

                {/* Previous (desktop only) */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={playPrevious}
                  className="hidden md:flex p-1.5"
                  style={{ color: "rgba(255,255,255,0.60)" }}
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </motion.button>

                {/* Play / Pause */}
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    togglePlay();
                  }}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-black font-bold transition-all"
                  style={{
                    background: "var(--accent)",
                    boxShadow: isPlaying
                      ? "0 0 20px var(--accent-glow), 0 4px 12px rgba(0,0,0,0.4)"
                      : "0 4px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </motion.button>

                {/* Next (mobile & desktop) */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={playNext}
                  className="flex p-1.5"
                  style={{ color: "rgba(255,255,255,0.70)" }}
                  title="Next song"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </motion.button>

                {/* Repeat (desktop only) */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleRepeat}
                  className="hidden md:flex p-1.5 transition-colors"
                  style={{ color: repeatMode !== "none" ? "var(--accent)" : "rgba(255,255,255,0.35)" }}
                >
                  {repeatMode === "one" ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </motion.button>
              </div>

              {/* Time labels + seekbar (desktop) */}
              <InteractiveSeekBar layout="horizontal" className="hidden md:flex w-full min-w-[220px] max-w-[320px]" />
            </div>

            {/* ── RIGHT: Volume (desktop) ── */}
            <div className="hidden md:flex items-center gap-2.5 flex-1 justify-end min-w-0">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleMuteToggle}
                style={{ color: "rgba(255,255,255,0.40)" }}
                className="hover:text-white transition-colors flex-shrink-0"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </motion.button>

              <div className="w-24 relative">
                {/* Volume track fill */}
                <div
                  className="absolute top-1/2 left-0 h-[3px] rounded-full pointer-events-none"
                  style={{
                    width: `${(isMuted ? 0 : volume) * 100}%`,
                    background: "var(--accent)",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (isMuted && v > 0) setIsMuted(false);
                  }}
                  className="w-full relative z-10"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
