import type { Song } from "../store/usePlayerStore";

const JIOSAAVN_BASE_URL = "https://jiosaavnapi-six.vercel.app";

type JioImage = { url?: string; quality?: string };
type JioDownload = { url?: string; quality?: string };

type JioSongItem = {
  id?: string;
  name?: string;
  duration?: string | number;
  image?: JioImage[];
  downloadUrl?: JioDownload[];
  artists?: { primary?: Array<{ name?: string }> };
  album?: { name?: string };
};

type JioPlaylistItem = {
  id?: string;
  name?: string;
  title?: string;
  image?: JioImage[];
  songs?: JioSongItem[];
  songCount?: string | number;
  user?: { name?: string };
  subtitle?: string;
};

type JioArtistItem = {
  id?: string;
  name?: string;
  image?: JioImage[];
};

function toSeconds(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function secondsToDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function pickImage(images?: JioImage[]): string {
  if (!Array.isArray(images) || images.length === 0) return "";
  const preferred = ["500x500", "150x150", "50x50"];
  for (const q of preferred) {
    const found = images.find((img) => img.quality === q && img.url);
    if (found?.url) return found.url;
  }
  return images[images.length - 1]?.url || images[0]?.url || "";
}

function pickDownloadUrl(urls?: JioDownload[]): string {
  if (!Array.isArray(urls) || urls.length === 0) return "";
  const preferred = ["320kbps", "160kbps", "96kbps", "48kbps", "12kbps"];
  for (const q of preferred) {
    const found = urls.find((u) => u.quality === q && u.url);
    if (found?.url) return found.url;
  }
  return urls[urls.length - 1]?.url || urls[0]?.url || "";
}

function extractResults(payload: unknown): unknown[] {
  const data = payload as {
    data?: { results?: unknown[] } | unknown[];
    results?: unknown[];
  };

  if (Array.isArray((data.data as { results?: unknown[] })?.results)) {
    return (data.data as { results?: unknown[] }).results || [];
  }
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function normalizeSong(item: JioSongItem): Song {
  const artist =
    item.artists?.primary
      ?.map((a) => a.name)
      .filter(Boolean)
      .join(", ") || "Unknown Artist";

  return {
    videoId: item.id || "",
    title: item.name || "Unknown Title",
    artist,
    duration: secondsToDuration(toSeconds(item.duration)),
    thumbnail: pickImage(item.image),
    streamUrl: pickDownloadUrl(item.downloadUrl),
  };
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${JIOSAAVN_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`JioSaavn API request failed: ${res.status}`);
  }
  return res.json();
}

export async function searchSongs(query: string, limit = 15): Promise<Song[]> {
  const data = await fetchJson(
    `/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const results = extractResults(data) as JioSongItem[];
  return results.map(normalizeSong).filter((s) => s.videoId);
}

export async function searchArtists(
  query: string,
  limit = 8,
): Promise<
  Array<{ id: string; name: string; thumbnail: string; verified: boolean }>
> {
  const data = await fetchJson(
    `/api/search/artists?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const results = extractResults(data) as JioArtistItem[];
  return results
    .map((artist) => ({
      id: artist.id || artist.name || "",
      name: artist.name || "Unknown Artist",
      thumbnail: pickImage(artist.image),
      verified: true,
    }))
    .filter((a) => a.id);
}

export async function searchPlaylists(
  query: string,
  limit = 10,
): Promise<
  Array<{
    id: string;
    title: string;
    author: string;
    thumbnail: string;
    videoCount: string;
  }>
> {
  const data = await fetchJson(
    `/api/search/playlists?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const results = extractResults(data) as JioPlaylistItem[];
  return results
    .map((playlist) => ({
      id: playlist.id || "",
      title: playlist.name || playlist.title || "Playlist",
      author: playlist.user?.name || playlist.subtitle || "JioSaavn",
      thumbnail: pickImage(playlist.image),
      videoCount: `${playlist.songCount || 0} songs`,
    }))
    .filter((p) => p.id);
}

export async function searchAll(query: string): Promise<{
  songs: Song[];
  playlists: Array<{
    id: string;
    title: string;
    author: string;
    thumbnail: string;
    videoCount: string;
  }>;
  artists: Array<{
    id: string;
    name: string;
    thumbnail: string;
    verified: boolean;
  }>;
}> {
  const [songs, playlists, artists] = await Promise.all([
    searchSongs(query, 20),
    searchPlaylists(query, 10),
    searchArtists(query, 8),
  ]);

  return { songs, playlists, artists };
}

export async function getSongById(id: string): Promise<Song | null> {
  const data = await fetchJson(`/api/songs?id=${encodeURIComponent(id)}`);
  const results = extractResults(data) as JioSongItem[];
  if (results.length > 0) return normalizeSong(results[0]);

  const payload = data as { data?: unknown };
  const single =
    payload.data && !Array.isArray(payload.data) ? payload.data : null;
  if (single && typeof single === "object") {
    return normalizeSong(single as JioSongItem);
  }

  return null;
}

export async function getPlaylistById(id: string): Promise<{
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  songs: Song[];
}> {
  const data = await fetchJson(`/api/playlists?id=${encodeURIComponent(id)}`);

  const payload = data as { data?: unknown };
  const candidate = Array.isArray(payload.data)
    ? payload.data[0]
    : payload.data || data;
  const playlistData = (candidate || {}) as JioPlaylistItem & {
    list?: JioSongItem[];
    user?: { name?: string };
    subtitle?: string;
    image?: JioImage[];
  };

  const songsRaw = Array.isArray(playlistData.songs)
    ? playlistData.songs
    : Array.isArray(playlistData.list)
      ? playlistData.list
      : [];

  return {
    id: playlistData.id || id,
    title: playlistData.name || playlistData.title || "Playlist",
    author: playlistData.user?.name || playlistData.subtitle || "JioSaavn",
    thumbnail: pickImage(playlistData.image),
    songs: songsRaw.map(normalizeSong).filter((s: Song) => s.videoId),
  };
}

export async function getPopularSongs(): Promise<Song[]> {
  const queries = ["trending songs", "top hindi songs", "viral hits"];
  const batches = await Promise.all(queries.map((q) => searchSongs(q, 12)));
  const merged = batches.flat();
  const seen = new Set<string>();
  const unique: Song[] = [];

  for (const song of merged) {
    if (!song.videoId || seen.has(song.videoId)) continue;
    seen.add(song.videoId);
    unique.push(song);
    if (unique.length >= 20) break;
  }

  return unique;
}

export async function getRecommendations(params: {
  artistsCsv?: string;
  genresCsv?: string;
  languagesCsv?: string;
}): Promise<{
  songs: Song[];
  artists: Array<{
    id: string;
    name: string;
    thumbnail: string;
    verified: boolean;
  }>;
  playlists: Array<{
    id: string;
    title: string;
    author: string;
    thumbnail: string;
    videoCount: string;
  }>;
  albums: Array<{
    id: string;
    title: string;
    author: string;
    thumbnail: string;
    videoCount: string;
  }>;
  metadata: { forYouArtist: string; trendingGenre: string };
}> {
  const selectedArtists =
    params.artistsCsv
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];
  const selectedGenres =
    params.genresCsv
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];
  const selectedLanguages =
    params.languagesCsv
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];

  const artist = selectedArtists[0] || "Arijit Singh";
  const genre = selectedGenres[0] || "Bollywood";
  const language = selectedLanguages[0] || "Hindi";

  const [songs, artists, playlists, albums] = await Promise.all([
    searchSongs(`${artist} songs`, 12),
    searchArtists(artist, 8),
    searchPlaylists(`${language} ${genre}`, 8),
    searchPlaylists(`${artist} album`, 8),
  ]);

  return {
    songs,
    artists,
    playlists,
    albums,
    metadata: {
      forYouArtist: artist,
      trendingGenre: genre,
    },
  };
}
