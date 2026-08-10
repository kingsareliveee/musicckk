/**
 * smartRecommendations.ts
 * =======================
 * SOUND-PROFILE based recommendation engine.
 *
 * Core principle: "What SOUNDS like this song?" NOT "What else does this artist have?"
 *
 * Weighted Scoring System:
 *   same language        +30
 *   shared sub-genre     +25 each
 *   directly similar     +20
 *   bidirectional sim.   +15
 *   shared mood          +10 each
 *   user taste overlap   +15
 *   same artist          +5  (LOW - prevents artist-playlist feel)
 *
 * Diversity Rules:
 *   - Round-robin interleave across artist buckets
 *   - Max 2 total songs from the same artist per batch
 *   - Same artist never placed consecutively back-to-back
 */

import { searchSongs, getPopularSongs } from "../lib/jiosaavn";
import type { Song } from "../store/usePlayerStore";

interface SongProfile {
  language: string;
  genres: string[];
  mood: string[];
  similarArtists: string[];
}

interface ArtistScore {
  artist: string;
  score: number;
  isSameArtist: boolean;
}

const ARTIST_PROFILES: Record<string, SongProfile> = {
  // Punjabi Hip-Hop / Trap / Pop
  "Karan Aujla": {
    language: "punjabi",
    genres: ["punjabi-hiphop", "desi-trap", "punjabi-rap"],
    mood: ["hype", "swag", "chill"],
    similarArtists: ["AP Dhillon", "Shubh", "Prem Dhillon", "Sidhu Moosewala", "Gurinder Gill", "Amrit Maan", "Diljit Dosanjh"],
  },
  "AP Dhillon": {
    language: "punjabi",
    genres: ["punjabi-pop", "desi-rnb", "punjabi-hiphop"],
    mood: ["romantic", "chill", "vibes"],
    similarArtists: ["Karan Aujla", "Shubh", "Gurinder Gill", "Diljit Dosanjh", "Prem Dhillon"],
  },
  "Shubh": {
    language: "punjabi",
    genres: ["punjabi-hiphop", "desi-trap", "punjabi-rap"],
    mood: ["swag", "hype", "chill"],
    similarArtists: ["Karan Aujla", "AP Dhillon", "Prem Dhillon", "Sidhu Moosewala"],
  },
  "Prem Dhillon": {
    language: "punjabi",
    genres: ["punjabi-hiphop", "desi-trap"],
    mood: ["swag", "hype"],
    similarArtists: ["Karan Aujla", "Shubh", "AP Dhillon", "Sidhu Moosewala"],
  },
  "Diljit Dosanjh": {
    language: "punjabi",
    genres: ["punjabi-pop", "bhangra-pop", "punjabi-hiphop"],
    mood: ["energetic", "fun", "romantic"],
    similarArtists: ["AP Dhillon", "Karan Aujla", "Amrit Maan", "Gurnazar", "Harrdy Sandhu"],
  },
  "Sidhu Moosewala": {
    language: "punjabi",
    genres: ["punjabi-rap", "desi-trap", "punjabi-hiphop"],
    mood: ["raw", "hype", "swag"],
    similarArtists: ["Karan Aujla", "Shubh", "Prem Dhillon", "Amrit Maan", "Mankirt Aulakh"],
  },
  "Amrit Maan": {
    language: "punjabi",
    genres: ["punjabi-hiphop", "punjabi-pop"],
    mood: ["energetic", "hype"],
    similarArtists: ["Sidhu Moosewala", "Karan Aujla", "Diljit Dosanjh", "Mankirt Aulakh"],
  },
  "Gurinder Gill": {
    language: "punjabi",
    genres: ["punjabi-pop", "desi-rnb"],
    mood: ["romantic", "chill"],
    similarArtists: ["AP Dhillon", "Karan Aujla", "Amrit Maan"],
  },
  "Harrdy Sandhu": {
    language: "punjabi",
    genres: ["punjabi-pop", "bollywood-pop"],
    mood: ["romantic", "fun"],
    similarArtists: ["Diljit Dosanjh", "Gurnazar", "Armaan Malik"],
  },
  // Desi Hip-Hop / Urdu Trap
  "Talha Anjum": {
    language: "urdu",
    genres: ["desi-hiphop", "urdu-rap"],
    mood: ["swag", "hype"],
    similarArtists: ["Hasan Raheem", "Faris Shafi", "Young Stunners", "Talhah Yunus"],
  },
  "Hasan Raheem": {
    language: "urdu",
    genres: ["desi-rnb", "urdu-pop"],
    mood: ["chill", "romantic", "vibes"],
    similarArtists: ["Talha Anjum", "Ali Sethi", "Omer Daud", "Faris Shafi"],
  },
  "Faris Shafi": {
    language: "urdu",
    genres: ["desi-hiphop", "urdu-rap"],
    mood: ["hype", "swag"],
    similarArtists: ["Talha Anjum", "Hasan Raheem", "Young Stunners"],
  },
  "Ali Sethi": {
    language: "urdu",
    genres: ["classical-fusion", "ghazal", "indie-pop"],
    mood: ["soulful", "romantic"],
    similarArtists: ["Hasan Raheem", "Shae Gill", "Arooj Aftab", "Arijit Singh"],
  },
  // Hindi Bollywood / Romantic
  "Arijit Singh": {
    language: "hindi",
    genres: ["bollywood", "romantic-pop", "indie-pop"],
    mood: ["sad", "romantic", "soulful"],
    similarArtists: ["Jubin Nautiyal", "Atif Aslam", "Darshan Raval", "KK", "Rahat Fateh Ali Khan"],
  },
  "Jubin Nautiyal": {
    language: "hindi",
    genres: ["bollywood", "romantic-pop"],
    mood: ["romantic", "sad"],
    similarArtists: ["Arijit Singh", "Darshan Raval", "Armaan Malik", "Atif Aslam"],
  },
  "Darshan Raval": {
    language: "hindi",
    genres: ["indie-pop", "romantic-pop"],
    mood: ["romantic", "chill"],
    similarArtists: ["Jubin Nautiyal", "Arijit Singh", "Armaan Malik"],
  },
  "Atif Aslam": {
    language: "hindi",
    genres: ["bollywood", "romantic-pop", "qawwali-pop"],
    mood: ["romantic", "soulful", "sad"],
    similarArtists: ["Arijit Singh", "Rahat Fateh Ali Khan", "Jubin Nautiyal"],
  },
  "Armaan Malik": {
    language: "hindi",
    genres: ["indie-pop", "bollywood", "romantic-pop"],
    mood: ["romantic", "upbeat"],
    similarArtists: ["Jubin Nautiyal", "Darshan Raval"],
  },
  // English Pop / Hip-Hop
  "The Weeknd": {
    language: "english",
    genres: ["rnb", "synth-pop", "dark-pop", "pop"],
    mood: ["dark", "cinematic", "late-night"],
    similarArtists: ["Drake", "Post Malone", "Future", "NAV", "Travis Scott"],
  },
  "Drake": {
    language: "english",
    genres: ["hiphop", "rnb", "trap"],
    mood: ["swag", "vibes", "introspective"],
    similarArtists: ["The Weeknd", "Travis Scott", "Future", "21 Savage", "Lil Baby"],
  },
  "Post Malone": {
    language: "english",
    genres: ["pop", "trap", "rnb"],
    mood: ["chill", "sad", "upbeat"],
    similarArtists: ["The Weeknd", "Drake", "Future", "Juice WRLD"],
  },
  "Travis Scott": {
    language: "english",
    genres: ["trap", "hiphop", "psychedelic-rap"],
    mood: ["hype", "dark", "cinematic"],
    similarArtists: ["Drake", "The Weeknd", "Young Thug", "Future", "Kid Cudi"],
  },
};

