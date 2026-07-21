import { searchSongs, getPopularSongs } from "../lib/jiosaavn";
import type { Song } from "../store/usePlayerStore";

/**
 * Fisher-Yates shuffle array helper
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate smart recommendation queue based on current song,
 * user favorite artists/genres/languages, and listening history.
 * Prevents duplicate tracks and tracks recently played.
 */
export async function getSmartRecommendations(
  currentSong: Song | null,
  history: Song[] = [],
  excludeVideoIds: Set<string> = new Set()
): Promise<Song[]> {
  try {
    // Collect all videoIds to avoid (history + current + explicit exclusions)
    const avoidIds = new Set<string>(excludeVideoIds);
    if (currentSong?.videoId) avoidIds.add(currentSong.videoId);
    history.forEach((s) => s.videoId && avoidIds.add(s.videoId));

    // Get user favorite artists & preferences from local storage
    const prefArtistsStr = typeof localStorage !== 'undefined' ? localStorage.getItem("musick-pref-artists") || "" : "";
    const userPrefArtists = prefArtistsStr
      ? prefArtistsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // Form search seeds (artists / genres)
    const seeds: string[] = [];
    if (currentSong?.artist) {
      seeds.push(currentSong.artist);
    }
    if (userPrefArtists.length > 0) {
      seeds.push(...userPrefArtists);
    }

    // Fallback seeds if no preference found
    if (seeds.length === 0) {
      seeds.push("Arijit Singh", "Karan Aujla", "The Weeknd", "AP Dhillon");
    }

    // Pick up to 2 seeds to fetch recommendations from
    const shuffledSeeds = shuffleArray(seeds).slice(0, 2);
    
    // Fetch songs for each selected seed
    const fetchPromises = shuffledSeeds.map((seed) =>
      searchSongs(`${seed} hit songs`, 10)
    );
    const popularPromise = getPopularSongs();

    const [batch1 = [], batch2 = []] = await Promise.all(fetchPromises);
    const popularSongs = await popularPromise;

    const mergedCandidates = [...batch1, ...batch2, ...popularSongs];

    // Filter out duplicates and already played/history tracks
    const uniqueCandidates: Song[] = [];
    const seenInBatch = new Set<string>();

    for (const song of mergedCandidates) {
      if (!song.videoId) continue;
      if (avoidIds.has(song.videoId) || seenInBatch.has(song.videoId)) continue;

      seenInBatch.add(song.videoId);

      // Clean metadata noise from title
      const cleanedTitle = song.title
        .replace(/\s*\(official.*?\)\s*/gi, "")
        .replace(/\s*\[official.*?\]\s*/gi, "")
        .trim();

      uniqueCandidates.push({ ...song, title: cleanedTitle || song.title });
    }

    // Randomize candidates with Fisher-Yates shuffle
    const recommendedQueue = shuffleArray(uniqueCandidates).slice(0, 15);
    return recommendedQueue;
  } catch (err) {
    console.error("Failed to generate smart recommendations:", err);
    return [];
  }
}
