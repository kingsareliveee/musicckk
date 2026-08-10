/**
 * smartRecommendations.ts
 * Context-driven recommendation engine.
 * NO title keyword matching for recommendations.
 */

import { searchSongs, getPopularSongs } from "../lib/jiosaavn";
import type { Song } from "../store/usePlayerStore";

const ARTIST_CLUSTERS: Record<string, string[]> = {
  "Karan Aujla": ["AP Dhillon", "Shubh", "Diljit Dosanjh", "Sidhu Moosewala", "Amrit Maan", "Gurinder Gill"],
  "AP Dhillon": ["Karan Aujla", "Gurinder Gill", "Shubh", "Diljit Dosanjh"],
  "Shubh": ["Karan Aujla", "AP Dhillon", "Diljit Dosanjh", "Sidhu Moosewala"],
  "Diljit Dosanjh": ["Karan Aujla", "AP Dhillon", "Sidhu Moosewala", "Amrit Maan"],
  "Sidhu Moosewala": ["Karan Aujla", "Diljit Dosanjh", "Amrit Maan", "Shubh"],
  "Amrit Maan": ["Sidhu Moosewala", "Karan Aujla", "Diljit Dosanjh"],
  "Gurinder Gill": ["AP Dhillon", "Karan Aujla", "Amrit Maan"],
  "Talha Anjum": ["Hasan Raheem", "Faris Shafi", "Ali Sethi"],
  "Hasan Raheem": ["Talha Anjum", "Faris Shafi", "Ali Sethi"],
  "Faris Shafi": ["Talha Anjum", "Hasan Raheem"],
  "Arijit Singh": ["Jubin Nautiyal", "Darshan Raval", "Atif Aslam", "KK"],
  "Jubin Nautiyal": ["Arijit Singh", "Darshan Raval", "Armaan Malik"],
  "Darshan Raval": ["Jubin Nautiyal", "Arijit Singh", "Armaan Malik"],
  "Atif Aslam": ["Arijit Singh", "Jubin Nautiyal", "Rahat Fateh Ali Khan"],
  "Armaan Malik": ["Jubin Nautiyal", "Darshan Raval", "Arijit Singh"],
  "The Weeknd": ["Drake", "Post Malone", "Future", "Travis Scott"],
  "Drake": ["The Weeknd", "Travis Scott", "Future", "21 Savage"],
  "Post Malone": ["The Weeknd", "Drake", "Future"],
  "Travis Scott": ["Drake", "The Weeknd", "Young Thug"],
};

const LANGUAGE_POOLS: Record<string, string[]> = {
  punjabi: ["Karan Aujla", "AP Dhillon", "Diljit Dosanjh", "Sidhu Moosewala", "Shubh", "Amrit Maan", "Gurinder Gill"],
  hindi: ["Arijit Singh", "Jubin Nautiyal", "Atif Aslam", "Armaan Malik", "Darshan Raval", "Shreya Ghoshal"],
  urdu: ["Atif Aslam", "Rahat Fateh Ali Khan", "Talha Anjum", "Hasan Raheem", "Ali Sethi"],
  english: ["The Weeknd", "Drake", "Post Malone", "Travis Scott", "Billie Eilish", "Harry Styles"],
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeArtist(artist: string): string {
  return artist.split(/,|feat\.|ft\.|&/i)[0].trim();
}

function getRelatedArtistNames(artistName: string): string[] {
  const normalized = normalizeArtist(artistName);
  if (ARTIST_CLUSTERS[normalized]) return ARTIST_CLUSTERS[normalized];
  const key = Object.keys(ARTIST_CLUSTERS).find(
    (k) =>
      k.toLowerCase().includes(normalized.toLowerCase()) ||
      normalized.toLowerCase().includes(k.toLowerCase())
  );
  return key ? ARTIST_CLUSTERS[key] : [];
}

function detectLanguagePool(artistName: string): string[] {
  const name = normalizeArtist(artistName).toLowerCase();
  for (const artists of Object.values(LANGUAGE_POOLS)) {
    if (artists.some((a) => a.toLowerCase().includes(name) || name.includes(a.toLowerCase()))) {
      return artists;
    }
  }
  return [];
}

function getUserTopArtists(): string[] {
  const prefStr =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("musick-pref-artists") || ""
      : "";
  const prefArtists = prefStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const topTracks = JSON.parse(localStorage.getItem("musick-top-tracks") || "[]");
    const trackArtists: string[] = topTracks
      .sort(
        (a: { play_count: number }, b: { play_count: number }) =>
          b.play_count - a.play_count
      )
      .slice(0, 5)
      .map((t: { artist: string }) => normalizeArtist(t.artist || ""))
      .filter(Boolean);
    return [...new Set([...prefArtists, ...trackArtists])];
  } catch {
    return prefArtists;
  }
}

