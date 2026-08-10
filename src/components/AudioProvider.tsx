import { useEffect, useRef } from "react";
import { audioEngine } from "../lib/audioEngine";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { useRecentlyPlayed } from "../hooks/useRecentlyPlayed";
import { getSongById } from "../lib/jiosaavn";
import { upsertListeningHistory, guestUpsert } from "../lib/listeningHistory";
import { useLibraryStore } from "../store/useLibraryStore";

/**
 * AudioProvider — bridges the singleton AudioEngine with the Zustand player store.
 *
 * Mount this component ABOVE <BrowserRouter> so it never unmounts during
 * route navigation. It contains no UI — just wiring logic.
 *
 * Responsibilities:
 * 1. When `currentSong` changes (by videoId) → load new stream
 * 2. When `isPlaying` changes → play/pause
 * 3. When `volume` changes → update engine volume
 * 4. Forward engine events → Zustand store (currentTime, duration, etc.)
 */
// Module-level variables to survive React lifecycle triggers and re-mounts
let globalLoadedVideoId: string | null = null;
let globalLoadToken = 0;

// Module-level listen-time session tracking (per song)
// Prevents duplicate history writes from re-renders
interface ListenSession {
  videoId: string;
  song: Song;
  startedAt: number;     // Date.now() ms
  accumulatedSeconds: number;
  committed: boolean;    // true once we've written to DB for this session
}
let currentListenSession: ListenSession | null = null;

/**
 * Commit listening history for a session if threshold is met.
 * Threshold: >=30 seconds listened OR >=50% of total duration.
 * Only commits once per session (committed flag prevents re-entry).
 */
