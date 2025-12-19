import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, ExternalLink, BadgeCheck, Video, MoreHorizontal, Pin, RefreshCw, Layers, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Custom Tweet Card Component
 * Renders tweets natively without Twitter widget for consistent styling
 */

// Pixie Folders color palette (same as CollectionCards)
const PIXIE_FOLDERS = [
  { name: 'yellow', color: '#F9B846', image: '/folders/folder-yellow.png' },
  { name: 'aqua', color: '#2BC4C4', image: '/folders/folder-aqua.png' },
  { name: 'blue', color: '#7B7EED', image: '/folders/folder-blue.png' },
  { name: 'purple', color: '#B687D6', image: '/folders/folder-purple.png' },
  { name: 'pink', color: '#F6639B', image: '/folders/folder-pink.png' },
  { name: 'salmon', color: '#F87171', image: '/folders/folder-salmon.png' },
  { name: 'black', color: '#2D2D2D', image: '/folders/folder-black.png' },
];

// Get consistent folder based on collection ID
const getFolderForCollection = (collectionId) => {
  const str = String(collectionId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return PIXIE_FOLDERS[Math.abs(hash) % PIXIE_FOLDERS.length];
};

const XLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Tweet Menu Button - inline in header
const TweetMenuButton = ({ onPin, onCreateSide, onDelete, onRefresh, isPinned, isRefreshing, isHovered }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = 160;
        let left = rect.right - menuWidth;
        if (left < 16) left = rect.left;

        setMenuPosition({
          top: rect.bottom + 4,
          left: left,
        });
      }
    };

    updatePosition();

    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleClick = (e, action) => {
    e.stopPropagation();
    action();
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200",
          "bg-gruvbox-bg-lighter/50 hover:bg-gruvbox-bg-lighter text-gruvbox-fg-muted hover:text-gruvbox-fg",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        title="More options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            className="fixed z-[9999] min-w-[160px] rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              background: 'linear-gradient(180deg, rgba(60, 56, 54, 0.98) 0%, rgba(40, 40, 40, 0.98) 100%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(215, 153, 33, 0.15)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
            }}
          >
            <button
              onClick={(e) => handleClick(e, onPin)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gruvbox-fg hover:bg-gruvbox-yellow/10 transition-colors"
            >
              <Pin className={cn("w-4 h-4", isPinned && "fill-current text-gruvbox-yellow")} />
              <span>{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <button
              onClick={(e) => handleClick(e, onRefresh)}
              disabled={isRefreshing}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gruvbox-fg hover:bg-gruvbox-yellow/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={(e) => handleClick(e, onCreateSide)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gruvbox-fg hover:bg-gruvbox-yellow/10 transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Add to Side</span>
            </button>
            <div className="h-px bg-gruvbox-bg-lighter/30 mx-2 my-1" />
            <button
              onClick={(e) => handleClick(e, onDelete)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gruvbox-red-light hover:bg-gruvbox-red/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

const formatCount = (count) => {
  if (!count) return '';
  const num = parseInt(count.replace(/[^0-9]/g, ''));
  if (isNaN(num)) return count;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const TweetMedia = ({ media, url, onMediaClick, selectionMode = false }) => {
  if (!media || media.length === 0) return null;

  // Get the first media item (respect the order from the tweet)
  const firstMedia = media[0];
  if (!firstMedia) return null;

  // If first media is a video
  if (firstMedia.type === 'video') {
    const posterUrl = firstMedia.poster || firstMedia.thumbnail;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => selectionMode ? e.preventDefault() : e.stopPropagation()}
        className="block mt-3 group"
      >
        <div className="relative rounded-xl overflow-hidden bg-gruvbox-bg-darkest">
          {/* Video thumbnail or placeholder */}
          {posterUrl ? (
            <img
              src={posterUrl}
              alt=""
              className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="w-full aspect-video bg-gruvbox-bg-darker flex items-center justify-center">
              <Video className="w-16 h-16 text-gruvbox-fg-muted/40" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
            <div className="w-14 h-14 rounded-full bg-gruvbox-bg-light/90 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-gruvbox-fg ml-1" fill="currentColor" />
            </div>
            <p className="text-gruvbox-fg text-sm font-medium px-4 text-center">
              Videos are shy here — tap to watch on X
            </p>
          </div>
        </div>
      </a>
    );
  }

  // First media is an image - show it as cover
  if (firstMedia.type === 'image' && firstMedia.url) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden bg-gruvbox-bg-darkest">
        <img
          src={firstMedia.url}
          alt=""
          className="w-full aspect-video object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            if (onMediaClick) {
              onMediaClick(firstMedia.url);
            } else {
              // Open image in new tab if no handler
              window.open(firstMedia.url, '_blank');
            }
          }}
        />
      </div>
    );
  }

  return null;
};

