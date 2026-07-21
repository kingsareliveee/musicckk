import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Plus, Heart, ListPlus } from 'lucide-react';
import { usePlaylists } from '../hooks/usePlaylists';
import { useLikedSongs } from '../hooks/useLikedSongs';
import type { Song } from '../store/usePlayerStore';
import { cn } from '../utils/cn';

interface SongContextMenuProps {
  song: Song;
  className?: string;
}

export const SongContextMenu: React.FC<SongContextMenuProps> = ({ song, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { playlists, addSongToPlaylist } = usePlaylists();
  const { isLiked, toggleLike } = useLikedSongs();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowPlaylists(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleLike = () => {
    toggleLike(song);
    setIsOpen(false);
  };

  const handleAdd = (playlistId: string) => {
    addSongToPlaylist(playlistId, song);
    setIsOpen(false);
    setShowPlaylists(false);
  };

  return (
    <div className={cn("relative", className)} ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          setShowPlaylists(false);
        }}
        className="p-2 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#282828] rounded-xl shadow-2xl py-1 z-50 border border-white/10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleLike();
            }}
            className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <Heart className={cn("w-4 h-4", isLiked(song.videoId) && "fill-primary text-primary")} />
            {isLiked(song.videoId) ? 'Remove from Liked' : 'Save to Liked Songs'}
          </button>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylists(!showPlaylists);
              }}
              className="w-full text-left px-4 py-3 flex items-center justify-between text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-4 h-4" />
                Add to playlist
              </div>
            </button>
            
            {showPlaylists && (
              <div className="absolute right-full top-0 mr-1 w-48 bg-[#282828] rounded-xl shadow-2xl py-1 z-50 border border-white/10 max-h-64 overflow-y-auto">
                {playlists.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-text-secondary">No playlists found</div>
                ) : (
                  playlists.map(p => (
                    <button
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(p.id);
                      }}
                      className="w-full text-left px-4 py-2 flex items-center gap-3 text-sm font-medium text-white hover:bg-white/10 transition-colors truncate"
                    >
                      <ListPlus className="w-4 h-4 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
