/**
 * lyricsService.ts
 * ================
 * Robust, high-confidence Lyrics & Translation engine for Musick.
 *
 * Principles:
 * 1. Never match lyrics by title alone. Match Song ID / Title + Artist + Duration.
 * 2. Auto-extract parenthesized inline English translations (e.g. "Line (English)")
 * 3. Contextual English translation for Gurmukhi, Devanagari, Urdu, and foreign lyrics.
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
 * Clean title for search.
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
 * Extract inline parenthesized translation e.g. "Punjabi Line (English Translation)"
 */
function processLineTranslation(rawText: string): { text: string; translation?: string } {
  if (!rawText) return { text: "" };

  // Match pattern: "Original line (English translation)" or "Original line [English translation]"
  const match = rawText.match(/^(.*?)\s*[\(\[\{]([^\(\)\[\]\{\}]+)[\)\]\}]\s*$/);
  if (match && match[1].trim() && match[2].trim()) {
    const orig = match[1].trim();
    const trans = match[2].trim();

    // Verify if inner bracket text looks like an English translation (Latin characters)
    if (/[a-zA-Z]/.test(trans)) {
      return { text: orig, translation: trans };
    }
  }

  return { text: rawText };
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
      const rawText = line.replace(timeRegex, "").replace(/\[.*?\]/g, "").trim();

      if (rawText) {
        const { text, translation } = processLineTranslation(rawText);
        result.push({ time, text, translation });
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
          const scored = results.map((item: any) => {
            const titleSim = calculateSimilarity(cleanTitle, item.trackName || "");
            const artistSim = calculateSimilarity(cleanArtist, item.artistName || "");
            let score = titleSim * 0.5 + artistSim * 0.5;

            if (expectedDurationSec && item.duration) {
              const diff = Math.abs(expectedDurationSec - item.duration);
              if (diff <= 5) score += 0.3;
              else if (diff > 15) score -= 0.4;
            }

            if (item.syncedLyrics) score += 0.1;

            return { item, score, titleSim, artistSim };
          });

          scored.sort((a, b) => b.score - a.score);
          const top = scored[0];

          if (top && top.score >= 0.45 && top.titleSim >= 0.25 && top.artistSim >= 0.25) {
            candidate = top.item;
          }
        }
      }
    }

    if (!candidate) {
      return { status: "unavailable", isSynced: false, syncedLyrics: [], plainLyrics: "", errorMessage: "Lyrics unavailable" };
    }

    if (candidate.instrumental) {
      return { status: "instrumental", isSynced: false, syncedLyrics: [], plainLyrics: "" };
    }

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
 * Detect non-English text (Devanagari, Gurmukhi, Urdu, Arabic, Korean, CJK, etc. or Indic Romanized)
 */
export function isEnglishText(text: string): boolean {
  if (!text) return true;
  // Non-ASCII character ranges for scripts like Gurmukhi (\u0A00-\u0A7F), Devanagari (\u0900-\u097F), Urdu/Arabic (\u0600-\u06FF)
  const hasNonLatinScript = /[\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F\u0B00-\u0B7F\u0C00-\u0C7F\u0D00-\u0D7F\u1100-\u11FF\u3000-\u9FFF]/;
  if (hasNonLatinScript.test(text)) {
    return false;
  }

  const nonEnglishIndicators = /\b(aur|hai|hoon|tum|meri|tere|dil|kya|nahin|sath|main|yaad|zindagi|pyaar|tenu|mera|rabba|apna|tujhe|kehte|lekin|rahen|chaho|sohniye|jaana|ishq|jatta|ve)\b/i;
  return !nonEnglishIndicators.test(text);
}

/**
 * Context-aware English Translation Engine.
 * Uses small safe batch sizes (4 lines per request) to prevent URL length HTTP errors on non-Latin scripts (Gurmukhi, Devanagari, etc.).
 */
export async function translateLyricsToEnglish(
  songId: string,
  lines: SyncedLyricLine[],
  plainText?: string
): Promise<{ syncedTranslated: SyncedLyricLine[]; plainTranslated: string }> {
  const contentToHash = plainText || lines.map((l) => `${l.text}|${l.translation || ""}`).join("\n");
  const cacheKey = `musick_trans_${songId}_${simpleHash(contentToHash)}`;

  // Check LocalStorage Cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.syncedTranslated || parsed.plainTranslated)) {
        return parsed;
      }
    }
  } catch (e) {}

  const textArray = lines.length > 0 ? lines.map((l) => l.text) : (plainText || "").split("\n");
  const fullSample = textArray.slice(0, 10).join(" ");

  // Check if lines ALREADY have extracted parenthesized translations
  const alreadyHasTranslations = lines.some((l) => l.translation && l.translation.length > 0);

  if (alreadyHasTranslations) {
    const syncedTranslated = lines.map((l) => ({
      ...l,
      translation: l.translation || l.text,
    }));
    const finalResult = { syncedTranslated, plainTranslated: plainText || "" };
    try { localStorage.setItem(cacheKey, JSON.stringify(finalResult)); } catch {}
    return finalResult;
  }

  if (isEnglishText(fullSample)) {
    const result = {
      syncedTranslated: lines.map((l) => ({ ...l, translation: l.translation || l.text })),
      plainTranslated: plainText || "",
    };
    try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch {}
    return result;
  }

  try {
    // Translate in small safe batches of 5 lines max to avoid HTTP GET URL overflow
    const chunkSize = 5;
    const translatedLines: string[] = [];

    for (let i = 0; i < textArray.length; i += chunkSize) {
      const chunk = textArray.slice(i, i + chunkSize);
      const joinedChunk = chunk.join("\n");

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(joinedChunk)}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          const chunkTranslation = data[0].map((segment: any) => segment[0]).join("");
          const splitLines = chunkTranslation.split("\n");

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
      translation: line.translation || translatedLines[idx] || line.text,
    }));

    const plainTranslated = translatedLines.join("\n");
    const finalResult = { syncedTranslated, plainTranslated };

    try { localStorage.setItem(cacheKey, JSON.stringify(finalResult)); } catch {}
    return finalResult;
  } catch (err) {
    console.error("[lyricsService] Translation error:", err);
    return {
      syncedTranslated: lines.map((l) => ({ ...l, translation: l.translation || l.text })),
      plainTranslated: plainText || "",
    };
  }
}
