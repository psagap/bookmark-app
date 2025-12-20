import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CommandMenu - Floating slash command menu for TipTap editor
 * Shows available block types when user types "/"
 */
const CommandMenu = forwardRef(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = menuRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Expose keyboard handlers to parent
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((index) => (index + items.length - 1) % items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((index) => (index + 1) % items.length);
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  const selectItem = useCallback(
    (index) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [command, items]
  );

  if (!items.length) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="command-menu z-[200] w-72 max-h-80 overflow-y-auto rounded-xl border border-gruvbox-bg-lighter/50 bg-gruvbox-bg-dark/95 backdrop-blur-xl shadow-2xl shadow-black/50"
    >
      <div className="p-2">
        <div className="text-[10px] uppercase tracking-wider text-gruvbox-fg-muted/50 px-3 py-2 font-medium">
          Basic blocks
        </div>
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              data-index={index}
              onClick={() => selectItem(index)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                ${index === selectedIndex
                  ? 'bg-gruvbox-yellow/15 text-gruvbox-fg'
                  : 'text-gruvbox-fg-muted hover:bg-gruvbox-bg-lighter/30 hover:text-gruvbox-fg'
                }
              `}
            >
              <div className={`
                p-2 rounded-lg transition-colors
                ${index === selectedIndex
                  ? 'bg-gruvbox-yellow/20 text-gruvbox-yellow'
                  : 'bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted'
                }
              `}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.title}</div>
                <div className="text-xs text-gruvbox-fg-muted/70 truncate">{item.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

CommandMenu.displayName = 'CommandMenu';

export default CommandMenu;