async function maybeCommitHistory(
  session: ListenSession,
  totalDurationSeconds: number,
  userId: string | null,
): Promise<void> {
  if (session.committed) return;
  const { accumulatedSeconds } = session;
  const threshold50pct = totalDurationSeconds > 0 ? totalDurationSeconds * 0.5 : Infinity;
  const metThreshold = accumulatedSeconds >= 30 || accumulatedSeconds >= threshold50pct;
  if (!metThreshold) return;

  session.committed = true;

  if (userId) {
    await upsertListeningHistory(userId, session.song, Math.round(accumulatedSeconds), totalDurationSeconds);
  } else {
    guestUpsert(session.song, Math.round(accumulatedSeconds));
  }
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { logPlay } = useRecentlyPlayed();
  const userRef = useRef<string | null>(null);

  // Keep userRef current without subscribing whole component to auth state changes
  useEffect(() => {
    userRef.current = useLibraryStore.getState().user?.id ?? null;
    return useLibraryStore.subscribe((state) => {
      userRef.current = state.user?.id ?? null;
    });
  }, []);

  // ── CRITICAL FIX: stabilize logPlay reference ──
  // logPlay is a new function every render (not memoized in useRecentlyPlayed).
  // If used directly in a useEffect dependency array, the effect re-runs on
  // every render, which tears down + recreates the Zustand subscription,
  // causing the "initial state" block to re-fire → duplicate stream request.
  const logPlayRef = useRef(logPlay);
  logPlayRef.current = logPlay;

  // We use refs for store actions to avoid stale closures in callbacks.
  // The callbacks are registered once on mount and must always call fresh actions.
  const storeRef = useRef(usePlayerStore.getState());

  useEffect(() => {
    // Subscribe to Zustand store to keep ref current
    const unsub = usePlayerStore.subscribe((state) => {
      storeRef.current = state;
    });
    return unsub;
  }, []);

  // ── Wire AudioEngine callbacks → Zustand store (runs once on mount) ──
  useEffect(() => {
    audioEngine.setCallbacks({
      onTimeUpdate: (time) => {
        storeRef.current.setCurrentTime(time);
        if (currentListenSession) {
          currentListenSession.accumulatedSeconds = Math.max(currentListenSession.accumulatedSeconds, time);
          if (!currentListenSession.committed) {
            const totalDur = storeRef.current.duration || 0;
            maybeCommitHistory(currentListenSession, totalDur, userRef.current).catch(console.error);
          }
        }
      },
      onDurationChange: (dur) => {
        storeRef.current.setDuration(dur);
      },
      onCanPlay: () => {
        // If the store says we should be playing, start playback
        if (storeRef.current.isPlaying) {
          audioEngine.play();
        }
      },
      onEnded: () => {
        // Song ended naturally — commit full duration as listened
        if (currentListenSession && !currentListenSession.committed) {
          const totalDur = storeRef.current.duration || 0;
          // Mark full session as the total duration for completion
          currentListenSession.accumulatedSeconds = totalDur;
          maybeCommitHistory(currentListenSession, totalDur, userRef.current).catch(console.error);
        }
        storeRef.current.playNext();
      },
      onError: (errorMsg) => {
        console.error("[AudioProvider] audio error:", errorMsg);
        // Auto-skip to next song after error
        setTimeout(() => {
          storeRef.current.playNext();
        }, 3000);
      },
      onPlay: () => {
        // Sync store if audio started playing externally
        if (!storeRef.current.isPlaying) {
          storeRef.current.setIsPlaying(true);
        }
      },
      onPause: () => {
        // Sync store if audio paused externally, but ignore if seeking
        if (storeRef.current.isPlaying && !audioEngine.isSeeking()) {
          storeRef.current.setIsPlaying(false);
        }
      },
    });

    // Set initial volume
    audioEngine.setVolume(usePlayerStore.getState().volume);

    return () => {
      audioEngine.setCallbacks({});
    };
  }, []);

  // ── React to currentSong changes ──
  // Subscribe specifically to `currentSong` so unrelated state updates
  // (currentTime/duration/etc.) do NOT re-run the load logic.
  useEffect(() => {
    // Debug: AudioProvider song-subscription effect MOUNTED (selector)

    let prevSong: Song | null | undefined = undefined;

    const unsub = usePlayerStore.subscribe((state) => {
      const song = state.currentSong;

      // Only process if song actually changed
      if (song?.videoId === prevSong?.videoId) return;

      // Commit history for the previous song session before switching
      if (prevSong && currentListenSession && currentListenSession.videoId === prevSong.videoId) {
        const totalDur = storeRef.current.duration || 0;
        maybeCommitHistory(currentListenSession, totalDur, userRef.current).catch(console.error);
      }

      prevSong = song;

      // This listener only runs when `currentSong` changes.
      if (!song) {
        if (globalLoadedVideoId !== null) {
          audioEngine.unload();
          globalLoadedVideoId = null;
        }
        currentListenSession = null;
        return;
      }

      // Only load if videoId actually changed
      if (song.videoId !== globalLoadedVideoId) {
        // Debug: currentSong changed

        const loadToken = ++globalLoadToken;
        (async () => {
          try {
            let streamUrl = song.streamUrl;

            // Backward compatibility: older saved songs may not have streamUrl persisted.
            if (!streamUrl) {
              const fresh = await getSongById(song.videoId);
              streamUrl = fresh?.streamUrl;
            }

            if (loadToken !== globalLoadToken) return;
            if (!streamUrl) {
              console.error(`[AudioProvider] Missing stream URL for song ${song.videoId}`);
              return;
            }

            globalLoadedVideoId = song.videoId;
            audioEngine.load(song.videoId, streamUrl);

            // Start a new listen session for this song
            currentListenSession = {
              videoId: song.videoId,
              song: { ...song, streamUrl },
              startedAt: Date.now(),
              accumulatedSeconds: 0,
              committed: false,
            };

            // Log recently played (use ref to avoid stale closure)
            logPlayRef.current({ ...song, streamUrl });
          } catch (err) {
            console.error("[AudioProvider] Failed to resolve song stream URL", err);
          }
        })();
      }
    });

    // Handle initial state (if a song is already set before this mounts)
    const initialSong = usePlayerStore.getState().currentSong;
    if (initialSong && initialSong.videoId !== globalLoadedVideoId) {
      // Debug: Initial state load

      const loadToken = ++globalLoadToken;
      (async () => {
        try {
          let streamUrl = initialSong.streamUrl;
          if (!streamUrl) {
            const fresh = await getSongById(initialSong.videoId);
            streamUrl = fresh?.streamUrl;
          }

          if (loadToken !== globalLoadToken) return;
          if (!streamUrl) {
            console.error(`[AudioProvider] Missing stream URL for song ${initialSong.videoId}`);
            return;
          }

          globalLoadedVideoId = initialSong.videoId;
          audioEngine.load(initialSong.videoId, streamUrl);
          logPlayRef.current({ ...initialSong, streamUrl });
        } catch (err) {
          console.error("[AudioProvider] Failed to resolve initial song stream URL", err);
        }
      })();
    }

    return () => {
      // Debug: AudioProvider song-subscription effect CLEANUP
      unsub();
    };
  }, []);

  // ── React to isPlaying changes (selector subscription) ──
  useEffect(() => {
    let prevIsPlaying: boolean | undefined = undefined;

    const unsub = usePlayerStore.subscribe((state) => {
      const isPlaying = state.isPlaying;

      // Use storeRef to check for currentSong without subscribing to whole state
      if (!storeRef.current.currentSong) return;
      if (isPlaying === prevIsPlaying) return;

      prevIsPlaying = isPlaying;

      if (isPlaying) {
        if (audioEngine.getReadyState() >= 3) {
          audioEngine.play();
        }
      } else {
        audioEngine.pause();
      }
    });
    return unsub;
  }, []);

  // ── React to volume changes (selector subscription) ──
  useEffect(() => {
    let prevVolume: number | undefined = undefined;

    const unsub = usePlayerStore.subscribe((state) => {
      const volume = state.volume;

      if (volume === prevVolume) return;
      prevVolume = volume;
      audioEngine.setVolume(volume);
    });
    return unsub;
  }, []);

  // No UI — just renders children
  return <>{children}</>;
};
