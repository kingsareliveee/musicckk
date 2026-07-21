import React, { useEffect, useState, useRef } from 'react';
import { usePlayerStore, type Song } from '../store/usePlayerStore';
import { cn } from '../utils/cn';

interface LyricLine {
  time: number;
  text: string;
}

interface SyncedLyricsProps {
  song: Song;
  isCurrentSong: boolean;
}

export const SyncedLyrics: React.FC<SyncedLyricsProps> = ({ song, isCurrentSong }) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { currentTime } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    // Clear old lyrics immediately to prevent stale state
    setLyrics([]);
    setPlainLyrics('');
    setError('');
    
    const cleanTitle = (title: string, artist: string) => {
      let cleaned = title
        .replace(/\s*\(official.*?\)\s*/i, ' ')
        .replace(/\s*\[official.*?\]\s*/i, ' ')
        .replace(/\s*\([^)]*lyric[^)]*\)\s*/i, ' ')
        .replace(/\s*\[[^\]]*lyric[^\]]*\]\s*/i, ' ')
        .replace(/\s*\|.*/, '')
        .trim();

      if (artist && cleaned.toLowerCase().includes(artist.toLowerCase())) {
        cleaned = cleaned.replace(new RegExp(artist, 'ig'), '').trim();
      }

      cleaned = cleaned.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
      return cleaned || title;
    };

    const fetchLyrics = async () => {
      setLoading(true);
      setError('');
      try {
        const cTitle = cleanTitle(song.title, song.artist);
        const cArtist = song.artist;
        
        // 1. Exact match
        let queryUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cTitle)}&artist_name=${encodeURIComponent(cArtist)}`;
        let res = await fetch(queryUrl);
        let data = null;

        if (res.ok) {
          data = await res.json();
        } else {
          // 2. Search by title + artist
          queryUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cTitle + ' ' + cArtist)}`;
          res = await fetch(queryUrl);
          if (res.ok) {
            const searchResults = await res.json();
            if (searchResults && searchResults.length > 0) {
              data = searchResults.find((t: any) => t.syncedLyrics) || searchResults[0];
            }
          }

          if (!data) {
            // 3. Search by title only
            queryUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cTitle)}`;
            res = await fetch(queryUrl);
            if (res.ok) {
              const searchResults = await res.json();
              if (searchResults && searchResults.length > 0) {
                // Try fuzzy match or just pick first with synced lyrics
                data = searchResults.find((t: any) => t.syncedLyrics) || searchResults[0];
              }
            }
          }
        }
        
        if (!data) {
          throw new Error('Looks like we don\'t have lyrics for this song.');
        }
        
        if (!isMounted) return;

        if (data.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          setLyrics(parsed);
          setPlainLyrics('');
        } else if (data.plainLyrics) {
          setPlainLyrics(data.plainLyrics);
          setLyrics([]);
        } else {
          throw new Error('Looks like we don\'t have lyrics for this song.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Error loading lyrics.');
        setLyrics([]);
        setPlainLyrics('');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLyrics();
    
    return () => {
      isMounted = false;
    };
  }, [song.title, song.artist]);

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

  // Find active line
  let activeIndex = -1;
  if (isCurrentSong && lyrics.length > 0) {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      // 0.3s lookahead for smoother visual transition before audio catches up
      if (currentTime >= lyrics[i].time - 0.3) { 
        activeIndex = i;
        break;
      }
    }
  }

  // Auto-scroll: only scroll WITHIN the lyrics container, never the page
  useEffect(() => {
    if (!activeLineRef.current || !containerRef.current || !isCurrentSong || !isVisible) return;
    
    const container = containerRef.current;
    const activeLine = activeLineRef.current;
    
    // Calculate offset relative to container, then center it
    const containerHeight = container.clientHeight;
    const lineOffsetTop = activeLine.offsetTop;
    const lineHeight = activeLine.clientHeight;
    
    const targetScrollTop = lineOffsetTop - containerHeight / 2 + lineHeight / 2;
    
    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }, [activeIndex, isCurrentSong, isVisible]);

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 gap-3 rounded-3xl mt-8"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Loading lyrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center p-10 gap-2 rounded-3xl mt-8"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>{error}</span>
      </div>
    );
  }

  if (plainLyrics) {
    return (
      <div
        className="p-7 rounded-3xl max-w-3xl mt-8"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <h2 className="text-xl font-bold text-white mb-5" style={{ fontFamily: "'Outfit', sans-serif" }}>Lyrics</h2>
        <div className="whitespace-pre-wrap text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          {plainLyrics}
        </div>
      </div>
    );
  }

  if (lyrics.length === 0) {
    return null;
  }

  return (
    <div
      className="p-7 rounded-3xl max-w-3xl w-full mt-8"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <h2 className="text-xl font-bold text-white mb-5" style={{ fontFamily: "'Outfit', sans-serif" }}>Lyrics</h2>
      <div
        ref={containerRef}
        className="relative h-[420px] overflow-y-auto space-y-4 px-2 py-6 hide-scrollbar"
      >
        {lyrics.map((line, index) => {
          const isActive = index === activeIndex;
          const isPassed = index < activeIndex;

          return (
            <div
              key={index}
              ref={isActive ? activeLineRef : null}
              className={cn(
                "text-xl md:text-2xl font-bold transition-all duration-300 py-0.5 leading-snug",
                isActive ? "scale-105 origin-left" : ""
              )}
              style={{
                color: isActive
                  ? "white"
                  : isPassed
                  ? "rgba(255,255,255,0.22)"
                  : "rgba(255,255,255,0.40)",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {line.text || " "}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function parseLrc(lrc: string): LyricLine[] {
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\]/;
  
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = line.replace(timeRegex, '').replace(/\[.*?\]/g, '').trim();
      result.push({ time, text });
    }
  }
  return result;
}
