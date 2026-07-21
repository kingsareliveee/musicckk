import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  Heart,
  Shuffle,
  ArrowLeft,
  Music,
  Trash2,
  ListMusic,
  Download,
  Loader2,
} from "lucide-react";
import { usePlaylists } from "../hooks/usePlaylists";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { useAuth } from "../hooks/useAuth";
import { CompactTrackRow } from "../components/CompactTrackRow";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { supabase } from "../lib/supabase";
import { useLibraryStore, type Playlist } from "../store/useLibraryStore";
import toast from "react-hot-toast";
import { getPlaylistById } from "../lib/jiosaavn";

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

function durationToSeconds(dur: string): number {
  if (!dur) return 0;
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export const PlaylistDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { playlists, deletePlaylist, removeSongFromPlaylist } = usePlaylists();
  const { addPlaylist } = useLibraryStore();

  const {
    currentSong,
    setCurrentSong,
    setQueue,
    togglePlay,
    toggleShuffle,
    isShuffle,
  } = usePlayerStore();

  // External (JioSaavn) playlist state
  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  const isExternalPlaylist = id ? !isUuid(id) : false;

  const [ytPlaylist, setYtPlaylist] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Fetch external playlist if applicable
  useEffect(() => {
    if (!id || !isExternalPlaylist) return;
    const fetchExternalPlaylist = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getPlaylistById(id);
        setYtPlaylist(data);
      } catch (err: any) {
        setError(err.message || "Failed to load playlist details.");
      } finally {
        setLoading(false);
      }
    };
    fetchExternalPlaylist();
  }, [id, isExternalPlaylist]);

  // Check if external playlist is liked in local storage
  useEffect(() => {
    if (!id || !isExternalPlaylist) return;
    const liked = JSON.parse(
      localStorage.getItem("musick-liked-yt-playlists") || "[]",
    );
    setIsLiked(liked.some((p: any) => p.id === id));
  }, [id, isExternalPlaylist]);

  const dbPlaylist = playlists.find((p) => p.id === id);
  const songList = isExternalPlaylist
    ? ytPlaylist?.songs || []
    : dbPlaylist?.songs || [];
  const count = songList.length;
  const name = isExternalPlaylist
    ? ytPlaylist?.title || "JioSaavn Playlist"
    : dbPlaylist?.name || "";
  const author = isExternalPlaylist ? ytPlaylist?.author || "JioSaavn" : "You";
  const thumbnail = isExternalPlaylist
    ? ytPlaylist?.thumbnail || ""
    : songList[0]?.thumbnail || "";

  /** Play a specific song from the list, setting the rest as queue */
  const handlePlaySong = (song: Song, index: number) => {
    if (currentSong?.videoId === song.videoId) {
      togglePlay();
    } else {
      setCurrentSong(song);
      setQueue(songList.slice(index + 1));
    }
  };

  /** Play all songs from the first track */
  const handlePlayAll = () => {
    if (songList.length === 0) return;
    setCurrentSong(songList[0]);
    setQueue(songList.slice(1));
  };

  /** Shuffle play — randomize the list */
  const handleShufflePlay = () => {
    if (songList.length === 0) return;
    const shuffled = [...songList].sort(() => Math.random() - 0.5);
    setCurrentSong(shuffled[0]);
    setQueue(shuffled.slice(1));
    if (!isShuffle) toggleShuffle();
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this playlist?")) {
      await deletePlaylist(id);
      navigate("/library");
    }
  };

  const toggleLikePlaylist = () => {
    if (!ytPlaylist) return;
    const liked = JSON.parse(
      localStorage.getItem("musick-liked-yt-playlists") || "[]",
    );
    const exists = liked.some((p: any) => p.id === ytPlaylist.id);
    let next;
    if (exists) {
      next = liked.filter((p: any) => p.id !== ytPlaylist.id);
      setIsLiked(false);
      toast.success("Removed from Liked Playlists");
    } else {
      next = [
        ...liked,
        {
          id: ytPlaylist.id,
          title: ytPlaylist.title,
          author: ytPlaylist.author,
          thumbnail: ytPlaylist.thumbnail,
          videoCount: `${ytPlaylist.songs?.length || 0} songs`,
        },
      ];
      setIsLiked(true);
      toast.success("Added to Liked Playlists");
    }
    localStorage.setItem("musick-liked-yt-playlists", JSON.stringify(next));
  };

  const importPlaylist = async () => {
    if (!user) {
      toast.error("Please login to import playlists");
      return;
    }
    if (!ytPlaylist) return;
    setImporting(true);
    try {
      // 1. Insert playlist
      const { data: plData, error: plError } = await supabase
        .from("playlists")
        .insert({ user_id: user.id, name: ytPlaylist.title })
        .select()
        .single();
      if (plError) throw plError;

      // 2. Batch insert playlist songs
      const songsToInsert = ytPlaylist.songs.map(
        (song: Song, index: number) => ({
          playlist_id: plData.id,
          song_id: song.videoId, // use song_id instead of video_id
          title: song.title,
          artist: song.artist,
          duration: durationToSeconds(song.duration),
          position: index,
        }),
      );

      const { error: songsError } = await supabase
        .from("playlist_songs")
        .insert(songsToInsert);
      if (songsError) throw songsError;

      // 3. Update local state
      const newPlaylist: Playlist = {
        id: plData.id,
        user_id: user.id,
        name: ytPlaylist.title,
        created_at: plData.created_at,
        songs: ytPlaylist.songs,
      };
      addPlaylist(newPlaylist);
      toast.success(`Imported playlist "${ytPlaylist.title}" to library!`);
      navigate(`/playlist/${plData.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to import playlist");
    } finally {
      setImporting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <ListMusic
          className="w-12 h-12"
          style={{ color: "rgba(255,255,255,0.15)" }}
        />
        <p className="text-sm text-white/30">Sign in to see your playlists</p>
      </div>
    );
  }

  if (isExternalPlaylist && loading) {
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
        <div className="flex flex-col gap-2">
          <SkeletonLoader variant="list" count={8} />
        </div>
      </div>
    );
  }

  if (isExternalPlaylist && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-accent underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!isExternalPlaylist && !dbPlaylist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-sm text-white/30">Playlist not found</p>
        <button
          onClick={() => navigate("/library")}
          className="text-sm text-accent underline"
        >
          Go back to Library
        </button>
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
          background:
            "linear-gradient(135deg, rgba(95,168,255,0.15) 0%, rgba(139,207,198,0.10) 50%, rgba(255,255,255,0.02) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Background blob */}
        <div
          className="absolute -top-10 -right-10 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(95,168,255,0.2) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-6">
          {/* Icon / Artwork */}
          <div
            className="w-36 h-36 md:w-44 md:h-44 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #5FA8FF 0%, #8BCFC6 100%)",
              boxShadow:
                "0 16px 48px rgba(95,168,255,0.25), 0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ListMusic className="w-16 h-16 text-white" />
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2 text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
              {isExternalPlaylist ? "JioSaavn Playlist" : "Playlist"}
            </span>
            <h1
              className="text-3xl md:text-5xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {name}
            </h1>
            <p className="text-sm text-white/40">
              By {author} • {count} {count === 1 ? "song" : "songs"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Action bar ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          {count > 0 && (
            <>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={handlePlayAll}
                className="w-14 h-14 rounded-full flex items-center justify-center text-black"
                style={{
                  background: "var(--accent)",
                  boxShadow:
                    "0 0 24px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.4)",
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
            </>
          )}

          {isExternalPlaylist && (
            <>
              {/* Like Playlist */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleLikePlaylist}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border"
                style={{
                  background: isLiked
                    ? "rgba(var(--accent-rgb),0.10)"
                    : "rgba(255,255,255,0.05)",
                  borderColor: isLiked
                    ? "var(--accent)"
                    : "rgba(255,255,255,0.1)",
                  color: isLiked ? "var(--accent)" : "white",
                }}
              >
                <Heart
                  className="w-4 h-4"
                  fill={isLiked ? "currentColor" : "none"}
                />
                {isLiked ? "Liked" : "Like Playlist"}
              </motion.button>

              {/* Add/Import to Library */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={importPlaylist}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-black hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
                style={{ boxShadow: "0 4px 12px rgba(var(--accent-rgb),0.2)" }}
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {importing ? "Importing..." : "Add to Library"}
              </motion.button>
            </>
          )}
        </div>

        {!isExternalPlaylist && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete Playlist
          </motion.button>
        )}
      </motion.div>

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
            <p className="font-semibold text-white/40 mb-1">
              Playlist is empty
            </p>
            <p className="text-sm text-white/25">
              {isExternalPlaylist
                ? "No tracks found in this playlist."
                : "Search for tracks and add them using the context menu"}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {songList.map((song: Song, i: number) => (
            <motion.div
              key={song.videoId}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="flex items-center justify-between group"
            >
              <div className="flex-1">
                <CompactTrackRow
                  song={song}
                  index={i}
                  onClick={() => handlePlaySong(song, i)}
                />
              </div>
              {!isExternalPlaylist && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (id) await removeSongFromPlaylist(id, song.videoId);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-white/40 hover:text-red-400 rounded-lg hover:bg-red-500/10 mr-4 shrink-0"
                  title="Remove from playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
