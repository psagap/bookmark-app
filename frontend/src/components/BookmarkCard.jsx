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

  // Note Card - Modern minimal design matching InlineNoteComposer
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  if (isNote) {
    const noteContent = noteData || title || '';
    const hasContent = noteContent.trim().length > 0;

    // Extract tags from note content
    const extractedTags = extractTagsFromContent(noteContent);
    // Also check bookmark.tags array (for manually added tags) - normalize to lowercase
    const allTags = [...new Set([...extractedTags, ...(bookmark.tags || []).map(t => t.toLowerCase())])];

    // Format date with time
    const formatNoteDate = (dateString) => {
      if (!dateString) return '';
      const d = new Date(dateString);
      return d.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
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
        <div
          className={cn(
            "note-card-modern group relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer",
            isSelected && "ring-2 ring-gruvbox-yellow ring-offset-2 ring-offset-gruvbox-bg-darkest"
          )}
          style={{
            background: 'linear-gradient(165deg, var(--theme-bg-light) 0%, var(--theme-bg) 50%, var(--theme-bg-dark) 100%)',
            border: '1px solid hsl(var(--border) / 0.2)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
          }}
        >
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(var(--glow-color-rgb), 0.06) 0%, transparent 60%)',
            }}
          />

          {selectionMode && (
            <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />
          )}

          {/* Pin indicator */}
          {bookmark.pinned && !selectionMode && (
            <div className="absolute top-3 left-3 z-10">
              <Pin className="w-3.5 h-3.5 text-gruvbox-yellow/70 fill-gruvbox-yellow/70" />
            </div>
          )}

          {/* Content area */}
          <div className="relative z-[1] p-4">
            {hasContent ? (
              <div
                className={cn(
                  "overflow-x-hidden overflow-y-auto note-scroll-area transition-all duration-300 ease-out",
                  isCardExpanded ? "max-h-[500px]" : "max-h-[200px]"
                )}
              >
                <div className="text-[15px] leading-relaxed text-foreground/90 break-words">
                  <NoteBlockRenderer content={noteContent} compact={true} />
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground/50">
                  Empty note
                </p>
              </div>
            )}
          </div>

          {/* Tags section - above footer */}
          {allTags.length > 0 && (
            <div className="relative z-[1] px-4 pb-3 flex flex-wrap gap-1.5">
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

          {/* Footer with date, expand button, and menu */}
          <div
            className="relative z-[1] px-4 py-2.5 border-t flex items-center justify-between"
            style={{ borderColor: 'hsl(var(--border) / 0.15)' }}
          >
            <span className="text-[11px] font-medium text-muted-foreground/60 tracking-wide">
              {formatNoteDate(bookmark.createdAt)}
            </span>

            {/* Right side: expand button + menu */}
            <div className="flex items-center gap-1">
              {/* Expand/Collapse button */}
              {needsExpand && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCardExpanded(!isCardExpanded);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground/70 hover:text-primary/90 hover:bg-primary/10 transition-all duration-200"
                >
                  {isCardExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      <span>Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      <span>More</span>
                    </>
                  )}
                </button>
              )}

              {/* Menu - in footer, shows on hover */}
              {!selectionMode && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <CardMenuInline
                    onPin={() => onPin?.(bookmark)}
                    onCreateSide={() => onCreateSide?.(bookmark)}
                    onDelete={() => onDelete?.(bookmark)}
                    onRefresh={handleRefresh}
                    onEdit={handleOpenEditor}
                    isPinned={bookmark.pinned}
                    isRefreshing={isRefreshing}
                    showEdit={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Hover border glow */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(var(--glow-color-rgb), 0.15), 0 4px 20px rgba(0, 0, 0, 0.2)',
            }}
          />
        </div>
      </div>
    );
  }

  // Tweet Card - Thumbnail preview style (click to open detail)
  if (isTweet) {
    const tweetData = metadata?.tweetData;
    // Get the first image from tweet media for thumbnail
    const tweetThumbnail = tweetData?.tweetMedia?.find(m => m.type === 'image')?.url
      || tweetData?.tweetMedia?.find(m => m.type === 'video')?.poster
      || tweetData?.tweetMedia?.find(m => m.type === 'video')?.thumbnail
      || thumbnail;
    const hasMedia = !!tweetThumbnail;
    const isVideoTweet = tweetData?.tweetMedia?.some(m => m.type === 'video');

    return (
      <div className="break-inside-avoid mb-5">
        <div className={cn(
          "bookmark-card bookmark-card-overlay group relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl cursor-pointer",
          hasMedia ? "min-h-[320px]" : "min-h-[200px]",
          isSelected && "ring-2 ring-gruvbox-yellow ring-offset-2 ring-offset-gruvbox-bg-darkest"
        )}
        style={{
          backgroundImage: hasMedia ? `url(${tweetThumbnail})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: hasMedia ? undefined : 'var(--theme-bg-dark)',
        }}
        >
          {selectionMode && (
            <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />
          )}
          <CollectionGlow collection={collection} />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

          {/* Video play indicator */}
          {isVideoTweet && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}

          {/* Menu button - top right */}
          {!selectionMode && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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

          {/* Content at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-4 z-10">
            {/* Author info */}
            {tweetData && (
              <div className="flex items-center gap-2 mb-2">
                {tweetData.authorAvatar && (
                  <img
                    src={tweetData.authorAvatar.replace('_bigger', '_normal')}
                    alt=""
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-medium text-sm truncate">
                    {tweetData.authorName}
                  </span>
                  <span className="text-white/60 text-xs truncate">
                    {tweetData.authorHandle}
                  </span>
                </div>
                <XLogo className="w-4 h-4 text-white/70 ml-auto flex-shrink-0" />
              </div>
            )}

            {/* Tweet text preview */}
            <p className="text-white text-sm leading-relaxed line-clamp-2">
              {tweetData?.tweetText?.replace(/https:\/\/t\.co\/\w+\s*$/g, '').trim() || title}
            </p>

            {/* Timestamp */}
            {(tweetData?.tweetDate || bookmark.createdAt) && (
              <p className="text-white/50 text-xs mt-2">
                {formatFullTimestamp(tweetData?.tweetDate || bookmark.createdAt)}
              </p>
            )}
          </div>

          {/* No thumbnail fallback */}
          {!hasMedia && !tweetData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <XLogo className="w-12 h-12 text-white/30 mb-2" />
              <span className="text-white/50 text-sm">Tweet</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // YouTube Video Card - Improved layout with visible title and date
  if (isVideo) {
    const getYoutubeVideoId = (url) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };
    const videoId = getYoutubeVideoId(url);
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : thumbnail;
    // Clean up YouTube title
    const cleanTitle = title?.replace(/^\(\d+\)\s*/, '').replace(/ - YouTube$/, '').trim();

    return (
      <div className="break-inside-avoid mb-5">
        <div className={cn(
          "bookmark-card group relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl",
          isSelected && "ring-2 ring-gruvbox-yellow ring-offset-2 ring-offset-gruvbox-bg-darkest"
        )}>
          {selectionMode && (
            <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />
          )}
          <CollectionGlow collection={collection} />

          {/* Thumbnail area */}
          <div
            className="relative aspect-video bg-gruvbox-bg-darkest"
            style={{
              backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {/* Play button - centered */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex items-center justify-center z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-gruvbox-red/90 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </a>

            {/* Duration badge placeholder - top right of thumbnail */}
            <div className="absolute top-2 left-2 z-10">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-black/70 text-white font-medium">
                <Play className="w-2.5 h-2.5 fill-current" />
                YouTube
              </span>
            </div>

            {/* Menu button - top right */}
            {!selectionMode && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
          </div>

          {/* Content area - always visible */}
          <div className="bg-gruvbox-bg-light p-4">
            {/* Title - up to 3 lines */}
            <h3 className="text-gruvbox-fg text-sm font-medium leading-snug line-clamp-3 mb-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gruvbox-yellow transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {cleanTitle}
              </a>
            </h3>

            {/* Timestamp and metadata row */}
            <div className="flex items-center justify-between text-xs text-gruvbox-fg-muted">
              <span>
                {bookmark.createdAt && formatFullTimestamp(bookmark.createdAt)}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-gruvbox-red hover:text-gruvbox-red-light transition-colors"
              >
                <span>Watch</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Description - smooth slide-in on hover */}
            {(noteData || metadata?.ogDescription) && (
              <div className="overflow-hidden transition-all duration-300 ease-out max-h-0 group-hover:max-h-16 opacity-0 group-hover:opacity-100">
                <p className="text-gruvbox-fg-muted text-xs mt-2 line-clamp-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ease-out">
                  {noteData || metadata?.ogDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default Webpage Card - Clean split layout (image top, content bottom)
  return (
    <div className="break-inside-avoid mb-5">
      <div className={cn(
        "bookmark-card group relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl",
        isSelected && "ring-2 ring-gruvbox-yellow ring-offset-2 ring-offset-gruvbox-bg-darkest"
      )}>
        {selectionMode && (
          <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />
        )}
        <CollectionGlow collection={collection} />

        {/* Thumbnail area */}
        <div
          className="relative aspect-[16/10] bg-gruvbox-bg-darkest"
          style={{
            backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

          {/* Menu button - top right */}
          {!selectionMode && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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

          {/* No thumbnail fallback */}
          {!thumbnail && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gruvbox-bg-light to-gruvbox-bg-dark">
              <ExternalLink className="w-10 h-10 text-gruvbox-fg-muted/30" />
            </div>
          )}
        </div>

        {/* Content area - solid opaque background */}
        <div className="bg-gruvbox-bg-light p-4">
          {/* Tags section - at top like note cards */}
          {bookmark.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {bookmark.tags.map((tag) => {
                const normalizedTag = tag.toLowerCase();
                return (
                  <DeletableTagPill
                    key={tag}
                    tag={normalizedTag}
                    size="small"
                    actionIcon="menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(normalizedTag);
                    }}
                    onDelete={onTagDelete ? (tagToDelete) => {
                      onTagDelete(bookmark, tagToDelete);
                    } : undefined}
                    showColorPicker={true}
                  />
                );
              })}
            </div>
          )}

          {/* Header row: Domain + Category pill */}
          <div className="flex items-center gap-2 mb-2.5">
            <img
              src={`https://www.google.com/s2/favicons?domain=${url}&sz=32`}
              alt=""
              className="w-4 h-4 rounded"
            />
            <span className="text-xs text-gruvbox-fg-muted font-medium truncate">{getDomain(url)}</span>
            {category && (
              <span className="category-pill text-[10px] px-2 py-0.5 rounded-full bg-gruvbox-bg-lighter text-gruvbox-fg-muted font-medium ml-auto flex-shrink-0">
                {category}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-gruvbox-fg text-[15px] font-medium leading-snug line-clamp-2 mb-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gruvbox-yellow transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {title}
            </a>
          </h3>

          {/* Description */}
          {(noteData || metadata?.ogDescription) && (
            <p className="text-gruvbox-fg-muted text-sm leading-relaxed line-clamp-2 mb-3">
              {noteData || metadata?.ogDescription}
            </p>
          )}

          {/* Footer: Timestamp */}
          <div className="pt-2.5 border-t border-gruvbox-bg-lighter/50">
            <span className="text-[11px] text-gruvbox-fg-muted">
              {bookmark.createdAt && formatFullTimestamp(bookmark.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookmarkCard;
