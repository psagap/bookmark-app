import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from "@/lib/utils";
import { ExternalLink, BookOpen, Star, User, Pin, Layers, Trash2, RefreshCw } from "lucide-react";

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

// Star rating component
const StarRating = ({ rating, maxStars = 5 }) => {
  if (!rating) return null;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(maxStars)].map((_, i) => (
          <Star key={i} className={cn("w-3 h-3", i < fullStars ? "text-amber-400 fill-amber-400" : i === fullStars && hasHalf ? "text-amber-400 fill-amber-400/50" : "text-gray-600")} />
        ))}
      </div>
      <span className="text-[11px] text-white/50">{rating.toFixed(1)}</span>
    </div>
  );
};

// Get platform from URL
const getPlatform = (url) => {
  if (url?.includes('goodreads.com')) return { name: 'Goodreads', color: '#553B08' };
  if (url?.includes('amazon.')) return { name: 'Amazon Books', color: '#FF9900' };
  if (url?.includes('books.google.')) return { name: 'Google Books', color: '#4285F4' };
  return { name: 'Book', color: '#8B4513' };
};

const BookCard = ({ bookmark, onDelete, onPin, onCreateSide, onRefresh, selectionMode, isSelected, onToggleSelect }) => {
  const { url, title, thumbnail, metadata } = bookmark;
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const author = metadata?.author;
  const rating = metadata?.rating;
  const ratingCount = metadata?.ratingCount;
  const pageCount = metadata?.pageCount;
  const publishDate = metadata?.publishDate;
  const genre = metadata?.genre;

  const platform = getPlatform(url);

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
      className={cn("absolute top-3 left-3 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer", isSelected ? "bg-white border-white" : "border-white/40 bg-black/30 hover:border-white/60")}
    >
      {isSelected && <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
    </div>
  );

  return (
    <div className="break-inside-avoid mb-4" onContextMenu={handleContextMenu}>
      <div className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer",
        "w-full bg-[#1a1512]",
        "border border-amber-900/30 hover:border-amber-700/50",
        "hover:shadow-lg hover:shadow-amber-900/20",
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

        <div className="absolute top-3 left-3 z-10">
          <BookOpen className="w-5 h-5 text-amber-600" />
        </div>

        <div className="flex justify-center pt-10 pb-4 px-4">
          {thumbnail ? (
            <div className="relative w-32 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <img src={thumbnail} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          ) : (
            <div className="relative w-32 aspect-[2/3] rounded-lg bg-gradient-to-br from-amber-900/40 to-amber-950/60 flex items-center justify-center shadow-2xl shadow-black/50 ring-1 ring-amber-800/30">
              <BookOpen className="w-12 h-12 text-amber-700/50" />
            </div>
          )}
        </div>

        <div className="px-4 pb-4 space-y-2 text-center">
          <h3 className="text-[15px] leading-[1.4] text-white/95 font-semibold line-clamp-2">{title}</h3>
          {author && <p className="text-[13px] text-amber-400/80 line-clamp-1 flex items-center justify-center gap-1"><User className="w-3 h-3" />{author}</p>}
          {rating && (
            <div className="flex items-center justify-center gap-2">
              <StarRating rating={rating} />
              {ratingCount && <span className="text-[11px] text-white/40">({ratingCount.toLocaleString()})</span>}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 text-[11px] text-white/40">
            {pageCount && <span>{pageCount} pages</span>}
            {publishDate && <span>{publishDate}</span>}
          </div>
          {genre && <p className="text-[11px] text-amber-600/60">{genre}</p>}
          <p className="text-[11px] text-white/30">on <span style={{ color: platform.color }}>{platform.name}</span></p>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 right-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tl-lg text-[10px] font-medium text-white/60 border-t border-l border-amber-900/30 bg-amber-900/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-amber-400 hover:bg-amber-800/20 z-20"
        >
          <BookOpen className="w-3 h-3" />
          <span>View</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
};

export default BookCard;
