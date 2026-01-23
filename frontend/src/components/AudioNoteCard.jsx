import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Pin, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import NoteBlockRenderer from './NoteBlockRenderer';

// ============================================================================
// AUDIO NOTE CARD - Voice Note Card
// Compact, modern, minimal design for saved voice notes
// Calm aesthetic with subtle voice indicator
// ============================================================================


const AudioNoteCard = ({
  bookmark,
  onDelete,
  onPin,
  onCardClick,
  onOpenEditor,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const { currentTheme } = useTheme();
  const noteCardColors = currentTheme?.noteCard || {};
  const themeColors = currentTheme?.colors || {};

  // Context menu state
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Extract data
  const { title, notes, notesHtml, pinned, metadata } = bookmark;
  const content = notesHtml || notes || title || '';

  // Get accent color from theme
  const accentColor = noteCardColors.accent || themeColors.primaryHex || '#d79921';
  const bgColor = noteCardColors.bg || themeColors.bgLight || '#3c3836';
  const textColor = noteCardColors.text || themeColors.fgMuted || '#a89984';
  const headingColor = noteCardColors.heading || themeColors.fg || '#ebdbb2';

  const handleClick = (e) => {
    e.stopPropagation();
    if (selectionMode) {
      onToggleSelect?.();
    } else if (onOpenEditor) {
      onOpenEditor(bookmark);
    } else {
      onCardClick?.(bookmark);
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="break-inside-avoid mb-4"
    >
      <div
        onClick={handleClick}
        className={cn(
          "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer",
          "hover:shadow-lg max-w-[280px]",
          isSelected && "ring-2 ring-offset-2 ring-offset-background"
        )}
        style={{
          backgroundColor: bgColor,
          border: `1.5px solid ${accentColor}20`,
          boxShadow: isSelected ? `0 0 0 2px ${accentColor}` : undefined
        }}
      >
        {/* Compact header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <Mic className="w-3 h-3" style={{ color: accentColor }} />
            </div>
            <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: textColor }}>
              Voice Note
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {pinned && (
              <Pin
                className="w-3 h-3 fill-current"
                style={{ color: accentColor }}
              />
            )}
            <button
              onClick={handleMenuClick}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
            >
              <MoreHorizontal className="w-3.5 h-3.5" style={{ color: textColor }} />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div
                ref={menuRef}
                className="absolute top-10 right-3 z-50 min-w-[120px] rounded-lg border shadow-xl py-1"
                style={{
                  backgroundColor: bgColor,
                  borderColor: `${accentColor}30`
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin?.(bookmark);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-white/5 transition-colors"
                  style={{ color: headingColor }}
                >
                  <Pin className="w-3.5 h-3.5" />
                  {pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(bookmark);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-red-500/10 transition-colors text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content area - compact */}
        <div className="px-3 pb-3">
          {content ? (
            <div
              className="text-[13px] leading-relaxed line-clamp-5"
              style={{ color: headingColor }}
            >
              <NoteBlockRenderer content={content} compact={true} />
            </div>
          ) : (
            <p className="text-xs italic" style={{ color: textColor }}>
              No transcript yet
            </p>
          )}
        </div>


        {/* Selection checkbox */}
        {selectionMode && (
          <div className="absolute top-2 left-2">
            <div
              className={cn(
                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                isSelected ? "border-transparent" : "border-white/30"
              )}
              style={{
                backgroundColor: isSelected ? accentColor : 'transparent'
              }}
            >
              {isSelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AudioNoteCard;
