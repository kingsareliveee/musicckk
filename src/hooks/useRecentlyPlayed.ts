import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useLibraryStore } from "../store/useLibraryStore";
import type { Song } from "../store/usePlayerStore";
import { logStructuredError } from "../utils/logger";

function durationToSeconds(dur: string): number {
  if (!dur) return 0;
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function secondsToDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function sanitizePayloadForPGRST(payload: Record<string, any>, errorMessage: string): Record<string, any> {
  const copy = { ...payload };
  const match = errorMessage.match(/Could not find the '([^']+)' column/i);
  if (match && match[1] && match[1] in copy) {
    delete copy[match[1]];
  }
  return copy;
}

export const useRecentlyPlayed = () => {
  const { user, recentlyPlayed, setRecentlyPlayed, addRecentlyPlayed } = useLibraryStore();
  const lastLoggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRecentlyPlayed([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("recently_played")
          .select("*")
          .eq("user_id", user.id)
          .order("played_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        const seen = new Set<string>();
        const history: Song[] = [];
        for (const row of data || []) {
          const vid = row.song_id || row.video_id;
          if (!vid || seen.has(vid)) continue;
          seen.add(vid);
          history.push({
            videoId: vid,
            title: row.title || "Unknown",
            artist: row.artist || "Unknown",
            thumbnail: row.thumbnail || "",
            duration: secondsToDuration(row.duration),
            provider: row.provider || "jiosaavn",
            providerSongId: vid,
          });
          if (history.length >= 50) break;
        }
        setRecentlyPlayed(history);

        if (history.length > 0) {
          lastLoggedRef.current = history[0].videoId;
        }
      } catch (err: any) {
        logStructuredError({
          operation: "recently_played.fetch",
          status: err?.status || 400,
          code: err?.code || "FETCH_FAILED",
          message: err?.message || "Failed to fetch recently played",
          details: err,
        });
      }
    };

    const timer = setTimeout(() => {
      fetchHistory();
    }, 500);
    return () => clearTimeout(timer);
  }, [user, setRecentlyPlayed]);

  const logPlay = async (song: Song) => {
    if (!user || !song) return;
    const vid = song.videoId || (song as any).id;
    if (!vid) return;

    if (lastLoggedRef.current === vid) return;

    const songWithId = {
      ...song,
      videoId: vid,
      provider: song.provider || "jiosaavn",
      providerSongId: vid,
    } as Song;

    // Optimistic UI update
    addRecentlyPlayed(songWithId);
    lastLoggedRef.current = vid;

    // Log to top_tracks locally
    try {
      const topTracks = JSON.parse(localStorage.getItem("musick-top-tracks") || "[]");
      const idx = topTracks.findIndex((t: any) => t.video_id === vid || t.id === vid);
      if (idx !== -1) {
        topTracks[idx].play_count += 1;
      } else {
        topTracks.push({
          id: vid,
          video_id: vid,
          title: song.title,
          artist: song.artist,
          thumbnail: song.thumbnail,
          play_count: 1,
          created_at: new Date().toISOString(),
        });
      }
      localStorage.setItem("musick-top-tracks", JSON.stringify(topTracks));
    } catch {}

    try {
      await supabase.from("recently_played").delete().match({ user_id: user.id, song_id: vid });

      let payload: Record<string, any> = {
        user_id: user.id,
        song_id: vid,
        provider: song.provider || "jiosaavn",
        video_id: vid,
        title: song.title || "Unknown",
        artist: song.artist || "Unknown",
        thumbnail: song.thumbnail || "",
        duration: durationToSeconds(song.duration),
        played_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("recently_played")
        .insert(payload);

      if (error && error.code === "PGRST204") {
        payload = sanitizePayloadForPGRST(payload, error.message);
        const retryRes = await supabase.from("recently_played").insert(payload);
        error = retryRes.error;
      }

      if (error) {
        logStructuredError({
          operation: "recently_played.insert",
          status: error.code === "23502" ? "NOT_NULL_VIOLATION" : 400,
          code: error.code || "DB_INSERT_FAILED",
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      }
    } catch (err: any) {
      logStructuredError({
        operation: "recently_played.insert_catch",
        status: err?.status || 400,
        code: err?.code || "DB_ERROR",
        message: err?.message || "Insert exception",
        details: err,
      });
    }
  };

  return { recentlyPlayed, logPlay };
};
