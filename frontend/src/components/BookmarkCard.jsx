import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Play, ExternalLink, MoreHorizontal, Pin, Layers, Trash2, RefreshCw, Check, Edit3, Maximize2, Minimize2, PenLine, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import GlowingCard from './GlowingCard';
import { getTagColors, getTagColor } from '@/utils/tagColors';
import { DeletableTagPill } from './TagColorPicker';
import NoteBlockRenderer from './NoteBlockRenderer';
import { extractTagsFromContent } from '@/utils/tagExtraction';
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

// TweetMedia component - Fetches media from FxTwitter
// Uses ref-based approach to ensure video autoplay works
// Key logic: ALWAYS use FxTwitter data to determine if media exists - don't trust stored data
const TweetMedia = ({ tweetUrl }) => {
  const [videoUrl, setVideoUrl] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await fetch(`/api/twitter/video?url=${encodeURIComponent(tweetUrl)}`);
        const data = await response.json();

        if (data.success && data.videoUrl) {
          // Tweet has video - show video with FxTwitter's thumbnail as poster
          setVideoUrl(data.videoUrl);
          setThumbnailUrl(data.thumbnail || '');
        } else if (data.success && data.photos && data.photos.length > 0) {
          // Tweet has photos but no video - show the first photo from FxTwitter
          setImageUrl(data.photos[0].url);
        } else if (data.success && data.thumbnail && !data.videoUrl) {
          // Has thumbnail but no video URL - could be an image tweet
          setImageUrl(data.thumbnail);
        }
        // If none of the above, no media to show
      } catch (err) {
        console.warn('FxTwitter fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [tweetUrl]);

  // Force autoplay when video element mounts or URL changes
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [videoUrl]);

  // Still loading - show nothing
  if (loading) {
    return null;
  }

  // Has video - autoplay it using ref to ensure muted works
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
            // Force play when video data loads
            e.target.muted = true;
            e.target.play().catch(() => {});
          }}
        />
      </div>
    );
  }

  // Has image but no video - show image from FxTwitter
  if (imageUrl && !videoUrl) {
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

// Card Menu - appears as a more noticeable button
const CardMenuInline = ({ onPin, onCreateSide, onDelete, onRefresh, onEdit, isPinned, isRefreshing, variant = 'default', showEdit = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          left: Math.min(rect.left, window.innerWidth - 170),
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

  // Different styles for different card contexts
  const buttonStyles = variant === 'overlay'
    ? "menu-dots-btn w-8 h-8 flex items-center justify-center cursor-pointer rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all duration-200"
    : "menu-dots-btn w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg bg-gruvbox-bg-lighter/60 hover:bg-gruvbox-bg-lighter transition-all duration-200";

  const dotStyles = variant === 'overlay'
    ? "w-1 h-1 bg-white/80 rounded-full"
    : "w-1 h-1 bg-gruvbox-fg-muted rounded-full";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={buttonStyles}
      >
        <span className={cn(dotStyles, "relative inline-block")}>
          <span className="absolute -left-2 top-0 w-1 h-1 bg-current rounded-full" />
          <span className="absolute left-2 top-0 w-1 h-1 bg-current rounded-full" />
        </span>
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
            className="fixed z-[9999] min-w-[160px] rounded-xl overflow-hidden"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              background: 'linear-gradient(180deg, var(--theme-bg-light) 0%, var(--theme-bg-dark) 100%)',
              border: '1px solid hsl(var(--border) / 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.2)',
            }}
          >
            {showEdit && onEdit && (
              <button
                onClick={(e) => handleClick(e, onEdit)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gruvbox-fg hover:bg-white/10 hover:text-gruvbox-yellow transition-all duration-150"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={(e) => handleClick(e, onPin)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gruvbox-fg hover:bg-white/10 hover:text-gruvbox-yellow transition-all duration-150"
            >
              <Pin className={cn("w-4 h-4", isPinned && "fill-current text-gruvbox-yellow")} />
              <span>{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <button
              onClick={(e) => handleClick(e, onRefresh)}
              disabled={isRefreshing}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gruvbox-fg hover:bg-white/10 hover:text-gruvbox-yellow transition-all duration-150 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={(e) => handleClick(e, onCreateSide)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gruvbox-fg hover:bg-white/10 hover:text-gruvbox-yellow transition-all duration-150"
            >
              <Layers className="w-4 h-4" />
              <span>Add to Side</span>
            </button>
            <div className="h-px bg-white/10 mx-3 my-1" />
            <button
              onClick={(e) => handleClick(e, onDelete)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gruvbox-red-light hover:bg-gruvbox-red/20 transition-all duration-150"
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

const BookmarkCard = ({ bookmark, onDelete, onPin, onCreateSide, onRefresh, onUpdate, onOpenEditor, selectionMode, isSelected, onToggleSelect, collection, onTagClick, onTagDelete }) => {
  const { title, url, thumbnail, category, notes, content, type, metadata } = bookmark;
  // Support both 'notes' and 'content' field names
  const noteData = notes || content;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.(bookmark);
    } finally {
      setIsRefreshing(false);
    }
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
  const isNote = type === 'note' || url?.startsWith('note://') || (!url && (noteData || title));

  // Get domain for display
  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  // Note Card - Warm, calm design with subtle amber accent
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  if (isNote) {
    const noteContent = noteData || title || '';
    const hasContent = noteContent.trim().length > 0;

    // Extract tags from note content
    const extractedTags = extractTagsFromContent(noteContent);
    // Also check bookmark.tags array (for manually added tags) - normalize to lowercase
    const allTags = [...new Set([...extractedTags, ...(bookmark.tags || []).map(t => t.toLowerCase())])];

    // Format date
    const formatNoteDate = (dateString) => {
      if (!dateString) return '';
      const d = new Date(dateString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    // Check if content is long enough to need expand button
    const contentLength = noteContent.length;
    const needsExpand = contentLength > 300;

    return (
      <div
        className="break-inside-avoid mb-4"
        onClick={(e) => {
          e.stopPropagation();
          if (!selectionMode) {
            handleOpenEditor();
          }
        }}
      >
        <div className={cn(
          "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer h-auto",
          "w-full bg-[#12120f]",
          "border border-amber-900/20 hover:border-amber-700/30",
          "hover:shadow-lg hover:shadow-amber-950/20",
          isSelected && "ring-2 ring-amber-500 ring-offset-2 ring-offset-background"
        )}>
          {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

          {/* Menu - Top Right, only on hover */}
          {!selectionMode && (
            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <CardMenuInline
                onPin={() => onPin?.(bookmark)}
                onCreateSide={() => onCreateSide?.(bookmark)}
                onDelete={() => onDelete?.(bookmark)}
                onRefresh={handleRefresh}
                onEdit={handleOpenEditor}
                isPinned={bookmark.pinned}
                isRefreshing={isRefreshing}
                showEdit={true}
                variant="overlay"
              />
            </div>
          )}

          {/* Note icon - top left */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <PenLine className="w-6 h-6 text-amber-500/70" />
            {bookmark.pinned && !selectionMode && (
              <Pin className="w-4 h-4 text-amber-400/70 fill-amber-400/70" />
            )}
          </div>

          {/* Content area */}
          <div className="pt-10 px-4 pb-3">
            {hasContent ? (
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-out",
                  isCardExpanded ? "max-h-[500px]" : "max-h-[180px]"
                )}
              >
                <div className="text-[15px] leading-[1.7] text-white/85 break-words">
                  <NoteBlockRenderer content={noteContent} compact={true} />
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-white/30 italic">
                Empty note
              </p>
            )}

            {/* Expand button - inline */}
            {needsExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCardExpanded(!isCardExpanded);
                }}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-500/60 hover:text-amber-400 transition-colors"
              >
                {isCardExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Show more</span>
                  </>
                )}
              </button>
            )}

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <DeletableTagPill
                    key={tag}
                    tag={tag}
                    size="small"
                    actionIcon="menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(tag);
                    }}
                    onDelete={onTagDelete ? (tagToDelete) => {
                      onTagDelete(bookmark, tagToDelete);
                    } : undefined}
                    showColorPicker={true}
                  />
                ))}
              </div>
            )}

            {/* Date */}
            <p className="mt-3 text-[11px] text-white/25">
              {formatNoteDate(bookmark.createdAt)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tweet Card - Clean black design with X logo top-left
  // TweetMedia component always fetches from FxTwitter to get video/image
  if (isTweet) {
    const tweetData = metadata?.tweetData;

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
      <div className="break-inside-avoid mb-4">
        <div className={cn(
          "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer h-auto",
          "w-full bg-[#000000]",
          "border border-white/[0.08] hover:border-white/20",
          "hover:shadow-xl hover:shadow-black/50",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}>
          {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

          {/* Menu - Top Right, only on hover */}
          {!selectionMode && (
            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <CardMenuInline
                onPin={() => onPin?.(bookmark)}
                onCreateSide={() => onCreateSide?.(bookmark)}
                onDelete={() => onDelete?.(bookmark)}
                onRefresh={handleRefresh}
                isPinned={bookmark.pinned}
                isRefreshing={isRefreshing}
                variant="overlay"
              />
            </div>
          )}

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

            {/* Tweet media - fetches from FxTwitter to get correct video/image */}
            <TweetMedia tweetUrl={url} />

            {/* Author attribution - directly after content */}
            {authorName && (
              <p className="mt-3 text-[11px] text-white/35">
                by {authorName}
              </p>
            )}
          </div>

          {/* Hover link - bottom right */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 right-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-tl-xl text-[11px] font-medium text-white/60 border-t border-l border-white/10 bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-white hover:bg-white/10 z-20"
          >
            <XLogo className="w-3.5 h-3.5" />
            <span>View on X</span>
            <ExternalLink className="w-3 h-3" />
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
      <div className="break-inside-avoid mb-4">
        <div className={cn(
          "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer h-auto",
          "w-full bg-[#0f0f0f]",
          "border border-white/[0.08] hover:border-red-500/30",
          "hover:shadow-xl hover:shadow-red-900/20",
          isSelected && "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
        )}>
          {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

          {/* Menu - Top Right, only on hover */}
          {!selectionMode && (
            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <CardMenuInline
                onPin={() => onPin?.(bookmark)}
                onCreateSide={() => onCreateSide?.(bookmark)}
                onDelete={() => onDelete?.(bookmark)}
                onRefresh={handleRefresh}
                isPinned={bookmark.pinned}
                isRefreshing={isRefreshing}
                variant="overlay"
              />
            </div>
          )}

          {/* YouTube Logo - top left */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500/80" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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
            className="absolute bottom-0 right-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-tl-xl text-[11px] font-medium text-white/60 border-t border-l border-white/10 bg-white/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-white hover:bg-red-500/20 z-20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // Article/Webpage Card - Calm, minimal dark design matching X card aesthetic
  return (
    <div className="break-inside-avoid mb-4">
      <div className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer h-auto",
        "w-full bg-[#0a0a0a]",
        "border border-white/[0.06] hover:border-white/15",
        "hover:shadow-lg hover:shadow-black/40",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}>
        {selectionMode && <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />}

        {/* Menu - Top Right, only on hover */}
        {!selectionMode && (
          <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <CardMenuInline
              onPin={() => onPin?.(bookmark)}
              onCreateSide={() => onCreateSide?.(bookmark)}
              onDelete={() => onDelete?.(bookmark)}
              onRefresh={handleRefresh}
              isPinned={bookmark.pinned}
              isRefreshing={isRefreshing}
              variant="overlay"
            />
          </div>
        )}

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
          className="absolute bottom-0 right-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-tl-xl text-[11px] font-medium text-white/50 border-t border-l border-white/[0.06] bg-white/[0.02] backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-white/80 hover:bg-white/5 z-20"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Read</span>
        </a>
      </div>
    </div>
  );
};

export default BookmarkCard;
