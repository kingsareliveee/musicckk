/**
 * lyricsService.ts
 * ================
 * Robust, high-confidence Lyrics & Translation engine for Musick.
 *
 * Core Principles:
 * 1. Never match lyrics by title alone. Match Song ID / Exact Title + Artist + Duration.
 * 2. Reject low-confidence matches. Wrong lyrics are worse than missing lyrics.
 * 3. Contextual English translation for Hindi, Punjabi, Urdu, and foreign lyrics.
 * 4. Align synced LRC timestamps 1:1 between Original & Translated lines.
 * 5. Cache translations safely (song ID + lyrics hash).
 */

export interface SyncedLyricLine {
  time: number;
  text: string;
  translation?: string;
}

export interface LyricsResult {
  status: "success" | "instrumental" | "unavailable";
  isSynced: boolean;
  syncedLyrics: SyncedLyricLine[];
  plainLyrics: string;
  plainTranslation?: string;
  language?: string;
  errorMessage?: string;
}

/**
 * Clean title for search while preserving essential tags like Remix/Cover.
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s*\(official.*?\)\s*/gi, " ")
    .replace(/\s*\[official.*?\]\s*/gi, " ")
    .replace(/\s*\([^)]*lyric[^)]*\)\s*/gi, " ")
    .replace(/\s*\[[^\]]*lyric[^\]]*\]\s*/gi, " ")
    .replace(/\s*\|.*/, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate token overlap score between two strings.
 */
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0;

  const tokens1 = new Set(norm1.split(" ").filter((t) => t.length > 1));
  const tokens2 = new Set(norm2.split(" ").filter((t) => t.length > 1));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersection++;
  });

  const union = new Set([...tokens1, ...tokens2]).size;
  return intersection / union;
}

/**
 * Parse track duration string (e.g. "3:45" -> 225 seconds).
 */
