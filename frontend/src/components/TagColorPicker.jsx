import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllTagColors, getTagColor, setTagColor } from '@/utils/tagColors';

/**
 * TagColorPicker - Notion-style color picker for tags
 *
 * Usage:
 * <TagColorPicker tagName="myTag" onColorChange={(colorId) => { ... }}>
 *   <TagPill>myTag</TagPill>
 * </TagColorPicker>
 *
 * Or use the hook:
 * const { showPicker, openPicker, closePicker } = useTagColorPicker();
 */

const ColorSwatch = ({ color, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "relative w-7 h-7 rounded-lg transition-all duration-150 flex items-center justify-center",
      "hover:scale-110 hover:ring-2 ring-offset-1 ring-offset-gruvbox-bg-dark",
      isSelected && "ring-2"
    )}
    style={{
      backgroundColor: color.hover,
      ringColor: color.text,
    }}
    title={color.name}
  >
    {isSelected && (
      <Check className="w-4 h-4 text-gruvbox-bg-darkest" strokeWidth={3} />
    )}
  </button>
);

const ColorPickerDropdown = ({
  tagName,
  currentColorId,
  position,
  onSelect,
  onClose,
}) => {
  const dropdownRef = useRef(null);
  const colors = getAllTagColors();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  const adjustedPosition = { ...position };
  if (typeof window !== 'undefined') {
    const dropdownWidth = 200;
    const dropdownHeight = 120;

    if (position.left + dropdownWidth > window.innerWidth - 16) {
      adjustedPosition.left = window.innerWidth - dropdownWidth - 16;
    }
    if (position.top + dropdownHeight > window.innerHeight - 16) {
      adjustedPosition.top = position.top - dropdownHeight - 8;
    }
  }

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[10000] animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: adjustedPosition.top,
        left: adjustedPosition.left,
      }}
    >
      <div
        className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(60, 56, 54, 0.98) 0%, rgba(40, 40, 40, 0.98) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(215, 153, 33, 0.2)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-gruvbox-bg-lighter/30">
          <div className="flex items-center gap-2 text-xs text-gruvbox-fg-muted">
            <Palette className="w-3 h-3" />
            <span>Color for</span>
            <span className="font-medium text-gruvbox-fg">#{tagName}</span>
          </div>
        </div>

        {/* Color Grid */}
        <div className="p-3">
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <ColorSwatch
                key={color.id}
                color={color}
                isSelected={currentColorId === color.id}
                onClick={() => {
                  onSelect(color.id);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>

        {/* Reset option */}
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              onSelect(null); // Reset to default
              onClose();
            }}
            className="w-full text-xs text-gruvbox-fg-muted hover:text-gruvbox-fg py-1.5 rounded-md hover:bg-gruvbox-bg-lighter/30 transition-colors"
          >
            Reset to default
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * TagColorPicker Component
 * Wraps a tag and adds click-to-change-color functionality
 */
export const TagColorPicker = ({
  tagName,
  children,
  onColorChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const currentColor = getTagColor(tagName);

  const handleClick = (e) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setIsOpen(true);
  };

  const handleColorSelect = (colorId) => {
    setTagColor(tagName, colorId);
    onColorChange?.(colorId);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleClick}
        className={cn(!disabled && "cursor-pointer")}
      >
        {children}
      </div>

      {isOpen && (
        <ColorPickerDropdown
          tagName={tagName}
          currentColorId={currentColor.id}
          position={position}
          onSelect={handleColorSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

/**
 * Standalone color picker trigger (for use in menus, etc.)
 */
export const TagColorPickerTrigger = ({
  tagName,
  onColorChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const currentColor = getTagColor(tagName);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setIsOpen(true);
  };

  const handleColorSelect = (colorId) => {
    setTagColor(tagName, colorId);
    onColorChange?.(colorId);
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gruvbox-fg-muted hover:text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50 transition-colors",
          className
        )}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: currentColor.hover }}
        />
        <Palette className="w-3 h-3" />
      </button>

      {isOpen && (
        <ColorPickerDropdown
          tagName={tagName}
          currentColorId={currentColor.id}
          position={position}
          onSelect={handleColorSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

/**
 * Tag Pill with built-in color picker
 * Click to open color picker, appears on all tag displays
 */
export const TagPill = ({
  tag,
  color,
  onClick,
  onColorChange,
  showColorPicker = true,
  size = 'default', // 'small' | 'default' | 'large'
  className,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const pillRef = useRef(null);

  // Get color from props or fetch it
  const tagColor = color || getTagColor(tag);

  const sizeClasses = {
    small: 'text-[10px] px-2 py-0.5',
    default: 'text-xs px-2.5 py-1',
    large: 'text-sm px-3 py-1.5',
  };

  const handleContextMenu = (e) => {
    if (!showColorPicker) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = pillRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setIsPickerOpen(true);
  };

  const handleColorSelect = (colorId) => {
    setTagColor(tag, colorId);
    onColorChange?.(colorId);
  };

  return (
    <>
      <span
        ref={pillRef}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium transition-all duration-150",
          showColorPicker && "cursor-context-menu hover:ring-2 hover:ring-offset-1 hover:ring-offset-gruvbox-bg-dark",
          onClick && "cursor-pointer",
          sizeClasses[size],
          className
        )}
        style={{
          backgroundColor: tagColor.bg,
          color: tagColor.text,
          '--tw-ring-color': tagColor.border,
        }}
        title={showColorPicker ? "Right-click to change color" : undefined}
      >
        #{tag}
      </span>

      {isPickerOpen && (
        <ColorPickerDropdown
          tagName={tag}
          currentColorId={tagColor.id}
          position={position}
          onSelect={handleColorSelect}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </>
  );
};

export default TagColorPicker;
