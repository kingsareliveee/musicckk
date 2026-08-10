/**
 * listeningHistory.ts
 * -------------------
 * Pure Supabase operations for the listening_history table.
 * No React hooks here — import this from hooks or components.
 *
 * UPSERT strategy:
 *   Check for existing row → if found, increment play_count + update timestamp.
 *   This ensures one row per user-song pair with accurate play counts.
 *
 * Guest users get localStorage-backed history (key: "musick-guest-history").
 */

import { supabase } from './supabase';
import type { Song } from '../store/usePlayerStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  song_id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;          // seconds
  play_count: number;
  listened_at: string;       // ISO timestamp
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function durationToSeconds(dur: string | undefined): number {
  if (!dur) return 0;
  const parts = dur.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// ─── Guest localStorage helpers ───────────────────────────────────────────────

const GUEST_HISTORY_KEY = 'musick-guest-history';
const GUEST_MAX = 100;

function guestLoad(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function guestSave(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(entries.slice(0, GUEST_MAX)));
  } catch { /* ignore quota errors */ }
}

export function guestUpsert(song: Song, _listenedSeconds: number): HistoryEntry[] {
  const entries = guestLoad();
  const now = new Date().toISOString();
  const dur = durationToSeconds(song.duration);
  const idx = entries.findIndex(e => e.song_id === song.videoId);

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
    id: `guest-${song.videoId}`,
    song_id: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail || '',
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
  const updated = guestLoad().filter(e => e.song_id !== songId);
  guestSave(updated);
  return updated;
}

export function guestClear(): void {
  localStorage.removeItem(GUEST_HISTORY_KEY);
}

// ─── Supabase operations ──────────────────────────────────────────────────────

/**
 * Record or increment a play. Called only after the 30s/50% threshold.
 */
export async function upsertListeningHistory(
  userId: string,
  song: Song,
  listenedSeconds: number,
  totalDurationSeconds: number,
): Promise<{ error: string | null }> {
  if (!userId || !song.videoId) return { error: 'Missing userId or songId' };

  const now = new Date().toISOString();
  const completed = totalDurationSeconds > 0 && listenedSeconds >= totalDurationSeconds * 0.8;

  try {
    // Check for existing row
    const { data: existing, error: fetchErr } = await supabase
      .from('listening_history')
      .select('id, play_count, listened_seconds')
      .eq('user_id', userId)
      .eq('song_id', song.videoId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing) {
      const { error: updateErr } = await supabase
        .from('listening_history')
        .update({
          play_count: (existing.play_count || 1) + 1,
          listened_seconds: Math.max((existing.listened_seconds || 0), listenedSeconds),
          listened_at: now,
          completed: completed || false,
          thumbnail: song.thumbnail || null,
        })
        .eq('id', existing.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('listening_history')
        .insert({
          user_id: userId,
          song_id: song.videoId,
          provider: 'jiosaavn',
          title: song.title,
          artist: song.artist,
          image_url: song.thumbnail || null,
          thumbnail: song.thumbnail || null,
          duration: totalDurationSeconds,
          listened_seconds: listenedSeconds,
          play_count: 1,
          completed,
          listened_at: now,
        });

      if (insertErr) throw insertErr;
    }

    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[listeningHistory] upsert failed:', msg);
    return { error: msg };
  }
}

/**
 * Fetch history ordered by most recently played.
 */
export async function fetchRecentHistory(
  userId: string,
  limit = 50,
): Promise<{ data: HistoryEntry[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('listening_history')
      .select('id, song_id, title, artist, thumbnail, image_url, duration, play_count, listened_at')
      .eq('user_id', userId)
      .order('listened_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const entries: HistoryEntry[] = (data || [])
      .filter(r => r.song_id)
      .map(r => ({
        id: r.id,
        song_id: r.song_id as string,
        title: r.title,
        artist: r.artist,
        thumbnail: (r.thumbnail as string | null) || (r.image_url as string | null) || '',
        duration: (r.duration as number) || 0,
        play_count: (r.play_count as number) || 1,
        listened_at: r.listened_at,
      }));

    return { data: entries, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: [], error: msg };
  }
}

/**
 * Fetch history ordered by most played (highest play_count first).
 */
export async function fetchMostPlayed(
  userId: string,
  limit = 20,
): Promise<{ data: HistoryEntry[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('listening_history')
      .select('id, song_id, title, artist, thumbnail, image_url, duration, play_count, listened_at')
      .eq('user_id', userId)
      .order('play_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const entries: HistoryEntry[] = (data || [])
      .filter(r => r.song_id)
      .map(r => ({
        id: r.id,
        song_id: r.song_id as string,
        title: r.title,
        artist: r.artist,
        thumbnail: (r.thumbnail as string | null) || (r.image_url as string | null) || '',
        duration: (r.duration as number) || 0,
        play_count: (r.play_count as number) || 1,
        listened_at: r.listened_at,
      }));

    return { data: entries, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: [], error: msg };
  }
}

/**
 * Delete a single history entry.
 */
export async function deleteHistoryEntry(
  userId: string,
  songId: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('listening_history')
      .delete()
      .eq('user_id', userId)
      .eq('song_id', songId);

    if (error) throw error;
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}

/**
 * Clear all history for a user.
 */
export async function clearAllHistory(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('listening_history')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}