const CustomTweetCard = ({
  tweetData,
  url,
  onMediaClick,
  collection,
  selectionMode = false,
  className = '',
  // Menu props
  menuProps = null,
  isHovered = false,
}) => {
  if (!tweetData) return null;

  const {
    authorName,
    authorHandle,
    authorAvatar,
    isVerified,
    tweetText,
    tweetDate,
    tweetMedia,
    likeCount,
    retweetCount,
    replyCount,
    viewCount
  } = tweetData;

  // Clean up tweet text - remove t.co links at end
  const cleanText = tweetText?.replace(/https:\/\/t\.co\/\w+\s*$/g, '').trim() || '';

  return (
    <div className={`bg-gruvbox-bg-light rounded-xl border border-gruvbox-bg-lighter overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gruvbox-bg-lighter flex-shrink-0">
              {authorAvatar ? (
                <img
                  src={authorAvatar.replace('_bigger', '_normal')}
                  alt={authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gruvbox-fg-muted">
                  {authorName?.[0] || 'X'}
                </div>
              )}
            </div>

            {/* Author info */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gruvbox-fg truncate text-sm">
                  {authorName}
                </span>
                {isVerified && (
                  <BadgeCheck className="w-4 h-4 text-[#1d9bf0] flex-shrink-0" fill="#1d9bf0" stroke="white" strokeWidth={2} />
                )}
              </div>
              <span className="text-gruvbox-fg-muted text-sm truncate">
                {authorHandle}
              </span>
            </div>
          </div>

          {/* Menu + X Logo */}
          <div className="flex items-center gap-1.5">
            {menuProps && !selectionMode && (
              <TweetMenuButton
                onPin={menuProps.onPin}
                onCreateSide={menuProps.onCreateSide}
                onDelete={menuProps.onDelete}
                onRefresh={menuProps.onRefresh}
                isPinned={menuProps.isPinned}
                isRefreshing={menuProps.isRefreshing}
                isHovered={isHovered}
              />
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => selectionMode ? e.preventDefault() : e.stopPropagation()}
              className="text-gruvbox-fg-muted hover:text-gruvbox-fg transition-colors"
            >
              <XLogo className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Tweet text */}
        {cleanText && (
          <p className="mt-3 text-gruvbox-fg text-[15px] leading-relaxed whitespace-pre-wrap">
            {cleanText}
          </p>
        )}
      </div>

      {/* Media */}
      <div className="px-4">
        <TweetMedia media={tweetMedia} url={url} onMediaClick={onMediaClick} selectionMode={selectionMode} />
      </div>

      {/* Timestamp & Stats Footer */}
      <div className="px-4 py-3 mt-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => selectionMode ? e.preventDefault() : e.stopPropagation()}
            className="text-gruvbox-fg-muted text-sm hover:underline flex items-center gap-1 min-w-0"
          >
            {tweetDate && (
              <>
                <span className="flex-shrink-0">
                  {new Date(tweetDate).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })},
                </span>
                <span className="flex-shrink-0 font-medium">
                  {new Date(tweetDate).toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </>
            )}
          </a>

          {/* View on X button */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => selectionMode ? e.preventDefault() : e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gruvbox-bg-lighter/60 text-gruvbox-fg-muted hover:bg-gruvbox-bg-lighter hover:text-gruvbox-fg transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <span>View on</span>
            <XLogo className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Engagement stats - simplified (no view count) */}
      {(likeCount || retweetCount) && (
        <div className="px-4 py-2.5 border-t border-gruvbox-bg-lighter/60 bg-gruvbox-bg/30">
          <div className="flex items-center gap-4 text-xs">
            {retweetCount && (
              <span className="text-gruvbox-fg-muted">
                <span className="font-semibold text-gruvbox-fg">{formatCount(retweetCount)}</span> reposts
              </span>
            )}
            {likeCount && (
              <span className="text-gruvbox-fg-muted">
                <span className="font-semibold text-gruvbox-fg">{formatCount(likeCount)}</span> likes
              </span>
            )}
          </div>
        </div>
      )}

      {/* Folder stripe - full height preview */}
      {collection?.id && (() => {
        const pixieFolder = getFolderForCollection(collection.id);
        return (
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{
              backgroundColor: pixieFolder.color,
              color: pixieFolder.name === 'black' ? '#ebdbb2' : '#1d2021',
            }}
          >
            <img
              src={pixieFolder.image}
              alt=""
              className="w-10 h-10 object-contain drop-shadow-md"
            />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider opacity-70">Saved in</span>
              <span className="text-sm font-semibold">{collection.name}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CustomTweetCard;
