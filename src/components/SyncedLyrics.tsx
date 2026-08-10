import React, { useEffect, useState, useRef } from "react";
import { Loader2, Languages, Disc } from "lucide-react";
import { usePlayerStore, type Song } from "../store/usePlayerStore";
import { cn } from "../utils/cn";
import {
  fetchValidatedLyrics,
  translateLyricsToEnglish,
  type SyncedLyricLine,
  type LyricsResult,
} from "../services/lyricsService";

interface SyncedLyricsProps {
  song: Song;
  isCurrentSong: boolean;
}

export type ViewMode = "original" | "english" | "both";

export const SyncedLyrics: React.FC<SyncedLyricsProps> = ({ song, isCurrentSong }) => {
  const [lyricsState, setLyricsState] = useState<LyricsResult | null>(null);
  const [syncedLines, setSyncedLines] = useState<SyncedLyricLine[]>([]);
  const [plainText, setPlainText] = useState<string>("");
  const [plainTranslation, setPlainTranslation] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);

  // User selected view mode (persisted)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("musick_lyrics_view_mode") as ViewMode) || "both";
  });

  const { currentTime } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Save viewMode preference
  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("musick_lyrics_view_mode", mode);
  };

  useEffect(() => {
    let isMounted = true;

    // Clear previous state immediately on song change
    setLyricsState(null);
    setSyncedLines([]);
    setPlainText("");
    setPlainTranslation("");
    setLoading(true);
    setTranslating(false);
    setTranslationError(false);

    const loadLyricsAndTranslation = async () => {
      // Step 1: Fetch validated lyrics (strict title/artist/duration check)
      const res = await fetchValidatedLyrics(song);
      if (!isMounted) return;

      setLyricsState(res);
      setLoading(false);

      if (res.status === "success") {
        if (res.isSynced) {
          setSyncedLines(res.syncedLyrics);
        } else {
          setPlainText(res.plainLyrics);
        }

        // Step 2: Fetch English Translation asynchronously
        setTranslating(true);
        try {
          const translationRes = await translateLyricsToEnglish(
            song.videoId,
            res.syncedLyrics,
            res.plainLyrics
          );

          if (!isMounted) return;

          if (res.isSynced && translationRes.syncedTranslated) {
            setSyncedLines(translationRes.syncedTranslated);
          }
          if (!res.isSynced && translationRes.plainTranslated) {
            setPlainTranslation(translationRes.plainTranslated);
          }
        } catch (err) {
          if (isMounted) setTranslationError(true);
        } finally {
          if (isMounted) setTranslating(false);
        }
      }
    };

    loadLyricsAndTranslation();

    return () => {
      isMounted = false;
    };
  }, [song.videoId, song.title, song.artist, song.duration]);

  // Observer for active line scrolling
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Find active line index
  let activeIndex = -1;
  if (isCurrentSong && syncedLines.length > 0) {
    for (let i = syncedLines.length - 1; i >= 0; i--) {
      // 0.3s lookahead for smooth transition
      if (currentTime >= syncedLines[i].time - 0.3) {
        activeIndex = i;
        break;
      }
    }
  }

  // Smooth auto-scroll inside lyrics container
  useEffect(() => {
    if (!activeLineRef.current || !containerRef.current || !isCurrentSong || !isVisible) return;

    const container = containerRef.current;
    const activeLine = activeLineRef.current;

    const containerHeight = container.clientHeight;
    const lineOffsetTop = activeLine.offsetTop;
    const lineHeight = activeLine.clientHeight;

    const targetScrollTop = lineOffsetTop - containerHeight / 2 + lineHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: "smooth",
    });
  }, [activeIndex, isCurrentSong, isVisible, viewMode]);

  // ── 1. LOADING STATE ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 gap-3 rounded-3xl mt-8"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-medium text-white/40">Loading lyrics...</span>
      </div>
    );
  }

  // ── 2. INSTRUMENTAL STATE ─────────────────────────────────────────────
  if (lyricsState?.status === "instrumental") {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 gap-3 rounded-3xl mt-8 text-center"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Disc className="w-8 h-8 text-white/30 animate-spin-slow" />
        <span className="text-base font-semibold text-white/60">Instrumental</span>
        <span className="text-xs text-white/30">This track does not contain vocal lyrics.</span>
      </div>
    );
  }

  // ── 3. UNAVAILABLE STATE (Strict Match Failed) ────────────────────────
  if (!lyricsState || lyricsState.status === "unavailable") {
    return (
      <div
        className="flex flex-col items-center justify-center p-10 gap-2 rounded-3xl mt-8"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-sm font-medium text-white/30">Lyrics unavailable</span>
      </div>
    );
  }

  // ── 4. SUCCESS STATE: RENDER LYRICS & TRANSLATION ─────────────────────
  return (
    <div
      className="p-6 md:p-8 rounded-3xl max-w-3xl w-full mt-8"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* Header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white font-outfit">Lyrics</h2>
          {translating && (
            <span className="flex items-center gap-1 text-xs text-accent/70 font-medium ml-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Translating...
            </span>
          )}
          {translationError && (
            <span className="text-xs text-amber-400/60 font-medium ml-2">
              Translation unavailable
            </span>
          )}
        </div>

        {/* Mode Selector Toggle */}
        <div
          className="flex items-center p-1 rounded-2xl self-start sm:self-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => handleSetViewMode("original")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
              viewMode === "original"
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/40 hover:text-white/70"
            )}
          >
            Original
          </button>
          <button
            onClick={() => handleSetViewMode("english")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
              viewMode === "english"
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/40 hover:text-white/70"
            )}
          >
            <Languages className="w-3.5 h-3.5" />
            English
          </button>
          <button
            onClick={() => handleSetViewMode("both")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
              viewMode === "both"
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/40 hover:text-white/70"
            )}
          >
            Both
          </button>
        </div>
      </div>

      {/* ── PLAIN LYRICS FALLBACK ── */}
      {!lyricsState.isSynced && (
        <div className="space-y-6">
          {viewMode === "original" && (
            <div className="whitespace-pre-wrap text-base leading-relaxed text-white/60 font-inter">
              {plainText}
            </div>
          )}
          {viewMode === "english" && (
            <div className="whitespace-pre-wrap text-base leading-relaxed text-white/60 font-inter">
              {plainTranslation || plainText}
            </div>
          )}
          {viewMode === "both" && (
            <div className="space-y-4">
              {plainText.split("\n").map((origLine, idx) => {
                const transLine = (plainTranslation || "").split("\n")[idx];
                return (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <p className="text-base font-semibold text-white/80">{origLine}</p>
                    {transLine && transLine !== origLine && (
                      <p className="text-sm text-white/40">{transLine}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SYNCED LRC LYRICS ── */}
      {lyricsState.isSynced && (
        <div
          ref={containerRef}
          className="relative h-[420px] overflow-y-auto space-y-5 px-2 py-6 hide-scrollbar"
        >
          {syncedLines.map((line, index) => {
            const isActive = index === activeIndex;
            const isPassed = index < activeIndex;

            const hasTranslation =
              line.translation && line.translation.trim().toLowerCase() !== line.text.trim().toLowerCase();

            return (
              <div
                key={index}
                ref={isActive ? activeLineRef : null}
                className={cn(
                  "flex flex-col transition-all duration-300 py-1 leading-snug",
                  isActive ? "scale-[1.02] origin-left" : ""
                )}
              >
                {/* Original Line */}
                {(viewMode === "original" || viewMode === "both") && (
                  <div
                    className="text-lg md:text-xl font-bold font-outfit tracking-wide"
                    style={{
                      color: isActive
                        ? "#ffffff"
                        : isPassed
                        ? "rgba(255,255,255,0.25)"
                        : "rgba(255,255,255,0.45)",
                    }}
                  >
                    {line.text}
                  </div>
                )}

                {/* English Translation Line */}
                {(viewMode === "english" || (viewMode === "both" && hasTranslation)) && (
                  <div
                    className={cn(
                      "font-medium font-inter mt-0.5 transition-colors",
                      viewMode === "english" ? "text-lg md:text-xl font-bold font-outfit" : "text-sm"
                    )}
                    style={{
                      color: isActive
                        ? viewMode === "english"
                          ? "#ffffff"
                          : "rgba(var(--accent-rgb), 0.90)"
                        : isPassed
                        ? "rgba(255,255,255,0.20)"
                        : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {viewMode === "english" ? line.translation || line.text : line.translation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
