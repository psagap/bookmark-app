import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, MoreHorizontal, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllTagColors, getTagColor, setTagColor } from '@/utils/tagColors';

/**
 * Modern Tag System - Minimalist, theme-adaptive tag pills with color picker
 *
 * Design principles:
 * - Clean, borderless pills with subtle backgrounds
 * - Smooth micro-interactions (scale, opacity transitions)
 * - Theme-adaptive using CSS variables
 * - Accessible with proper contrast
 * - No harsh borders or heavy shadows
 */

const ColorSwatch = ({ color, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "relative w-5 h-5 rounded-full transition-all duration-150 flex items-center justify-center",
      "hover:scale-110 focus:outline-none",
      isSelected && "ring-[1.5px] ring-offset-[2px] scale-105"
    )}
    style={{
      backgroundColor: color.hover,
      '--tw-ring-color': color.hover,
      '--tw-ring-offset-color': 'var(--theme-bg-dark, #1d2021)',
    }}
    title={color.name}
  >
    {isSelected && (
      <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: color.hoverText }} />
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
  const [adjustedPos, setAdjustedPos] = useState(position);

  // Adjust position after render to stay in viewport
  useEffect(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const newPos = { ...position };

      if (position.left + rect.width > window.innerWidth - 16) {
        newPos.left = window.innerWidth - rect.width - 16;
      }
      if (position.top + rect.height > window.innerHeight - 16) {
        newPos.top = position.top - rect.height - 8;
      }
      if (newPos.left < 16) newPos.left = 16;
      if (newPos.top < 16) newPos.top = 16;

      setAdjustedPos(newPos);
    }
  }, [position]);

  // Close on click outside, escape, or scroll
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[10000]"
      style={{
        top: adjustedPos.top,
        left: adjustedPos.left,
        animation: 'tagPickerIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--theme-bg-dark, #282828)',
          border: '1px solid color-mix(in srgb, var(--theme-fg-muted, #a89984) 12%, transparent)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Color Grid */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
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
        <div
          className="px-3 pb-2"
          style={{
            borderTop: '1px solid color-mix(in srgb, var(--theme-fg-muted, #a89984) 8%, transparent)',
          }}
        >
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="w-full text-[10px] pt-1.5 pb-0.5 rounded transition-all duration-150 hover:opacity-100 opacity-40"
            style={{ color: 'var(--theme-fg-muted, #a89984)' }}
          >
            Reset
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tagPickerIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-2px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
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
        top: rect.bottom + 6,
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
        top: rect.bottom + 6,
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
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-150",
          "opacity-60 hover:opacity-100",
          className
        )}
        style={{ color: 'var(--theme-fg-muted, #a89984)' }}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: currentColor.text }}
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
 * Modern Tag Pill
 * Minimal, borderless pill with subtle tinted background
 * Right-click for color picker
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

  const tagColor = color || getTagColor(tag);

  const sizeConfig = {
    small: {
      text: 'text-[10px]',
      padding: 'px-1.5 py-[2px]',
    },
    default: {
      text: 'text-[11px]',
      padding: 'px-2 py-[3px]',
    },
    large: {
      text: 'text-xs',
      padding: 'px-2.5 py-[4px]',
    },
  };

  const config = sizeConfig[size];

  const handleContextMenu = (e) => {
    if (!showColorPicker) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = pillRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 6,
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
          "modern-tag-pill inline-flex items-center rounded-full font-medium transition-all duration-150",
          "hover:brightness-125",
          config.text,
          config.padding,
          showColorPicker && "cursor-context-menu",
          onClick && "cursor-pointer",
          className
        )}
        style={{
          backgroundColor: tagColor.bg,
          color: tagColor.text,
        }}
        title={showColorPicker ? "Right-click to change color" : undefined}
      >
        <span className="leading-none">{tag}</span>
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

/**
 * DeletableTagPill - Clean minimal pill with hover-reveal close button
 * No dot, no border - just text on subtle background
 */
export const DeletableTagPill = ({
  tag,
  color,
  onClick,
  onDelete,
  onColorChange,
  showColorPicker = true,
  size = 'default',
  actionIcon = 'delete', // 'delete' | 'menu'
  className,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const pillRef = useRef(null);

  const tagColor = color || getTagColor(tag);

  const sizeConfig = {
    small: {
      text: 'text-[10px]',
      padding: 'px-1.5 py-[2px]',
      btnSize: 'w-3 h-3',
      iconSize: 'w-2 h-2',
    },
    default: {
      text: 'text-[11px]',
      padding: 'px-2 py-[3px]',
      btnSize: 'w-3.5 h-3.5',
      iconSize: 'w-2.5 h-2.5',
    },
    large: {
      text: 'text-xs',
      padding: 'px-2.5 py-[4px]',
      btnSize: 'w-4 h-4',
      iconSize: 'w-3 h-3',
    },
  };

  const config = sizeConfig[size];
  const showActionButton = actionIcon === 'menu' ? showColorPicker : !!onDelete;

  const openColorPicker = (e) => {
    if (!showColorPicker) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = pillRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 6,
        left: rect.left,
      });
    }
    setIsPickerOpen(true);
  };

  const handleContextMenu = (e) => {
    if (!showColorPicker) return;
    openColorPicker(e);
  };

  const handleColorSelect = (colorId) => {
    setTagColor(tag, colorId);
    onColorChange?.(colorId);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(tag);
  };

  const handleActionClick = (e) => {
    if (actionIcon === 'menu') {
      openColorPicker(e);
      return;
    }
    handleDelete(e);
  };

  const handleClick = (e) => {
    if (onClick) onClick(e, tag);
  };

  return (
    <>
      <span
        ref={pillRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "modern-tag-pill inline-flex items-center gap-1 rounded-full font-medium transition-all duration-150 group/tag",
          "hover:brightness-125",
          config.text,
          config.padding,
          showColorPicker && "cursor-context-menu",
          onClick && "cursor-pointer",
          className
        )}
        style={{
          backgroundColor: tagColor.bg,
          color: tagColor.text,
        }}
        title={showColorPicker ? "Right-click to change color" : undefined}
      >
        <span className="leading-none">{tag}</span>

        {/* Action button - appears on hover */}
        {showActionButton && (
          <button
            onClick={handleActionClick}
            className={cn(
              "flex items-center justify-center rounded-full transition-all duration-150",
              "opacity-0 scale-75 group-hover/tag:opacity-70 group-hover/tag:scale-100 hover:!opacity-100",
              config.btnSize
            )}
            aria-label={actionIcon === 'menu' ? `Change color for ${tag}` : `Remove ${tag} tag`}
          >
            {actionIcon === 'menu' ? (
              <MoreHorizontal className={config.iconSize} />
            ) : (
              <X className={config.iconSize} strokeWidth={2.5} />
            )}
          </button>
        )}
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
