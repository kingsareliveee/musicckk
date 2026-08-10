-- ==============================================================================
-- MUSICK PRODUCTION RELEASE MIGRATION (v3.1 - Safe Migration)
-- Copy and run this entire file in your Supabase SQL Editor: https://app.supabase.com
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- 2. USER SETTINGS TABLE
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system',
  language text not null default 'en',
  hq_audio boolean not null default false,
  autoplay boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings add column if not exists theme text not null default 'system';
alter table public.user_settings add column if not exists language text not null default 'en';
alter table public.user_settings add column if not exists hq_audio boolean not null default false;
alter table public.user_settings add column if not exists autoplay boolean not null default true;

-- 3. LIKED SONGS TABLE
create table if not exists public.liked_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text not null,
  provider text not null default 'jiosaavn',
  video_id text,
  title text not null,
  artist text not null,
  album text,
  image_url text,
  duration integer not null default 0,
  language text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.liked_songs add column if not exists provider text not null default 'jiosaavn';
alter table public.liked_songs add column if not exists video_id text;
alter table public.liked_songs add column if not exists album text;
alter table public.liked_songs add column if not exists image_url text;
alter table public.liked_songs add column if not exists duration integer not null default 0;
alter table public.liked_songs add column if not exists language text;
alter table public.liked_songs add column if not exists source_url text;

create unique index if not exists liked_songs_user_song_provider_unique
  on public.liked_songs (user_id, song_id, provider);

create index if not exists liked_songs_user_created_idx
  on public.liked_songs (user_id, created_at desc);

-- 4. LIKED ALBUMS TABLE
create table if not exists public.liked_albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id text not null,
  provider text not null default 'jiosaavn',
  album_name text not null,
  artist text not null,
  image_url text,
  year text,
  song_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.liked_albums add column if not exists provider text not null default 'jiosaavn';
alter table public.liked_albums add column if not exists image_url text;
alter table public.liked_albums add column if not exists year text;
alter table public.liked_albums add column if not exists song_count integer not null default 0;

create unique index if not exists liked_albums_user_album_provider_unique
  on public.liked_albums (user_id, album_id, provider);

create index if not exists liked_albums_user_created_idx
  on public.liked_albums (user_id, created_at desc);

-- 5. PLAYLISTS TABLE
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.playlists add column if not exists description text;
alter table public.playlists add column if not exists cover_url text;
alter table public.playlists add column if not exists is_public boolean not null default false;

create index if not exists playlists_user_created_idx
  on public.playlists (user_id, created_at desc);

-- 6. PLAYLIST SONGS TABLE
create table if not exists public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id text,
  video_id text,
  title text not null,
  artist text not null,
  thumbnail text,
  duration integer not null default 0,
  position integer not null default 0,
  added_at timestamptz not null default now()
);

alter table public.playlist_songs add column if not exists song_id text;
alter table public.playlist_songs add column if not exists video_id text;
alter table public.playlist_songs add column if not exists thumbnail text;
alter table public.playlist_songs add column if not exists duration integer not null default 0;
alter table public.playlist_songs add column if not exists position integer not null default 0;
alter table public.playlist_songs add column if not exists added_at timestamptz not null default now();

create index if not exists playlist_songs_playlist_position_idx
  on public.playlist_songs (playlist_id, position);

-- 7. RECENTLY PLAYED TABLE
create table if not exists public.recently_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text,
  provider text not null default 'jiosaavn',
  video_id text,
  title text not null,
  artist text not null,
  thumbnail text,
  duration integer not null default 0,
  played_at timestamptz not null default now()
);

alter table public.recently_played add column if not exists song_id text;
alter table public.recently_played add column if not exists provider text not null default 'jiosaavn';
alter table public.recently_played add column if not exists video_id text;
alter table public.recently_played add column if not exists thumbnail text;
alter table public.recently_played add column if not exists duration integer not null default 0;
alter table public.recently_played add column if not exists played_at timestamptz not null default now();

create index if not exists recently_played_user_played_idx
  on public.recently_played (user_id, played_at desc);

-- 8. LISTENING HISTORY TABLE (Fix for missing listened_at on pre-existing tables)
create table if not exists public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text,
  provider text not null default 'jiosaavn',
  title text not null,
  artist text not null,
  album text,
  image_url text,
  thumbnail text,
  duration integer not null default 0,
  listened_seconds integer not null default 0,
  play_count integer not null default 1,
  completed boolean not null default false,
  listened_at timestamptz not null default now()
);

