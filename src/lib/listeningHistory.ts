/**
 * listeningHistory.ts
 * -------------------
 * Pure Supabase operations for the listening_history table.
 *
 * UPSERT strategy:
 *   Check for existing row -> if found, increment play_count + update timestamp & listened_seconds.
 *   Schema-Adaptive Retry: Automatically handles PGRST204 schema cache errors if remote DB table
 *   lacks optional columns (e.g. artist, album, play_count) prior to SQL migration execution.
 *
 * Guest users get localStorage-backed history (key: "musick-guest-history").
 */

import { supabase } from "./supabase";
import type { Song } from "../store/usePlayerStore";
import { logStructuredError } from "../utils/logger";

export interface HistoryEntry {
  id: string;
  song_id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number; // seconds
  play_count: number;
  listened_at: string; // ISO timestamp
}

function durationToSeconds(dur: string | undefined): number {
  if (!dur) return 0;
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

const GUEST_HISTORY_KEY = "musick-guest-history";
const GUEST_MAX = 100;

function guestLoad(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function guestSave(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(entries.slice(0, GUEST_MAX)));
  } catch {}
}

export function guestUpsert(song: Song, _listenedSeconds: number): HistoryEntry[] {
  const entries = guestLoad();
  const now = new Date().toISOString();
  const dur = durationToSeconds(song.duration);
  const songId = song.videoId || (song as any).id;
  if (!songId) return entries;

  const idx = entries.findIndex((e) => e.song_id === songId);

  if (idx !== -1) {
    entries[idx].play_count += 1;
    entries[idx].listened_at = now;
    entries[idx].duration = dur;
    entries[idx].thumbnail = song.thumbnail || entries[idx].thumbnail;
    const updated = [entries[idx], ...entries.filter((_, i) => i !== idx)];
    guestSave(updated);
    return updated;
  }

  const newEntry: HistoryEntry = {
    id: `guest-${songId}`,
    song_id: songId,
    title: song.title || "Unknown",
    artist: song.artist || "Unknown",
    thumbnail: song.thumbnail || "",
    duration: dur,
    play_count: 1,
    listened_at: now,
  };
  const updated = [newEntry, ...entries];
  guestSave(updated);
  return updated;
}

export function guestFetchAll(): HistoryEntry[] {
  return guestLoad();
}

export function guestDelete(songId: string): HistoryEntry[] {
  const updated = guestLoad().filter((e) => e.song_id !== songId);
  guestSave(updated);
  return updated;
}

export function guestClear(): void {
  localStorage.removeItem(GUEST_HISTORY_KEY);
}

/**
 * Clean payload of any column that PostgREST PGRST204 reports as missing.
 */
function sanitizePayloadForPGRST(payload: Record<string, any>, errorMessage: string): Record<string, any> {
  const copy = { ...payload };
  // Extract column name from PostgREST PGRST204 message e.g. "Could not find the 'artist' column of 'listening_history'"
  const match = errorMessage.match(/Could not find the '([^']+)' column/i);
  if (match && match[1] && match[1] in copy) {
    delete copy[match[1]];
  }
  return copy;
}

/**
 * Record or increment a play. Called when threshold (>=30s or >=50%) or onEnded is reached.
 */
