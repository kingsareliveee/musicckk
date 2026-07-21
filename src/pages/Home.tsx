import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GlassCard } from "../components/GlassCard";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { CompactTrackRow } from "../components/CompactTrackRow";
import { useRecentlyPlayed } from "../hooks/useRecentlyPlayed";
import { useLikedSongs } from "../hooks/useLikedSongs";
import { usePlaylists } from "../hooks/usePlaylists";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { useAuth } from "../hooks/useAuth";
import { Play, Sparkles, LogIn, TrendingUp } from "lucide-react";
import {
  getPopularSongs,
  getRecommendations,
  searchSongs,
} from "../lib/jiosaavn";

const MOOD_QUERIES: Record<string, string> = {
  Focus: "lofi hip hop focus study",
  Energize: "synthwave cyberpunk high energy",
  Chill: "ambient chill background music",
  Sleep: "soft piano sleep music",
  Happy: "upbeat happy indie pop",
  Workout: "gym motivation electronic dance",
  "Late Night": "deep house vocal late night lounge",
};

/* ── Animated waveform visualizer (hero) ─────────────────── */
const HeroWaveform = React.memo(() => (
  <div className="flex items-end gap-[3px]" style={{ height: 56 }}>
    {Array.from({ length: 24 }).map((_, i) => (
      <div
        key={i}
        className="waveform-bar rounded-sm"
        style={{
          width: 3,
          height: `${30 + Math.abs(Math.sin(i * 0.7)) * 70}%`,
          opacity: 0.6 + Math.abs(Math.sin(i * 0.5)) * 0.4,
          animationDelay: `${(i % 12) * 0.08}s`,
        }}
      />
    ))}
  </div>
));
HeroWaveform.displayName = "HeroWaveform";

/* ── Section heading ─────────────────────────────────────── */
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({
  icon,
  title,
}) => (
  <div className="flex items-center gap-2 mb-5">
    <span style={{ color: "var(--accent)" }}>{icon}</span>
    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
      {title}
    </h2>
  </div>
);

/* ── Mood pills ──────────────────────────────────────────── */
const MOODS = [
  "Focus",
  "Energize",
  "Chill",
  "Sleep",
  "Happy",
  "Workout",
  "Late Night",
];

