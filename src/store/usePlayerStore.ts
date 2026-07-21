import { create } from "zustand";

export interface Song {
  title: string;
  artist: string;
  videoId: string;
  duration: string;
  thumbnail: string;
  streamUrl?: string;
}

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  history: Song[];
  volume: number; // 0 to 1
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: "none" | "all" | "one";

  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setQueue: (queue: Song[]) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (videoId: string) => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  togglePlay: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;
}

function parseDurationToSeconds(
  durationStr: string | undefined | null,
): number {
  if (!durationStr) return 0;
  if (/^\d+$/.test(durationStr)) {
    return parseInt(durationStr, 10);
  }
  const parts = durationStr.split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  queue: [],
  history: [],
  volume: 0.8, // Default volume
  currentTime: 0,
  duration: 0,
  isShuffle: false,
  repeatMode: "none",

  setCurrentSong: (song) => {
    const { currentSong, history } = get();
    if (song === null) {
      set({ currentSong: null, isPlaying: false, currentTime: 0, duration: 0 });
      return;
    }
    // Guard: if the same song is already loaded, skip entirely.
    // This prevents duplicate stream requests when navigating to SongDetail
    // or when components re-pass the same song object.
    if (currentSong && currentSong.videoId === song.videoId) {
      return;
    }
    // Only push to history if a different song is playing
    const updatedHistory =
      currentSong && currentSong.videoId !== song.videoId
        ? [...history, currentSong]
        : history;

    set({
      currentSong: song,
      isPlaying: true,
      currentTime: 0,
      duration: parseDurationToSeconds(song.duration),
      history: updatedHistory,
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setQueue: (queue) => set({ queue }),

  addToQueue: (song) =>
    set((state) => {
      // Avoid duplicate videoIds in upcoming queue if desired
      const alreadyInQueue = state.queue.some(
        (s) => s.videoId === song.videoId,
      );
      if (alreadyInQueue) return state;
      return { queue: [...state.queue, song] };
    }),

  removeFromQueue: (videoId) =>
    set((state) => ({
      queue: state.queue.filter((song) => song.videoId !== videoId),
    })),

  setVolume: (volume) => set({ volume }),

  setCurrentTime: (currentTime) => set({ currentTime }),

  setDuration: (duration) => set({ duration }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

  toggleRepeat: () =>
    set((state) => {
      const modes: ("none" | "all" | "one")[] = ["none", "all", "one"];
      const currentIndex = modes.indexOf(state.repeatMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { repeatMode: modes[nextIndex] };
    }),

  playNext: async () => {
    const { queue, currentSong, history, isShuffle, repeatMode } = get();

    if (repeatMode === "one" && currentSong) {
      // Re-trigger playback of current song (reset time)
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    if (queue.length === 0) {
      if (repeatMode === "all" && history.length > 0) {
        // Recycle history back into queue
        const fullList = [...history];
        if (currentSong) fullList.push(currentSong);
        const nextSong = fullList[0];
        const newQueue = fullList.slice(1);
        set({
          currentSong: nextSong,
          queue: newQueue,
          history: [],
          currentTime: 0,
          duration: parseDurationToSeconds(nextSong.duration),
          isPlaying: true,
        });
      } else {
        // Queue is empty: automatically generate smart recommendations!
        try {
          const { getSmartRecommendations } = await import("../utils/smartRecommendations");
          const smartSongs = await getSmartRecommendations(currentSong, history);
          if (smartSongs.length > 0) {
            const nextSong = smartSongs[0];
            const newQueue = smartSongs.slice(1);
            const updatedHistory = currentSong ? [...history, currentSong] : history;

            set({
              currentSong: nextSong,
              queue: newQueue,
              history: updatedHistory,
              currentTime: 0,
              duration: parseDurationToSeconds(nextSong.duration),
              isPlaying: true,
            });
            return;
          }
        } catch (err) {
          console.error("Smart queue generation failed:", err);
        }
        set({ isPlaying: false });
      }
      return;
    }

    let nextSong: Song;
    let newQueue: Song[];

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      nextSong = queue[randomIndex];
      newQueue = queue.filter((_, idx) => idx !== randomIndex);
    } else {
      nextSong = queue[0];
      newQueue = queue.slice(1);
    }

    const updatedHistory = currentSong ? [...history, currentSong] : history;

    set({
      currentSong: nextSong,
      queue: newQueue,
      history: updatedHistory,
      currentTime: 0,
      duration: parseDurationToSeconds(nextSong.duration),
      isPlaying: true,
    });
  },

  playPrevious: () => {
    const { history, currentSong, queue } = get();
    if (history.length === 0) return;

    const previousSong = history[history.length - 1];
    const updatedHistory = history.slice(0, -1);
    const updatedQueue = currentSong ? [currentSong, ...queue] : queue;

    set({
      currentSong: previousSong,
      history: updatedHistory,
      queue: updatedQueue,
      currentTime: 0,
      duration: parseDurationToSeconds(previousSong.duration),
      isPlaying: true,
    });
  },
}));