function normalizeArtist(artist: string): string {
  return artist.split(/,|feat\.|ft\.|&/i)[0].trim();
}

function getProfileForArtist(name: string): SongProfile | null {
  const norm = normalizeArtist(name);
  if (ARTIST_PROFILES[norm]) return ARTIST_PROFILES[norm];
  const key = Object.keys(ARTIST_PROFILES).find(
    (k) => k.toLowerCase() === norm.toLowerCase() ||
           k.toLowerCase().includes(norm.toLowerCase()) ||
           norm.toLowerCase().includes(k.toLowerCase())
  );
  return key ? ARTIST_PROFILES[key] : null;
}

function scoreArtistForSong(
  candidate: string,
  primaryArtist: string,
  primaryProfile: SongProfile | null,
  userTopArtists: string[]
): ArtistScore {
  let score = 0;
  const normalized = normalizeArtist(candidate);
  const isSameArtist = normalized.toLowerCase() === primaryArtist.toLowerCase();

  // Same artist -> LOW score (+5). We intentionally discourage artist playlists.
  if (isSameArtist) {
    return { artist: candidate, score: 5, isSameArtist: true };
  }

  if (!primaryProfile) {
    if (userTopArtists.some((a) => a.toLowerCase() === normalized.toLowerCase())) score += 15;
    return { artist: candidate, score, isSameArtist: false };
  }

  const cp = getProfileForArtist(normalized);

  // Directly listed similar artist
  if (primaryProfile.similarArtists.some((a) => a.toLowerCase() === normalized.toLowerCase())) score += 20;

  if (cp) {
    // Same language -> HIGH weight (+30)
    if (cp.language === primaryProfile.language) score += 30;
    // Shared sub-genres -> HIGH weight (+25 each)
    const sharedGenres = cp.genres.filter((g) => primaryProfile.genres.includes(g));
    score += sharedGenres.length * 25;
    // Shared mood -> MEDIUM-HIGH weight (+10 each)
    const sharedMood = cp.mood.filter((m) => primaryProfile.mood.includes(m));
    score += sharedMood.length * 10;
    // Bidirectional similarity check (+15)
    if (cp.similarArtists.some((a) => a.toLowerCase() === primaryArtist.toLowerCase())) score += 15;
  }

  // User taste overlap -> MEDIUM (+15)
  if (userTopArtists.some((a) => a.toLowerCase() === normalized.toLowerCase())) score += 15;

  return { artist: candidate, score, isSameArtist: false };
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getUserTopArtists(): string[] {
  if (typeof localStorage === "undefined") return [];
  const prefStr = localStorage.getItem("musick-pref-artists") || "";
  const prefArtists = prefStr.split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const topTracks = JSON.parse(localStorage.getItem("musick-top-tracks") || "[]");
    const trackArtists: string[] = topTracks
      .sort((a: { play_count: number }, b: { play_count: number }) => b.play_count - a.play_count)
      .slice(0, 8)
      .map((t: { artist: string }) => normalizeArtist(t.artist || ""))
      .filter(Boolean);
    return [...new Set([...prefArtists, ...trackArtists])];
  } catch {
    return prefArtists;
  }
}