alter table public.listening_history add column if not exists song_id text;
alter table public.listening_history add column if not exists provider text not null default 'jiosaavn';
alter table public.listening_history add column if not exists album text;
alter table public.listening_history add column if not exists image_url text;
alter table public.listening_history add column if not exists thumbnail text;
alter table public.listening_history add column if not exists duration integer not null default 0;
alter table public.listening_history add column if not exists listened_seconds integer not null default 0;
alter table public.listening_history add column if not exists play_count integer not null default 1;
alter table public.listening_history add column if not exists completed boolean not null default false;
alter table public.listening_history add column if not exists listened_at timestamptz not null default now();

create index if not exists listening_history_user_listened_idx
  on public.listening_history (user_id, listened_at desc);

create unique index if not exists listening_history_user_song_unique
  on public.listening_history (user_id, song_id)
  where song_id is not null;

create index if not exists listening_history_user_playcount_idx
  on public.listening_history (user_id, play_count desc);

create index if not exists listening_history_user_songid_idx
  on public.listening_history (user_id, song_id);

-- 9. ARTIST PREFERENCES TABLE
create table if not exists public.artist_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_name text not null,
  score integer not null default 0,
  genre text,
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artist_preferences add column if not exists score integer not null default 0;
alter table public.artist_preferences add column if not exists genre text;
alter table public.artist_preferences add column if not exists language text;

create unique index if not exists artist_preferences_user_artist_unique
  on public.artist_preferences (user_id, artist_name);

create index if not exists artist_preferences_user_score_idx
  on public.artist_preferences (user_id, score desc);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.liked_songs enable row level security;
alter table public.liked_albums enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.recently_played enable row level security;
alter table public.listening_history enable row level security;
alter table public.artist_preferences enable row level security;

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, onboarding_completed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    false
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- RLS POLICIES (DROP EXISTING THEN RE-CREATE SAFELY)
-- ==============================================================================

drop policy if exists "Users can manage own profile" on public.profiles;
drop policy if exists "Users can select own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

drop policy if exists "Users can manage own settings" on public.user_settings;
drop policy if exists "Users can manage own liked songs" on public.liked_songs;
drop policy if exists "Users can manage own liked albums" on public.liked_albums;

drop policy if exists "Users can view public playlists" on public.playlists;
drop policy if exists "Users can manage own playlists" on public.playlists;
drop policy if exists "Users can insert own playlists" on public.playlists;
drop policy if exists "Users can update own playlists" on public.playlists;
drop policy if exists "Users can delete own playlists" on public.playlists;

drop policy if exists "Users can view songs from public playlists" on public.playlist_songs;
drop policy if exists "Users can manage songs in own playlists" on public.playlist_songs;
drop policy if exists "Users can view playlist songs" on public.playlist_songs;
drop policy if exists "Users can insert songs into own playlists" on public.playlist_songs;
drop policy if exists "Users can update songs in own playlists" on public.playlist_songs;
drop policy if exists "Users can delete songs from own playlists" on public.playlist_songs;

drop policy if exists "Users can manage own recently played" on public.recently_played;
drop policy if exists "Users can manage own listening history" on public.listening_history;
drop policy if exists "Users can manage own artist preferences" on public.artist_preferences;

-- PROFILES
create policy "Users can select own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can delete own profile" on public.profiles for delete using (auth.uid() = id);

-- USER SETTINGS
create policy "Users can manage own settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- LIKED SONGS
create policy "Users can manage own liked songs" on public.liked_songs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- LIKED ALBUMS
create policy "Users can manage own liked albums" on public.liked_albums for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PLAYLISTS
create policy "Users can view public playlists" on public.playlists for select using (is_public = true or auth.uid() = user_id);
create policy "Users can insert own playlists" on public.playlists for insert with check (auth.uid() = user_id);
create policy "Users can update own playlists" on public.playlists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own playlists" on public.playlists for delete using (auth.uid() = user_id);

-- PLAYLIST SONGS
create policy "Users can view playlist songs" on public.playlist_songs for select using (
  exists (select 1 from public.playlists p where p.id = playlist_songs.playlist_id and (p.is_public = true or p.user_id = auth.uid()))
);

create policy "Users can insert songs into own playlists" on public.playlist_songs for insert with check (
  exists (select 1 from public.playlists p where p.id = playlist_songs.playlist_id and p.user_id = auth.uid())
);

create policy "Users can update songs in own playlists" on public.playlist_songs for update using (
  exists (select 1 from public.playlists p where p.id = playlist_songs.playlist_id and p.user_id = auth.uid())
);

create policy "Users can delete songs from own playlists" on public.playlist_songs for delete using (
  exists (select 1 from public.playlists p where p.id = playlist_songs.playlist_id and p.user_id = auth.uid())
);

-- RECENTLY PLAYED
create policy "Users can manage own recently played" on public.recently_played for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- LISTENING HISTORY
create policy "Users can manage own listening history" on public.listening_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ARTIST PREFERENCES
create policy "Users can manage own artist preferences" on public.artist_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
