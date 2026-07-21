import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, Heart, Shuffle, ArrowLeft, Music,
} from "lucide-react";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { useAuth } from "../hooks/useAuth";
import { CompactTrackRow } from "../components/CompactTrackRow";

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export const LikedSongs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const {
    currentSong,
    setCurrentSong,
    setQueue,
    togglePlay,
    toggleShuffle,
    isShuffle,
  } = usePlayerStore();

  const likedList = Object.values(likedSongs);
  const count = likedList.length;

  /** Play a specific song from the list, setting the rest as queue */
  const handlePlaySong = (song: Song, index: number) => {
    if (currentSong?.videoId === song.videoId) {
      togglePlay();
    } else {
      setCurrentSong(song);
      setQueue(likedList.slice(index + 1));
    }
  };

  /** Play all liked songs from the first track */
  const handlePlayAll = () => {
    if (likedList.length === 0) return;
    setCurrentSong(likedList[0]);
    setQueue(likedList.slice(1));
  };

  /** Shuffle play — randomize the list */
  const handleShufflePlay = () => {
    if (likedList.length === 0) return;
    const shuffled = [...likedList].sort(() => Math.random() - 0.5);
    setCurrentSong(shuffled[0]);
    setQueue(shuffled.slice(1));
    if (!isShuffle) toggleShuffle();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Heart className="w-12 h-12" style={{ color: "rgba(255,255,255,0.15)" }} />
        <p className="text-sm text-white/30">Sign in to see your liked songs</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8">

      {/* ── Back button ─────────────────────────────────── */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>

      {/* ── Hero header ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl p-8 md:p-10 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(232,156,176,0.20) 0%, rgba(95,168,255,0.12) 50%, rgba(139,207,198,0.08) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Background blob */}
        <div
          className="absolute -top-10 -right-10 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(232,156,176,0.25) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-6">
          {/* Icon */}
          <div
            className="w-36 h-36 md:w-44 md:h-44 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #E89CB0 0%, #5FA8FF 100%)",
              boxShadow: "0 16px 48px rgba(232,156,176,0.30), 0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <Heart className="w-16 h-16 text-white" fill="currentColor" />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
              Playlist
            </span>
            <h1
              className="text-3xl md:text-5xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Liked Songs
            </h1>
            <p className="text-sm text-white/40">
              {count} {count === 1 ? "song" : "songs"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Action bar ──────────────────────────────────── */}
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={handlePlayAll}
            className="w-14 h-14 rounded-full flex items-center justify-center text-black"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 24px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleShufflePlay}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{
              color: isShuffle ? "var(--accent)" : "rgba(255,255,255,0.40)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <Shuffle className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}

      {/* ── Song list ───────────────────────────────────── */}
      {count === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 py-16 text-center"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <Music className="w-9 h-9 text-white/15" />
          </div>
          <div>
            <p className="font-semibold text-white/40 mb-1">No liked songs yet</p>
            <p className="text-sm text-white/25">
              Tap the ❤️ on any track to save it here
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {likedList.map((song, i) => (
            <motion.div
              key={song.videoId}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <CompactTrackRow
                song={song}
                index={i}
                onClick={() => handlePlaySong(song, i)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