async function fetchArtistSongs(artistName: string, limit = 10): Promise<Song[]> {
  try {
    return await searchSongs(artistName, limit);
  } catch {
    return [];
  }
}

function applyDiversityRules(
  candidates: Song[],
  avoidIds: Set<string>,
  maxPerArtist = 3,
  targetTotal = 20
): Song[] {
  const seen = new Set<string>(avoidIds);
  const artistCount: Record<string, number> = {};
  const result: Song[] = [];

  for (const song of candidates) {
    if (!song.videoId) continue;
    if (seen.has(song.videoId)) continue;

    const artist = normalizeArtist(song.artist || "");
    const count = artistCount[artist] || 0;
    if (count >= maxPerArtist) continue;

    seen.add(song.videoId);
    artistCount[artist] = count + 1;

    const cleanTitle = song.title
      .replace(/\s*\(official.*?\)\s*/gi, "")
      .replace(/\s*\[official.*?\]\s*/gi, "")
      .trim();

    result.push({ ...song, title: cleanTitle || song.title });
    if (result.length >= targetTotal) break;
  }
  return result;
}

export async function getSmartRecommendations(
  currentSong: Song | null,
  history: Song[] = [],
  excludeIds: Set<string> = new Set()
): Promise<Song[]> {
  try {
    const avoidIds = new Set<string>(excludeIds);
    if (currentSong?.videoId) avoidIds.add(currentSong.videoId);
    history.slice(0, 20).forEach((s) => s.videoId && avoidIds.add(s.videoId));

    const primaryArtist = currentSong?.artist
      ? normalizeArtist(currentSong.artist)
      : null;
    const userTopArtists = getUserTopArtists();
    const related = primaryArtist ? getRelatedArtistNames(primaryArtist) : [];
    const languagePool = primaryArtist ? detectLanguagePool(primaryArtist) : [];

    const artistQueue: string[] = [];
    if (primaryArtist) artistQueue.push(primaryArtist);
    artistQueue.push(...shuffleArray(related).slice(0, 3));
    for (const a of userTopArtists) {
      if (!artistQueue.includes(a)) artistQueue.push(a);
      if (artistQueue.length >= 6) break;
    }
    const extraPool = shuffleArray(
      languagePool.filter((a) => !artistQueue.includes(a))
    );
    artistQueue.push(...extraPool.slice(0, 2));
    if (artistQueue.length === 0) {
      artistQueue.push("Arijit Singh", "Karan Aujla", "The Weeknd", "AP Dhillon");
    }

    const fetchSlice = artistQueue.slice(0, 4);
    const batches = await Promise.all(
      fetchSlice.map((a) => fetchArtistSongs(a, 12))
    );
    const popular = await getPopularSongs();

    const merged: Song[] = [
      ...(batches[0] || []),
      ...(batches[1] || []),
      ...(batches[2] || []),
      ...(batches[3] || []),
      ...popular,
    ];

    return applyDiversityRules(shuffleArray(merged), avoidIds, 3, 20);
  } catch (err) {
    console.error("[smartRecommendations] Failed:", err);
    return [];
  }
}

export async function getRelatedSongs(
  song: Song,
  limit = 12
): Promise<Song[]> {
  try {
    const primaryArtist = normalizeArtist(song.artist || "");
    const related = getRelatedArtistNames(primaryArtist);
    const languagePool = detectLanguagePool(primaryArtist);

    const artistList = [
      primaryArtist,
      ...shuffleArray(related).slice(0, 2),
      ...shuffleArray(
        languagePool.filter(
          (a) => a !== primaryArtist && !related.includes(a)
        )
      ).slice(0, 1),
    ].filter(Boolean);

    const batches = await Promise.all(
      artistList.slice(0, 3).map((a) => fetchArtistSongs(a, 10))
    );
    const merged = shuffleArray([...batches.flat()]);
    const avoidIds = new Set<string>([song.videoId]);

    return applyDiversityRules(merged, avoidIds, 3, limit);
  } catch (err) {
    console.error("[getRelatedSongs] Failed:", err);
    return [];
  }
}
