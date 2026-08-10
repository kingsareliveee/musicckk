import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useLibraryStore } from '../store/useLibraryStore';
import type { Song } from '../store/usePlayerStore';

/** Convert "m:ss" or "h:mm:ss" duration string to total seconds (int). */
function durationToSeconds(dur: string): number {
  if (!dur) return 0;
  const parts = dur.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/** Convert integer seconds back to "m:ss" display string. */
function secondsToDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
          .from('recently_played')
          .select('*')
          .eq('user_id', user.id)
          .order('played_at', { ascending: false })
          .limit(20);
          
        if (error) throw error;
        
        // Map rows to Song and deduplicate by song_id (keep most recent)
        const seen = new Set<string>();
        const history: Song[] = [];
        for (const row of data) {
          const vid = row.song_id;
          if (!vid || seen.has(vid)) continue;
          seen.add(vid);
          history.push({
            videoId: vid,
            title: row.title,
            artist: row.artist,
            thumbnail: '', // remote table has no thumbnail column
            duration: secondsToDuration(row.duration),
          });
          if (history.length >= 50) break;
        }
        setRecentlyPlayed(history);
        
        if (history.length > 0) {
          lastLoggedRef.current = history[0].videoId;
        }
      } catch (err) {
        console.error('Failed to fetch recently played:', err);
      }
    };

    const timer = setTimeout(() => {
      fetchHistory();
    }, 500);
    return () => clearTimeout(timer);
  }, [user, setRecentlyPlayed]);

  const logPlay = async (song: Song) => {
    if (!user || !song) return;
    const vid = (song as any).videoId || (song as any).id;
    if (!vid) return;

    // Spam prevention: don't log if it's exactly the same song we just logged
    if (lastLoggedRef.current === vid) return;

    // Ensure song has a videoId for store consistency
    const songWithId = { ...song, videoId: vid } as Song;

    // Optimistic UI update
    addRecentlyPlayed(songWithId);
    lastLoggedRef.current = vid;

    // Log to top_tracks locally
    try {
      const topTracks = JSON.parse(localStorage.getItem("musick-top-tracks") || "[]");
      const idx = topTracks.findIndex((t: any) => t.video_id === vid);
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
          created_at: new Date().toISOString()
        });
      }
      localStorage.setItem("musick-top-tracks", JSON.stringify(topTracks));
    } catch (err) {
      console.error('Failed to log top tracks locally:', err);
    }

    try {
      // Remove any existing rows for this user/video to avoid duplicates
      await supabase.from("recently_played").delete().match({ user_id: user.id, song_id: vid });
      await supabase
        .from("recently_played")
        .insert({
          user_id: user.id,
          song_id: vid,
          title: song.title || "Unknown",
          artist: song.artist || "Unknown",
          duration: durationToSeconds(song.duration),
        });
    } catch (err) {
      // Graceful fallback: local state & top-tracks already updated
    }
  };

  return { recentlyPlayed, logPlay };
};