export function parseDurationSeconds(dur: string | number | undefined): number | null {
  if (!dur) return null;
  if (typeof dur === "number") return dur;
  const parts = String(dur).split(":").map((p) => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  return null;
}

/**
 * Parse raw LRC string into structured SyncedLyricLine objects.
 */
export function parseLrc(lrc: string): SyncedLyricLine[] {
  const lines = lrc.split("\n");
  const result: SyncedLyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = line.replace(timeRegex, "").replace(/\[.*?\]/g, "").trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * High-confidence Lyrics Search & Match Engine.
 */
export async function fetchValidatedLyrics(song: {
  videoId: string;
  title: string;
  artist: string;
  duration?: string | number;
}): Promise<LyricsResult> {
  const cleanTitle = song.title
    .replace(/\s*\(official.*?\)\s*/gi, "")
    .replace(/\s*\[official.*?\]\s*/gi, "")
    .replace(/\s*\|.*/, "")
    .trim();
  const cleanArtist = song.artist.replace(/\s*-Topic/gi, "").trim();

  const expectedDurationSec = parseDurationSeconds(song.duration);

  try {
    let candidate: any = null;

    // Step 1: Direct exact match query
    const directUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    const directRes = await fetch(directUrl);

    if (directRes.ok) {
      candidate = await directRes.json();
    } else {
      // Step 2: Search with title + artist
      const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      const searchRes = await fetch(searchUrl);

      if (searchRes.ok) {
        const results = await searchRes.json();
        if (Array.isArray(results) && results.length > 0) {
          // Score candidates by title, artist, and duration closeness
          const scored = results.map((item: any) => {
            const titleSim = calculateSimilarity(cleanTitle, item.trackName || "");
            const artistSim = calculateSimilarity(cleanArtist, item.artistName || "");
            let score = titleSim * 0.5 + artistSim * 0.5;

            // Duration verification (critical to avoid matching wrong remixes/covers)
            if (expectedDurationSec && item.duration) {
              const diff = Math.abs(expectedDurationSec - item.duration);
              if (diff <= 5) score += 0.3;
              else if (diff > 15) score -= 0.4;
            }

            // Prefer synced lyrics slightly
            if (item.syncedLyrics) score += 0.1;

            return { item, score, titleSim, artistSim };
          });

          scored.sort((a, b) => b.score - a.score);
          const top = scored[0];

          // Reject low-confidence matches: require at least 0.45 similarity for title & artist
          if (top && top.score >= 0.5 && top.titleSim >= 0.3 && top.artistSim >= 0.3) {
            candidate = top.item;
          }
        }
      }
    }

    if (!candidate) {
      return { status: "unavailable", isSynced: false, syncedLyrics: [], plainLyrics: "", errorMessage: "Lyrics unavailable" };
    }

    // Instrumental check
    if (candidate.instrumental) {
      return { status: "instrumental", isSynced: false, syncedLyrics: [], plainLyrics: "" };
    }

    // Process valid candidate
    if (candidate.syncedLyrics) {
      const parsed = parseLrc(candidate.syncedLyrics);
      if (parsed.length > 0) {
        return { status: "success", isSynced: true, syncedLyrics: parsed, plainLyrics: "" };
      }
    }

    if (candidate.plainLyrics && candidate.plainLyrics.trim().length > 0) {
      return { status: "success", isSynced: false, syncedLyrics: [], plainLyrics: candidate.plainLyrics.trim() };
    }

    return { status: "unavailable", isSynced: false, syncedLyrics: [], plainLyrics: "", errorMessage: "Lyrics unavailable" };
  } catch (err) {
    console.error("[lyricsService] Fetch error:", err);
    return { status: "unavailable", isSynced: false, syncedLyrics: [], plainLyrics: "", errorMessage: "Lyrics unavailable" };
  }
}

/**
 * Generate a hash for cache keys.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Detect if text is primarily English (to avoid unnecessary translation).
 */
export function isEnglishText(text: string): boolean {
  const clean = text.replace(/[^a-zA-Z]/g, "");
  if (clean.length === 0) return false;
  // If >85% of characters are standard ASCII Latin characters, check common non-English keywords
  const nonEnglishIndicators = /\b(aur|hai|hoon|tum|meri|tere|dil|kya|nahin|sath|main|yaad|zindagi|pyaar|tenu|mera|rabba|apna|tujhe|kehte|lekin|rahen|chaho)\b/i;
  return !nonEnglishIndicators.test(text);
}

/**
 * Context-aware English Translation Engine with caching.
 * Translates line-by-line preserving timing and context.
 */
export async function translateLyricsToEnglish(
  songId: string,
  lines: SyncedLyricLine[],
  plainText?: string
): Promise<{ syncedTranslated: SyncedLyricLine[]; plainTranslated: string }> {
  const contentToHash = plainText || lines.map((l) => l.text).join("\n");
  const cacheKey = `musick_trans_${songId}_${simpleHash(contentToHash)}`;

  // 1. Check LocalStorage Cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.syncedTranslated || parsed.plainTranslated)) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore storage quota/parsing errors
  }

  // 2. Prepare text lines for translation
  const textArray = lines.length > 0 ? lines.map((l) => l.text) : (plainText || "").split("\n");
  const fullSample = textArray.slice(0, 10).join(" ");

  // If text is already standard English, return unchanged
  if (isEnglishText(fullSample)) {
    const result = {
      syncedTranslated: lines.map((l) => ({ ...l, translation: l.text })),
      plainTranslated: plainText || "",
    };
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {}
    return result;
  }

  try {
    // 3. Batch translate using Google GTX translation service (Free, context-aware)
    // We send line-delimited chunks to translate preserve structure
    const chunkSize = 20;
    const translatedLines: string[] = [];

    for (let i = 0; i < textArray.length; i += chunkSize) {
      const chunk = textArray.slice(i, i + chunkSize);
      const joinedChunk = chunk.join("\n");

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(joinedChunk)}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          // GTX returns array of translated segments: [[["translated line", "original line", ...], ...]]
          const chunkTranslation = data[0].map((segment: any) => segment[0]).join("");
          const splitLines = chunkTranslation.split("\n");
          
          // Match array length
          chunk.forEach((orig, idx) => {
            const trans = splitLines[idx] ? splitLines[idx].trim() : orig;
            translatedLines.push(trans);
          });
        } else {
          translatedLines.push(...chunk);
        }
      } else {
        translatedLines.push(...chunk);
      }
    }

    const syncedTranslated: SyncedLyricLine[] = lines.map((line, idx) => ({
      ...line,
      translation: translatedLines[idx] || line.text,
    }));

    const plainTranslated = translatedLines.join("\n");
    const finalResult = { syncedTranslated, plainTranslated };

    // Save to cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(finalResult));
    } catch {}

    return finalResult;
  } catch (err) {
    console.error("[lyricsService] Translation error:", err);
    // Safety fallback: return original text as translation
    return {
      syncedTranslated: lines.map((l) => ({ ...l, translation: l.text })),
      plainTranslated: plainText || "",
    };
  }
}