export async function upsertListeningHistory(
  userId: string,
  song: Song,
  listenedSeconds: number,
  totalDurationSeconds: number
): Promise<{ error: string | null }> {
  const songId = song?.videoId || (song as any)?.id;
  if (!userId || !songId) return { error: "Missing userId or songId" };

  const now = new Date().toISOString();
  const completed = totalDurationSeconds > 0 && listenedSeconds >= totalDurationSeconds * 0.8;
  const provider = song.provider || "jiosaavn";

  try {
    // 1. Check existing row
    const { data: existing, error: fetchErr } = await supabase
      .from("listening_history")
      .select("id, play_count, listened_seconds")
      .eq("user_id", userId)
      .eq("song_id", songId)
      .maybeSingle();

    if (fetchErr && fetchErr.code !== "PGRST116" && fetchErr.code !== "PGRST204") {
      logStructuredError({
        operation: "listening_history.check_existing",
        status: fetchErr.code || 400,
        code: fetchErr.code,
        message: fetchErr.message,
        details: fetchErr.details,
        hint: fetchErr.hint,
      });
    }

    if (existing) {
      // 2. UPDATE existing row
      let updatePayload: Record<string, any> = {
        play_count: (existing.play_count || 1) + 1,
        listened_seconds: Math.max(existing.listened_seconds || 0, listenedSeconds),
        listened_at: now,
        completed: completed || false,
        thumbnail: song.thumbnail || null,
        image_url: song.thumbnail || null,
        artist: song.artist || "Unknown",
        title: song.title || "Unknown",
        provider,
      };

      let { error: updateErr } = await supabase
        .from("listening_history")
        .update(updatePayload)
        .eq("id", existing.id);

      if (updateErr && updateErr.code === "PGRST204") {
        // Retry update removing missing column
        updatePayload = sanitizePayloadForPGRST(updatePayload, updateErr.message);
        const retryRes = await supabase
          .from("listening_history")
          .update(updatePayload)
          .eq("id", existing.id);
        updateErr = retryRes.error;
      }

      if (updateErr) throw updateErr;
    } else {
      // 3. INSERT new row
      let insertPayload: Record<string, any> = {
        user_id: userId,
        song_id: songId,
        provider,
        title: song.title || "Unknown",
        artist: song.artist || "Unknown",
        album: song.album || null,
        image_url: song.thumbnail || null,
        thumbnail: song.thumbnail || null,
        duration: totalDurationSeconds || 0,
        listened_seconds: listenedSeconds || 0,
        play_count: 1,
        completed,
        listened_at: now,
      };

      let { error: insertErr } = await supabase
        .from("listening_history")
        .insert(insertPayload);

      // Handle PostgREST PGRST204 schema mismatch (e.g. 'artist' column missing remotely)
      if (insertErr && insertErr.code === "PGRST204") {
        logStructuredError({
          operation: "listening_history.insert_pgrst204",
          status: "PGRST204",
          code: "MISSING_COLUMN_REMOTELY",
          message: insertErr.message,
          hint: "Execute Supabase migration script to add missing columns to listening_history table.",
        });

        // 1st retry: sanitize payload to remove reported missing column
        insertPayload = sanitizePayloadForPGRST(insertPayload, insertErr.message);
        let retryRes = await supabase.from("listening_history").insert(insertPayload);
        insertErr = retryRes.error;

        // 2nd retry: if another column is missing, remove it too
        if (insertErr && insertErr.code === "PGRST204") {
          insertPayload = sanitizePayloadForPGRST(insertPayload, insertErr.message);
          retryRes = await supabase.from("listening_history").insert(insertPayload);
          insertErr = retryRes.error;
        }

        // 3rd retry: fallback to guaranteed core columns (user_id, song_id, provider)
        if (insertErr) {
          const minimalPayload = { user_id: userId, song_id: songId, provider };
          retryRes = await supabase.from("listening_history").insert(minimalPayload);
          insertErr = retryRes.error;
        }
      }

      if (insertErr) throw insertErr;
    }

    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    guestUpsert(song, listenedSeconds);
    return { error: msg };
  }
}

export async function fetchRecentHistory(
  userId: string,
  limit = 50
): Promise<{ data: HistoryEntry[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("listening_history")
      .select("*")
      .eq("user_id", userId)
      .order("listened_at", { ascending: false })
      .limit(limit);

    if (error) {
      logStructuredError({
        operation: "listening_history.fetch_recent",
        status: error.code || 400,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    const entries: HistoryEntry[] = (data || [])
      .filter((r: any) => r && (r.song_id || r.id))
      .map((r: any) => ({
        id: r.id || `hist-${r.song_id}`,
        song_id: r.song_id || r.video_id || "",
        title: r.title || "Unknown",
        artist: r.artist || "Unknown",
        thumbnail: r.thumbnail || r.image_url || "",
        duration: r.duration || 0,
        play_count: r.play_count || 1,
        listened_at: r.listened_at || r.played_at || new Date().toISOString(),
      }));

    return { data: entries, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: guestFetchAll(), error: msg };
  }
}

export async function fetchMostPlayed(
  userId: string,
  limit = 20
): Promise<{ data: HistoryEntry[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("listening_history")
      .select("*")
      .eq("user_id", userId)
      .order("play_count", { ascending: false })
      .limit(limit);

    if (error) {
      logStructuredError({
        operation: "listening_history.fetch_most_played",
        status: error.code || 400,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    const entries: HistoryEntry[] = (data || [])
      .filter((r: any) => r && (r.song_id || r.id))
      .map((r: any) => ({
        id: r.id || `hist-${r.song_id}`,
        song_id: r.song_id || r.video_id || "",
        title: r.title || "Unknown",
        artist: r.artist || "Unknown",
        thumbnail: r.thumbnail || r.image_url || "",
        duration: r.duration || 0,
        play_count: r.play_count || 1,
        listened_at: r.listened_at || r.played_at || new Date().toISOString(),
      }));

    return { data: entries, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const guestData = guestFetchAll().sort((a, b) => b.play_count - a.play_count).slice(0, limit);
    return { data: guestData, error: msg };
  }
}

export async function deleteHistoryEntry(
  userId: string,
  songId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from("listening_history")
      .delete()
      .eq("user_id", userId)
      .eq("song_id", songId);

    if (error) throw error;
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}

export async function clearAllHistory(userId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("listening_history").delete().eq("user_id", userId);
    if (error) throw error;
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}
