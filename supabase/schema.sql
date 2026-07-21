-- Musick Supabase schema v2
-- Run this in the Supabase SQL Editor

create extension if not exists pgcrypto;

-- Rename old users table if it exists from earlier setup
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.users RENAME TO profiles;
  END IF;
END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system',
  language text not null default 'en',
  hq_audio boolean not null default false,
  autoplay boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create unique index if not exists liked_songs_user_song_provider_unique
  on public.liked_songs (user_id, song_id, provider);

create index if not exists liked_songs_user_created_idx
  on public.liked_songs (user_id, created_at desc);

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

create index if not exists playlists_user_created_idx
  on public.playlists (user_id, created_at desc);

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

create index if not exists playlist_songs_playlist_position_idx
  on public.playlist_songs (playlist_id, position);

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

create index if not exists recently_played_user_played_idx
  on public.recently_played (user_id, played_at desc);

create table if not exists public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text,
  provider text not null default 'jiosaavn',
  title text not null,
  artist text not null,
  album text,
  image_url text,
  duration integer not null default 0,
  listened_seconds integer not null default 0,
  completed boolean not null default false,
  listened_at timestamptz not null default now()
);

create index if not exists listening_history_user_listened_idx
  on public.listening_history (user_id, listened_at desc);

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

create unique index if not exists artist_preferences_user_artist_unique
  on public.artist_preferences (user_id, artist_name);

create index if not exists artist_preferences_user_score_idx
  on public.artist_preferences (user_id, score desc);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.liked_songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.recently_played enable row level security;
alter table public.listening_history enable row level security;
alter table public.artist_preferences enable row level security;

-- Auto-create profile after signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Policies
create policy if not exists "Users can manage own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy if not exists "Users can manage own settings"
  on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can manage own liked songs"
  on public.liked_songs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can view public playlists"
  on public.playlists
  for select
  using (is_public = true);

create policy if not exists "Users can manage own playlists"
  on public.playlists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can view songs from public playlists"
  on public.playlist_songs
  for select
  using (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_songs.playlist_id
        and p.is_public = true
    )
  );

create policy if not exists "Users can manage songs in own playlists"
  on public.playlist_songs
  for all
  using (
    auth.uid() is not null
    and auth.uid() = (
      select p.user_id
      from public.playlists p
      where p.id = playlist_songs.playlist_id
    )
  )
  with check (
    auth.uid() is not null
    and auth.uid() = (
      select p.user_id
      from public.playlists p
      where p.id = playlist_songs.playlist_id
    )
  );

create policy if not exists "Users can manage own recently played"
  on public.recently_played
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can manage own listening history"
  on public.listening_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can manage own artist preferences"
  on public.artist_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