async function fetchArtistSongs(artistName: string, limit = 8): Promise<Song[]> {
  try {
    return await searchSongs(artistName, limit);
  } catch {
    return [];
  }
}

/**
 * Interleaves songs from different artists in round-robin order.
 * Ensures:
 * 1. No 2 consecutive songs are from the same artist.
 * 2. Maximum `maxPerArtist` (default 2) songs per artist in the final set.
 */
function interleaveByArtist(songs: Song[], maxPerArtist = 2): Song[] {
  const buckets: Map<string, Song[]> = new Map();
  for (const song of songs) {
    const a = normalizeArtist(song.artist || "Unknown");
    if (!buckets.has(a)) buckets.set(a, []);
    buckets.get(a)!.push(song);
  }

  const result: Song[] = [];
  const artistKeys = shuffleArray([...buckets.keys()]);
  const usage: Record<string, number> = {};

  let rounds = 0;
  while (result.length < 25 && rounds < 60) {
    rounds++;
    let added = false;
    for (const artistKey of artistKeys) {
      const bucket = buckets.get(artistKey);
      if (!bucket || bucket.length === 0) continue;
      if ((usage[artistKey] || 0) >= maxPerArtist) continue;

      // Check last inserted artist to avoid consecutive duplicate artists
      if (result.length > 0) {
        const lastArtist = normalizeArtist(result[result.length - 1].artist || "");
        if (lastArtist.toLowerCase() === artistKey.toLowerCase()) continue;
      }

      const song = bucket.shift()!;
      result.push(song);
      usage[artistKey] = (usage[artistKey] || 0) + 1;
      added = true;
    }

    // Fallback pass if strictly enforcing non-consecutive blocked all remaining songs
    if (!added) {
      for (const artistKey of artistKeys) {
        const bucket = buckets.get(artistKey);
        if (!bucket || bucket.length === 0) continue;
        if ((usage[artistKey] || 0) >= maxPerArtist) continue;
        const song = bucket.shift()!;
        result.push(song);
        usage[artistKey] = (usage[artistKey] || 0) + 1;
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  return result;
}

function dedupAndClean(songs: Song[], avoidIds: Set<string>): Song[] {
  const seen = new Set<string>(avoidIds);
  return songs
    .filter((s) => {
      if (!s.videoId || seen.has(s.videoId)) return false;
      seen.add(s.videoId);
      return true;
    })
    .map((s) => ({
      ...s,
      title: s.title
        .replace(/\s*\(official.*?\)\s*/gi, "")
        .replace(/\s*\[official.*?\]\s*/gi, "")
        .trim() || s.title,
    }));
}

/**
 * Get smart recommendations for autoplay radio.
 * Answers: "What SOUNDS like this song?" - not "What else does this artist have?"
 */
export async function getSmartRecommendations(
  currentSong: Song | null,
  history: Song[] = [],
  excludeIds: Set<string> = new Set()
): Promise<Song[]> {
  try {
    const avoidIds = new Set<string>(excludeIds);
    if (currentSong?.videoId) avoidIds.add(currentSong.videoId);
    history.slice(0, 20).forEach((s) => s.videoId && avoidIds.add(s.videoId));

    const primaryArtist = currentSong?.artist ? normalizeArtist(currentSong.artist) : null;
    const primaryProfile = primaryArtist ? getProfileForArtist(primaryArtist) : null;
    const userTopArtists = getUserTopArtists();

    // Pool of candidates: all known profile artists + user top artists + similar artists
    const candidates = new Set<string>([
      ...Object.keys(ARTIST_PROFILES),
      ...userTopArtists,
      ...(primaryProfile?.similarArtists || []),
    ]);

    // Score candidates by genre, language, mood, and similarity (same artist gets low score)
    const scored: ArtistScore[] = [...candidates]
      .map((a) => scoreArtistForSong(a, primaryArtist || "", primaryProfile, userTopArtists))
      .filter((s) => s.score > 0)
      .sort((a, b) => {
        // Different artists with high similarity score come first!
        if (a.isSameArtist !== b.isSameArtist) return a.isSameArtist ? 1 : -1;
        return b.score - a.score;
      });

    // Top recommended artists (different artists first)
    const otherArtists = scored.filter((s) => !s.isSameArtist).slice(0, 7).map((s) => s.artist);
    const sameArtist = scored.find((s) => s.isSameArtist);

    const fetchList = [...otherArtists];
    // Insert 1 entry for the same artist at position 2 or 3 so it's not dominant
    if (sameArtist) {
      fetchList.splice(Math.min(2, fetchList.length), 0, sameArtist.artist);
    }
    if (fetchList.length === 0) {
      fetchList.push("Arijit Singh", "Karan Aujla", "The Weeknd", "AP Dhillon");
    }

    // Fetch songs for recommended artists in parallel
    const batches = await Promise.all(fetchList.slice(0, 6).map((a) => fetchArtistSongs(a, 8)));
    const popular = await getPopularSongs();

    // Round-robin interleave to ensure variety and no back-to-back same artist
    const interleaved = interleaveByArtist([...batches.flat(), ...popular], 2);

    return dedupAndClean(interleaved, avoidIds).slice(0, 20);
  } catch (err) {
    console.error("[smartRecommendations] Failed:", err);
    return [];
  }
}

/**
 * Get related songs for the Search page "Related Songs" section.
 * Strictly excludes the current song's artist to show similar sounding tracks by OTHER artists.
 */
export async function getRelatedSongs(song: Song, limit = 12): Promise<Song[]> {
  try {
    const primaryArtist = normalizeArtist(song.artist || "");
    const primaryProfile = getProfileForArtist(primaryArtist);
    const userTopArtists = getUserTopArtists();

    const candidates = new Set<string>([
      ...Object.keys(ARTIST_PROFILES),
      ...(primaryProfile?.similarArtists || []),
    ]);

    const topArtists = [...candidates]
      .map((a) => scoreArtistForSong(a, primaryArtist, primaryProfile, userTopArtists))
      .filter((s) => s.score > 0 && !s.isSameArtist) // Exclude same artist
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.artist);

    const batches = await Promise.all(topArtists.map((a) => fetchArtistSongs(a, 6)));
    const interleaved = interleaveByArtist(batches.flat(), 2);
    const avoidIds = new Set<string>([song.videoId]);

    return dedupAndClean(interleaved, avoidIds).slice(0, limit);
  } catch (err) {
    console.error("[getRelatedSongs] Failed:", err);
    return [];
  }
}
