import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Code,
  CheckSquare,
  List,
  Plus
} from 'lucide-react';

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Block types configuration
const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Text', icon: Type, description: 'Plain text paragraph' },
  { type: 'heading1', label: 'Heading 1', icon: Heading1, description: 'Large heading' },
  { type: 'heading2', label: 'Heading 2', icon: Heading2, description: 'Medium heading' },
  { type: 'heading3', label: 'Heading 3', icon: Heading3, description: 'Small heading' },
  { type: 'todo', label: 'To-do', icon: CheckSquare, description: 'Checkbox item' },
  { type: 'bullet', label: 'Bullet', icon: List, description: 'Bulleted list item' },
  { type: 'code', label: 'Code', icon: Code, description: 'Code block' },
];

// Create default block
const createBlock = (type = 'paragraph', content = '') => ({
  id: generateId(),
  type,
  content,
  checked: type === 'todo' ? false : undefined,
});

// Parse plain text to blocks (for backwards compatibility)
const parseTextToBlocks = (text) => {
  if (!text) return [createBlock()];

  // If already an array of blocks, return as is
  if (Array.isArray(text)) return text;

  // Split by newlines and create blocks
  const lines = text.split('\n');
  const blocks = lines.map(line => {
    // Detect headings
    if (line.startsWith('### ')) {
      return createBlock('heading3', line.slice(4));
    }
    if (line.startsWith('## ')) {
      return createBlock('heading2', line.slice(3));
    }
    if (line.startsWith('# ')) {
      return createBlock('heading1', line.slice(2));
    }
    // Detect todos
    if (line.startsWith('- [ ] ') || line.startsWith('[ ] ')) {
      return { ...createBlock('todo', line.replace(/^-?\s*\[\s*\]\s*/, '')), checked: false };
    }
    if (line.startsWith('- [x] ') || line.startsWith('[x] ')) {
      return { ...createBlock('todo', line.replace(/^-?\s*\[x\]\s*/i, '')), checked: true };
    }
    // Detect bullets
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return createBlock('bullet', line.slice(2));
    }
    // Detect code (simple - surrounded by backticks)
    if (line.startsWith('```')) {
      return createBlock('code', '');
    }
    // Default to paragraph
    return createBlock('paragraph', line);
  });

  return blocks.length > 0 ? blocks : [createBlock()];
};

// Convert blocks to plain text
const blocksToText = (blocks) => {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading1': return `# ${block.content}`;
      case 'heading2': return `## ${block.content}`;
      case 'heading3': return `### ${block.content}`;
      case 'todo': return `- [${block.checked ? 'x' : ' '}] ${block.content}`;
      case 'bullet': return `- ${block.content}`;
      case 'code': return `\`\`\`\n${block.content}\n\`\`\``;
      default: return block.content;
    }
  }).join('\n');
};

