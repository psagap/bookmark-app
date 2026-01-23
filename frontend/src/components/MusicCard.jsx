import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from "@/lib/utils";
import { Play, ExternalLink, Music, Pin, Layers, Trash2, RefreshCw } from "lucide-react";

// Spotify Logo SVG
const SpotifyLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// Apple Music Logo SVG
const AppleMusicLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.997 6.124c0-.738-.065-1.47-.24-2.19-.317-1.31-1.062-2.31-2.18-3.043C21.007.463 20.376.22 19.693.137 19.058.063 18.42.037 17.783.03c-.116-.003-.232-.002-.348-.002H6.565c-.116 0-.232-.001-.348.002-.637.007-1.275.033-1.91.107-.683.083-1.314.326-1.884.754-1.118.733-1.863 1.733-2.18 3.043-.175.72-.24 1.452-.24 2.19v11.752c0 .738.065 1.47.24 2.19.317 1.31 1.062 2.31 2.18 3.043.57.428 1.201.671 1.884.754.635.074 1.273.1 1.91.107.116.003.232.002.348.002h10.87c.116 0 .232.001.348-.002.637-.007 1.275-.033 1.91-.107.683-.083 1.314-.326 1.884-.754 1.118-.733 1.863-1.733 2.18-3.043.175-.72.24-1.452.24-2.19V6.124zM16.95 17.97c-.004.5-.13.76-.358.96-.227.2-.594.35-1.086.41-.496.063-1.083.066-1.696.047-1.22-.039-2.467-.237-3.563-.748-.46-.215-.864-.484-1.198-.8-.336-.318-.6-.683-.774-1.098-.176-.414-.258-.878-.258-1.39V9.252c0-.5.092-.944.276-1.33.184-.385.45-.716.798-1.005.35-.287.768-.522 1.256-.716.486-.194 1.023-.35 1.604-.47.58-.118 1.2-.202 1.848-.253l1.142-.086c0 .56 0 1.115.002 1.67-.63.06-1.207.137-1.754.223-.547.088-.99.213-1.33.352-.342.14-.585.316-.72.53-.137.217-.204.474-.204.77v5.35c0 .304.066.57.197.8.132.23.328.426.59.588.262.161.582.29.957.388.377.097.806.16 1.27.19.466.028.967.024 1.478-.027.51-.05 1.01-.139 1.5-.27l-.002 2.014z"/>
  </svg>
);

