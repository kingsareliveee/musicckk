import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Song } from "./usePlayerStore";

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  songs?: Song[]; // Joined client-side or from playlist_songs
}

export interface LibraryState {
  user: User | null;
  likedSongs: Record<string, Song>; // Key is videoId for O(1) lookup
  playlists: Playlist[];
  recentlyPlayed: Song[];
  
  // Setters
  setUser: (user: User | null) => void;
  setLikedSongs: (songs: Record<string, Song>) => void;
  addLikedSong: (song: Song) => void;
  removeLikedSong: (videoId: string) => void;
  
  setPlaylists: (playlists: Playlist[]) => void;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  renamePlaylist: (id: string, newName: string) => void;
  
  setRecentlyPlayed: (songs: Song[]) => void;
  addRecentlyPlayed: (song: Song) => void;
  
  clearStore: () => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  user: null,
  likedSongs: {},
  playlists: [],
  recentlyPlayed: [],

  setUser: (user) => set({ user }),
  
  setLikedSongs: (likedSongs) => set({ likedSongs }),
  
  addLikedSong: (song) => set((state) => ({
    likedSongs: { ...state.likedSongs, [song.videoId]: song }
  })),
  
  removeLikedSong: (videoId) => set((state) => {
    const newLiked = { ...state.likedSongs };
    delete newLiked[videoId];
    return { likedSongs: newLiked };
  }),

  setPlaylists: (playlists) => set({ playlists }),
  
  addPlaylist: (playlist) => set((state) => ({
    playlists: [...state.playlists, playlist]
  })),
  
  removePlaylist: (id) => set((state) => ({
    playlists: state.playlists.filter(p => p.id !== id)
  })),
  
  renamePlaylist: (id, newName) => set((state) => ({
    playlists: state.playlists.map(p => p.id === id ? { ...p, name: newName } : p)
  })),

  setRecentlyPlayed: (recentlyPlayed) => set(() => {
    const key = (s: any) => s.videoId || s.id;
    const seen = new Set<string>();
    const filtered: typeof recentlyPlayed = [];
    for (const s of recentlyPlayed) {
      const k = key(s as any);
      if (seen.has(k)) continue;
      seen.add(k);
      filtered.push(s);
      if (filtered.length >= 50) break;
    }
    return { recentlyPlayed: filtered };
  }),
  
  addRecentlyPlayed: (song) => set((state) => {
    // Use videoId or fallback to id as unique key
    const key = (s: any) => s.videoId || (s as any).id;
    const songKey = key(song);
    // Avoid immediate duplicates
    if (key(state.recentlyPlayed[0]) === songKey) {
      return state;
    }
    const filtered = state.recentlyPlayed.filter(s => key(s) !== songKey);
    const newList = [song, ...filtered].slice(0, 50); // keep max 50
    return { recentlyPlayed: newList };
  }),
  
  clearStore: () => set({
    user: null,
    likedSongs: {},
    playlists: [],
    recentlyPlayed: []
  })
}));
