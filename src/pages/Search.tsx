import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search as SearchIcon,
  X,
  Clock,
  TrendingUp,
  Trash2,
  ChevronRight,
  Music,
  Mic2,
  ListMusic,
  Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import { GlassCard } from "../components/GlassCard";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { searchAll } from "../lib/jiosaavn";
import { getRelatedSongs } from "../utils/smartRecommendations";

interface RecentSearchItem {
  id: string;
  type: "song" | "artist" | "playlist" | "term";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  songData?: Song;
}

const RECENT_ITEMS_KEY = "musick-recent-search-items";
const MAX_RECENT = 8;

const MOBILE_CHIPS = ["Punjabi", "Hindi", "Rap", "Chill", "Workout", "Focus"];

const GENRES = [
  // Indian
  "Punjabi Pop",
  "Bollywood Hits",
  "Desi Hip-Hop",
  "Sufi Music",
  "Urdu Rap",
  "Indie Hindi",
  "Tamil Beats",
  "Bhangra",
  // International
  "Lofi Hip Hop",
  "Synthwave",
  "Ambient",
  "Jazz Fusion",
  "Post-Rock",
  "Indie Folk",
  "Electronic",
  "R&B",
];

const TRENDING_SEARCHES = [
  "Karan Aujla",
  "Sidhu Moosewala",
  "Diljit Dosanjh",
  "Shubh",
  "Talha Anjum",
];

const TRENDING_ARTISTS = [
  {
    name: "Arijit Singh",
    thumbnail:
      "https://yt3.googleusercontent.com/DcEzZrPCQRSSs47rMbdJ3UJkQUCN3X8SKf8aCnvOgd2BmPihAz-0jBGJgEVh9_P8EiSBVNyixDs=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Karan Aujla",
    thumbnail:
      "https://yt3.googleusercontent.com/Da4zbrS4XLxzb3xVNT14aKr22aBg1blJCuCBppbYglO_uDmElYopgoDk7XV6UWNxthI96XOYrw=s88-c-k-c0x00ffffff-no-rj-mo",
  },
  {
    name: "Sidhu Moosewala",
    thumbnail:
      "https://yt3.ggpht.com/ytc/AIdro_kiQJ0Hhp0O-tdaY1dy81-gSNujjccUlWstnpFr686ZlMk=s88-c-k-c0x00ffffff-no-rj-mo",
  },
];

const TRENDING_PLAYLISTS: Array<{
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  videoCount: string;
}> = [];

