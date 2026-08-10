/**
 * listeningHistory.ts
 * -------------------
 * Direct Supabase operations for listening_history.
 *
 * Single-pass upsert strategy:
 *   Check existing row by (user_id, song_id) -> UPDATE if found, INSERT if missing.
 *   Writes strictly when session completes / thresholds met.
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
    title: song.title || "Unknown Title",
    artist: song.artist || "Unknown Artist",
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
 * Single-pass record or increment play count.
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
    // 1. Check if row exists for user + song
    const { data: existing, error: fetchErr } = await supabase
      .from("listening_history")
      .select("id, play_count, listened_seconds")
      .eq("user_id", userId)
      .eq("song_id", songId)
      .maybeSingle();

    if (fetchErr && fetchErr.code !== "PGRST116") {
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
      // UPDATE existing row
      const { error: updateErr } = await supabase
        .from("listening_history")
        .update({
          play_count: (existing.play_count || 1) + 1,
          listened_seconds: Math.max(existing.listened_seconds || 0, listenedSeconds),
          listened_at: now,
          completed: completed || false,
          thumbnail: song.thumbnail || null,
          image_url: song.thumbnail || null,
          artist: song.artist || "Unknown Artist",
          title: song.title || "Unknown Title",
          provider,
        })
        .eq("id", existing.id);

      if (updateErr) {
        logStructuredError({
          operation: "listening_history.update",
          status: updateErr.code || 400,
          code: updateErr.code,
          message: updateErr.message,
          details: updateErr.details,
          hint: updateErr.hint,
        });
        return { error: updateErr.message };
      }
    } else {
      // INSERT new row
      const { error: insertErr } = await supabase
        .from("listening_history")
        .insert({
          user_id: userId,
          song_id: songId,
          provider,
          title: song.title || "Unknown Title",
          artist: song.artist || "Unknown Artist",
          album: song.album || null,
          image_url: song.thumbnail || null,
          thumbnail: song.thumbnail || null,
          duration: totalDurationSeconds || 0,
          listened_seconds: listenedSeconds || 0,
          play_count: 1,
          completed,
          listened_at: now,
        });

      if (insertErr) {
        logStructuredError({
          operation: "listening_history.insert",
          status: insertErr.code || 400,
          code: insertErr.code,
          message: insertErr.message,
          details: insertErr.details,
          hint: insertErr.hint,
        });
        return { error: insertErr.message };
      }
    }

    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logStructuredError({
      operation: "listening_history.catch",
      status: 500,
      code: "EXCEPTION",
      message: msg,
    });
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
        title: r.title || "Unknown Title",
        artist: r.artist || "Unknown Artist",
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
        title: r.title || "Unknown Title",
        artist: r.artist || "Unknown Artist",
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
