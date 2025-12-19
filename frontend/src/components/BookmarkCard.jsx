import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Play, ExternalLink, MoreHorizontal, Pin, Layers, Trash2, RefreshCw, Check, Edit3, X, Maximize2, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import GlowingCard from './GlowingCard';
import { getTagColors } from '@/utils/tagColors';
import NoteBlockEditor, { blocksToText } from './NoteBlockEditor';
import NoteBlockRenderer from './NoteBlockRenderer';

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
            className="fixed z-[9999] min-w-[160px] bg-gruvbox-bg-light/95 backdrop-blur-md border border-gruvbox-bg-lighter rounded-lg shadow-xl overflow-hidden"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {showEdit && onEdit && (
              <button
                onClick={(e) => handleClick(e, onEdit)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gruvbox-fg hover:bg-gruvbox-yellow/10 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
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
            <div className="h-px bg-gruvbox-bg-lighter mx-2" />
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

const BookmarkCard = ({ bookmark, onDelete, onPin, onCreateSide, onRefresh, onUpdate, onOpenEditor, selectionMode, isSelected, onToggleSelect, collection }) => {
  const { title, url, thumbnail, category, notes, content, type, metadata } = bookmark;
  // Support both 'notes' and 'content' field names
  const noteData = notes || content;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.(bookmark);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to strip HTML and convert to plain text for editing
  const htmlToPlainText = (html) => {
    if (!html || typeof html !== 'string') return html || '';
    // Check if it contains HTML
    if (!/<[a-z][\s\S]*>/i.test(html)) return html;

    const temp = document.createElement('div');
    temp.innerHTML = html;

    const lines = [];

    // Process each top-level node
    const processNode = (node, isTopLevel = false) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        return text;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const tag = node.tagName.toLowerCase();

      // Get text content directly for leaf nodes
      const getText = () => {
        let text = '';
        node.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            text += child.textContent;
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            // Handle inline elements
            const childTag = child.tagName.toLowerCase();
            if (childTag === 'span' || childTag === 'strong' || childTag === 'em' || childTag === 'b' || childTag === 'i') {
              text += child.textContent;
            } else if (childTag === 'br') {
              text += '\n';
            } else {
              text += processNode(child, false);
            }
          }
        });
        return text.trim();
      };

      switch (tag) {
        case 'h1':
          return `# ${getText()}`;
        case 'h2':
          return `## ${getText()}`;
        case 'h3':
          return `### ${getText()}`;
        case 'ul':
          const bullets = [];
          node.querySelectorAll(':scope > li').forEach(li => {
            const liText = li.textContent.trim();
            if (liText) bullets.push(`- ${liText}`);
          });
          return bullets.join('\n');
        case 'ol':
          const numbered = [];
          node.querySelectorAll(':scope > li').forEach((li, i) => {
            const liText = li.textContent.trim();
            if (liText) numbered.push(`${i + 1}. ${liText}`);
          });
          return numbered.join('\n');
        case 'li':
          return getText();
        case 'p':
        case 'div':
          const content = getText();
          return content;
        case 'br':
          return '';
        case 'pre':
        case 'code':
          return '```\n' + node.textContent + '\n```';
        case 'span':
          return getText();
        default:
          return getText();
      }
    };

    // Process top-level nodes
    Array.from(temp.childNodes).forEach(node => {
      const result = processNode(node, true);
      if (result && result.trim()) {
        lines.push(result.trim());
      }
    });

    return lines.join('\n');
  };

  // Inline editing handlers
  const handleStartEdit = useCallback(() => {
    const plainText = htmlToPlainText(noteData || title || '');
    setEditContent({ blocks: null, plainText });
    setIsEditing(true);
  }, [noteData, title]);

  const handleSaveEdit = useCallback(() => {
    if (editContent && onUpdate) {
      onUpdate({
        ...bookmark,
        notes: editContent.plainText,
        notesBlocks: editContent.blocks
      });
    }
    setIsEditing(false);
    setEditContent(null);
  }, [bookmark, editContent, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent(null);
  }, []);

  const handleEditorChange = useCallback((content) => {
    setEditContent(content);
  }, []);

  // Handle keyboard shortcuts for editing
  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSaveEdit();
    }
    // ⌘E / Ctrl+E to expand to full modal
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      if (editContent && onUpdate && onOpenEditor) {
        const updatedBookmark = {
          ...bookmark,
          notes: editContent.plainText,
          notesBlocks: editContent.blocks
        };
        onUpdate(updatedBookmark);
        setIsEditing(false);
        onOpenEditor(updatedBookmark);
      }
    }
  }, [handleCancelEdit, handleSaveEdit, editContent, onUpdate, onOpenEditor, bookmark]);

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

  // Note Card - Enhanced with rich editor, scrollable content, expand button
  if (isNote) {
    const noteContent = noteData || title || '';
    const hasContent = noteContent.trim().length > 0;
    const isLongNote = noteContent.length > 300;

    // Handle expand to open modal
    const handleExpand = (e) => {
      e.stopPropagation();
      if (onOpenEditor) {
        onOpenEditor(bookmark);
      }
    };

    return (
      <div
        className="break-inside-avoid mb-4"
        onClick={(e) => {
          // Stop propagation to prevent App.jsx from opening detail panel
          // Note cards handle their own click behavior (inline editing)
          e.stopPropagation();
        }}
      >
        <div
          className={cn(
            "bookmark-card group relative rounded-xl overflow-hidden transition-all duration-200",
            isEditing
              ? "shadow-lg ring-1 ring-gruvbox-yellow/40"
              : "hover:shadow-md hover:-translate-y-0.5",
            "bg-gradient-to-br from-gruvbox-bg-light to-gruvbox-bg border border-gruvbox-bg-lighter/40",
            isSelected && "ring-2 ring-gruvbox-yellow ring-offset-2 ring-offset-gruvbox-bg-darkest"
          )}
          onKeyDown={isEditing ? handleEditKeyDown : undefined}
        >
          {selectionMode && (
            <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />
          )}

          {/* Header bar with date+time and expand button */}
          <div className="flex items-center justify-between px-3 py-2 bg-gruvbox-bg-lighter/30 border-b border-gruvbox-bg-lighter/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gruvbox-yellow/70" />
              <span className="text-xs text-gruvbox-fg-muted">
                {formatFullTimestamp(bookmark.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  {/* Expand button - top right during editing */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editContent && onUpdate && onOpenEditor) {
                        const updatedBookmark = {
                          ...bookmark,
                          notes: editContent.plainText,
                          notesBlocks: editContent.blocks
                        };
                        onUpdate(updatedBookmark);
                        setIsEditing(false);
                        onOpenEditor(updatedBookmark);
                      }
                    }}
                    className="group/expand relative p-1.5 rounded-md hover:bg-gruvbox-yellow/15 transition-all"
                    title="Expand to full editor (⌘E)"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-gruvbox-fg-muted/60 group-hover/expand:text-gruvbox-yellow transition-colors" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 text-gruvbox-fg-muted/60 hover:text-gruvbox-red hover:bg-gruvbox-red/10 rounded-md transition-all"
                    title="Cancel (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  {/* Expand button - opens full editor modal */}
                  <button
                    onClick={handleExpand}
                    className="p-1.5 text-gruvbox-fg-muted/50 hover:text-gruvbox-yellow hover:bg-gruvbox-yellow/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    title="Expand to full editor"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  {!selectionMode && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <CardMenuInline
                        onPin={() => onPin?.(bookmark)}
                        onCreateSide={() => onCreateSide?.(bookmark)}
                        onDelete={() => onDelete?.(bookmark)}
                        onRefresh={handleRefresh}
                        onEdit={handleStartEdit}
                        isPinned={bookmark.pinned}
                        isRefreshing={isRefreshing}
                        showEdit={true}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Content area - scrollable with max height, click to edit */}
          <div
            className={cn(
              "px-3 py-3",
              !isEditing && "cursor-text"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (!selectionMode && !isEditing) {
                handleStartEdit();
              }
            }}
          >
            {isEditing ? (
              <>
                <div className="min-h-[80px] max-h-[200px] overflow-y-auto overflow-x-hidden note-scroll-area">
                  <NoteBlockEditor
                    initialContent={editContent?.plainText || ''}
                    onChange={handleEditorChange}
                    placeholder="Start writing... Type / for commands"
                    compact={true}
                    autoFocus={true}
                  />
                </div>
                {/* Bottom action bar - outside scroll area, always visible */}
                <div className="flex items-center justify-end pt-3 mt-2 border-t border-gruvbox-bg-lighter/30">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gruvbox-yellow border border-gruvbox-yellow/40 rounded-full hover:bg-gruvbox-yellow hover:text-gruvbox-bg-darkest transition-all duration-200 hover:border-transparent hover:shadow-lg hover:shadow-gruvbox-yellow/20"
                  >
                    <span>Save</span>
                    <span className="flex items-center gap-0.5 text-xs opacity-70">
                      <span>⌘</span>
                      <span>↵</span>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {hasContent ? (
                  <div className="overflow-x-hidden max-h-[250px] overflow-y-auto note-scroll-area">
                    <NoteBlockRenderer content={noteContent} compact={true} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-gruvbox-yellow/10 flex items-center justify-center mb-3 group-hover:bg-gruvbox-yellow/20 transition-colors">
                      <PenLine className="w-5 h-5 text-gruvbox-yellow/60 group-hover:text-gruvbox-yellow transition-colors" />
                    </div>
                    <p className="text-sm text-gruvbox-fg-muted/50 group-hover:text-gruvbox-fg-muted transition-colors">
                      Click to start writing...
                    </p>
                    <p className="text-xs text-gruvbox-fg-muted/30 mt-1">
                      Type <span className="px-1 py-0.5 bg-gruvbox-bg-lighter/30 rounded text-[10px]">/</span> for formatting options
                    </p>
                  </div>
                )}

                {/* Scroll indicator for long notes */}
                {isLongNote && hasContent && (
                  <div className="flex items-center justify-center pt-2 border-t border-gruvbox-bg-lighter/30 mt-2">
                    <span className="text-[10px] text-gruvbox-fg-muted/40 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-gruvbox-fg-muted/30 animate-bounce" />
                      Scroll for more
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pin indicator */}
          {bookmark.pinned && !isEditing && (
            <div className="absolute top-2 right-10 opacity-60">
              <Pin className="w-3.5 h-3.5 text-gruvbox-yellow fill-gruvbox-yellow" />
            </div>
          )}
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
          backgroundColor: hasMedia ? undefined : '#15202b',
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

            {/* Description - shows on hover */}
            {(noteData || metadata?.ogDescription) && (
              <p className="text-gruvbox-fg-muted text-xs mt-2 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity h-0 group-hover:h-auto overflow-hidden">
                {noteData || metadata?.ogDescription}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default Webpage Card - Style 1 (white content box with slide-up)
  return (
    <div className="break-inside-avoid mb-5">
      <div className={cn(
        "bookmark-card bookmark-card-slideup group relative rounded-xl overflow-hidden min-h-[380px] transition-all duration-300",
        isSelected && "ring-2 ring-gruvbox-yellow ring-offset-2 ring-offset-gruvbox-bg-darkest"
      )}
      style={{
        backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: thumbnail ? undefined : '#3c3836',
      }}
      >
        {selectionMode && (
          <SelectionCheckbox isSelected={isSelected} onToggle={onToggleSelect} />
        )}
        <CollectionGlow collection={collection} />

        {/* Date Badge - Corner style (top left) */}
        <DateBadge date={bookmark.createdAt} variant="corner" />

        {/* Gradient overlay for readability when no thumbnail */}
        {!thumbnail && (
          <div className="absolute inset-0 bg-gradient-to-b from-gruvbox-bg-light to-gruvbox-bg-dark" />
        )}

        {/* Menu button - top right on cover photo */}
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

        {/* Content area - slides up on hover */}
        <div className="card-data absolute bottom-0 left-0 right-0 transform translate-y-[calc(100%-110px)] group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <div className="card-content bg-gruvbox-bg-light/95 backdrop-blur-sm px-6 py-5 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
            {/* Header row: Domain + Category pill */}
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src={`https://www.google.com/s2/favicons?domain=${url}&sz=32`}
                alt=""
                className="w-4 h-4 rounded"
              />
              <span className="text-xs text-gruvbox-fg-muted font-medium">{getDomain(url)}</span>
              {/* Category pill - inline with domain for clean reading flow */}
              {category && (
                <span className="category-pill text-[11px] px-2.5 py-1 rounded-full bg-gruvbox-bg-lighter text-gruvbox-fg-muted font-medium transition-colors duration-200 hover:bg-gruvbox-yellow hover:text-gruvbox-bg-darkest cursor-pointer">
                  {category}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-gruvbox-fg text-lg font-light leading-snug line-clamp-2 pr-2">
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

            {/* Timestamp - like tweets */}
            {bookmark.createdAt && (
              <p className="text-xs text-gruvbox-fg-muted mt-2">
                {formatFullTimestamp(bookmark.createdAt)}
              </p>
            )}

            {/* Description - visible on hover */}
            <p className="card-text text-gruvbox-fg-muted text-sm mt-3 line-clamp-2 h-[40px] pr-2">
              {noteData || metadata?.ogDescription || ''}
            </p>

            {/* Tags row */}
            {bookmark.tags?.length > 0 && (
              <div className="card-text flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gruvbox-bg-lighter/50">
                {(() => {
                  const tagsToShow = bookmark.tags?.slice(0, 3) || [];
                  const tagColors = getTagColors(tagsToShow);
                  return tagsToShow.map((tag, idx) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: tagColors[idx].bg,
                        color: tagColors[idx].text,
                      }}
                    >
                      #{tag}
                    </span>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookmarkCard;
