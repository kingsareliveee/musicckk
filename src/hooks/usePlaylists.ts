import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLibraryStore, type Playlist } from '../store/useLibraryStore';
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

export const usePlaylists = () => {
  const { user, playlists, setPlaylists, addPlaylist, removePlaylist, renamePlaylist } = useLibraryStore();

  useEffect(() => {
    if (!user) {
      setPlaylists([]);
      return;
    }

    const fetchPlaylists = async () => {
      try {
        const { data, error } = await supabase
          .from('playlists')
          .select('*, playlist_songs(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        const formattedPlaylists: Playlist[] = data.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.name,
          created_at: p.created_at,
          songs: (p.playlist_songs || [])
            .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
            .map((ps: any) => ({
              videoId: ps.song_id,
              title: ps.title,
              artist: ps.artist,
              thumbnail: '', // remote table has no thumbnail column
              duration: secondsToDuration(ps.duration),
            } as Song))
        }));
        
        setPlaylists(formattedPlaylists);
      } catch (err) {
        console.error('[usePlaylists] Failed to fetch playlists:', err);
      }
    };

    fetchPlaylists();
  }, [user, setPlaylists]);

  const createNewPlaylist = async (name: string) => {
    if (!user) {
      toast.error('Please login to create a playlist');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ user_id: user.id, name })
        .select()
        .single();
        
      if (error) {
        console.error('[createNewPlaylist] Complete error object:', JSON.stringify(error, null, 2));
        console.error('[createNewPlaylist] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      
      const newPlaylist: Playlist = {
        ...data,
        songs: []
      };
      
      addPlaylist(newPlaylist);
      toast.success(`Created playlist "${name}"`);
    } catch (err: any) {
      console.error('[createNewPlaylist] Unexpected error:', JSON.stringify(err, null, 2));
      toast.error(err.message || 'Failed to create playlist');
    }
  };

  const deletePlaylist = async (id: string) => {
    try {
      // Optimistic delete
      removePlaylist(id);
      
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success('Playlist deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete playlist');
      // In a real app we'd fetch to revert
    }
  };

  const rename = async (id: string, newName: string) => {
    try {
      renamePlaylist(id, newName);
      const { error } = await supabase
        .from('playlists')
        .update({ name: newName })
        .eq('id', id);
        
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename playlist');
    }
  };

  const addSongToPlaylist = async (playlistId: string, song: Song) => {
    if (!user) return;
    
    try {
      // Check for duplicates first
      const { data: existing } = await supabase
        .from('playlist_songs')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('song_id', song.videoId)
        .single();
        
      if (existing) {
        toast.error('Song already in playlist');
        return;
      }

      const { error } = await supabase
        .from('playlist_songs')
        .insert({
          playlist_id: playlistId,
          song_id: song.videoId,
          title: song.title,
          artist: song.artist,
          duration: durationToSeconds(song.duration),
          position: playlists.find(p => p.id === playlistId)?.songs?.length || 0
        });
        
      if (error) throw error;
      toast.success(`Added to playlist`);
      
      // Update local state
      setPlaylists(playlists.map(p => {
        if (p.id === playlistId) {
          return { ...p, songs: [...(p.songs || []), song] };
        }
        return p;
      }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to add song');
    }
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('song_id', songId);
        
      if (error) throw error;
      
      setPlaylists(playlists.map(p => {
        if (p.id === playlistId) {
          return { ...p, songs: (p.songs || []).filter(s => s.videoId !== songId) };
        }
        return p;
      }));
      toast.success('Removed from playlist');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove song');
    }
  };

  return { playlists, createNewPlaylist, deletePlaylist, rename, addSongToPlaylist, removeSongFromPlaylist };
};
