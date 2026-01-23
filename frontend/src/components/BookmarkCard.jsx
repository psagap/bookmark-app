import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Play, ExternalLink, Pin, Layers, Trash2, RefreshCw, Check, Edit3, PenLine, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import GlowingCard from './GlowingCard';
import { getTagColors, getTagColor } from '@/utils/tagColors';
import { DeletableTagPill } from './TagColorPicker';
import NoteBlockRenderer from './NoteBlockRenderer';
import { extractTagsFromContent } from '@/utils/tagExtraction';
import ImageBookmarkCard from './ImageBookmarkCard';
import AudioNoteCard from './AudioNoteCard';
// New smart card components
import MusicCard from './MusicCard';
import ProductCard from './ProductCard';
import BookCard from './BookCard';
import RecipeCard from './RecipeCard';
// X Logo SVG Component
const XLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// YouTube Channel Name component - fetches from oEmbed API
const YouTubeChannelName = ({ videoUrl }) => {
  const [channelName, setChannelName] = useState(null);

  useEffect(() => {
    const fetchChannelName = async () => {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.author_name) {
            setChannelName(data.author_name);
          }
        }
      } catch (err) {
        // Silently fail - channel name is optional
      }
    };
    fetchChannelName();
  }, [videoUrl]);

  if (!channelName) return null;

  return (
    <p className="mt-2 text-[12px] text-white/40">
      by <span className="text-white/55">{channelName}</span>
    </p>
  );
};

// TweetMedia component - Shows tweet media with fallback to stored data
// Priority: 1) Stored data (immediate display), 2) Fresh fetch from FxTwitter
// This ensures media persists even when FxTwitter API is unavailable
const TweetMedia = ({ tweetUrl, storedVideoUrl, storedImageUrl, storedThumbnail }) => {
  // Initialize with stored data for immediate display
  const [videoUrl, setVideoUrl] = useState(storedVideoUrl || null);
  const [imageUrl, setImageUrl] = useState(storedImageUrl || null);
  const [thumbnailUrl, setThumbnailUrl] = useState(storedThumbnail || '');
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  // Fetch fresh data from FxTwitter
  useEffect(() => {
    let cancelled = false;

    const fetchMedia = async () => {
      try {
        const response = await fetch(`/api/twitter/video?url=${encodeURIComponent(tweetUrl)}`);
        const data = await response.json();

        if (cancelled) return;

        if (data.success && data.videoUrl) {
          // Tweet has video
          setVideoUrl(data.videoUrl);
          setThumbnailUrl(data.thumbnail || '');
          setImageUrl(null);
        } else if (data.success && data.photos && data.photos.length > 0) {
          // Tweet has photos but no video
          setImageUrl(data.photos[0].url);
          setVideoUrl(null);
        } else if (data.success && data.thumbnail && !data.videoUrl) {
          // Has thumbnail but no video URL - could be an image tweet
          setImageUrl(data.thumbnail);
          setVideoUrl(null);
        }
        // If API returns nothing, keep using stored data (don't clear)
      } catch (err) {
        console.warn('FxTwitter fetch failed, using stored data:', err);
        // Keep using stored data on error
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchMedia();

    return () => {
      cancelled = true;
    };
  }, [tweetUrl]);

  // Force autoplay when video element mounts or URL changes
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => { });
    }
  }, [videoUrl]);

  // Has video - autoplay it
  if (videoUrl) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden aspect-video bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          onLoadedData={(e) => {
            e.target.muted = true;
            e.target.play().catch(() => { });
          }}
        />
      </div>
    );
  }

  // Has image - show image
  if (imageUrl) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden">
        <img
          src={imageUrl}
          alt=""
          className="w-full h-auto object-cover max-h-[300px]"
        />
      </div>
    );
  }

  // Still loading and no stored data - show nothing
  if (loading) {
    return null;
  }

  // No media to show
  return null;
};

// Date Badge Component - styled like the example
const DateBadge = ({ date, variant = 'corner' }) => {
  if (!date) return null;

  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();

  if (variant === 'corner') {
    return (
      <div className="absolute top-0 left-0 z-10 bg-gruvbox-aqua text-white px-3 py-2 shadow-lg">
        <span className="block text-center text-2xl font-bold drop-shadow-sm">{day}</span>
        <span className="block text-center text-[10px] uppercase tracking-wider">{month}</span>
        <span className="block text-center text-[10px]">{year}</span>
      </div>
    );
  }

  // Inline variant for overlay cards
  return (
    <span className="text-xs text-white/80">
      {day} {month} {year}
    </span>
  );
};