// Block Type Menu
const BlockTypeMenu = ({ isOpen, onSelect, position, onClose }) => {
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredTypes = BLOCK_TYPES.filter(t =>
    t.label.toLowerCase().includes(filter.toLowerCase()) ||
    t.type.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Reset state when menu closes
  useEffect(() => {
    if (!isOpen) {
      setFilter('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredTypes.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredTypes.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Arrow Down or Tab: move selection down
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredTypes.length - 1 ? prev + 1 : 0
        );
        return;
      }

      // Arrow Up or Shift+Tab: move selection up
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredTypes.length - 1
        );
        return;
      }

      // Enter: select current item
      if (e.key === 'Enter' && filteredTypes.length > 0) {
        e.preventDefault();
        onSelect(filteredTypes[selectedIndex].type);
        return;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, onSelect, filteredTypes, selectedIndex]);

  if (!isOpen) return null;

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute z-50 w-56 bg-gruvbox-bg-light border border-gruvbox-bg-lighter rounded-lg shadow-xl overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      <div className="p-2 border-b border-gruvbox-bg-lighter">
        <input
          type="text"
          placeholder="Filter... (↑↓ to navigate, Enter to select)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 text-sm bg-gruvbox-bg-dark rounded text-gruvbox-fg placeholder:text-gruvbox-fg-muted/50 focus:outline-none"
          autoFocus
        />
      </div>
      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {filteredTypes.map((blockType, index) => {
          const Icon = blockType.icon;
          const isSelected = index === selectedIndex;
          return (
            <button
              key={blockType.type}
              onClick={() => onSelect(blockType.type)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                isSelected
                  ? "bg-gruvbox-yellow/20 border-l-2 border-gruvbox-yellow"
                  : "hover:bg-gruvbox-yellow/10 border-l-2 border-transparent"
              )}
            >
              <Icon className={cn(
                "w-4 h-4",
                isSelected ? "text-gruvbox-yellow" : "text-gruvbox-fg-muted"
              )} />
              <div>
                <div className={cn(
                  "text-sm",
                  isSelected ? "text-gruvbox-yellow" : "text-gruvbox-fg"
                )}>{blockType.label}</div>
                <div className="text-xs text-gruvbox-fg-muted">{blockType.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

// Auto-resizing textarea hook
const useAutoResize = (ref, content) => {
  useEffect(() => {
    if (ref.current) {
      // Reset height to auto to get the correct scrollHeight
      ref.current.style.height = 'auto';
      // Set height to scrollHeight to fit content
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [content, ref]);
};

// Single Block Component
const Block = ({
  block,
  onChange,
  onDelete,
  onKeyDown,
  onFocus,
  isFocused,
  placeholder
}) => {
  const inputRef = useRef(null);

  // Auto-resize textarea based on content
  useAutoResize(inputRef, block.content);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isFocused, block.type]); // Re-run when block type changes to refocus after type selection

  const handleChange = (e) => {
    onChange({ ...block, content: e.target.value });
  };

  const handleCheckToggle = () => {
    onChange({ ...block, checked: !block.checked });
  };

  const handleKeyDown = (e) => {
    // Enter to create new block (except in code blocks)
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
      e.preventDefault();
      onKeyDown('enter', block);
    }
    // Backspace on empty to delete
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      onKeyDown('backspace', block);
    }
  };

  // Render based on block type
  const renderBlockContent = () => {
    const baseClasses = "w-full bg-transparent focus:outline-none resize-none overflow-hidden break-words";

    switch (block.type) {
      case 'heading1':
        return (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            placeholder={placeholder || 'Heading 1'}
            className={cn(baseClasses, "text-2xl font-bold text-gruvbox-fg min-h-[36px]")}
            rows={1}
          />
        );

      case 'heading2':
        return (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            placeholder={placeholder || 'Heading 2'}
            className={cn(baseClasses, "text-xl font-semibold text-gruvbox-fg min-h-[32px]")}
            rows={1}
          />
        );

      case 'heading3':
        return (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            placeholder={placeholder || 'Heading 3'}
            className={cn(baseClasses, "text-lg font-medium text-gruvbox-fg min-h-[28px]")}
            rows={1}
          />
        );

      case 'todo':
        return (
          <div className="flex items-start gap-2">
            <button
              onClick={handleCheckToggle}
              className={cn(
                "mt-1 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                block.checked
                  ? "bg-gruvbox-yellow border-gruvbox-yellow"
                  : "border-gruvbox-fg-muted/40 hover:border-gruvbox-yellow"
              )}
            >
              {block.checked && (
                <svg className="w-3 h-3 text-gruvbox-bg-darkest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              placeholder={placeholder || 'To-do item'}
              className={cn(
                baseClasses,
                "text-sm text-gruvbox-fg flex-1 min-h-[24px]",
                block.checked && "line-through text-gruvbox-fg-muted"
              )}
              rows={1}
            />
          </div>
        );

      case 'bullet':
        return (
          <div className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gruvbox-fg-muted flex-shrink-0" />
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              placeholder={placeholder || 'List item'}
              className={cn(baseClasses, "text-sm text-gruvbox-fg flex-1 min-h-[24px]")}
              rows={1}
            />
          </div>
        );

      case 'code':
        return (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleChange}
            onKeyDown={(e) => {
              // Allow Enter in code blocks
              if (e.key === 'Backspace' && block.content === '') {
                e.preventDefault();
                onKeyDown('backspace', block);
              }
            }}
            onFocus={onFocus}
            placeholder={placeholder || 'Code...'}
            className={cn(
              baseClasses,
              "font-mono text-sm text-gruvbox-aqua bg-gruvbox-bg-dark/50 rounded p-2 min-h-[60px] overflow-auto"
            )}
            rows={3}
          />
        );

      default: // paragraph
        return (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            placeholder={placeholder || 'Type something...'}
            className={cn(baseClasses, "text-sm text-gruvbox-fg min-h-[24px]")}
            rows={1}
          />
        );
    }
  };

  return (
    <div className={cn(
      "group relative py-1 px-2 -mx-2 rounded transition-colors",
      isFocused && "bg-gruvbox-bg-lighter/20"
    )}>
      {renderBlockContent()}
    </div>
  );
};

// Main Editor Component
const NoteBlockEditor = ({
  initialContent = '',
  onChange,
  placeholder = 'Type / for commands...',
  compact = false,
  autoFocus = false
}) => {
  const [blocks, setBlocks] = useState(() => parseTextToBlocks(initialContent));
  const [focusedBlockId, setFocusedBlockId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [pendingBlockId, setPendingBlockId] = useState(null);
  const containerRef = useRef(null);
  const prevInitialContentRef = useRef(initialContent);

  // Reinitialize blocks when initialContent changes (e.g., when modal opens with new content)
  useEffect(() => {
    if (initialContent !== prevInitialContentRef.current) {
      prevInitialContentRef.current = initialContent;
      const newBlocks = parseTextToBlocks(initialContent);
      setBlocks(newBlocks);
      // Focus first block if autoFocus is enabled
      if (autoFocus && newBlocks.length > 0) {
        setFocusedBlockId(newBlocks[0].id);
      }
    }
  }, [initialContent, autoFocus]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange({
        blocks,
        plainText: blocksToText(blocks)
      });
    }
  }, [blocks, onChange]);

  // Auto-focus first block
  useEffect(() => {
    if (autoFocus && blocks.length > 0) {
      setFocusedBlockId(blocks[0].id);
    }
  }, [autoFocus]);

  const updateBlock = useCallback((updatedBlock) => {
    setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));

    // Check for slash command
    if (updatedBlock.content === '/') {
      const blockElement = containerRef.current?.querySelector(`[data-block-id="${updatedBlock.id}"]`);
      if (blockElement) {
        const rect = blockElement.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setMenuPosition({
          x: rect.left - containerRect.left,
          y: rect.bottom - containerRect.top + 4
        });
        setPendingBlockId(updatedBlock.id);
        setMenuOpen(true);
      }
    } else if (updatedBlock.content.startsWith('/') && menuOpen) {
      // Keep menu open while typing filter
    } else {
      setMenuOpen(false);
    }
  }, [menuOpen]);

  const handleBlockTypeSelect = useCallback((type) => {
    if (pendingBlockId) {
      const blockIdToFocus = pendingBlockId;
      setBlocks(prev => prev.map(b =>
        b.id === pendingBlockId
          ? { ...b, type, content: '', checked: type === 'todo' ? false : undefined }
          : b
      ));
      // Close menu first, then focus after DOM updates
      setMenuOpen(false);
      setPendingBlockId(null);
      // Focus on the block after type selection so cursor appears ready to type
      // Use longer delay to ensure DOM has updated with new block type
      setTimeout(() => {
        setFocusedBlockId(null); // Reset first
        setTimeout(() => setFocusedBlockId(blockIdToFocus), 10); // Then set to trigger effect
      }, 10);
    } else {
      setMenuOpen(false);
      setPendingBlockId(null);
    }
  }, [pendingBlockId]);

  const handleKeyAction = useCallback((action, block) => {
    const blockIndex = blocks.findIndex(b => b.id === block.id);

    if (action === 'enter') {
      // If current block is empty bullet/todo, convert to paragraph instead of creating new
      if ((block.type === 'bullet' || block.type === 'todo') && block.content === '') {
        setBlocks(prev => prev.map(b =>
          b.id === block.id
            ? { ...b, type: 'paragraph', checked: undefined }
            : b
        ));
        return;
      }

      // Create new block after current
      const newBlock = createBlock(
        block.type === 'todo' ? 'todo' :
        block.type === 'bullet' ? 'bullet' : 'paragraph'
      );
      setBlocks(prev => [
        ...prev.slice(0, blockIndex + 1),
        newBlock,
        ...prev.slice(blockIndex + 1)
      ]);
      // Focus new block
      setTimeout(() => setFocusedBlockId(newBlock.id), 0);
    }

    if (action === 'backspace') {
      // If block has formatting (bullet, todo, heading), first convert to paragraph
      if (block.type !== 'paragraph' && block.content === '') {
        setBlocks(prev => prev.map(b =>
          b.id === block.id
            ? { ...b, type: 'paragraph', checked: undefined }
            : b
        ));
        return;
      }

      // If it's an empty paragraph and not the only block, delete it
      if (block.type === 'paragraph' && block.content === '' && blocks.length > 1) {
        const prevBlock = blocks[blockIndex - 1];
        setBlocks(prev => prev.filter(b => b.id !== block.id));
        if (prevBlock) {
          setFocusedBlockId(prevBlock.id);
        }
      }
    }
  }, [blocks]);

  const addNewBlock = () => {
    const newBlock = createBlock();
    setBlocks(prev => [...prev, newBlock]);
    setTimeout(() => setFocusedBlockId(newBlock.id), 0);
  };

  return (
    <div ref={containerRef} className={cn("relative", compact ? "space-y-0.5" : "space-y-1")}>
      {blocks.map((block, index) => (
        <div key={block.id} data-block-id={block.id}>
          <Block
            block={block}
            onChange={updateBlock}
            onDelete={() => handleKeyAction('backspace', block)}
            onKeyDown={handleKeyAction}
            onFocus={() => setFocusedBlockId(block.id)}
            isFocused={focusedBlockId === block.id}
            placeholder={index === 0 ? placeholder : undefined}
          />
        </div>
      ))}

      {/* Add block button */}
      {!compact && (
        <button
          onClick={addNewBlock}
          className="flex items-center gap-2 px-2 py-1 text-xs text-gruvbox-fg-muted/50 hover:text-gruvbox-fg-muted transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add block
        </button>
      )}

      {/* Block type menu */}
      <AnimatePresence>
        <BlockTypeMenu
          isOpen={menuOpen}
          position={menuPosition}
          onSelect={handleBlockTypeSelect}
          onClose={() => {
            setMenuOpen(false);
            setPendingBlockId(null);
          }}
        />
      </AnimatePresence>
    </div>
  );
};

export { NoteBlockEditor, parseTextToBlocks, blocksToText, createBlock };
export default NoteBlockEditor;
