import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  Heart,
  Loader2,
  ArrowLeft,
  Share2,
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  X,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { SyncedLyrics } from "../components/SyncedLyrics";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { SongContextMenu } from "../components/SongContextMenu";
import { InteractiveSeekBar } from "../components/InteractiveSeekBar";
import {
  extractDominantColor,
  applyAmbientColor,
} from "../utils/colorExtractor";
import toast from "react-hot-toast";
import { getSongById, searchSongs } from "../lib/jiosaavn";

export const SongDetail: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dominantColor, setDominantColor] =
    useState<string>("rgba(20,20,20,0.8)");

  // Related songs state
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const {
    currentSong,
    isPlaying,
    setCurrentSong,
    setQueue,
    togglePlay,
    playNext,
    playPrevious,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLikedSongs();

  // Load song details
  useEffect(() => {
    if (!videoId) return;

    const fallbackSong = currentSong?.videoId === videoId ? currentSong : null;
    if (fallbackSong) {
      // Show current playing song details immediately, even if API is slow/fails.
      setSong(fallbackSong);
    }

    const fetchSongDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getSongById(videoId);
        if (!data) throw new Error("Failed to fetch song details");
        setSong(data);
      } catch {
        if (!fallbackSong) {
          setError("Failed to load song details.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSongDetails();
  }, [videoId, currentSong]);

  // Extract dominant color from artwork
  useEffect(() => {
    if (!song?.thumbnail) return;
    extractDominantColor(song.thumbnail).then((rgb) => {
      applyAmbientColor(rgb);
      setDominantColor(`rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
    });
  }, [song?.thumbnail]);

  // Fetch related songs by the same artist dynamically!
  useEffect(() => {
    if (!song?.artist) return;
    const fetchRelated = async () => {
      setRelatedLoading(true);
      try {
        const cleanArtist = song.artist.replace(/\s*-Topic/gi, "").trim();
        const songsList = await searchSongs(cleanArtist, 14);
        setRelatedSongs(
          songsList.filter((s: Song) => s.videoId !== song.videoId).slice(0, 6),
        );
      } catch (err) {
        console.error("Failed to load related songs:", err);
      } finally {
        setRelatedLoading(false);
      }
    };
    fetchRelated();
  }, [song?.artist, song?.videoId]);

  const handlePlaySong = (targetSong: Song) => {
    if (currentSong?.videoId === targetSong.videoId) {
      togglePlay();
    } else {
      setCurrentSong(targetSong);
      // Set remaining related songs as queue
      const idx = relatedSongs.findIndex(
        (s) => s.videoId === targetSong.videoId,
      );
      if (idx !== -1) {
        setQueue(relatedSongs.slice(idx + 1));
      }
    }
  };

  const handlePlayMainSong = () => {
    if (!song) return;
    if (currentSong?.videoId === song.videoId) {
      togglePlay();
    } else {
      setCurrentSong(song);
      setQueue(relatedSongs);
    }
  };

  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleShare = async () => {
    if (!song) return;
    const url = window.location.href;
    const shareData = {
      title: `${song.title} — ${song.artist}`,
      text: `🎵 Listen to ${song.title} by ${song.artist} on Musick`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Share failed:", err);
          navigator.clipboard.writeText(url).then(() => {
            toast.success("Link copied!");
          });
        }
      }
    } else {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied!");
      });
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied!");
      setShowShareMenu(false);
    });
  };

  const shareLinks = song
    ? [
        {
          label: "WhatsApp",
          icon: "💬",
          url: `https://wa.me/?text=${encodeURIComponent(`🎵 ${song.title} by ${song.artist}\n${window.location.href}`)}`,
        },
        {
          label: "Telegram",
          icon: "✈️",
          url: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`🎵 ${song.title} by ${song.artist}`)}`,
        },
        {
          label: "Twitter/X",
          icon: "𝕏",
          url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎵 ${song.title} by ${song.artist}`)}&url=${encodeURIComponent(window.location.href)}`,
        },
        {
          label: "Discord",
          icon: "🎮",
          url: `https://discord.com/channels/@me`,
          onClick: handleCopyLink,
        },
      ]
    : [];

  const isCurrentSong = currentSong?.videoId === song?.videoId;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
        <div className="flex gap-6 items-start">
          <div className="w-48 h-48 skeleton rounded-2xl flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-4">
            <div className="skeleton h-8 rounded-full w-3/4" />
            <div className="skeleton h-5 rounded-full w-1/2" />
            <div className="skeleton h-4 rounded-full w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-sm font-medium text-red-400/80">
          {error || "Song not found"}
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-sm text-accent underline"
        >
          Go Home
        </button>
      </div>
    );
  }

  // NOTE: JioSaavn API provides only basic song metadata (title, artist, thumbnail, duration)
  // Detailed metadata (composer, producer, lyricist, credits, lyrics, genre, mood, theme) is NOT available
  // from the API. Only display real data; unavailable fields show "Information unavailable"

  return (
    <div className="flex flex-col gap-10 md:gap-14 max-w-5xl pb-16 relative">
      {/* ── Share Menu Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showShareMenu && (
          <>
            <motion.div
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareMenu(false)}
            />
            <motion.div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[201] w-[90vw] max-w-sm rounded-3xl p-5 flex flex-col gap-4"
              style={{
                background: "rgba(18,18,18,0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
              }}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-base">Share</span>
                <button
                  onClick={() => setShowShareMenu(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {shareLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.onClick ? undefined : link.url}
                    target={link.onClick ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    onClick={link.onClick}
                    className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:bg-white/8 active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="text-sm font-semibold text-white/80">
                      {link.label}
                    </span>
                  </a>
                ))}
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl text-sm font-bold text-black transition-all active:scale-98"
                style={{ background: "var(--accent)" }}
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Spotify style Blurred Cover Backdrop ───────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[600px] overflow-hidden pointer-events-none z-0 rounded-b-[40px]">
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-full h-full object-cover scale-150 blur-[80px] opacity-45"
          onError={(e) => {
            e.currentTarget.src = "https://ui-avatars.com/api/?name=Artist";
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${dominantColor} 0%, rgba(0,0,0,0.92) 80%, #000000 100%)`,
          }}
        />
      </div>

      {/* ── Sticky/Top Header Section ─────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        <div className="hidden sm:flex flex-col items-center max-w-[50%]">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-white/30">
            Playing From Search
          </span>
          <span className="text-sm font-bold text-white truncate max-w-full">
            {song.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleLike(song)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-md text-white/60 hover:text-white transition-all"
            style={{ color: isLiked(song.videoId) ? "var(--accent)" : "" }}
          >
            <Heart
              className="w-5 h-5"
              fill={isLiked(song.videoId) ? "currentColor" : "none"}
            />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-md text-white/60 hover:text-white transition-all"
          >
            <Share2 className="w-5 h-5" />
          </motion.button>
          <SongContextMenu
            song={song}
            className="[&>button]:w-10 [&>button]:h-10 [&>button]:rounded-full [&>button]:bg-white/5 [&>button]:hover:bg-white/10 [&>button]:backdrop-blur-md"
          />
        </div>
      </div>

      {/* ── Main Hero Section (Large Art + Meta) ─────────────────────────── */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center mt-2">
        {/* Cover Art */}
        <div className="col-span-1 md:col-span-5 flex justify-center">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-2xl"
            style={{
              boxShadow: `0 24px 80px rgba(var(--ambient-r),var(--ambient-g),var(--ambient-b),0.35), 0 8px 32px rgba(0,0,0,0.5)`,
            }}
          >
            <img
              src={song.thumbnail}
              alt={song.title}
              className="w-full h-full object-cover select-none"
              onError={(e) => {
                e.currentTarget.src = "https://ui-avatars.com/api/?name=Artist";
              }}
            />
          </motion.div>
        </div>

        {/* Text Info & Controls */}
        <div className="col-span-1 md:col-span-7 flex flex-col gap-5 text-left">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight font-outfit">
              {song.title}
            </h1>
            <div className="flex items-center gap-2.5 text-sm text-white/50 font-medium">
              <span className="text-white/80 hover:text-white transition-colors cursor-pointer font-semibold">
                {song.artist}
              </span>
              <span>•</span>
              <span>Single</span>
            </div>
          </div>

          {/* Interactive Seek Bar */}
          <div className="w-full mt-2">
            <InteractiveSeekBar showLabels={true} className="w-full" />
          </div>

          {/* Player Controls (Shuffle, Back, Play/Pause, Next, Repeat) */}
          <div className="flex items-center gap-6 mt-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleShuffle}
              className="text-white/40 hover:text-white transition-colors"
              style={{ color: isShuffle ? "var(--accent)" : "" }}
            >
              <Shuffle className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={playPrevious}
              className="text-white/70 hover:text-white transition-colors"
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handlePlayMainSong}
              className="w-16 h-16 rounded-full flex items-center justify-center text-black font-bold"
              style={{
                background: "var(--accent)",
                boxShadow:
                  "0 0 24px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              {isCurrentSong && isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-0.5" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={playNext}
              className="text-white/70 hover:text-white transition-colors"
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRepeat}
              className="text-white/40 hover:text-white transition-colors"
              style={{ color: repeatMode !== "none" ? "var(--accent)" : "" }}
            >
              {repeatMode === "one" ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Spotify Lyrics Section ─────────────────────────────────── */}
      <div className="relative z-10 w-full">
        <SyncedLyrics song={song} isCurrentSong={isCurrentSong} />
      </div>

      {/* ── Related Songs (More Like This) Section ──────────────────────────── */}
      {relatedSongs.length > 0 && (
        <div className="relative z-10 w-full text-left">
          <h3 className="text-base font-bold text-white tracking-wide uppercase mb-5">
            More Like This
          </h3>
          {relatedLoading ? (
            <div className="flex items-center gap-2 text-white/40 py-4 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span>Fetching similar tracks...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-5">
              {relatedSongs.map((s) => (
                <motion.div
                  key={s.videoId}
                  whileHover={{ y: -4 }}
                  onClick={() => handlePlaySong(s)}
                  className="rounded-2xl p-3 flex flex-col gap-2 cursor-pointer group transition-all"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.02)")
                  }
                >
                  <div className="aspect-square rounded-xl overflow-hidden relative">
                    <img
                      src={s.thumbnail}
                      alt={s.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://ui-avatars.com/api/?name=Artist";
                      }}
                    />
                    {/* Hover play icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-current" />
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate leading-tight group-hover:text-accent transition-colors">
                      {s.title}
                    </span>
                    <span className="text-[10px] text-white/30 truncate mt-0.5">
                      {s.artist}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