/* ── Card entrance animation ─────────────────────────────── */
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recentlyPlayed } = useRecentlyPlayed();
  const { likedSongs } = useLikedSongs();
  const { playlists } = usePlaylists();
  const { setCurrentSong, setQueue, togglePlay, currentSong } =
    usePlayerStore();
  const likedList = Object.values(likedSongs);

  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [moodSongs, setMoodSongs] = useState<Song[]>([]);
  const [moodLoading, setMoodLoading] = useState<boolean>(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<{
    songs: Song[];
    artists: Array<{
      id: string;
      name: string;
      thumbnail: string;
      verified: boolean;
    }>;
    playlists: Array<{
      id: string;
      title: string;
      author: string;
      thumbnail: string;
      videoCount: string;
    }>;
    albums: Array<{
      id: string;
      title: string;
      author: string;
      thumbnail: string;
      videoCount: string;
    }>;
    metadata?: { forYouArtist: string; trendingGenre: string };
  } | null>(null);
  const [recLoading, setRecLoading] = useState<boolean>(false);

  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [popularLoading, setPopularLoading] = useState<boolean>(false);

  // Fetch mood songs
  useEffect(() => {
    if (!activeMood) {
      setMoodSongs([]);
      return;
    }
    const fetchMoodSongs = async () => {
      setMoodLoading(true);
      try {
        const query = MOOD_QUERIES[activeMood];
        const songs = await searchSongs(query, 12);
        setMoodSongs(songs.slice(0, 10));
      } catch (err) {
        console.error("Failed to fetch mood songs:", err);
      } finally {
        setMoodLoading(false);
      }
    };
    fetchMoodSongs();
  }, [activeMood]);

  // Fetch recommendations based on user onboarding taste picker
  useEffect(() => {
    if (!user) {
      setRecommendations(null);
      return;
    }
    const fetchRecommendations = async () => {
      setRecLoading(true);
      try {
        const prefGenre =
          localStorage.getItem("musick-pref-genre") || "Bollywood";
        const prefLang = localStorage.getItem("musick-pref-lang") || "Hindi";
        const prefArtists = localStorage.getItem("musick-pref-artists") || "";

        const data = await getRecommendations({
          artistsCsv: prefArtists,
          genresCsv: prefGenre,
          languagesCsv: prefLang,
        });
        setRecommendations(data);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setRecLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  // Popular songs (for all users)
  useEffect(() => {
    const fetchPopular = async () => {
      setPopularLoading(true);
      try {
        const songs = await getPopularSongs();
        setPopularSongs(songs);
      } catch (err) {
        console.error("Failed to fetch popular songs:", err);
      } finally {
        setPopularLoading(false);
      }
    };

    fetchPopular();
  }, []);

  const handlePlaySong = (song: Song, queue?: Song[]) => {
    if (currentSong?.videoId === song.videoId) {
      togglePlay();
    } else {
      setCurrentSong(song);
      if (queue) setQueue(queue);
    }
  };

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-10 md:gap-12 pb-8">
      {/* ── Hero Section ───────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden p-7 md:p-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(var(--accent-rgb),0.10) 0%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Ambient blob */}
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(var(--accent-rgb),0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          {/* Text */}
          <div className="flex flex-col gap-4 text-left">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide w-fit"
              style={{
                background: "rgba(var(--accent-rgb),0.10)",
                color: "var(--accent)",
                border: "1px solid rgba(var(--accent-rgb),0.20)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              Premium Sound Experience
            </div>

            <div>
              <h1
                className="font-bold text-white leading-tight"
                style={{
                  fontSize: "clamp(26px, 4vw, 42px)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {greeting},
              </h1>
              <h1
                className="font-bold leading-tight"
                style={{
                  fontSize: "clamp(26px, 4vw, 42px)",
                  fontFamily: "'Outfit', sans-serif",
                  color: "var(--accent)",
                }}
              >
                What will you play?
              </h1>
            </div>

            <p className="text-sm text-white/40 max-w-xs">
              Discover, stream, and feel every note.
            </p>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const first =
                  recommendations?.songs?.[0] ||
                  recentlyPlayed[0] ||
                  likedList[0];
                if (first) {
                  const queueList = recommendations?.songs
                    ? recommendations.songs.slice(1)
                    : recentlyPlayed.slice(1);
                  handlePlaySong(first, queueList);
                }
              }}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold text-black transition-all w-fit font-inter"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 24px var(--accent-glow)",
              }}
            >
              <Play className="w-4 h-4 fill-current" />
              Play Recommendations
            </motion.button>
          </div>

          {/* Waveform visualizer */}
          <div
            className="flex-shrink-0 p-5 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              minWidth: 160,
            }}
          >
            <HeroWaveform />
          </div>
        </div>
      </motion.section>

      {/* ── Popular Songs ──────────────────────────────── */}
      <section>
        <SectionHeader
          icon={<TrendingUp className="w-4 h-4" />}
          title="Popular Songs"
        />
        {popularLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            <SkeletonLoader variant="card" count={10} />
          </div>
        ) : popularSongs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            {popularSongs.slice(0, 10).map((song, i) => (
              <motion.div
                key={song.videoId}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <GlassCard
                  title={song.title}
                  subtitle={song.artist}
                  imageUrl={song.thumbnail}
                  song={song}
                  onClick={() =>
                    handlePlaySong(song, popularSongs.slice(i + 1))
                  }
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/30 py-4">
            No popular songs found.
          </div>
        )}
      </section>

      {/* ── Mood Pills ─────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={<Sparkles className="w-4 h-4" />}
          title="Pick a Mood"
        />
        <div className="flex flex-wrap gap-2.5">
          {MOODS.map((mood) => {
            const isActive = activeMood === mood;
            return (
              <motion.button
                key={mood}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveMood(isActive ? null : mood)}
                className="px-5 py-2 rounded-full text-sm font-medium transition-all"
                style={
                  isActive
                    ? {
                        background: "var(--accent)",
                        color: "#000",
                        boxShadow: "0 0 16px var(--accent-glow)",
                      }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        color: "rgba(255,255,255,0.65)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                {mood}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Mood Recommendations ───────────────────────── */}
      {activeMood && (
        <section>
          <SectionHeader
            icon={<Sparkles className="w-4 h-4" />}
            title={`${activeMood} Soundtracks`}
          />
          {moodLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
              <SkeletonLoader variant="card" count={8} />
            </div>
          ) : moodSongs.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
              {moodSongs.map((song, i) => (
                <motion.div
                  key={song.videoId}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                >
                  <GlassCard
                    title={song.title}
                    subtitle={song.artist}
                    imageUrl={song.thumbnail}
                    song={song}
                    onClick={() => handlePlaySong(song, moodSongs.slice(i + 1))}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/30 py-4">
              No tracks found for this mood.
            </div>
          )}
        </section>
      )}

      {/* ── Not signed in ──────────────────────────────── */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl p-8 md:p-10 flex flex-col items-center text-center gap-5"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(var(--accent-rgb),0.10)" }}
          >
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <circle
                cx="24"
                cy="24"
                r="22"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              <circle cx="24" cy="24" r="4" fill="var(--accent)" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Unlock Your Music
            </h2>
            <p className="text-sm text-white/40 max-w-xs">
              Sign in to access your playlists, liked songs, and listening
              history.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-bold text-black"
            style={{ background: "var(--accent)" }}
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </motion.button>
        </motion.div>
      )}

      {/* ── Signed in content ──────────────────────────── */}
      {user && (
        <>
          {/* Continue Listening */}
          {recentlyPlayed.length > 0 && (
            <section>
              <SectionHeader
                icon={<TrendingUp className="w-4 h-4" />}
                title="Continue Listening"
              />
              <div className="flex flex-col gap-1">
                {recentlyPlayed.slice(0, 6).map((song, i) => (
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
                      onClick={() =>
                        handlePlaySong(song, recentlyPlayed.slice(i + 1))
                      }
                    />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Personalized Recommended Songs */}
          {recommendations?.songs && recommendations.songs.length > 0 && (
            <section>
              <SectionHeader
                icon={<Sparkles className="w-4 h-4" />}
                title={`Because You Listened To ${recommendations.metadata?.forYouArtist || "Your Favorites"}`}
              />
              {recLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                  <SkeletonLoader variant="card" count={8} />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                  {recommendations.songs.map((song, i) => (
                    <motion.div
                      key={song.videoId}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                    >
                      <GlassCard
                        title={song.title}
                        subtitle={song.artist}
                        imageUrl={song.thumbnail}
                        song={song}
                        onClick={() =>
                          handlePlaySong(
                            song,
                            recommendations.songs.slice(i + 1),
                          )
                        }
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Personalized Recommended Artists */}
          {recommendations?.artists && recommendations.artists.length > 0 && (
            <section>
              <SectionHeader
                icon={<Sparkles className="w-4 h-4" />}
                title="Similar Artists"
              />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 justify-items-center">
                {recommendations.artists.map((artist, i) => (
                  <motion.div
                    key={artist.id}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center text-center cursor-pointer group gap-3"
                    onClick={() =>
                      navigate(`/search?q=${encodeURIComponent(artist.name)}`)
                    }
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden relative shadow-md border border-white/5">
                      <img
                        src={
                          artist.thumbnail ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&size=256&background=1a1a2e&color=fff&bold=true`
                        }
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          const t = e.currentTarget;
                          t.onerror = null;
                          t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&size=256&background=1a1a2e&color=fff&bold=true`;
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-center min-w-0">
                      <span className="text-sm font-bold text-white truncate max-w-full group-hover:text-accent transition-colors">
                        {artist.name}
                      </span>
                      <span className="text-[10px] uppercase text-white/30 font-semibold tracking-wider mt-0.5">
                        Artist
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Personalized Recommended Playlists */}
          {recommendations?.playlists &&
            recommendations.playlists.length > 0 && (
              <section>
                <SectionHeader
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  }
                  title={`Trending In ${recommendations.metadata?.trendingGenre || "Your Genre"}`}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                  {recommendations.playlists.map((playlist, i) => (
                    <motion.div
                      key={playlist.id}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                      whileHover={{ y: -6 }}
                      className="rounded-[24px] p-4 cursor-pointer flex flex-col gap-3 group transition-all"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                      onClick={() => navigate(`/playlist/${playlist.id}`)}
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden relative shadow-lg">
                        <img
                          src={playlist.thumbnail}
                          alt={playlist.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://ui-avatars.com/api/?name=Playlist";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-black shadow-lg">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0 text-left">
                        <h4 className="text-sm font-bold text-white truncate leading-tight group-hover:text-accent transition-colors">
                          {playlist.title}
                        </h4>
                        <p className="text-xs text-white/40 truncate mt-1">
                          By {playlist.author} • {playlist.videoCount}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

          {/* Liked Songs */}
          {likedList.length > 0 && (
            <section>
              <SectionHeader
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="currentColor"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                }
                title="Liked Songs"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                {likedList.slice(0, 10).map((song, i) => (
                  <motion.div
                    key={song.videoId}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                  >
                    <GlassCard
                      title={song.title}
                      subtitle={song.artist}
                      imageUrl={song.thumbnail}
                      song={song}
                      onClick={() =>
                        handlePlaySong(song, likedList.slice(i + 1))
                      }
                    />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Playlists */}
          {playlists.length > 0 && (
            <section>
              <SectionHeader
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                }
                title="Your Playlists"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
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
              </div>
            </section>
          )}

          {/* Empty state */}
          {recentlyPlayed.length === 0 &&
            likedList.length === 0 &&
            playlists.length === 0 && (
              <div
                className="rounded-3xl p-10 text-center"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p className="text-white/30 text-sm">
                  Search for a song to start your journey →
                </p>
              </div>
            )}
        </>
      )}
    </div>
  );
};
