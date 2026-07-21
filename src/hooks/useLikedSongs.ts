import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLibraryStore } from '../store/useLibraryStore';
import type { Song } from '../store/usePlayerStore';
import toast from 'react-hot-toast';

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

export const useLikedSongs = () => {
  const { user, likedSongs, setLikedSongs, addLikedSong, removeLikedSong } = useLibraryStore();

  useEffect(() => {
    if (!user) {
      setLikedSongs({});
      return;
    }

    const fetchLikedSongs = async () => {
      try {
        const { data, error } = await supabase
          .from('liked_songs')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        const likedMap: Record<string, Song> = {};
        data.forEach(row => {
          const songId = row.song_id;
          likedMap[songId] = {
            videoId: songId,
            title: row.title,
            artist: row.artist,
            // liked_songs stores image in 'image_url'; map to 'thumbnail' for Song type
            thumbnail: row.image_url || '',
            duration: secondsToDuration(row.duration),
          };
        });
        setLikedSongs(likedMap);
      } catch (err) {
        console.error('Failed to fetch liked songs:', err);
      }
    };

    const timer = setTimeout(() => {
      fetchLikedSongs();
    }, 500);
    return () => clearTimeout(timer);
  }, [user, setLikedSongs]);

  const isLiked = (videoId: string) => {
    return !!likedSongs[videoId];
  };

  const toggleLike = async (song: Song) => {
    if (!user) {
      toast.error('Please login to like songs');
      return;
    }

    const currentlyLiked = isLiked(song.videoId);

    // Optimistic UI update
    if (currentlyLiked) {
      removeLikedSong(song.videoId);
    } else {
      addLikedSong(song);
    }

    try {
      if (currentlyLiked) {
        const { error } = await supabase
          .from('liked_songs')
          .delete()
          .eq('user_id', user.id)
          .eq('song_id', song.videoId);
          
        if (error) throw error;
        toast.success('Removed from Liked Songs');
      } else {
        const { error } = await supabase
          .from('liked_songs')
          .insert({
            user_id: user.id,
            song_id: song.videoId,      // required not-null column
            provider: 'jiosaavn',
            title: song.title,
            artist: song.artist,
            image_url: song.thumbnail,  // schema uses image_url, not thumbnail
            duration: durationToSeconds(song.duration),
          });
          
        if (error) throw error;
        toast.success('Added to Liked Songs');
      }
    } catch (err: any) {
      // Revert optimistic update on failure
      if (currentlyLiked) {
        addLikedSong(song);
      } else {
        removeLikedSong(song.videoId);
      }
      toast.error(err.message || 'Failed to update liked songs');
      console.error(err);
    }
  };

  return { likedSongs, isLiked, toggleLike };
};
