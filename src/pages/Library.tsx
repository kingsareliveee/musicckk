import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePlaylists } from "../hooks/usePlaylists";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { useAuth } from "../hooks/useAuth";
import { GlassCard } from "../components/GlassCard";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { Heart, Play, Music, Disc, Mic2, TrendingUp, ListMusic, LogIn, ArrowLeft, Clock, Trash2, RotateCcw } from "lucide-react";
import { CompactTrackRow } from "../components/CompactTrackRow";
import toast from "react-hot-toast";
import {
  fetchRecentHistory,
  fetchMostPlayed,
  deleteHistoryEntry,
  clearAllHistory,
  guestFetchAll,
  guestDelete,
  guestClear,
  type HistoryEntry,
} from "../lib/listeningHistory";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export const Library: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playlists } = usePlaylists();
  const { likedSongs } = useLikedSongs();
  const { setCurrentSong, setQueue } = usePlayerStore();

  const [likedYtPlaylists, setLikedYtPlaylists] = useState<any[]>([]);
  const [artistsList, setArtistsList] = useState<any[]>([]);
  const [albumsList, setAlbumsList] = useState<any[]>([]);
  const [topTracksList, setTopTracksList] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"collection" | "artists" | "albums" | "top_tracks" | "history">("collection");

  // Listening history state
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([]);
  const [mostPlayed, setMostPlayed] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Fetch local storage liked playlists
  useEffect(() => {
    if (!user) return;
    const liked = JSON.parse(localStorage.getItem("musick-liked-yt-playlists") || "[]");
    setLikedYtPlaylists(liked);
  }, [user]);

  // Fetch library data from localStorage (artists, albums, top_tracks have no DB table)
  useEffect(() => {
    if (!user) return;

    const loadLocalLibraryData = () => {
      try {
        // Helper: generate avatar for artists without an image
        const getArtistImage = (name: string) => {
          const ARTIST_SEEDS: Record<string, string> = {
            "arijit singh": "6c1a4d",
            "karan aujla": "1a4d6c",
            "ap dhillon": "1a6c4d",
            "shubh": "4d1a6c",
            "sidhu moosewala": "6c4d1a",
            "diljit dosanjh": "1a6c6c",
            "talha anjum": "6c1a1a",
            "the weeknd": "2d1a4d",
            "drake": "1a2d4d",
            "travis scott": "4d2d1a",
          };
          const bg = ARTIST_SEEDS[name.toLowerCase()] || "1a1a2e";
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&background=${bg}&color=fff&bold=true&format=svg`;
        };

        // 1. Artists — from localStorage (musick-followed-artists + musick-pref-artists)
        const localFollowed = JSON.parse(localStorage.getItem("musick-followed-artists") || "[]");
        const prefArtistsStr = localStorage.getItem("musick-pref-artists") || "";
        const prefArtistsList = prefArtistsStr ? prefArtistsStr.split(",") : [];

        const mergedArtistsMap = new Map<string, any>();
        prefArtistsList.forEach(name => {
          const clean = name.trim();
          if (clean) {
            mergedArtistsMap.set(clean.toLowerCase(), {
              id: clean,
              artist_name: clean,
              image_url: getArtistImage(clean),
            });
          }
        });
        localFollowed.forEach((a: any) => {
          mergedArtistsMap.set(a.artist_name.toLowerCase(), {
            id: a.id || a.artist_name,
            artist_name: a.artist_name,
            image_url: a.image_url || getArtistImage(a.artist_name),
          });
        });
        setArtistsList(Array.from(mergedArtistsMap.values()));

        // 2. Albums — from localStorage (musick-saved-albums)
        const localAlbums = JSON.parse(localStorage.getItem("musick-saved-albums") || "[]");
        const mergedAlbumsMap = new Map<string, any>();
        localAlbums.forEach((a: any) => {
          mergedAlbumsMap.set((a.album_name || a.id || "").toLowerCase(), a);
        });
        setAlbumsList(Array.from(mergedAlbumsMap.values()));

        // 3. Top Tracks — from localStorage (musick-top-tracks)
        const localTopTracks = JSON.parse(localStorage.getItem("musick-top-tracks") || "[]");
        const sortedTopTracks = localTopTracks
          .map((t: any) => ({
            id: t.id || t.video_id,
            video_id: t.video_id,
            title: t.title,
            artist: t.artist,
            thumbnail: t.thumbnail,
            play_count: t.play_count || 1,
          }))
          .sort((a: any, b: any) => b.play_count - a.play_count);
        setTopTracksList(sortedTopTracks);
      } catch (err) {
        console.error("Failed to load library data:", err);
      }
    };

    loadLocalLibraryData();
  }, [user]);

  const likedList = Object.values(likedSongs);
  const likedCount = likedList.length;
  const playlistCount = playlists.length + likedYtPlaylists.length;

  const libraryItems = [
    { key: "liked", icon: Music, label: "Liked Songs", count: `${likedCount} songs`, color: "#E89CB0" },
    { key: "top_tracks", icon: TrendingUp, label: "Top Tracks", count: `${topTracksList.length} tracks`, color: "#5FA8FF" },
    { key: "playlists", icon: ListMusic, label: "Playlists", count: `${playlistCount} playlists`, color: "#8BCFC6" },
    { key: "albums", icon: Disc, label: "Albums", count: `${albumsList.length} albums`, color: "#E4C16F" },
    { key: "artists", icon: Mic2, label: "Artists", count: `${artistsList.length} artists`, color: "#E89CB0" },
    { key: "history", icon: Clock, label: "History", count: `${recentHistory.length} plays`, color: "#a78bfa" },
  ];

  if (!user) {
    return (
      <div className="flex flex-col gap-8 pb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center gap-6 py-16"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}
          >
            <Music className="w-9 h-9" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2 font-outfit">Your Music Library</h1>
            <p className="text-sm text-white/40 max-w-xs">
              Sign in to access your playlists, liked songs, albums, and artists.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/login")}
            className="flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-bold text-black font-inter"
            style={{ background: "var(--accent)" }}
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Handle clicking items in the "Your Collection" grid
  const handleItemClick = (key: string) => {
    if (key === "liked") {
      navigate("/library/liked");
    } else if (key === "playlists") {
      if (playlistCount > 0) {
        const el = document.getElementById("playlists-section");
        el?.scrollIntoView({ behavior: "smooth" });
      } else {
        toast.error("You don't have any playlists yet. Create one in the sidebar!");
      }
    } else if (key === "artists") {
      setActiveView("artists");
    } else if (key === "albums") {
      setActiveView("albums");
    } else if (key === "top_tracks") {
      setActiveView("top_tracks");
    } else if (key === "history") {
      setActiveView("history");
      loadHistory();
    }
  };

  // Load listening history (Supabase or guest localStorage)
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      if (user) {
        const [recentRes, mostRes] = await Promise.all([
          fetchRecentHistory(user.id, 50),
          fetchMostPlayed(user.id, 20),
        ]);
        if (recentRes.error) throw new Error(recentRes.error);
        if (mostRes.error) throw new Error(mostRes.error);
        setRecentHistory(recentRes.data);
        setMostPlayed(mostRes.data);
      } else {
        const all = guestFetchAll();
        setRecentHistory([...all].sort((a, b) => new Date(b.listened_at).getTime() - new Date(a.listened_at).getTime()));
        setMostPlayed([...all].sort((a, b) => b.play_count - a.play_count).slice(0, 20));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setHistoryError(msg);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const handleDeleteHistoryEntry = async (entry: HistoryEntry) => {
    if (user) {
      const { error } = await deleteHistoryEntry(user.id, entry.song_id);
      if (error) { toast.error("Failed to delete entry"); return; }
    } else {
      guestDelete(entry.song_id);
    }
    setRecentHistory(prev => prev.filter(e => e.song_id !== entry.song_id));
    setMostPlayed(prev => prev.filter(e => e.song_id !== entry.song_id));
    toast.success("Removed from history");
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear your entire listening history?")) return;
    if (user) {
      const { error } = await clearAllHistory(user.id);
      if (error) { toast.error("Failed to clear history"); return; }
    } else {
      guestClear();
    }
    setRecentHistory([]);
    setMostPlayed([]);
    toast.success("Listening history cleared");
  };

  const handlePlayHistorySong = (entry: HistoryEntry) => {
    const song: Song = {
      videoId: entry.song_id,
      title: entry.title,
      artist: entry.artist,
      thumbnail: entry.thumbnail,
      duration: entry.duration ? `${Math.floor(entry.duration / 60)}:${String(entry.duration % 60).padStart(2, "0")}` : "0:00",
    };
    setCurrentSong(song);
  };

  function formatRelativeDate(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }


  const handlePlaySong = (song: Song, idx: number, list: Song[]) => {
    setCurrentSong(song);
    setQueue(list.slice(idx + 1));
  };

  return (
    <div className="flex flex-col gap-10 pb-6 text-left">
      <AnimatePresence mode="wait">
        {activeView === "collection" && (
          <motion.div
            key="collection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-10"
          >
            {/* ── Header ─────────────────────────────────────── */}
            <motion.h1
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-white tracking-tight md:hidden font-outfit"
            >
              Library
            </motion.h1>

            {/* ── Liked Songs Hero ───────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-3xl p-7 md:p-8 overflow-hidden cursor-pointer group"
              style={{
                background: "linear-gradient(135deg, rgba(232,156,176,0.18) 0%, rgba(95,168,255,0.10) 50%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onClick={() => navigate("/library/liked")}
            >
              {/* Background blob */}
              <div
                className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(232,156,176,0.20) 0%, transparent 70%)",
                  filter: "blur(40px)",
                }}
              />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(232,156,176,0.15)" }}
                  >
                    <Heart className="w-7 h-7" style={{ color: "#E89CB0" }} fill="currentColor" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-xl md:text-2xl font-bold text-white font-outfit">Liked Songs</h2>
                    <p className="text-sm text-white/40">{likedCount} songs</p>
                  </div>
                </div>

                {likedCount > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "var(--accent)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const first = likedList[0];
                      if (first) {
                        setCurrentSong(first);
                        setQueue(likedList.slice(1));
                      }
                    }}
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* ── Playlists ──────────────────────────────────── */}
            {(playlists.length > 0 || likedYtPlaylists.length > 0) && (
              <section id="playlists-section">
                <div className="flex items-center gap-2 mb-5">
                  <ListMusic className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <h2 className="text-lg font-bold text-white font-outfit">Your Playlists</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                  {/* Custom Database Playlists */}
                  {playlists.map((playlist, i) => (
                    <motion.div
                      key={playlist.id}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                    >
                      <GlassCard
                        title={playlist.name}
                        subtitle={`${playlist.songs?.length || 0} songs`}
                        onClick={() => navigate(`/playlist/${playlist.id}`)}
                        imageUrl={
                          playlist.songs && playlist.songs.length > 0
                            ? playlist.songs[0].thumbnail
                            : "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"
                        }
                      />
                    </motion.div>
                  ))}

                  {/* Liked YouTube Playlists */}
                  {likedYtPlaylists.map((playlist, i) => (
                    <motion.div
                      key={playlist.id}
                      custom={playlists.length + i}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                    >
                      <GlassCard
                        title={playlist.title}
                        subtitle={`${playlist.videoCount} • YouTube`}
                        onClick={() => navigate(`/playlist/${playlist.id}`)}
                        imageUrl={
                          playlist.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"
                        }
                      />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Library grid ───────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                <h2 className="text-lg font-bold text-white font-outfit">Your Collection</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {libraryItems.map((item, i) => (
                  <motion.div
                    key={item.label}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    onClick={() => handleItemClick(item.key)}
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer group transition-all"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.02)")
                    }
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}15` }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-white/80 group-hover:text-white transition-colors truncate text-sm">
                        {item.label}
                      </span>
                      <span className="text-xs text-white/30">{item.count}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* ── Sub-view: Artists ──────────────────────────── */}
        {activeView === "artists" && (
          <motion.div
            key="artists"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            <button
              onClick={() => setActiveView("collection")}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors w-fit font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Collection
            </button>

            <div className="flex items-center gap-2.5">
              <Mic2 className="w-5 h-5 text-accent" />
              <h2 className="text-2xl font-bold text-white font-outfit">Followed Artists</h2>
            </div>

            {artistsList.length === 0 ? (
              <div
                className="rounded-3xl p-16 text-center flex flex-col items-center gap-5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="w-16 h-16 rounded-full bg-[#E89CB0]/10 flex items-center justify-center text-[#E89CB0]">
                  <Mic2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-outfit">No followed artists yet</h3>
                  <p className="text-sm text-white/35 mt-1 max-w-xs">
                    Artists you select in the taste picker onboarding will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
                {artistsList.map((artist, idx) => (
                  <motion.div
                    key={artist.id}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center text-center cursor-pointer group gap-3"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(artist.artist_name)}`)}
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden relative shadow-md border border-white/5">
                      <img
                        src={artist.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.artist_name)}&size=256&background=1a1a2e&color=fff&bold=true`}
                        alt={artist.artist_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          const t = e.currentTarget;
                          t.onerror = null;
                          t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.artist_name)}&size=256&background=1a1a2e&color=fff&bold=true`;
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white truncate max-w-full group-hover:text-accent transition-colors">
                      {artist.artist_name}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Sub-view: Albums ───────────────────────────── */}
        {activeView === "albums" && (
          <motion.div
            key="albums"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            <button
              onClick={() => setActiveView("collection")}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors w-fit font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Collection
            </button>

            <div className="flex items-center gap-2.5">
              <Disc className="w-5 h-5 text-accent" />
              <h2 className="text-2xl font-bold text-white font-outfit">Saved Albums</h2>
            </div>

            {albumsList.length === 0 ? (
              <div
                className="rounded-3xl p-16 text-center flex flex-col items-center gap-5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="w-16 h-16 rounded-full bg-[#E4C16F]/10 flex items-center justify-center text-[#E4C16F]">
                  <Disc className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-outfit">No albums saved yet</h3>
                  <p className="text-sm text-white/35 mt-1 max-w-xs">
                    Albums you save while browsing will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {albumsList.map((album, idx) => (
                  <motion.div
                    key={album.id}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                  >
                    <GlassCard
                      title={album.album_name}
                      subtitle={album.artist_name}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(album.album_name)}`)}
                      imageUrl={album.cover_image || album.image_url || album.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Sub-view: Top Tracks ───────────────────────── */}
        {activeView === "top_tracks" && (
          <motion.div
            key="top_tracks"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            <button
              onClick={() => setActiveView("collection")}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors w-fit font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Collection
            </button>

            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h2 className="text-2xl font-bold text-white font-outfit">Your Top Tracks</h2>
            </div>

            {topTracksList.length === 0 ? (
              <div
                className="rounded-3xl p-16 text-center flex flex-col items-center gap-5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="w-16 h-16 rounded-full bg-[#5FA8FF]/10 flex items-center justify-center text-[#5FA8FF]">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-outfit">No top tracks logged</h3>
                  <p className="text-sm text-white/35 mt-1 max-w-xs">
                    Your most frequently played tracks will be calculated and listed here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {topTracksList.map((track, i) => {
                  const song: Song = {
                    videoId: track.video_id,
                    title: track.title,
                    artist: track.artist,
                    thumbnail: track.thumbnail,
                    duration: "3:00", // Default display
                  };
                  return (
                    <motion.div
                      key={track.id}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <CompactTrackRow
                          song={song}
                          index={i}
                          onClick={() => {
                            const playlistSongs = topTracksList.map((t) => ({
                              videoId: t.video_id,
                              title: t.title,
                              artist: t.artist,
                              thumbnail: t.thumbnail,
                              duration: "3:00",
                            }));
                            handlePlaySong(song, i, playlistSongs);
                          }}
                        />
                      </div>
                      <span className="text-xs text-white/30 font-medium tabular-nums mr-5">
                        {track.play_count} plays
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── HISTORY VIEW ───────────────────────────────── */}
        {activeView === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-8"
          >
            {/* Back + header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView("collection")}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white/60" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white font-outfit">Listening History</h1>
                  <p className="text-xs text-white/30 mt-0.5">
                    {user ? "Synced to your account" : "Saved locally (sign in to sync)"}
                  </p>
                </div>
              </div>
              {(recentHistory.length > 0 || mostPlayed.length > 0) && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}
            </div>

            {/* Reload button */}
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="self-start flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {historyError && (
              <div className="rounded-2xl p-4 text-sm text-red-400" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
                {historyError}
              </div>
            )}

            {historyLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="skeleton w-10 h-10 rounded-lg flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="skeleton h-3 rounded-full w-1/2" />
                      <div className="skeleton h-2.5 rounded-full w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentHistory.length === 0 && mostPlayed.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}>
                  <Clock className="w-8 h-8" style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <p className="text-base font-semibold text-white/60">No listening history yet</p>
                  <p className="text-sm text-white/30 mt-1">Songs you listen to for 30+ seconds will appear here.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Recently Played */}
                {recentHistory.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Recently Played</h2>
                    <div className="flex flex-col gap-1">
                      {recentHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                        >
                          <img
                            src={entry.thumbnail}
                            alt={entry.title}
                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.title)}`; }}
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handlePlayHistorySong(entry)}
                          >
                            <p className="text-sm font-semibold text-white truncate">{entry.title}</p>
                            <p className="text-xs text-white/40 truncate">{entry.artist}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-white/20 tabular-nums hidden sm:block">
                              {formatRelativeDate(entry.listened_at)}
                            </span>
                            {entry.play_count > 1 && (
                              <span className="text-xs text-purple-400/70 font-medium">
                                ×{entry.play_count}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteHistoryEntry(entry)}
                              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-400/15 text-red-400/60 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Most Played */}
                {mostPlayed.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Most Played</h2>
                    <div className="flex flex-col gap-1">
                      {mostPlayed.slice(0, 20).map((entry, idx) => (
                        <div
                          key={`mp-${entry.id}`}
                          className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                        >
                          <span className="w-5 text-right text-xs text-white/20 tabular-nums flex-shrink-0">{idx + 1}</span>
                          <img
                            src={entry.thumbnail}
                            alt={entry.title}
                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.title)}`; }}
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handlePlayHistorySong(entry)}
                          >
                            <p className="text-sm font-semibold text-white truncate">{entry.title}</p>
                            <p className="text-xs text-white/40 truncate">{entry.artist}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                              style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}
                            >
                              {entry.play_count} {entry.play_count === 1 ? "play" : "plays"}
                            </span>
                            <button
                              onClick={() => handleDeleteHistoryEntry(entry)}
                              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-400/15 text-red-400/60 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
