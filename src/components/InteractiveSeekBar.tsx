import React, { useState, useRef, useCallback, useEffect } from "react";
import { usePlayerStore } from "../store/usePlayerStore";
import { audioEngine } from "../lib/audioEngine";

interface InteractiveSeekBarProps {
  showLabels?: boolean;
  layout?: "horizontal" | "vertical";
  className?: string;
}

/** Format seconds → m:ss */
function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const InteractiveSeekBar: React.FC<InteractiveSeekBarProps> = ({
  showLabels = false,
  layout = "vertical",
  className = "",
}) => {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  // isDragging is kept in a ref so callbacks never go stale
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Only sync display time from store when NOT scrubbing
  useEffect(() => {
    if (!isDraggingRef.current) {
      setDragTime(currentTime);
    }
  }, [currentTime]);

  const calculateSeekTime = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pct * duration;
    },
    [duration]
  );

  const commitSeek = useCallback(
    (clientX: number) => {
      const seekTime = calculateSeekTime(clientX);
      // Seek audio engine directly — do NOT change currentSong or reload src
      audioEngine.seek(seekTime);
      // Optimistically update store time so UI is instant
      usePlayerStore.getState().setCurrentTime(seekTime);
      setDragTime(seekTime);
    },
    [calculateSeekTime, currentTime, duration]
  );

  // ── Mouse handlers ──────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      const seekTime = calculateSeekTime(e.clientX);
      setDragTime(seekTime);

      // Seek instantly on click
      audioEngine.seek(seekTime);
      usePlayerStore.getState().setCurrentTime(seekTime);

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const t = calculateSeekTime(ev.clientX);
        setDragTime(t);
      };

      const onMouseUp = (ev: MouseEvent) => {
        isDraggingRef.current = false;
        setIsDragging(false);
        commitSeek(ev.clientX);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [calculateSeekTime, commitSeek]
  );

  // ── Touch handlers ──────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      isDraggingRef.current = true;
      setIsDragging(true);
      const touch = e.touches[0];
      const seekTime = calculateSeekTime(touch.clientX);
      setDragTime(seekTime);

      // Seek instantly on touch start
      audioEngine.seek(seekTime);
      usePlayerStore.getState().setCurrentTime(seekTime);
    },
    [calculateSeekTime]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const seekTime = calculateSeekTime(touch.clientX);
      setDragTime(seekTime);
    },
    [calculateSeekTime]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      const touch = e.changedTouches[0] ?? e.touches[0];
      if (touch) {
        commitSeek(touch.clientX);
      }
    },
    [commitSeek]
  );

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPct = duration > 0 ? (displayTime / duration) * 100 : 0;

  if (layout === "horizontal") {
    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        <span className="text-[10px] tabular-nums text-white/35 flex-shrink-0">
          {formatTime(displayTime)}
        </span>
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 py-3 cursor-pointer group flex items-center"
          style={{ touchAction: "none" }}
        >
          {/* Inner track wrapper */}
          <div className="relative h-1 w-full bg-white/10 rounded-full flex items-center">
            <div
              className="h-full rounded-full transition-none"
              style={{
                width: `${progressPct}%`,
                background: "var(--accent)",
              }}
            />
            <div
              className={`absolute w-2.5 h-2.5 rounded-full bg-white transition-opacity ${isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              style={{
                left: `calc(${progressPct}% - 5px)`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.6)",
                zIndex: 10,
                transition: "left 0ms",
              }}
            />
          </div>
        </div>
        <span className="text-[10px] tabular-nums text-white/35 flex-shrink-0">
          {formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col gap-2 select-none ${className}`}>
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="py-3 w-full cursor-pointer group flex items-center"
        style={{ touchAction: "none" }}
      >
        {/* Inner track wrapper */}
        <div className="relative h-1.5 w-full bg-white/10 rounded-full flex items-center">
          {/* Active track */}
          <div
            className="h-full rounded-full"
            style={{
              width: `${progressPct}%`,
              background: "var(--accent)",
              transition: isDragging ? "none" : "width 80ms linear",
            }}
          />

          {/* Thumb */}
          <div
            className={`absolute w-3 h-3 rounded-full bg-white transition-opacity ${isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            style={{
              left: `calc(${progressPct}% - 6px)`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.8)",
              zIndex: 10,
              transition: isDragging ? "none" : "opacity 0.15s",
            }}
          />
        </div>
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs text-white/30 font-medium font-inter">
          <span>{formatTime(displayTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
};