// SoundCloud Logo SVG
const SoundCloudLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c0-.057-.045-.1-.09-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c0 .055.045.094.09.094s.089-.045.104-.104l.21-1.319-.21-1.334c0-.061-.044-.09-.09-.09m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.12.119.12.061 0 .105-.061.121-.12l.254-2.474-.254-2.548c-.016-.06-.061-.12-.121-.12m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.15l.24-2.532-.24-2.623c0-.075-.06-.135-.135-.135l-.031-.017zm1.155.36c-.005-.09-.075-.149-.159-.149-.09 0-.158.06-.164.149l-.217 2.43.2 2.563c0 .09.075.157.159.157.074 0 .148-.068.148-.158l.227-2.563-.227-2.444.033.015zm.809-1.709c-.101 0-.18.09-.18.181l-.21 3.957.187 2.563c0 .09.08.164.18.164.094 0 .174-.09.18-.18l.209-2.563-.209-3.972c-.008-.104-.088-.18-.18-.18m.959-.914c-.105 0-.195.09-.203.194l-.18 4.872.165 2.548c0 .12.09.209.195.209.104 0 .194-.089.21-.209l.193-2.548-.192-4.856c-.016-.12-.105-.21-.21-.21m.989-.449c-.121 0-.211.089-.225.209l-.165 5.275.165 2.52c.014.119.104.225.225.225.119 0 .225-.105.225-.225l.195-2.52-.196-5.275c0-.12-.105-.225-.225-.225m1.245.045c0-.135-.105-.24-.24-.24-.119 0-.24.105-.24.24l-.149 5.441.149 2.503c.016.135.121.24.256.24s.24-.105.24-.24l.164-2.503-.164-5.456-.016.015zm.749-.134c-.135 0-.255.119-.255.254l-.15 5.322.15 2.473c0 .15.12.255.255.255.15 0 .255-.12.27-.27l.154-2.474-.171-5.307c0-.148-.12-.27-.27-.27m1.005.166c-.164 0-.284.135-.284.285l-.103 5.143.135 2.474c0 .149.119.277.284.277.149 0 .271-.12.284-.285l.121-2.443-.135-5.149c-.016-.164-.135-.285-.285-.285m1.184-.945c-.045-.029-.105-.044-.165-.044s-.119.015-.165.044c-.09.054-.149.15-.149.255v.061l-.104 6.048.115 2.449v.016c.016.121.076.209.165.256.045.03.104.045.164.045.061 0 .119-.016.165-.045.09-.045.164-.15.164-.271l.016-.209.109-2.249-.109-6.077c-.015-.15-.074-.246-.165-.301m.66-.705c-.044-.029-.119-.06-.194-.06-.074 0-.148.03-.209.061-.075.061-.135.158-.135.27l-.09 6.711.104 2.4c.016.15.105.271.238.299.03.016.06.016.09.016.074 0 .149-.03.209-.074.075-.061.135-.152.135-.27l.118-2.369-.118-6.711c0-.12-.061-.224-.15-.285m.705-.72c-.045-.045-.135-.074-.209-.074-.089 0-.164.03-.225.074-.09.061-.15.154-.15.274l-.074 7.396.09 2.385c0 .15.074.285.209.328.031.016.078.031.12.031.045 0 .105-.015.15-.031.09-.045.165-.165.18-.328l.089-2.385-.105-7.396c-.015-.135-.09-.225-.18-.285m.719-.79c-.061-.044-.135-.074-.225-.074-.089 0-.165.03-.24.09-.075.06-.136.165-.136.3l-.074 8.155.09 2.34c.016.18.12.301.272.346.045.015.089.015.119.015.06 0 .12-.015.165-.045.105-.045.18-.165.194-.315l.091-2.341-.091-8.155c-.014-.145-.074-.255-.165-.315m.734-.864c-.074-.045-.149-.075-.254-.075-.09 0-.18.03-.255.075-.09.074-.149.18-.149.316l-.06 8.97.074 2.324c.016.165.105.3.255.345.045.016.104.031.164.031.06 0 .105-.015.165-.031.135-.059.225-.18.239-.345l.075-2.339-.074-8.955c-.015-.15-.074-.255-.165-.315m.749-.94c-.075-.045-.165-.075-.27-.075-.09 0-.181.03-.256.075-.119.075-.195.195-.195.36l-.045 9.839.061 2.311c0 .18.09.314.209.358.061.03.135.045.21.045.075 0 .149-.016.21-.045.135-.044.209-.18.224-.358l.061-2.311-.061-9.839c-.015-.165-.091-.285-.195-.36m1.304-.75c-.061-.06-.165-.09-.27-.09h-.015c-.104 0-.194.03-.27.09-.09.075-.15.195-.15.345l-.03 10.532.045 2.28c.016.195.12.33.27.375.061.015.12.03.181.03s.119-.015.165-.03c.149-.045.255-.18.27-.375l.061-2.28-.061-10.532c0-.15-.061-.27-.165-.345m.75-.811c-.074-.061-.165-.091-.285-.091-.119 0-.21.03-.284.091-.105.074-.165.195-.165.359v10.888l.045 2.266c.015.194.105.345.255.405.061.03.135.045.209.045.075 0 .149-.015.21-.045.149-.06.24-.21.255-.405l.059-2.266-.059-10.903c-.016-.165-.091-.285-.18-.359m3.353 5.655c-.36 0-.704.074-1.014.21-.149-1.874-1.574-3.344-3.405-3.344-.449 0-.885.09-1.275.244-.15.061-.193.12-.209.24v6.776c.016.119.09.21.21.239.014 0 5.459.016 5.693.016 1.125 0 2.055-.915 2.055-2.07 0-1.154-.93-2.084-2.055-2.084"/>
  </svg>
);

// Context Menu
const CardContextMenu = ({ isOpen, position, onClose, onPin, onCreateSide, onDelete, onRefresh, isPinned, isRefreshing }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => onClose();
    const handleClickOutside = () => onClose();
    const handleContextMenu = () => onClose();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClick = (e, action) => {
    e.stopPropagation();
    action();
    onClose();
  };

  const menuWidth = 200;
  const menuHeight = 240;
  const adjustedLeft = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const adjustedTop = Math.min(position.y, window.innerHeight - menuHeight - 10);

  return createPortal(
    <div
      className="fixed z-[9999] min-w-[200px] rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: adjustedTop,
        left: adjustedLeft,
        background: 'linear-gradient(180deg, rgba(35, 33, 31, 0.98) 0%, rgba(25, 23, 21, 0.98) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <button onClick={(e) => handleClick(e, onPin)} className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150">
        <Pin className={cn("w-5 h-5", isPinned && "fill-current text-primary")} />
        <span>{isPinned ? 'Unpin' : 'Pin'}</span>
      </button>
      <button onClick={(e) => handleClick(e, onRefresh)} disabled={isRefreshing} className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150 disabled:opacity-50">
        <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
        <span>Refresh</span>
      </button>
      <button onClick={(e) => handleClick(e, onCreateSide)} className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150">
        <Layers className="w-5 h-5" />
        <span>Add to Side</span>
      </button>
      <div className="h-px bg-white/10 mx-4 my-1" />
      <button onClick={(e) => handleClick(e, onDelete)} className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150">
        <Trash2 className="w-5 h-5" />
        <span>Delete</span>
      </button>
    </div>,
    document.body
  );
};

