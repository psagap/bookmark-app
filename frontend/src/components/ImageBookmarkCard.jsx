import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Pin, ExternalLink, Layers, Trash2, RefreshCw, Check, Download, Play } from "lucide-react";
import { cn } from "@/lib/utils";

// Selection checkbox - same as BookmarkCard
const SelectionCheckbox = ({ isSelected, onToggle }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className={cn(
      "absolute top-3 right-3 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200",
      isSelected
        ? "bg-violet-500 border-violet-500"
        : "bg-black/60 border-violet-400/50 hover:border-violet-400"
    )}
  >
    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
  </div>
);

// Context Menu for Image Card
const ImageContextMenu = ({ isOpen, position, onClose, onPin, onCreateSide, onDelete, onRefresh, onDownload, isPinned, isRefreshing }) => {
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
  const menuHeight = 280;
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
      <button
        onClick={(e) => handleClick(e, onDownload)}
        className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150"
      >
        <Download className="w-5 h-5" />
        <span>Download</span>
      </button>
      <button
        onClick={(e) => handleClick(e, onPin)}
        className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150"
      >
        <Pin className={cn("w-5 h-5", isPinned && "fill-current text-primary")} />
        <span>{isPinned ? 'Unpin' : 'Pin'}</span>
      </button>
      <button
        onClick={(e) => handleClick(e, onRefresh)}
        disabled={isRefreshing}
        className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150 disabled:opacity-50"
      >
        <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
        <span>Refresh</span>
      </button>
      <button
        onClick={(e) => handleClick(e, onCreateSide)}
        className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150"
      >
        <Layers className="w-5 h-5" />
        <span>Add to Side</span>
      </button>
      <div className="h-px bg-white/10 mx-4 my-1" />
      <button
        onClick={(e) => handleClick(e, onDelete)}
        className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150"
      >
        <Trash2 className="w-5 h-5" />
        <span>Delete</span>
      </button>
    </div>,
    document.body
  );
};

const ImageBookmarkCard = ({
  bookmark,
  onDelete,
  onPin,
  onCreateSide,
  onRefresh,
  selectionMode,
  isSelected,
  onToggleSelect,
}) => {
  const { title, url, thumbnail, metadata } = bookmark;
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get image URL - prefer thumbnail, fall back to url
  const imageUrl = thumbnail || url;

  // Check if this is a linked image (from a website, not a direct image file)
  const isLinkedImage = url && !(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|m4v)(\?|$)/i.test(url));

  // Get domain for linked images
  const getDomain = (urlString) => {
    try {
      return new URL(urlString).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };
  const sourceDomain = getDomain(url);

  // Check if this is a video file
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(imageUrl);

  // Get metadata
  const width = metadata?.width;
  const height = metadata?.height;
  const fileSize = metadata?.fileSize;

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle context menu (right-click)
  const handleContextMenu = (e) => {
    if (selectionMode) return;
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.(bookmark);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = title || 'image';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Calculate aspect ratio for placeholder
  const aspectRatio = width && height ? width / height : 4 / 3;
  const isPortrait = aspectRatio < 1;

  return (
    <div className="break-inside-avoid mb-4" onContextMenu={handleContextMenu}>
      <div className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer",
        "bg-[#0a0a0c]",
        "border border-white/[0.06] hover:border-violet-500/30",
        "hover:shadow-2xl hover:shadow-violet-900/20",
        "transform hover:-translate-y-1",
        isSelected && "ring-2 ring-violet-500 ring-offset-2 ring-offset-background"
      )}>
        {/* Selection checkbox */}
        {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

        {/* Context Menu */}
        <ImageContextMenu
          isOpen={contextMenu.isOpen}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          onPin={() => onPin?.(bookmark)}
          onCreateSide={() => onCreateSide?.(bookmark)}
          onDelete={() => onDelete?.(bookmark)}
          onRefresh={handleRefresh}
          onDownload={handleDownload}
          isPinned={bookmark.pinned}
          isRefreshing={isRefreshing}
        />

        {/* Pinned indicator - top left */}
        {bookmark.pinned && !selectionMode && (
          <div className="absolute top-3 left-3 z-10">
            <Pin className="w-4 h-4 text-violet-400 fill-violet-400 drop-shadow-lg" />
          </div>
        )}

        {/* Image container */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            maxHeight: isPortrait ? '400px' : undefined,
          }}
        >
          {/* Skeleton loader */}
          {!imageLoaded && !imageError && (
            <div
              className="absolute inset-0 bg-gradient-to-br from-violet-900/20 to-purple-900/20 animate-pulse"
              style={{ aspectRatio: aspectRatio }}
            />
          )}

          {/* Main image or video */}
          {!imageError ? (
            isVideo ? (
              <video
                src={imageUrl}
                autoPlay
                loop
                muted
                playsInline
                className={cn(
                  "w-full h-auto object-cover transition-all duration-500",
                  imageLoaded ? "opacity-100" : "opacity-0",
                  "group-hover:scale-[1.02]"
                )}
                style={{
                  maxHeight: isPortrait ? '400px' : undefined,
                }}
                onLoadedData={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <img
                src={imageUrl}
                alt={title || 'Image'}
                className={cn(
                  "w-full h-auto object-cover transition-all duration-500",
                  imageLoaded ? "opacity-100" : "opacity-0",
                  "group-hover:scale-[1.02]"
                )}
                style={{
                  maxHeight: isPortrait ? '400px' : undefined,
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            )
          ) : (
            <div
              className="w-full flex items-center justify-center bg-gradient-to-br from-violet-900/30 to-purple-900/30"
              style={{ aspectRatio: aspectRatio, minHeight: '150px' }}
            >
              <div className="text-center">
                <ImageIcon className="w-10 h-10 text-white/30 mx-auto mb-2" />
                <p className="text-sm text-white/40">Failed to load</p>
              </div>
            </div>
          )}

          {/* Gradient overlay - appears on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Subtle vignette effect */}
          <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.3)] pointer-events-none" />
        </div>

        {/* Type pill - bottom right corner, compact */}
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 right-0 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-tl-lg text-[10px] font-medium text-white/50 border-t border-l border-white/10 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-white hover:bg-violet-500/30 z-20"
        >
          {isVideo ? (
            <Play className="w-3 h-3 fill-current" />
          ) : (
            <ImageIcon className="w-3 h-3" />
          )}
          <span>{isVideo ? 'Video' : 'Image'}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>

        {/* Metadata overlay - slides up on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pr-28 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-8">
          <div className="flex-1 min-w-0">
            {/* Title/filename */}
            {title && (
              <p className="text-sm font-semibold text-white truncate mb-1 drop-shadow-md">
                {title}
              </p>
            )}
            {/* Source domain for linked images */}
            {isLinkedImage && sourceDomain && (
              <p className="text-[12px] text-white/60 mb-1">
                from <span className="text-white/80 font-medium">{sourceDomain}</span>
              </p>
            )}
            {/* Date and size */}
            <div className="flex items-center gap-2 text-[11px] text-white/60 font-medium">
              <span>{formatDate(bookmark.createdAt)}</span>
              {fileSize && (
                <>
                  <span className="text-white/40">·</span>
                  <span>{formatFileSize(fileSize)}</span>
                </>
              )}
              {width && height && (
                <>
                  <span className="text-white/40">·</span>
                  <span>{width}×{height}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageBookmarkCard;