function loadRecentItems(): RecentSearchItem[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_ITEMS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecentItem(item: RecentSearchItem): RecentSearchItem[] {
  try {
    const prev = loadRecentItems();
    const next = [item, ...prev.filter((i) => i.id !== item.id)].slice(
      0,
      MAX_RECENT,
    );
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

function deleteRecentItem(id: string): RecentSearchItem[] {
  try {
    const prev = loadRecentItems();
    const next = prev.filter((i) => i.id !== id);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

// Skeleton card
const SkeletonCard: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.3 }}
    className="rounded-[20px] overflow-hidden"
    style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)",
    }}
  >
    <div className="aspect-square skeleton" />
    <div className="p-4 flex flex-col gap-2">
      <div className="skeleton h-3 rounded-full w-3/4" />
      <div className="skeleton h-2.5 rounded-full w-1/2" />
    </div>
  </motion.div>
);

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
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

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [isFocused, setIsFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [recentItems, setRecentItems] =
    useState<RecentSearchItem[]>(loadRecentItems);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setCurrentSong, setQueue } = usePlayerStore();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle outside clicks to close popover panel
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const [results, setResults] = useState<{
    songs: Song[];
    playlists: Array<{
      id: string;
      title: string;
      author: string;
      thumbnail: string;
      videoCount: string;
    }>;
    artists: Array<{
      id: string;
      name: string;
      thumbnail: string;
      verified: boolean;
    }>;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Related songs state — populated after search resolves, based on top song artist
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const lastRelatedArtistRef = useRef<string | null>(null);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Search with debounce
  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError("");
    setRelatedSongs([]);
    lastRelatedArtistRef.current = null;
    try {
      const data = await searchAll(searchTerm);
      const songs: Song[] = data.songs || [];
      const playlists = data.playlists || [];
      const artists = data.artists || [];

      // ── Smart ranking: score-based exact/artist matching ─────────────
      // Priority: exact title match > title starts with > artist exact > fuzzy
      const termLower = searchTerm.trim().toLowerCase();
      const termWords = termLower.split(/\s+/).filter(Boolean);

      function scoreResult(s: Song): number {
        const titleL = s.title.toLowerCase();
        const artistL = s.artist.toLowerCase();
        let score = 0;
        // Exact full title match
        if (titleL === termLower) score += 100;
        // Title starts with query
        else if (titleL.startsWith(termLower)) score += 70;
        // Title contains full query
        else if (titleL.includes(termLower)) score += 50;
        // Artist exact match
        if (artistL === termLower) score += 60;
        else if (artistL.includes(termLower)) score += 30;
        // All query words appear in title
        if (termWords.every((w) => titleL.includes(w))) score += 40;
        // All query words appear in artist
        if (termWords.every((w) => artistL.includes(w))) score += 25;
        // At least one word matches title
        if (termWords.some((w) => titleL.includes(w))) score += 10;
        return score;
      }

      // Score and sort
      const scored = songs.map((s) => ({ song: s, score: scoreResult(s) }));
      scored.sort((a, b) => b.score - a.score);
      let rankedSongs = scored.map((x) => x.song);

      // Apply Fuse.js for fuzzy fallback on songs with score=0
      const highScored = scored.filter((x) => x.score > 0).map((x) => x.song);
      const lowScored = scored.filter((x) => x.score === 0).map((x) => x.song);

      if (lowScored.length > 0 && searchTerm.trim().length > 1) {
        const fuse = new Fuse(lowScored, {
          keys: [
            { name: "title", weight: 0.6 },
            { name: "artist", weight: 0.4 },
          ],
          threshold: 0.45,
          includeScore: true,
          ignoreLocation: true,
          minMatchCharLength: 2,
        });
        const fuseResults = fuse.search(searchTerm);
        rankedSongs = [
          ...highScored,
          ...fuseResults.map((r) => r.item),
          ...lowScored.filter((s) => !fuseResults.some((r) => r.item.videoId === s.videoId)),
        ];
      } else {
        rankedSongs = [...highScored, ...lowScored];
      }

      setResults({ songs: rankedSongs, playlists, artists });

      // Fetch related songs based on the TOP result's ARTIST (not the search term)
      if (rankedSongs.length > 0) {
        const topSong = rankedSongs[0];
        const artistKey = topSong.artist;
        if (artistKey !== lastRelatedArtistRef.current) {
          lastRelatedArtistRef.current = artistKey;
          setRelatedLoading(true);
          getRelatedSongs(topSong, 12)
            .then((related) => {
              // Exclude songs already in main results
              const resultIds = new Set(rankedSongs.map((s) => s.videoId));
              setRelatedSongs(related.filter((s) => !resultIds.has(s.videoId)));
            })
            .catch(console.error)
            .finally(() => setRelatedLoading(false));
        }
      }
    } catch {
      setError("Couldn't load results. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Stable reference for performSearch to avoid unnecessary re-runs
  const performSearchRef = useRef(performSearch);
  performSearchRef.current = performSearch;

  const stableSearch = useCallback((term: string) => performSearchRef.current(term), []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setRelatedSongs([]);
      lastRelatedArtistRef.current = null;
      return;
    }
    const timer = setTimeout(() => stableSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, stableSearch]);

  const handlePlaySong = (
    song: Song,
    index: number,
    overrideQueue?: Song[],
  ) => {
    setCurrentSong(song);
    const activeQueue = overrideQueue || results?.songs || [];
    setQueue(activeQueue.slice(index + 1));

    // Save to rich recent searches
    const updated = saveRecentItem({
      id: song.videoId,
      type: "song",
      title: song.title,
      subtitle: song.artist,
      imageUrl: song.thumbnail,
      songData: song,
    });
    setRecentItems(updated);
  };

  const handlePlaylistClick = (playlist: any) => {
    navigate(`/playlist/${playlist.id}`);
    const updated = saveRecentItem({
      id: playlist.id,
      type: "playlist",
      title: playlist.title || playlist.name,
      subtitle: playlist.author || "JioSaavn",
      imageUrl: playlist.thumbnail,
    });
    setRecentItems(updated);
  };

  const handleArtistClick = (artist: any) => {
    setQuery(artist.name);
    setIsFocused(false);
    performSearch(artist.name);
    const updated = saveRecentItem({
      id: artist.id || artist.name,
      type: "artist",
      title: artist.name,
      subtitle: "Artist",
      imageUrl: artist.thumbnail,
    });
    setRecentItems(updated);
  };

  const handleTermSearch = (term: string) => {
    setQuery(term);
    setIsFocused(false);
    performSearch(term);
    const updated = saveRecentItem({
      id: `term-${term.toLowerCase()}`,
      type: "term",
      title: term,
      subtitle: "Search query",
    });
    setRecentItems(updated);
  };

  const handleRecentItemClick = (item: RecentSearchItem) => {
    if (item.type === "song" && item.songData) {
      handlePlaySong(item.songData, 0, [item.songData]);
    } else if (item.type === "playlist") {
      navigate(`/playlist/${item.id}`);
    } else if (item.type === "artist" || item.type === "term") {
      setQuery(item.title);
      performSearch(item.title);
    }
    setIsFocused(false);
  };

  const handleDeleteRecent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteRecentItem(id);
    setRecentItems(updated);
  };

  const handleClearAllRecents = () => {
    localStorage.removeItem(RECENT_ITEMS_KEY);
    setRecentItems([]);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Partition results.playlists into Albums and Playlists
  const partitioned = React.useMemo(() => {
    if (!results?.playlists) return { playlists: [], albums: [] };
    const albums = results.playlists.filter(
      (p) =>
        p.title.toLowerCase().includes("album") ||
        p.title.toLowerCase().includes("ep") ||
        p.title.toLowerCase().includes("single") ||
        p.title.toLowerCase().includes("soundtrack"),
    );
    const playlists = results.playlists.filter((p) => !albums.includes(p));
    return { playlists, albums };
  }, [results?.playlists]);

  const hasQuery = query.trim().length > 0;
  const showPanel = isFocused && !hasQuery && !isMobile;

  return (
    <div className="flex flex-col gap-8 pb-12 relative min-h-[70vh]">
      {/* ── SEARCH INPUT CONTAINER (Top Navigation) ────────────────── */}
      <div
        ref={searchContainerRef}
        className={`${
          isMobile
            ? "sticky top-0 pt-2 pb-4 bg-[#000000] z-50 border-b border-white/5"
            : "relative w-full max-w-xl mx-auto z-[100]"
        }`}
      >
        <div className="relative">
          <SearchIcon
            className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "rgba(255,255,255,0.40)" }}
          />
          <input
            ref={inputRef}
            type="text"
            id="search-input"
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            autoComplete="off"
            className="w-full pl-12 pr-12 py-3 md:py-3.5 text-white text-sm rounded-full outline-none transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
              border: isFocused
                ? "1px solid rgba(255,255,255,0.2)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: isFocused ? "0 0 20px rgba(255,255,255,0.05)" : "none",
              caretColor: "var(--accent)",
            }}
          />

          {/* Right Input elements */}
          <div className="absolute right-4.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query ? (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors text-white/70"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/30 border border-white/5">
                Ctrl+K
              </kbd>
            )}
          </div>
        </div>

        {/* ── DESKTOP FLOATING DROPDOWN PANEL ─────────────────────── */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-[640px] bg-[#101010]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-6 z-[110] flex gap-6"
            >
              {/* Left Column: Recent Searches */}
              <div className="w-1/2 pr-4 border-r border-white/5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Recent Searches
                  </h3>
                  {recentItems.length > 0 && (
                    <button
                      onClick={handleClearAllRecents}
                      className="text-[10px] text-white/30 hover:text-white/70 transition-colors font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto max-h-[280px] pr-1.5 flex flex-col gap-1.5">
                  {recentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-white/30 gap-2">
                      <Clock className="w-8 h-8 opacity-40 stroke-[1.5]" />
                      <span className="text-xs font-medium">
                        No recent searches
                      </span>
                    </div>
                  ) : (
                    recentItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleRecentItemClick(item)}
                        className="group flex items-center justify-between p-2 rounded-xl bg-white/0 hover:bg-white/5 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className={`w-9 h-9 object-cover flex-shrink-0 ${
                                item.type === "artist"
                                  ? "rounded-full"
                                  : "rounded-md"
                              }`}
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://ui-avatars.com/api/?name=Artist";
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                              <SearchIcon className="w-4 h-4 text-white/40" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white truncate group-hover:text-accent transition-colors">
                              {item.title}
                            </span>
                            <span className="text-xs text-white/40 truncate">
                              {item.subtitle ||
                                (item.type === "song"
                                  ? "Song"
                                  : item.type === "artist"
                                    ? "Artist"
                                    : "Playlist")}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteRecent(item.id, e)}
                          className="p-1 rounded-full text-white/30 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Quick Access / Trending */}
              <div className="w-1/2 pl-4 flex flex-col gap-5 overflow-y-auto max-h-[340px]">
                {/* Trending searches */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Trending Searches
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {TRENDING_SEARCHES.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleTermSearch(term)}
                        className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors py-1.5 w-full text-left"
                      >
                        <TrendingUp className="w-3.5 h-3.5 opacity-55" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trending Artists */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5 mb-3">
                    <Mic2 className="w-3.5 h-3.5" />
                    Popular Artists
                  </h3>
                  <div className="flex gap-4">
                    {TRENDING_ARTISTS.map((art) => (
                      <div
                        key={art.name}
                        onClick={() => handleArtistClick(art)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                      >
                        <img
                          src={art.thumbnail}
                          alt={art.name}
                          className="w-11 h-11 rounded-full object-cover border border-white/5 group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://ui-avatars.com/api/?name=Artist";
                          }}
                        />
                        <span className="text-[10px] font-bold text-white/70 group-hover:text-white truncate max-w-[70px]">
                          {art.name.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trending Playlists */}
                {TRENDING_PLAYLISTS.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5 mb-3">
                      <ListMusic className="w-3.5 h-3.5" />
                      Trending Playlists
                    </h3>
                    <div className="flex flex-col gap-2">
                      {TRENDING_PLAYLISTS.map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => handlePlaylistClick(pl)}
                          className="group flex items-center gap-3 p-1.5 rounded-xl bg-white/0 hover:bg-white/5 transition-all cursor-pointer min-w-0"
                        >
                          <img
                            src={pl.thumbnail}
                            alt={pl.title}
                            className="w-9 h-9 object-cover rounded-md flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://ui-avatars.com/api/?name=Playlist";
                            }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate group-hover:text-accent transition-colors">
                              {pl.title}
                            </span>
                            <span className="text-[10px] text-white/40 truncate">
                              {pl.author} • {pl.videoCount}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MOBILE ONLY EMPTY STATE (Categories & recents) ────────── */}
      {isMobile && !hasQuery && (
        <div className="flex flex-col gap-6">
          {/* Mobile chips */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {MOBILE_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleTermSearch(chip)}
                className="px-4.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-white/5 text-white/70 border border-white/8 hover:bg-white/10 hover:text-white transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Recent searches */}
          {recentItems.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Recent Searches
                </h3>
                <button
                  onClick={handleClearAllRecents}
                  className="text-xs text-accent font-semibold"
                >
                  Clear All
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {recentItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleRecentItemClick(item)}
                    className="flex items-center justify-between py-2 rounded-xl bg-white/0 hover:bg-white/5 active:bg-white/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className={`w-9 h-9 object-cover flex-shrink-0 ${
                            item.type === "artist"
                              ? "rounded-full"
                              : "rounded-md"
                          }`}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://ui-avatars.com/api/?name=Artist";
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                          <SearchIcon className="w-4 h-4 text-white/40" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-xs text-white/40 truncate">
                          {item.subtitle ||
                            (item.type === "song"
                              ? "Song"
                              : item.type === "artist"
                                ? "Artist"
                                : "Playlist")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteRecent(item.id, e)}
                      className="p-2 rounded-full text-white/30 active:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DESKTOP EMPTY STATE (Quick Categories) ────────── */}
      {!isMobile && !hasQuery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-6 mt-6"
        >
          <h2 className="text-base font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Browse Genres
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {GENRES.map((genre: string) => (
              <motion.button
                key={genre}
                whileHover={{
                  scale: 1.04,
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleTermSearch(genre)}
                className="px-6 py-4 rounded-2xl text-sm font-semibold text-white/80 hover:text-white text-center transition-colors border border-white/6"
                style={{
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {genre}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── LOADING SKELETON STATE ────────────────────────── */}
      {hasQuery && loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} delay={i * 0.04} />
          ))}
        </div>
      )}

      {/* ── ERROR STATE ──────────────────────────────────── */}
      {hasQuery && !loading && error && (
        <div className="text-sm font-semibold px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* ── SEARCH RESULTS ───────────────────────────────── */}
      {hasQuery &&
        !loading &&
        !error &&
        results &&
        (results.songs?.length > 0 ||
          results.playlists?.length > 0 ||
          results.artists?.length > 0) && (
          <div className="flex flex-col gap-10">
            {/* Songs section */}
            {results.songs && results.songs.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Music className="w-4.5 h-4.5 text-accent" />
                    Songs
                    <span className="text-xs font-normal text-white/30 ml-1">
                      ({results.songs.length})
                    </span>
                  </h2>
                  {!isMobile && results.songs.length > 5 && (
                    <button
                      onClick={() => toggleSection("songs")}
                      className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                    >
                      {expandedSections["songs"] ? "Show Less" : "Show More"}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${expandedSections["songs"] ? "rotate-90" : ""}`}
                      />
                    </button>
                  )}
                </div>

                {isMobile ? (
                  /* Mobile vertical list stacking */
                  <div className="flex flex-col gap-1">
                    {results.songs.map((song, idx) => (
                      <div
                        key={song.videoId}
                        onClick={() => handlePlaySong(song, idx)}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white/0 hover:bg-white/5 active:bg-white/5 transition-all cursor-pointer"
                      >
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://ui-avatars.com/api/?name=Song";
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white truncate">
                            {song.title}
                          </span>
                          <span className="text-xs text-white/40 truncate">
                            {song.artist}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : expandedSections["songs"] ? (
                  /* Expanded Grid view */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {results.songs.map((song, idx) => (
                      <motion.div
                        key={song.videoId}
                        custom={idx}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                      >
                        <GlassCard
                          title={song.title}
                          subtitle={song.artist}
                          imageUrl={song.thumbnail}
                          song={song}
                          onClick={() => handlePlaySong(song, idx)}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* Collapsed Horizontal Carousel */
                  <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-3 scroll-smooth">
                    {results.songs.slice(0, 8).map((song, idx) => (
                      <div
                        key={song.videoId}
                        className="w-[180px] flex-shrink-0"
                      >
                        <GlassCard
                          title={song.title}
                          subtitle={song.artist}
                          imageUrl={song.thumbnail}
                          song={song}
                          onClick={() => handlePlaySong(song, idx)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── RELATED SONGS (artist/genre-based, NOT title-keyword) ── */}
            {(relatedLoading || relatedSongs.length > 0) && (
              <section className="mt-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-accent" />
                    Related Songs
                    {results?.songs?.[0]?.artist && (
                      <span className="text-xs font-normal text-white/30 ml-1">
                        based on {results.songs[0].artist.split(",")[0].trim()}
                      </span>
                    )}
                  </h2>
                </div>

                {relatedLoading ? (
                  <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-[180px] flex-shrink-0">
                        <div
                          className="rounded-[20px] overflow-hidden"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div className="aspect-square skeleton" />
                          <div className="p-4 flex flex-col gap-2">
                            <div className="skeleton h-3 rounded-full w-3/4" />
                            <div className="skeleton h-2.5 rounded-full w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isMobile ? (
                  <div className="flex flex-col gap-1">
                    {relatedSongs.map((song, idx) => (
                      <div
                        key={song.videoId}
                        onClick={() => handlePlaySong(song, idx, relatedSongs)}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white/0 hover:bg-white/5 active:bg-white/5 transition-all cursor-pointer"
                      >
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "https://ui-avatars.com/api/?name=Song";
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white truncate">
                            {song.title}
                          </span>
                          <span className="text-xs text-white/40 truncate">
                            {song.artist}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-3 scroll-smooth">
                    {relatedSongs.map((song, idx) => (
                      <div key={song.videoId} className="w-[180px] flex-shrink-0">
                        <GlassCard
                          title={song.title}
                          subtitle={song.artist}
                          imageUrl={song.thumbnail}
                          song={song}
                          onClick={() => handlePlaySong(song, idx, relatedSongs)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Artists section */}
            {results.artists && results.artists.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mic2 className="w-4.5 h-4.5 text-accent" />
                    Artists
                    <span className="text-xs font-normal text-white/30 ml-1">
                      ({results.artists.length})
                    </span>
                  </h2>
                  {!isMobile && results.artists.length > 5 && (
                    <button
                      onClick={() => toggleSection("artists")}
                      className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                    >
                      {expandedSections["artists"] ? "Show Less" : "Show More"}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${expandedSections["artists"] ? "rotate-90" : ""}`}
                      />
                    </button>
                  )}
                </div>

                {isMobile ? (
                  /* Mobile vertical list stacking */
                  <div className="flex flex-col gap-1">
                    {results.artists.map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => handleArtistClick(artist)}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white/0 hover:bg-white/5 active:bg-white/5 transition-all cursor-pointer"
                      >
                        <img
                          src={
                            artist.thumbnail ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&size=256&background=1a1a2e&color=fff&bold=true`
                          }
                          alt={artist.name}
                          className="w-10 h-10 object-cover rounded-full flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}`;
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white truncate flex items-center gap-1">
                            {artist.name}
                            {artist.verified && (
                              <span className="text-[9px] bg-blue-500 rounded-full px-1 py-0.5 text-white">
                                ✓
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-white/40 truncate">
                            Artist
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : expandedSections["artists"] ? (
                  /* Expanded Grid view */
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
                    {results.artists.map((artist, idx) => (
                      <motion.div
                        key={artist.id}
                        custom={idx}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                        whileHover={{ scale: 1.05 }}
                        className="flex flex-col items-center text-center cursor-pointer group gap-3"
                        onClick={() => handleArtistClick(artist)}
                      >
                        <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden relative shadow-md border border-white/5">
                          <img
                            src={
                              artist.thumbnail ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&size=256&background=1a1a2e&color=fff&bold=true`
                            }
                            alt={artist.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}`;
                            }}
                          />
                        </div>
                        <div className="flex flex-col items-center min-w-0">
                          <span className="text-sm font-bold text-white truncate max-w-full group-hover:text-accent transition-colors flex items-center gap-1">
                            {artist.name}
                            {artist.verified && (
                              <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white">
                                ✓
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] uppercase text-white/30 font-semibold tracking-wider mt-0.5">
                            Artist
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* Collapsed Horizontal Carousel */
                  <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-3 scroll-smooth">
                    {results.artists.slice(0, 8).map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => handleArtistClick(artist)}
                        className="flex-shrink-0 w-28 flex flex-col items-center text-center cursor-pointer group gap-2"
                      >
                        <div className="w-20 h-20 rounded-full overflow-hidden relative shadow-md border border-white/5">
                          <img
                            src={
                              artist.thumbnail ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&size=256&background=1a1a2e&color=fff&bold=true`
                            }
                            alt={artist.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}`;
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white truncate max-w-full group-hover:text-accent transition-colors">
                          {artist.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Albums section (partitioned EP/Albums) */}
            {partitioned.albums && partitioned.albums.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ListMusic className="w-4.5 h-4.5 text-accent" />
                    Albums & EPs
                    <span className="text-xs font-normal text-white/30 ml-1">
                      ({partitioned.albums.length})
                    </span>
                  </h2>
                  {!isMobile && partitioned.albums.length > 5 && (
                    <button
                      onClick={() => toggleSection("albums")}
                      className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                    >
                      {expandedSections["albums"] ? "Show Less" : "Show More"}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${expandedSections["albums"] ? "rotate-90" : ""}`}
                      />
                    </button>
                  )}
                </div>

                {isMobile ? (
                  /* Mobile vertical list stacking */
                  <div className="flex flex-col gap-1">
                    {partitioned.albums.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => handlePlaylistClick(album)}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white/0 hover:bg-white/5 active:bg-white/5 transition-all cursor-pointer"
                      >
                        <img
                          src={album.thumbnail}
                          alt={album.title}
                          className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://ui-avatars.com/api/?name=Album";
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white truncate">
                            {album.title}
                          </span>
                          <span className="text-xs text-white/40 truncate">
                            {album.author} • Album
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : expandedSections["albums"] ? (
                  /* Expanded Grid view */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {partitioned.albums.map((album, idx) => (
                      <motion.div
                        key={album.id}
                        custom={idx}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                      >
                        <GlassCard
                          title={album.title}
                          subtitle={album.author}
                          imageUrl={album.thumbnail}
                          onClick={() => handlePlaylistClick(album)}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* Collapsed Horizontal Carousel */
                  <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-3 scroll-smooth">
                    {partitioned.albums.slice(0, 8).map((album) => (
                      <div key={album.id} className="w-[180px] flex-shrink-0">
                        <GlassCard
                          title={album.title}
                          subtitle={album.author}
                          imageUrl={album.thumbnail}
                          onClick={() => handlePlaylistClick(album)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Playlists section */}
            {partitioned.playlists && partitioned.playlists.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ListMusic className="w-4.5 h-4.5 text-accent" />
                    Playlists
                    <span className="text-xs font-normal text-white/30 ml-1">
                      ({partitioned.playlists.length})
                    </span>
                  </h2>
                  {!isMobile && partitioned.playlists.length > 5 && (
                    <button
                      onClick={() => toggleSection("playlists")}
                      className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                    >
                      {expandedSections["playlists"]
                        ? "Show Less"
                        : "Show More"}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${expandedSections["playlists"] ? "rotate-90" : ""}`}
                      />
                    </button>
                  )}
                </div>

                {isMobile ? (
                  /* Mobile vertical list stacking */
                  <div className="flex flex-col gap-1">
                    {partitioned.playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        onClick={() => handlePlaylistClick(playlist)}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white/0 hover:bg-white/5 active:bg-white/5 transition-all cursor-pointer"
                      >
                        <img
                          src={playlist.thumbnail}
                          alt={playlist.title}
                          className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://ui-avatars.com/api/?name=Playlist";
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white truncate">
                            {playlist.title}
                          </span>
                          <span className="text-xs text-white/40 truncate">
                            By {playlist.author} • Playlist
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : expandedSections["playlists"] ? (
                  /* Expanded Grid view */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {partitioned.playlists.map((playlist, idx) => (
                      <motion.div
                        key={playlist.id}
                        custom={idx}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                      >
                        <GlassCard
                          title={playlist.title}
                          subtitle={playlist.author}
                          imageUrl={playlist.thumbnail}
                          onClick={() => handlePlaylistClick(playlist)}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* Collapsed Horizontal Carousel */
                  <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-3 scroll-smooth">
                    {partitioned.playlists.slice(0, 8).map((playlist) => (
                      <div
                        key={playlist.id}
                        className="w-[180px] flex-shrink-0"
                      >
                        <GlassCard
                          title={playlist.title}
                          subtitle={playlist.author}
                          imageUrl={playlist.thumbnail}
                          onClick={() => handlePlaylistClick(playlist)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

      {/* ── NO RESULTS STATE ─────────────────────────────── */}
      {hasQuery &&
        !loading &&
        !error &&
        results &&
        !results.songs?.length &&
        !results.playlists?.length &&
        !results.artists?.length && (
          <motion.div
            key="no-results"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/4">
              <SearchIcon className="w-6 h-6 text-white/20" />
            </div>
            <div>
              <p className="font-semibold text-white/50">
                No results for "{query}"
              </p>
              <p className="text-sm text-white/25 mt-1">
                Try a different search query
              </p>
            </div>
          </motion.div>
        )}
    </div>
  );
};