// Get platform icon and color
const getPlatformConfig = (url) => {
  if (url?.includes('spotify.com')) return { Logo: SpotifyLogo, color: '#1DB954', name: 'Spotify', bgClass: 'bg-[#121212]' };
  if (url?.includes('music.apple.com')) return { Logo: AppleMusicLogo, color: '#FC3C44', name: 'Apple Music', bgClass: 'bg-gradient-to-b from-[#fa2d52] to-[#bf2740]' };
  if (url?.includes('soundcloud.com')) return { Logo: SoundCloudLogo, color: '#FF5500', name: 'SoundCloud', bgClass: 'bg-[#0f0f0f]' };
  if (url?.includes('bandcamp.com')) return { Logo: Music, color: '#629aa9', name: 'Bandcamp', bgClass: 'bg-[#1a1a1a]' };
  return { Logo: Music, color: '#1DB954', name: 'Music', bgClass: 'bg-[#121212]' };
};

// Fetch metadata for Spotify using oEmbed
const useSpotifyMetadata = (url) => {
  const [metadata, setMetadata] = useState(null);
  useEffect(() => {
    if (!url?.includes('spotify.com')) return;
    const fetchMetadata = async () => {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (err) {
        console.warn('Spotify oEmbed fetch failed:', err);
      }
    };
    fetchMetadata();
  }, [url]);
  return metadata;
};

const MusicCard = ({ bookmark, onDelete, onPin, onCreateSide, onRefresh, selectionMode, isSelected, onToggleSelect }) => {
  const { url, title, thumbnail, metadata } = bookmark;
  const platform = getPlatformConfig(url);
  const spotifyData = useSpotifyMetadata(url);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayImage = spotifyData?.thumbnail_url || thumbnail || metadata?.image;
  const displayTitle = spotifyData?.title || title || 'Unknown Track';

  let trackName = displayTitle;
  let artistName = metadata?.artist || '';
  if (displayTitle.includes(' - ')) {
    const parts = displayTitle.split(' - ');
    trackName = parts[0];
    artistName = parts.slice(1).join(' - ');
  } else if (displayTitle.includes(' by ')) {
    const parts = displayTitle.split(' by ');
    trackName = parts[0];
    artistName = parts.slice(1).join(' by ');
  }

  const handleContextMenu = (e) => {
    if (selectionMode) return;
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu({ isOpen: false, x: 0, y: 0 });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await onRefresh?.(bookmark); } finally { setIsRefreshing(false); }
  };

  const SelectionCheckbox = () => (
    <div
      onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
      className={cn(
        "absolute top-3 left-3 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer",
        isSelected ? "bg-white border-white" : "border-white/40 bg-black/30 hover:border-white/60"
      )}
    >
      {isSelected && <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
    </div>
  );

  return (
    <div className="break-inside-avoid mb-4" onContextMenu={handleContextMenu}>
      <div className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer",
        "w-full bg-[#121212]",
        "border border-white/[0.06] hover:border-white/15",
        "hover:shadow-lg hover:shadow-black/40",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}>
        {selectionMode && <SelectionCheckbox />}

        <CardContextMenu
          isOpen={contextMenu.isOpen}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          onPin={() => onPin?.(bookmark)}
          onCreateSide={() => onCreateSide?.(bookmark)}
          onDelete={() => onDelete?.(bookmark)}
          onRefresh={handleRefresh}
          isPinned={bookmark.pinned}
          isRefreshing={isRefreshing}
        />

        {/* Platform Logo - Top Left */}
        <div className="absolute top-3 left-3 z-10">
          <platform.Logo className="w-6 h-6" style={{ color: platform.color }} />
        </div>

        {/* Album Art */}
        {displayImage ? (
          <div className="relative aspect-square bg-black/50 overflow-hidden">
            <img src={displayImage} alt={trackName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ backgroundColor: platform.color }}>
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative aspect-square bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <Music className="w-16 h-16 text-gray-600" />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <h3 className="text-[15px] leading-[1.4] text-white/95 font-semibold line-clamp-2">{trackName}</h3>
          {artistName && <p className="mt-1 text-[13px] text-white/50 line-clamp-1">{artistName}</p>}
          <p className="mt-2 text-[11px] text-white/30">on <span style={{ color: platform.color }}>{platform.name}</span></p>
        </div>

        {/* Hover link - bottom right */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 right-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tl-lg text-[10px] font-medium text-white/60 border-t border-l border-white/[0.06] bg-white/[0.02] backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-white z-20"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Listen</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
};

export default MusicCard;