// Full timestamp format - like tweets (e.g., "3:45 PM · Dec 4, 2025")
const formatFullTimestamp = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const SelectionCheckbox = ({ isSelected, onToggle }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className={cn(
      "absolute top-3 right-3 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200",
      isSelected
        ? "bg-gruvbox-yellow border-gruvbox-yellow"
        : "bg-gruvbox-bg-dark/80 border-gruvbox-yellow/50 hover:border-gruvbox-yellow-light"
    )}
  >
    {isSelected && <Check className="w-4 h-4 text-gruvbox-bg-darkest" strokeWidth={3} />}
  </div>
);

// Collection glow effect - subtle border glow in collection's color
const CollectionGlow = ({ collection }) => {
  if (!collection) return null;

  return (
    <>
      {/* Outer glow effect */}
      <div
        className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${collection.color}40, ${collection.color}20, ${collection.color}40)`,
          filter: 'blur(4px)',
        }}
      />
      {/* Inner subtle border */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 0 1px ${collection.color}30, 0 0 20px ${collection.color}15`,
        }}
      />
    </>
  );
};

// Context Menu - appears on right-click
const CardContextMenu = ({ isOpen, position, onClose, onPin, onCreateSide, onDelete, onRefresh, onEdit, isPinned, isRefreshing, showEdit = false }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => onClose();
    const handleClickOutside = () => onClose();
    const handleContextMenu = () => onClose(); // Close when right-clicking elsewhere

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

  // Adjust position to keep menu in viewport
  const menuWidth = 200;
  const menuHeight = showEdit ? 280 : 240;
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
      {showEdit && onEdit && (
        <button
          onClick={(e) => handleClick(e, onEdit)}
          className="w-full flex items-center gap-3.5 px-5 py-3 text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          <Edit3 className="w-5 h-5" />
          <span>Edit</span>
        </button>
      )}
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
        <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
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

// Export context menu for use in other card components
export { CardContextMenu };

const BookmarkCard = ({ bookmark, onDelete, onPin, onCreateSide, onRefresh, onUpdate, onOpenEditor, onCardClick, selectionMode, isSelected, onToggleSelect, collection, onTagClick, onTagDelete }) => {
  const { title, url, thumbnail, category, notes, content, type, metadata } = bookmark;
  // Support both 'notes' and 'content' field names
  const noteData = notes || content;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0 });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.(bookmark);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleContextMenu = (e) => {
    if (selectionMode) return;
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  // Open editor modal when card is clicked
  const handleOpenEditor = () => {
    if (onOpenEditor) {
      onOpenEditor(bookmark);
    }
  };

  // Determine card type based on content
  const isVideo = url?.includes('youtube.com') || url?.includes('youtu.be');
  const isTweet = url?.includes('twitter.com') || url?.includes('x.com');
  const isAudioNote = type === 'audio-note' || url?.startsWith('audio-note://');
  const isNote = type === 'note' || url?.startsWith('note://') || (!url && (noteData || title));

  // Get domain for display
  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  // Note Card - MyMind Sticky Note Style with folded corner
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isMouseActive, setIsMouseActive] = useState(false);
  const mouseTimeoutRef = useRef(null);

  // Mouse activity tracking for expand button visibility
  const handleMouseActivity = () => {
    setIsMouseActive(true);
    // Clear any existing timeout
    if (mouseTimeoutRef.current) {
      clearTimeout(mouseTimeoutRef.current);
    }
    // Hide after 3 seconds of inactivity
    mouseTimeoutRef.current = setTimeout(() => {
      setIsMouseActive(false);
    }, 3000);
  };

  const handleCardMouseLeave = () => {
    if (mouseTimeoutRef.current) {
      clearTimeout(mouseTimeoutRef.current);
    }
    setIsMouseActive(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }
    };
  }, []);

  // Audio Note Card - distinctive design for voice notes
  if (isAudioNote) {
    return (
      <AudioNoteCard
        bookmark={bookmark}
        onDelete={onDelete}
        onPin={onPin}
        onCardClick={onCardClick}
        onOpenEditor={onOpenEditor}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  if (isNote) {
    // Prefer HTML content (from Lexical editor) for rich text rendering, fall back to plain text
    const noteContent = bookmark.notesHtml || noteData || title || '';
    const hasContent = noteContent.trim().length > 0;

    // Extract tags from note content
    const extractedTags = extractTagsFromContent(noteContent);
    // Also check bookmark.tags array (for manually added tags) - normalize to lowercase
    const allTags = [...new Set([...extractedTags, ...(bookmark.tags || []).map(t => t.toLowerCase())])];

    // Check if content is long enough to need expand button
    const contentLength = noteContent.length;
    const needsExpand = contentLength > 500;

    return (
      <div
        className="break-inside-avoid mb-4"
        onClick={(e) => {
          e.stopPropagation();
          if (!selectionMode) {
            handleOpenEditor();
          }
        }}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseActivity}
        onMouseEnter={handleMouseActivity}
        onMouseLeave={handleCardMouseLeave}
      >
        {/* Note Card - Modern, calm solid color design */}
        <div className={cn(
          "group relative cursor-pointer",
          "w-full max-w-[320px]",
          "transition-all duration-200 ease-out",
          "hover:translate-y-[-2px]",
          isSelected && "ring-2 ring-primary/70 ring-offset-2 ring-offset-background"
        )}
          style={{
            background: 'var(--note-bg)',
            borderRadius: '14px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}>

          {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

          {/* Context Menu */}
          <CardContextMenu
            isOpen={contextMenu.isOpen}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={closeContextMenu}
            onPin={() => onPin?.(bookmark)}
            onCreateSide={() => onCreateSide?.(bookmark)}
            onDelete={() => onDelete?.(bookmark)}
            onRefresh={handleRefresh}
            onEdit={handleOpenEditor}
            isPinned={bookmark.pinned}
            isRefreshing={isRefreshing}
            showEdit={true}
          />

          {/* Pin indicator - top right, subtle */}
          {bookmark.pinned && !selectionMode && (
            <div className="absolute top-3 right-3 z-10">
              <Pin className="w-3.5 h-3.5" style={{ color: 'var(--note-accent)', fill: 'var(--note-accent)', opacity: 0.7 }} />
            </div>
          )}

          {/* Content area - tight padding */}
          <div className="px-4 pt-4 pb-3">
            {hasContent ? (
              <div
                className={cn(
                  "transition-all duration-300 ease-out note-scroll-area",
                  isCardExpanded
                    ? "max-h-[600px] overflow-y-auto"
                    : "max-h-[360px] overflow-hidden"
                )}
              >
                {/* Render note content with minimal styling */}
                <div className="sticky-note-content-renderer">
                  <NoteBlockRenderer content={noteContent} compact={true} />
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 400, fontStyle: 'italic', color: 'var(--note-text)', opacity: 0.5 }}>
                Empty note...
              </p>
            )}
          </div>

          {/* Floating expand button - bottom right, only on mouse activity */}
          {needsExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCardExpanded(!isCardExpanded);
              }}
              className={cn(
                "absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-200",
                isMouseActive ? "opacity-100" : "opacity-0"
              )}
              style={{
                background: 'var(--note-accent)',
                color: 'var(--note-bg)',
                fontSize: '10px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                letterSpacing: '0.02em'
              }}
            >
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform duration-200",
                isCardExpanded && "rotate-180"
              )} />
              <span>{isCardExpanded ? 'Less' : 'More'}</span>
            </button>
          )}

          {/* Clean note content styles */}
          <style>{`
            .sticky-note-content-renderer .zen-blocks {
              padding-left: 0;
            }
            .sticky-note-content-renderer .zen-block-h1,
            .sticky-note-content-renderer .zen-block-h2,
            .sticky-note-content-renderer .zen-block-h3 {
              color: var(--note-heading);
            }
            .sticky-note-content-renderer .zen-block-paragraph,
            .sticky-note-content-renderer .zen-block-bullet-text,
            .sticky-note-content-renderer .zen-block-numbered-text,
            .sticky-note-content-renderer .zen-block-todo-text {
              color: var(--note-text);
            }
            .sticky-note-content-renderer .zen-block-bullet-dot {
              background: var(--note-accent);
              border: none;
            }
            .sticky-note-content-renderer .zen-block-bullet-dot--nested {
              background: transparent;
              border: 1.5px solid var(--note-accent);
              opacity: 0.6;
            }
            .sticky-note-content-renderer .zen-block-number {
              color: var(--note-accent);
            }
            .sticky-note-content-renderer .zen-block-checkbox {
              border-color: var(--note-text);
              opacity: 0.4;
            }
            .sticky-note-content-renderer .zen-block-checkbox--checked {
              background: var(--note-accent);
              border-color: var(--note-accent);
              opacity: 1;
            }
            .sticky-note-content-renderer .zen-block-quote {
              border-left-color: var(--note-accent);
              background: rgba(0, 0, 0, 0.04);
              color: var(--note-text);
            }
            .sticky-note-content-renderer .zen-block-code {
              background: rgba(15, 23, 42, 0.9);
              color: #e2e8f0;
              border: 1px solid rgba(148, 163, 184, 0.2);
              box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
            }
            .sticky-note-content-renderer .zen-block-divider {
              background: var(--note-divider);
              opacity: 0.3;
            }
            .sticky-note-content-renderer .inline-code {
              background: rgba(15, 23, 42, 0.7);
              color: #f59e0b;
              padding: 0.1em 0.35em;
              border-radius: 3px;
            }
            .sticky-note-content-renderer strong {
              color: var(--note-heading);
            }
            .sticky-note-content-renderer a {
              color: var(--note-accent);
            }
            /* Hairline scrollbar for note cards */
            .note-scroll-area::-webkit-scrollbar {
              width: 2px !important;
            }
            .note-scroll-area::-webkit-scrollbar-track {
              background: transparent !important;
            }
            .note-scroll-area::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.15) !important;
              border-radius: 1px !important;
            }
            .note-scroll-area::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3) !important;
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Tweet Card - Clean black design with X logo top-left
  // TweetMedia component uses stored data + fetches fresh from FxTwitter
  if (isTweet) {
    const tweetData = metadata?.tweetData;

    // Extract stored media URLs from tweetData for fallback/immediate display
    const storedMedia = tweetData?.tweetMedia?.[0];
    const storedVideoUrl = tweetData?.fxTwitterVideoUrl || storedMedia?.fxTwitterUrl || storedMedia?.url || null;
    const storedImageUrl = tweetData?.tweetMedia?.find(m => m.type === 'photo')?.url || null;
    const storedThumbnail = storedMedia?.poster || tweetData?.fxTwitterThumbnail || '';

    // Clean tweet text - extract just the tweet content
    // Title format is often: "Author on X: "Tweet text" / X"
    let cleanText = tweetData?.tweetText || title || '';

    // Extract tweet text from title format: "Author on X: "text" / X"
    const titleMatch = cleanText.match(/on X: [""](.+)[""] \/ X$/);
    if (titleMatch) {
      cleanText = titleMatch[1];
    }

    // Remove t.co links and clean up whitespace
    cleanText = cleanText
      .replace(/https?:\/\/t\.co\/\w+/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'View on X';

    // Get author name from various sources
    const authorName = tweetData?.authorName
      || tweetData?.authorHandle?.replace(/^@/, '')
      || url?.match(/(?:twitter|x)\.com\/(@?\w+)\/status/)?.[1]?.replace(/^@/, '')
      || null;

    return (
      <div className="break-inside-avoid mb-4" onContextMenu={handleContextMenu}>
        <div className={cn(
          "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer h-auto",
          "w-full bg-[#000000]",
          "border border-white/[0.08] hover:border-white/20",
          "hover:shadow-xl hover:shadow-black/50",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}>
          {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

          {/* Context Menu */}
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

          {/* X Logo - top left */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <XLogo className="w-5 h-5 text-white/60" />
            {bookmark.pinned && !selectionMode && (
              <Pin className="w-4 h-4 text-white/70 fill-white/70" />
            )}
          </div>

          {/* Content area - compact, no extra space */}
          <div className="pt-10 px-4 pb-3">
            {/* Tweet text */}
            <p className="text-[14px] leading-[1.6] text-white/90 whitespace-pre-wrap font-normal">
              {cleanText}
            </p>

            {/* Tweet media - uses stored data + fetches fresh from FxTwitter for reliability */}
            <TweetMedia
              tweetUrl={url}
              storedVideoUrl={storedVideoUrl}
              storedImageUrl={storedImageUrl}
              storedThumbnail={storedThumbnail}
            />

            {/* Author attribution - directly after content */}
            {authorName && (
              <p className="mt-3 text-[11px] text-white/35">
                by {authorName}
              </p>
            )}
          </div>

          {/* Hover link - bottom right, compact */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 right-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tl-lg text-[10px] font-medium text-white/50 border-t border-l border-white/10 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-white hover:bg-white/10 z-20"
          >
            <XLogo className="w-3 h-3" />
            <span>View</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    );
  }

  // YouTube Video Card - Dark minimal design matching X card aesthetic
  if (isVideo) {
    const getYoutubeVideoId = (url) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };
    const videoId = getYoutubeVideoId(url);
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : thumbnail;
    // Clean up YouTube title - remove notification count and " - YouTube" suffix
    const cleanTitle = title?.replace(/^\(\d+\)\s*/, '').replace(/ - YouTube$/, '').trim();

    return (
      <div className="break-inside-avoid mb-4" onContextMenu={handleContextMenu}>
        <div className={cn(
          "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer h-auto",
          "w-full bg-[#0f0f0f]",
          "border border-white/[0.08] hover:border-red-500/40",
          isSelected && "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
        )}>
          {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

          {/* Context Menu */}
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

          {/* YouTube Logo - top left */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500/80" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            {bookmark.pinned && !selectionMode && (
              <Pin className="w-4 h-4 text-white/70 fill-white/70" />
            )}
          </div>

          {/* Thumbnail with play button overlay */}
          {thumbnailUrl && (
            <div className="relative aspect-video mt-10 mx-3 rounded-lg overflow-hidden bg-black">
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="px-4 py-3">
            {/* Video title - bold heading */}
            <h3 className="text-[15px] leading-[1.5] text-white/95 font-medium line-clamp-2">
              {cleanTitle}
            </h3>

            {/* Channel attribution - fetched from YouTube oEmbed */}
            <YouTubeChannelName videoUrl={url} />
          </div>

          {/* Hover link - bottom right */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 right-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tl-lg text-[10px] font-medium text-white/60 border-t border-l border-white/10 bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-white hover:bg-red-500/20 z-20"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Watch</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    );
  }

  // Music Card - Spotify, Apple Music, SoundCloud, Bandcamp
  const isMusic = category === 'audio' ||
    url?.includes('spotify.com') ||
    url?.includes('music.apple.com') ||
    url?.includes('soundcloud.com') ||
    url?.includes('bandcamp.com');
  if (isMusic) {
    return (
      <MusicCard
        bookmark={bookmark}
        onDelete={onDelete}
        onPin={onPin}
        onCreateSide={onCreateSide}
        onRefresh={onRefresh}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  // Product Card - Amazon, eBay, shopping sites
  const isProduct = category === 'product' ||
    metadata?.contentType === 'product' ||
    metadata?.price !== undefined ||
    (url?.includes('amazon.') && url?.includes('/dp/')) ||
    url?.includes('ebay.') && url?.includes('/itm/') ||
    url?.includes('etsy.com/listing/');
  if (isProduct) {
    return (
      <ProductCard
        bookmark={bookmark}
        onDelete={onDelete}
        onPin={onPin}
        onCreateSide={onCreateSide}
        onRefresh={onRefresh}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  // Book Card - Goodreads, books
  const isBook = bookmark.subCategory === 'book' ||
    metadata?.contentType === 'book' ||
    url?.includes('goodreads.com/book/') ||
    url?.includes('books.google.com');
  if (isBook) {
    return (
      <BookCard
        bookmark={bookmark}
        onDelete={onDelete}
        onPin={onPin}
        onCreateSide={onCreateSide}
        onRefresh={onRefresh}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  // Recipe Card - Cooking sites (check BEFORE image to catch recipe sites with images)
  const isRecipe = metadata?.contentType === 'recipe' ||
    metadata?.cookTime !== undefined ||
    metadata?.ingredients !== undefined ||
    category === 'recipe' ||
    bookmark.subCategory === 'recipe' ||
    // Major recipe sites
    url?.includes('allrecipes.com') ||
    url?.includes('seriouseats.com') ||
    url?.includes('epicurious.com') ||
    url?.includes('food52.com') ||
    url?.includes('bonappetit.com') ||
    url?.includes('foodnetwork.com') ||
    url?.includes('tasty.co') ||
    url?.includes('delish.com') ||
    url?.includes('simplyrecipes.com') ||
    url?.includes('cookinglight.com') ||
    url?.includes('eatingwell.com') ||
    url?.includes('myrecipes.com') ||
    url?.includes('thekitchn.com') ||
    url?.includes('food.com') ||
    url?.includes('yummly.com') ||
    url?.includes('bbcgoodfood.com') ||
    url?.includes('jamieoliver.com') ||
    url?.includes('budgetbytes.com') ||
    url?.includes('minimalistbaker.com') ||
    url?.includes('halfbakedharvest.com') ||
    url?.includes('skinnytaste.com') ||
    url?.includes('pinchofyum.com') ||
    url?.includes('sallysbakingaddiction.com') ||
    url?.includes('kingarthurbaking.com') ||
    url?.includes('recipetineats.com') ||
    url?.includes('gimmesomeoven.com') ||
    url?.includes('damndelicious.net') ||
    url?.includes('cafedelites.com') ||
    url?.includes('smittenkitchen.com') ||
    url?.includes('101cookbooks.com') ||
    url?.includes('loveandlemons.com') ||
    url?.includes('cookieandkate.com') ||
    url?.includes('hostthetoast.com') ||
    // URL patterns that indicate recipes
    /\/recipes?\//.test(url) ||
    /\/cooking\//.test(url);
  if (isRecipe) {
    return (
      <RecipeCard
        bookmark={bookmark}
        onDelete={onDelete}
        onPin={onPin}
        onCreateSide={onCreateSide}
        onRefresh={onRefresh}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  // Image Card - Artsy full-bleed design
  // Catches: type='image', category='image', direct image URLs, and image-focused sites
  const isImage = type === 'image' ||
    category === 'image' ||
    bookmark.subCategory === 'image' ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url) ||
    url?.includes('midjourney.com') ||
    url?.includes('imgur.com') ||
    url?.includes('unsplash.com') ||
    url?.includes('pexels.com') ||
    url?.includes('flickr.com') ||
    url?.includes('500px.com') ||
    url?.includes('deviantart.com') ||
    url?.includes('artstation.com') ||
    url?.includes('dribbble.com') ||
    url?.includes('behance.net');
  if (isImage) {
    return (
      <ImageBookmarkCard
        bookmark={bookmark}
        onDelete={onDelete}
        onPin={onPin}
        onCreateSide={onCreateSide}
        onRefresh={onRefresh}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  // Article/Webpage Card - Calm, minimal dark design matching X card aesthetic
  return (
    <div className="break-inside-avoid mb-4" onContextMenu={handleContextMenu}>
      <div className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer h-auto",
        "w-full bg-[#0a0a0a]",
        "border border-white/[0.06] hover:border-white/15",
        "hover:shadow-lg hover:shadow-black/40",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}>
        {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

        {/* Context Menu */}
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

        {/* Favicon/Link icon - top left */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <img
            src={`https://www.google.com/s2/favicons?domain=${url}&sz=64`}
            alt=""
            className="w-5 h-5 rounded opacity-70"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {bookmark.pinned && !selectionMode && (
            <Pin className="w-4 h-4 text-white/70 fill-white/70" />
          )}
        </div>

        {/* Thumbnail - if available */}
        {thumbnail && (
          <div className="relative aspect-[16/9] mt-10 mx-3 rounded-lg overflow-hidden bg-black/50">
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover opacity-90"
            />
          </div>
        )}

        {/* Content area */}
        <div className={cn("px-4 pb-3", thumbnail ? "pt-3" : "pt-10")}>
          {/* Title - bold heading */}
          <h3 className="text-[15px] leading-[1.5] text-white/95 font-medium line-clamp-2">
            {title}
          </h3>

          {/* Description - subtle, only if no thumbnail */}
          {!thumbnail && (noteData || metadata?.ogDescription) && (
            <p className="mt-2 text-[13px] leading-relaxed text-white/50 line-clamp-2">
              {noteData || metadata?.ogDescription}
            </p>
          )}

          {/* Source attribution */}
          <p className="mt-2 text-[12px] text-white/35">
            from <span className="font-medium">{getDomain(url)}</span>
          </p>
        </div>

        {/* Hover link - bottom right */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 right-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tl-lg text-[10px] font-medium text-white/50 border-t border-l border-white/[0.06] bg-white/[0.02] backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-white/80 hover:bg-white/5 z-20"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Read</span>
        </a>
      </div>
    </div>
  );
};

export default BookmarkCard;
