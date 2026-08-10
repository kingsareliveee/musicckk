import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gsrxhkuqskxxtzdtjigq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mCWnwMpQEP65vkXIj7UNqg_48-gMPnl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          theme: string;
          language: string;
          hq_audio: boolean;
          autoplay: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: string;
          language?: string;
          hq_audio?: boolean;
          autoplay?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: string;
          language?: string;
          hq_audio?: boolean;
          autoplay?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      liked_songs: {
        Row: {
          id: string;
          user_id: string;
          song_id: string;
          provider: string;
          video_id: string | null;
          title: string;
          artist: string;
          album: string | null;
          image_url: string | null;
          duration: number;
          language: string | null;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          song_id: string;
          provider?: string;
          video_id?: string | null;
          title: string;
          artist: string;
          album?: string | null;
          image_url?: string | null;
          duration?: number;
          language?: string | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_id?: string;
          provider?: string;
          video_id?: string | null;
          title?: string;
          artist?: string;
          album?: string | null;
          image_url?: string | null;
          duration?: number;
          language?: string | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      playlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          cover_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          cover_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          cover_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      playlist_songs: {
        Row: {
          id: string;
          playlist_id: string;
          song_id: string | null;
          video_id: string | null;
          title: string;
          artist: string;
          thumbnail: string | null;
          duration: number;
          position: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          playlist_id: string;
          song_id?: string | null;
          video_id?: string | null;
          title: string;
          artist: string;
          thumbnail?: string | null;
          duration?: number;
          position?: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          playlist_id?: string;
          song_id?: string | null;
          video_id?: string | null;
          title?: string;
          artist?: string;
          thumbnail?: string | null;
          duration?: number;
          position?: number;
          added_at?: string;
        };
      };
      recently_played: {
        Row: {
          id: string;
          user_id: string;
          song_id: string | null;
          provider: string;
          video_id: string | null;
          title: string;
          artist: string;
          thumbnail: string | null;
          duration: number;
          played_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          song_id?: string | null;
          provider?: string;
          video_id?: string | null;
          title: string;
          artist: string;
          thumbnail?: string | null;
          duration?: number;
          played_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_id?: string | null;
          provider?: string;
          video_id?: string | null;
          title?: string;
          artist?: string;
          thumbnail?: string | null;
          duration?: number;
          played_at?: string;
        };
      };
      listening_history: {
        Row: {
          id: string;
          user_id: string;
          song_id: string | null;
          provider: string;
          title: string;
          artist: string;
          album: string | null;
          image_url: string | null;
          thumbnail: string | null;
          duration: number;
          listened_seconds: number;
          play_count: number;
          completed: boolean;
          listened_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          song_id?: string | null;
          provider?: string;
          title: string;
          artist: string;
          album?: string | null;
          image_url?: string | null;
          thumbnail?: string | null;
          duration?: number;
          listened_seconds?: number;
          play_count?: number;
          completed?: boolean;
          listened_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_id?: string | null;
          provider?: string;
          title?: string;
          artist?: string;
          album?: string | null;
          image_url?: string | null;
          thumbnail?: string | null;
          duration?: number;
          listened_seconds?: number;
          play_count?: number;
          completed?: boolean;
          listened_at?: string;
        };
      };
      artist_preferences: {
        Row: {
          id: string;
          user_id: string;
          artist_name: string;
          score: number;
          genre: string | null;
          language: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          artist_name: string;
          score?: number;
          genre?: string | null;
          language?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          artist_name?: string;
          score?: number;
          genre?: string | null;
          language?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
