import { useEffect, useRef } from "react";
import { audioEngine } from "../lib/audioEngine";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { useRecentlyPlayed } from "../hooks/useRecentlyPlayed";
import { getSongById } from "../lib/jiosaavn";

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
// Module-level variable to survive React lifecycle triggers and re-mounts
let globalLoadedVideoId: string | null = null;
let globalLoadToken = 0;

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { logPlay } = useRecentlyPlayed();

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
      prevSong = song;

      // This listener only runs when `currentSong` changes.
      if (!song) {
        if (globalLoadedVideoId !== null) {
          // Debug: currentSong cleared -> unloading
          audioEngine.unload();
          globalLoadedVideoId = null;
        }
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
