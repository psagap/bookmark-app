import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Minus, CheckSquare, Hash, Image, ToggleLeft,
  AlertCircle, Table, FileText, Link2
} from 'lucide-react';
import { getTagColor } from '@/utils/tagColors';

// Notion-style slash commands organized by category
const COMMAND_CATEGORIES = [
  {
    name: 'Basic blocks',
    commands: [
      { id: 'text', label: 'Text', description: 'Just start writing with plain text.', icon: Type, format: 'p' },
      { id: 'h1', label: 'Heading 1', description: 'Big section heading.', icon: Heading1, format: 'h1', shortcut: '#' },
      { id: 'h2', label: 'Heading 2', description: 'Medium section heading.', icon: Heading2, format: 'h2', shortcut: '##' },
      { id: 'h3', label: 'Heading 3', description: 'Small section heading.', icon: Heading3, format: 'h3', shortcut: '###' },
      { id: 'todo', label: 'To-do list', description: 'Track tasks with a to-do list.', icon: CheckSquare, format: 'todo', shortcut: '[]' },
      { id: 'bullet', label: 'Bulleted list', description: 'Create a simple bulleted list.', icon: List, format: 'ul', shortcut: '-' },
      { id: 'numbered', label: 'Numbered list', description: 'Create a list with numbering.', icon: ListOrdered, format: 'ol', shortcut: '1.' },
      { id: 'toggle', label: 'Toggle list', description: 'Toggles can hide and show content.', icon: ToggleLeft, format: 'toggle' },
      { id: 'quote', label: 'Quote', description: 'Capture a quote.', icon: Quote, format: 'blockquote', shortcut: '>' },
      { id: 'divider', label: 'Divider', description: 'Visually divide blocks.', icon: Minus, format: 'hr', shortcut: '---' },
      { id: 'callout', label: 'Callout', description: 'Make writing stand out.', icon: AlertCircle, format: 'callout' },
      { id: 'code', label: 'Code', description: 'Capture a code snippet.', icon: Code, format: 'pre', shortcut: '```' },
    ]
  },
  {
    name: 'Media',
    commands: [
      { id: 'image', label: 'Image', description: 'Upload or embed with a link.', icon: Image, format: 'image' },
      { id: 'bookmark', label: 'Web bookmark', description: 'Save a link as a visual bookmark.', icon: Link2, format: 'bookmark' },
    ]
  },
  {
    name: 'Advanced blocks',
    commands: [
      { id: 'table', label: 'Table', description: 'Add a simple table.', icon: Table, format: 'table' },
    ]
  }
];

// Flatten commands for easy filtering
const ALL_COMMANDS = COMMAND_CATEGORIES.flatMap(cat =>
  cat.commands.map(cmd => ({ ...cmd, category: cat.name }))
);

// Get caret coordinates for positioning menu
const getCaretCoordinates = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0).cloneRange();

  // Create temporary marker
  const marker = document.createElement('span');
  marker.textContent = '\u200B';
  range.insertNode(marker);

  const rect = marker.getBoundingClientRect();
  const coords = {
    x: rect.left,
    y: rect.bottom + 4
  };

  // Clean up
  marker.parentNode?.removeChild(marker);

  // Normalize text nodes
  const container = selection.getRangeAt(0)?.commonAncestorContainer;
  container?.normalize?.();

  return coords;
};

// Notion-style Command Menu
const CommandMenu = memo(({
  commands,
  selectedIndex,
  onSelect,
  onClose,
  position,
  filter
}) => {
  const menuRef = useRef(null);
  const selectedRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Group filtered commands by category
  const groupedCommands = [];
  let currentCategory = null;
  let itemIndex = 0;

  commands.forEach((cmd) => {
    if (cmd.category !== currentCategory) {
      currentCategory = cmd.category;
      groupedCommands.push({ type: 'header', name: cmd.category });
    }
    groupedCommands.push({ type: 'command', ...cmd, index: itemIndex });
    itemIndex++;
  });

  // Position menu within viewport with smart flipping
  const menuHeight = 420; // Approximate menu height (340px content + header/footer)
  const wouldOverflowBottom = position.y + menuHeight > window.innerHeight;

  const menuStyle = {
    left: Math.max(8, Math.min(position.x, window.innerWidth - 340)),
    // If overflowing bottom, position menu ABOVE the caret instead
    top: wouldOverflowBottom
      ? Math.max(8, position.y - menuHeight - 30)
      : position.y
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-[320px] rounded-xl shadow-2xl overflow-hidden"
      style={{
        ...menuStyle,
        backgroundColor: 'var(--theme-bg-darkest)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Header */}
      <div 
        className="px-3 py-2"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'var(--theme-bg-dark)',
        }}
      >
        <span 
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          {filter ? `Results for "${filter}"` : 'Basic blocks'}
        </span>
      </div>

      {/* Commands list */}
      <div className="max-h-[340px] overflow-y-auto py-1">
        {groupedCommands.length === 0 ? (
          <div className="px-4 py-8 text-center" style={{ color: 'var(--theme-fg-muted)' }}>
            <p className="text-sm">No results</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        ) : (
          groupedCommands.map((item, idx) => {
            if (item.type === 'header') {
              return (
                <div
                  key={`header-${item.name}`}
                  className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--theme-fg-muted)' }}
                >
                  {item.name}
                </div>
              );
            }

            const Icon = item.icon;
            const isSelected = item.index === selectedIndex;

            return (
              <button
                key={item.id}
                ref={isSelected ? selectedRef : null}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(item)}
                onMouseEnter={() => {}}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                }}
                onMouseOver={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                }}
                onMouseOut={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Icon container */}
                <div 
                  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Icon 
                    className="w-5 h-5"
                    style={{ color: isSelected ? 'var(--theme-fg-light)' : 'var(--theme-fg-muted)' }}
                  />
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-sm font-medium"
                      style={{ color: 'var(--theme-fg)' }}
                    >
                      {item.label}
                    </span>
                    {item.shortcut && (
                      <span 
                        className="text-[10px] font-mono"
                        style={{ color: 'var(--theme-fg-muted)' }}
                      >
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                  <p 
                    className="text-xs truncate"
                    style={{ color: 'var(--theme-fg-muted)' }}
                  >
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div 
        className="px-3 py-2"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'var(--theme-bg-dark)',
        }}
      >
        <div 
          className="flex items-center gap-3 text-[10px]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          <span className="flex items-center gap-1">
            <kbd 
              className="px-1 py-0.5 rounded text-[9px]"
              style={{ backgroundColor: 'var(--theme-bg-light)' }}
            >↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd 
              className="px-1 py-0.5 rounded text-[9px]"
              style={{ backgroundColor: 'var(--theme-bg-light)' }}
            >↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd 
              className="px-1 py-0.5 rounded text-[9px]"
              style={{ backgroundColor: 'var(--theme-bg-light)' }}
            >esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
});

// Tag menu component
const TagMenu = memo(({ tags, selectedIndex, onSelect, onClose, position }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (tags.length === 0) return null;

  // Position menu with smart flipping when near viewport bottom
  const menuHeight = 280;
  const wouldOverflowBottom = position.y + menuHeight > window.innerHeight;

  const menuStyle = {
    left: Math.min(position.x, window.innerWidth - 220),
    top: wouldOverflowBottom
      ? Math.max(8, position.y - menuHeight - 30)
      : position.y
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-[200px] rounded-lg shadow-xl overflow-hidden"
      style={{
        ...menuStyle,
        backgroundColor: 'var(--theme-bg-darkest)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div 
        className="px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span 
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          Tags
        </span>
      </div>
      <div className="py-1 max-h-[200px] overflow-y-auto">
        {tags.map((tag, idx) => {
          const isSelected = idx === selectedIndex;
          const tagColor = getTagColor(tag);
          return (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(tag)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
              style={{
                backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: isSelected ? tagColor.text : 'var(--theme-fg)',
              }}
              onMouseOver={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              }}
              onMouseOut={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Hash className="w-4 h-4" style={{ color: isSelected ? tagColor.text : 'var(--theme-fg-muted)' }} />
              <span className="text-sm">{tag}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
});

// Creative placeholder messages for notes
const NOTE_PLACEHOLDERS = [
  "Start writing, or type '/' for commands...",
  "Your thoughts called. They'd like to be written down...",
  "Blank page syndrome? Type '/' for inspiration...",
  "Plot twist: you actually have to type something...",
  "Dear diary... just kidding. Type '/' for commands",
  "Writer's block? '/' might help (or not, no pressure)",
  "This note won't write itself. Trust me, I've tried.",
  "Type something brilliant. Or mediocre. No judgment.",
  "Alexa, write my notes... wait, wrong assistant.",
  "The cursor is blinking. That means it's your turn.",
  "Fun fact: empty notes contain infinite potential",
  "Your future self will thank you for this note. Maybe.",
  "Roses are red, violets are blue, type '/' for blocks, your note awaits you",
  "Here lies an empty note. May it rest in content.",
  "Chapter 1: In which you actually write something...",
  "Once upon a time, in a note far, far away...",
  "If content is king, this note is currently peasant-less",
  "Breaking news: Local note still empty at press time",
  "Loading creativity... please type to continue",
  "Error 404: Content not found. You should fix that.",
  "Hint: Words go here. Revolutionary, I know.",
  "This is the beginning of a beautiful note-ship",
  "Type '/' because even notes need a little direction",
  "Waiting for content... *taps microphone*",
  "Psst... the '/' key does cool stuff. Just saying.",
];

// Get a random placeholder
const getRandomNotePlaceholder = () => {
  return NOTE_PLACEHOLDERS[Math.floor(Math.random() * NOTE_PLACEHOLDERS.length)];
};

// Main NotionEditor component
const NotionEditor = memo(({
  value = '',
  onChange,
  placeholder,
  minHeight = 200,
  availableTags = [],
  className = ''
}) => {
  // Use provided placeholder or generate a random one
  const [currentPlaceholder] = useState(() => placeholder || getRandomNotePlaceholder());
  const editorRef = useRef(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerInfo, setTriggerInfo] = useState(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [isFocused, setIsFocused] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const isComposing = useRef(false);

  // Apply tag colors to all inline-tag elements in the editor
  const applyTagColors = useCallback(() => {
    if (!editorRef.current) return;
    const tagElements = editorRef.current.querySelectorAll('.inline-tag');
    tagElements.forEach(tagEl => {
      const tagText = tagEl.textContent || '';
      // Extract tag name (remove # prefix)
      const tagName = tagText.startsWith('#') ? tagText.slice(1) : tagText;
      if (tagName) {
        const tagColor = getTagColor(tagName);
        tagEl.style.backgroundColor = tagColor.bg;
        tagEl.style.color = tagColor.text;
      }
    });
  }, []);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      setIsEmpty(false);
      // Apply colors to any existing tags
      setTimeout(applyTagColors, 0);
    }
  }, [applyTagColors]);

  // Filter commands based on search
  const filteredCommands = filter
    ? ALL_COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
        cmd.id.toLowerCase().includes(filter.toLowerCase()) ||
        (cmd.shortcut && cmd.shortcut.includes(filter))
      )
    : ALL_COMMANDS;

  const filteredTags = availableTags.filter(tag =>
    tag.toLowerCase().includes(filter.toLowerCase())
  );

  // Update empty state - check for both text content AND block elements
  const updateEmptyState = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || '';
      // Also check if there are any block elements (h1, h2, h3, blockquote, pre, todo, etc.)
      const hasBlockElements = editorRef.current.querySelector('h1, h2, h3, blockquote, pre, .todo-item, .callout, .toggle, ul, ol, hr');
      setIsEmpty(!text.trim() && !hasBlockElements);
    }
  }, []);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (isComposing.current) return;

    const editor = editorRef.current;
    if (!editor) return;

    updateEmptyState();
    onChange(editor.innerHTML);

    // Check for slash command or tag trigger
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      setShowCommandMenu(false);
      setShowTagMenu(false);
      return;
    }

    const textNode = range.startContainer;
    const text = textNode.textContent || '';
    const cursorPos = range.startOffset;
    const textBeforeCursor = text.slice(0, cursorPos);

    // Check for slash command: /[filter]
    const slashMatch = textBeforeCursor.match(/\/([a-zA-Z0-9]*)$/);
    if (slashMatch) {
      const coords = getCaretCoordinates();
      if (coords) {
        setMenuPosition(coords);
        setFilter(slashMatch[1]);
        setSelectedIndex(0);
        setTriggerInfo({
          node: textNode,
          start: cursorPos - slashMatch[0].length,
          end: cursorPos
        });
        setShowCommandMenu(true);
        setShowTagMenu(false);
      }
      return;
    }

    // Check for tag trigger: #[filter]
    const tagMatch = textBeforeCursor.match(/#([a-zA-Z0-9_]*)$/);
    if (tagMatch && availableTags.length > 0) {
      const coords = getCaretCoordinates();
      if (coords) {
        setMenuPosition(coords);
        setFilter(tagMatch[1]);
        setSelectedIndex(0);
        setTriggerInfo({
          node: textNode,
          start: cursorPos - tagMatch[0].length,
          end: cursorPos
        });
        setShowTagMenu(true);
        setShowCommandMenu(false);
      }
      return;
    }

    // Close menus if no trigger
    setShowCommandMenu(false);
    setShowTagMenu(false);
  }, [onChange, updateEmptyState, availableTags]);

  // Keyboard handler
  const handleKeyDown = useCallback((e) => {
    // Hide placeholder on any keypress (except modifier keys alone)
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
      setHasTyped(true);
    }

    // Menu navigation when menu is open
    if (showCommandMenu || showTagMenu) {
      const items = showCommandMenu ? filteredCommands : filteredTags;
      const itemCount = items.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % Math.max(itemCount, 1));
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1));
          return;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (items[selectedIndex]) {
            if (showCommandMenu) {
              handleCommandSelect(items[selectedIndex]);
            } else {
              handleTagSelect(items[selectedIndex]);
            }
          }
          return;
        case 'Escape':
          e.preventDefault();
          setShowCommandMenu(false);
          setShowTagMenu(false);
          return;
        case ' ': // Space closes menu (Notion behavior)
          setShowCommandMenu(false);
          setShowTagMenu(false);
          return;
        case 'Backspace':
          // If filter is empty and backspace is pressed, close menu
          if (filter === '') {
            setShowCommandMenu(false);
            setShowTagMenu(false);
          }
          return;
      }
    }

    // Detect "/" key to immediately show command menu
    if (e.key === '/' && !showCommandMenu && !showTagMenu) {
      // Small delay to let the character be inserted first
      setTimeout(() => {
        const coords = getCaretCoordinates();
        if (coords) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;
            const cursorPos = range.startOffset;

            setMenuPosition(coords);
            setFilter('');
            setSelectedIndex(0);
            setTriggerInfo({
              node: textNode,
              start: cursorPos - 1,
              end: cursorPos
            });
            setShowCommandMenu(true);
            setShowTagMenu(false);
          }
        }
      }, 0);
      return;
    }

    // Detect "#" key to immediately show tag menu
    if (e.key === '#' && !showCommandMenu && !showTagMenu && availableTags.length > 0) {
      setTimeout(() => {
        const coords = getCaretCoordinates();
        if (coords) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;
            const cursorPos = range.startOffset;

            setMenuPosition(coords);
            setFilter('');
            setSelectedIndex(0);
            setTriggerInfo({
              node: textNode,
              start: cursorPos - 1,
              end: cursorPos
            });
            setShowTagMenu(true);
            setShowCommandMenu(false);
          }
        }
      }, 0);
      return;
    }

    // Handle Backspace key for todo item and toggle deletion when empty
    if (e.key === 'Backspace' && !showCommandMenu && !showTagMenu) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let currentBlock = range.startContainer;
      const editor = editorRef.current;

      // Check if we're inside a todo item
      const todoItem = currentBlock.closest ? currentBlock.closest('.todo-item') : null;
      const todoItemParent = todoItem || (currentBlock.parentElement?.closest?.('.todo-item'));

      if (todoItemParent) {
        const todoText = todoItemParent.querySelector('.todo-text');
        const textContent = todoText?.textContent || '';
        const currentIndent = parseInt(todoItemParent.dataset.indent || '0', 10);

        // If cursor is at the start of empty todo text
        if (textContent === '' || (range.startOffset === 0 && textContent.trim() === '')) {
          e.preventDefault();

          // Convert to paragraph, preserving indent position
          const newPara = document.createElement('p');
          newPara.appendChild(document.createElement('br'));

          // Preserve indent with padding
          if (currentIndent > 0) {
            newPara.style.paddingLeft = `${currentIndent * 1.5}rem`;
          }

          // Replace todo with paragraph
          todoItemParent.parentNode.replaceChild(newPara, todoItemParent);

          // Move cursor to the new paragraph
          const newRange = document.createRange();
          newRange.setStart(newPara, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);

          // Sync changes
          setTimeout(() => {
            if (editor) {
              updateEmptyState();
              onChange(editor.innerHTML);
            }
          }, 0);
          return;
        }
      }

      // Check if we're inside a toggle
      const toggle = currentBlock.closest ? currentBlock.closest('.toggle') : null;
      const toggleParent = toggle || (currentBlock.parentElement?.closest?.('.toggle'));

      if (toggleParent) {
        const toggleTitle = toggleParent.querySelector('.toggle-title');
        const toggleContent = toggleParent.querySelector('.toggle-content');
        const titleText = toggleTitle?.textContent || '';
        const contentText = toggleContent?.textContent || '';

        // Check if cursor is in the title and title is empty
        const isInTitle = toggleTitle && (toggleTitle.contains(currentBlock) || toggleTitle === currentBlock);

        if (isInTitle && (titleText === '' || (range.startOffset === 0 && titleText.trim() === ''))) {
          // If content is also empty, delete the whole toggle
          if (contentText.trim() === '') {
            e.preventDefault();

            // Create a new paragraph to replace the toggle
            const newPara = document.createElement('p');
            newPara.appendChild(document.createElement('br'));

            // Replace toggle with paragraph
            toggleParent.parentNode.replaceChild(newPara, toggleParent);

            // Move cursor to the new paragraph
            const newRange = document.createRange();
            newRange.setStart(newPara, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            // Sync changes
            setTimeout(() => {
              if (editor) {
                updateEmptyState();
                onChange(editor.innerHTML);
              }
            }, 0);
            return;
          }
        }

        // Check if cursor is in content and content is empty
        const isInContent = toggleContent && (toggleContent.contains(currentBlock) || toggleContent === currentBlock);

        if (isInContent && (contentText === '' || (range.startOffset === 0 && contentText.trim() === ''))) {
          e.preventDefault();

          // Move cursor to the toggle title instead
          const newRange = document.createRange();
          if (toggleTitle.lastChild) {
            newRange.setStartAfter(toggleTitle.lastChild);
          } else {
            newRange.setStart(toggleTitle, 0);
          }
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          return;
        }
      }
    }

    // Handle Tab key for indentation
    if (e.key === 'Tab' && !showCommandMenu && !showTagMenu) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let currentBlock = range.startContainer;

      // Check if we're inside a todo item
      const todoItem = currentBlock.closest ? currentBlock.closest('.todo-item') : null;
      const todoItemParent = todoItem || (currentBlock.parentElement?.closest?.('.todo-item'));

      if (todoItemParent) {
        e.preventDefault();

        // Get current indent level
        const currentIndent = parseInt(todoItemParent.dataset.indent || '0', 10);

        if (e.shiftKey) {
          // Shift+Tab: decrease indent (min 0)
          const newIndent = Math.max(0, currentIndent - 1);
          if (newIndent === 0) {
            delete todoItemParent.dataset.indent;
          } else {
            todoItemParent.dataset.indent = newIndent;
          }
        } else {
          // Tab: increase indent (max 5 levels)
          const newIndent = Math.min(5, currentIndent + 1);
          todoItemParent.dataset.indent = newIndent;
        }

        // Sync changes
        setTimeout(() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }, 0);
        return;
      }

      // For regular text, insert tab character (4 spaces)
      e.preventDefault();

      // Insert tab as non-breaking spaces (4 spaces = 1 tab)
      const tabSpaces = '\u00A0\u00A0\u00A0\u00A0';

      // Delete any selected text first
      if (!range.collapsed) {
        range.deleteContents();
      }

      // Insert the tab spaces
      const textNode = document.createTextNode(tabSpaces);
      range.insertNode(textNode);

      // Move cursor after the inserted tab
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      // Sync changes
      setTimeout(() => {
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      }, 0);
      return;
    }

    // Handle Enter key to create new paragraph blocks or continue lists
    if (e.key === 'Enter' && !e.shiftKey && !showCommandMenu && !showTagMenu) {
      e.preventDefault();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const editor = editorRef.current;
      let currentBlock = range.startContainer;

      // Check if we're inside a todo item
      const todoItem = currentBlock.closest ? currentBlock.closest('.todo-item') : null;
      const todoItemParent = todoItem || (currentBlock.parentElement?.closest?.('.todo-item'));

      if (todoItemParent) {
        // Create a new todo item
        const newTodo = document.createElement('div');
        newTodo.className = 'todo-item';

        // Preserve indent level from parent todo
        const parentIndent = todoItemParent.dataset.indent;
        if (parentIndent) {
          newTodo.dataset.indent = parentIndent;
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        const todoText = document.createElement('span');
        todoText.className = 'todo-text';
        todoText.contentEditable = 'true';
        todoText.setAttribute('data-placeholder', 'To-do');

        newTodo.appendChild(checkbox);
        newTodo.appendChild(todoText);

        // Insert after current todo item
        if (todoItemParent.nextSibling) {
          todoItemParent.parentNode.insertBefore(newTodo, todoItemParent.nextSibling);
        } else {
          todoItemParent.parentNode.appendChild(newTodo);
        }

        // Focus the new todo text
        const newRange = document.createRange();
        newRange.selectNodeContents(todoText);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // Sync changes
        setTimeout(() => {
          if (editor) {
            onChange(editor.innerHTML);
          }
        }, 0);
        return;
      }

      // Check if inside toggle content - allow normal line breaks there
      const toggleContent = currentBlock.closest ? currentBlock.closest('.toggle-content') :
                           currentBlock.parentElement?.closest?.('.toggle-content');
      if (toggleContent) {
        // Inside toggle content: insert a line break, not a new block
        document.execCommand('insertLineBreak');
        setTimeout(() => {
          if (editor) {
            onChange(editor.innerHTML);
          }
        }, 0);
        return;
      }

      // Find the current block element
      while (currentBlock && currentBlock !== editor &&
             !['P', 'DIV', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'LI'].includes(currentBlock.nodeName)) {
        currentBlock = currentBlock.parentElement;
      }

      // Create new paragraph
      const newPara = document.createElement('p');
      newPara.appendChild(document.createElement('br'));

      // Insert after current block or at the end
      if (currentBlock && currentBlock !== editor) {
        if (currentBlock.nextSibling) {
          currentBlock.parentNode.insertBefore(newPara, currentBlock.nextSibling);
        } else {
          currentBlock.parentNode.appendChild(newPara);
        }
      } else {
        // At root level or no block found, append to editor
        editor.appendChild(newPara);
      }

      // Move cursor to new paragraph
      const newRange = document.createRange();
      newRange.setStart(newPara, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      // Sync changes
      setTimeout(() => {
        if (editor) {
          onChange(editor.innerHTML);
        }
      }, 0);
      return;
    }

    // Text formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold', false);
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic', false);
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline', false);
          break;
      }
    }
  }, [showCommandMenu, showTagMenu, filteredCommands, filteredTags, selectedIndex, filter, availableTags, onChange]);

  // Handle command selection
  const handleCommandSelect = useCallback((cmd) => {
    const editor = editorRef.current;
    if (!editor || !triggerInfo) return;

    // Ensure editor has focus before processing
    editor.focus();

    const selection = window.getSelection();
    if (!selection) return;

    // Get the current block element (the line/paragraph containing the cursor)
    const { node, start, end } = triggerInfo;

    // Validate node is still in DOM and connected to editor
    if (!node || !node.parentElement || !editor.contains(node)) {
      console.warn('NotionEditor: triggerInfo node is no longer valid');
      setShowCommandMenu(false);
      setTriggerInfo(null);
      return;
    }
    let currentBlock = node.parentElement;

    // Find the actual block-level parent (p, div, h1, etc.)
    while (currentBlock && currentBlock !== editor &&
           !['P', 'DIV', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'LI'].includes(currentBlock.tagName)) {
      currentBlock = currentBlock.parentElement;
    }

    // Remove trigger text from the node
    const text = node.textContent || '';
    const beforeTrigger = text.slice(0, start);
    const afterTrigger = text.slice(end);
    const remainingText = beforeTrigger + afterTrigger;

    // For block-level formatting (headings, paragraphs, quotes, code)
    // Create the new block element directly instead of using formatBlock
    const blockFormats = ['p', 'h1', 'h2', 'h3', 'blockquote', 'pre'];

    // Placeholder text for each block type
    const blockPlaceholders = {
      'h1': 'Heading 1',
      'h2': 'Heading 2',
      'h3': 'Heading 3',
      'p': '',
      'blockquote': 'Quote',
      'pre': 'Code',
    };

    if (blockFormats.includes(cmd.format)) {
      // Create the new block element
      const newBlock = document.createElement(cmd.format);

      // If there's remaining content on the line, keep it; otherwise show placeholder
      if (remainingText.trim()) {
        newBlock.textContent = remainingText;
      } else {
        // Add placeholder attribute and a <br> for cursor placement
        const placeholder = blockPlaceholders[cmd.format];
        if (placeholder) {
          newBlock.setAttribute('data-placeholder', placeholder);
        }
        newBlock.appendChild(document.createElement('br'));
      }

      // Replace the current block with the new formatted block
      if (currentBlock && currentBlock !== editor) {
        currentBlock.parentNode.replaceChild(newBlock, currentBlock);
      } else {
        // If we're at root level, just replace content
        node.textContent = '';
        editor.insertBefore(newBlock, editor.firstChild);
      }

      // Position cursor at the very start of the new block (before placeholder)
      const range = document.createRange();
      range.setStart(newBlock, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

    } else if (cmd.format === 'ul' || cmd.format === 'ol') {
      // For lists, remove trigger then use execCommand
      node.textContent = remainingText;

      const range = document.createRange();
      range.setStart(node, Math.min(start, node.textContent.length));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      document.execCommand(cmd.format === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false);

    } else if (cmd.format === 'hr') {
      // Remove trigger text
      node.textContent = remainingText;
      document.execCommand('insertHorizontalRule', false);

    } else if (cmd.format === 'todo') {
      // Create a todo item with proper structure
      const todoItem = document.createElement('div');
      todoItem.className = 'todo-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';

      const todoText = document.createElement('span');
      todoText.className = 'todo-text';
      todoText.contentEditable = 'true';
      todoText.setAttribute('data-placeholder', 'To-do');
      if (remainingText.trim()) {
        todoText.textContent = remainingText.trim();
      }

      todoItem.appendChild(checkbox);
      todoItem.appendChild(todoText);

      // Create a new paragraph after the todo for continued typing
      const nextPara = document.createElement('p');
      nextPara.appendChild(document.createElement('br'));

      if (currentBlock && currentBlock !== editor) {
        currentBlock.parentNode.replaceChild(todoItem, currentBlock);
        todoItem.parentNode.insertBefore(nextPara, todoItem.nextSibling);
      } else {
        node.textContent = '';
        editor.appendChild(todoItem);
        editor.appendChild(nextPara);
      }

      // Focus the todo text span
      if (todoText) {
        const range = document.createRange();
        range.selectNodeContents(todoText);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

    } else if (cmd.format === 'callout') {
      const callout = document.createElement('div');
      callout.className = 'callout';
      callout.innerHTML = '<span class="callout-icon">💡</span><span contenteditable="true">' +
        (remainingText.trim() || '') + '</span>';

      const nextPara = document.createElement('p');
      nextPara.appendChild(document.createElement('br'));

      if (currentBlock && currentBlock !== editor) {
        currentBlock.parentNode.replaceChild(callout, currentBlock);
        callout.parentNode.insertBefore(nextPara, callout.nextSibling);
      } else {
        node.textContent = '';
        editor.appendChild(callout);
        editor.appendChild(nextPara);
      }

      const calloutSpan = callout.querySelector('span[contenteditable]');
      if (calloutSpan) {
        const range = document.createRange();
        range.selectNodeContents(calloutSpan);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

    } else if (cmd.format === 'toggle') {
      // Humorous toggle placeholders
      const toggleTitlePlaceholders = [
        'Spoiler alert...',
        'Click if you dare...',
        'Secret stuff inside',
        'Plot twist incoming',
        'The tea is in here',
        'Expand for wisdom',
        'Mystery box',
        'Click to unfold drama',
      ];
      const toggleContentPlaceholders = [
        "Surprise! It's empty. Add something cool.",
        "Nothing here yet. The suspense continues...",
        "You opened it! Now fill it with greatness.",
        "Empty, like my coffee cup at 3pm.",
        "This toggle has trust issues. Add content to help.",
        "Congratulations, you found... nothing. Yet.",
      ];

      const randomTitle = toggleTitlePlaceholders[Math.floor(Math.random() * toggleTitlePlaceholders.length)];
      const randomContent = toggleContentPlaceholders[Math.floor(Math.random() * toggleContentPlaceholders.length)];

      // Build custom toggle (NOT using details/summary due to contentEditable conflicts)
      const toggle = document.createElement('div');
      toggle.className = 'toggle is-open';

      // Header row with arrow and title
      const header = document.createElement('div');
      header.className = 'toggle-header';

      // Clickable arrow button
      const arrowBtn = document.createElement('button');
      arrowBtn.type = 'button';
      arrowBtn.className = 'toggle-arrow';
      arrowBtn.innerHTML = '▾';
      arrowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = toggle.classList.toggle('is-open');
        arrowBtn.innerHTML = isOpen ? '▾' : '▸';
      });
      header.appendChild(arrowBtn);

      // Editable title
      const titleSpan = document.createElement('span');
      titleSpan.className = 'toggle-title';
      titleSpan.contentEditable = 'true';
      titleSpan.setAttribute('data-placeholder', randomTitle);
      if (remainingText.trim()) {
        titleSpan.textContent = remainingText.trim();
      }
      header.appendChild(titleSpan);

      toggle.appendChild(header);

      // Collapsible content area
      const contentDiv = document.createElement('div');
      contentDiv.className = 'toggle-content';
      contentDiv.contentEditable = 'true';
      contentDiv.setAttribute('data-placeholder', randomContent);
      contentDiv.appendChild(document.createElement('br'));
      toggle.appendChild(contentDiv);

      const nextPara = document.createElement('p');
      nextPara.appendChild(document.createElement('br'));

      if (currentBlock && currentBlock !== editor) {
        currentBlock.parentNode.replaceChild(toggle, currentBlock);
        toggle.parentNode.insertBefore(nextPara, toggle.nextSibling);
      } else {
        node.textContent = '';
        editor.appendChild(toggle);
        editor.appendChild(nextPara);
      }

      // Focus the title
      if (titleSpan) {
        const range = document.createRange();
        range.selectNodeContents(titleSpan);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    setShowCommandMenu(false);
    setTriggerInfo(null);
    // Note: Don't call editor.focus() here as it can override cursor positioning

    // Sync changes
    setTimeout(() => {
      if (editorRef.current) {
        updateEmptyState();
        onChange(editorRef.current.innerHTML);
      }
    }, 0);
  }, [triggerInfo, onChange, updateEmptyState]);

  // Handle tag selection
  const handleTagSelect = useCallback((tag) => {
    const selection = window.getSelection();
    if (!selection || !triggerInfo) return;

    const { node, start, end } = triggerInfo;
    if (node && node.parentNode) {
      const text = node.textContent || '';
      const before = text.slice(0, start);
      const after = text.slice(end);

      // Get the tag's color from shared utility
      const tagColor = getTagColor(tag);

      // Create tag element with proper color styling
      const tagEl = document.createElement('span');
      tagEl.className = 'inline-tag';
      tagEl.textContent = `#${tag}`;
      tagEl.contentEditable = 'false';
      // Apply inline styles for consistent coloring across app
      tagEl.style.backgroundColor = tagColor.bg;
      tagEl.style.color = tagColor.text;

      // Build new content
      const beforeNode = document.createTextNode(before);
      const afterNode = document.createTextNode(' ' + after);

      const parent = node.parentNode;
      parent.insertBefore(beforeNode, node);
      parent.insertBefore(tagEl, node);
      parent.insertBefore(afterNode, node);
      parent.removeChild(node);

      // Position cursor after tag
      const range = document.createRange();
      range.setStart(afterNode, 1);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setShowTagMenu(false);
    setTriggerInfo(null);
    editorRef.current?.focus();

    setTimeout(() => {
      if (editorRef.current) {
        updateEmptyState();
        onChange(editorRef.current.innerHTML);
      }
    }, 0);
  }, [triggerInfo, onChange, updateEmptyState]);

  // Rich paste handler - preserves formatting from other sites
  const handlePaste = useCallback((e) => {
    e.preventDefault();

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Try to get HTML content first, fall back to plain text
    let html = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');

    if (html) {
      // Sanitize and transform the HTML
      const sanitizedHtml = sanitizePastedHtml(html);
      insertHtmlAtCursor(sanitizedHtml);
    } else if (plainText) {
      // Convert plain text to HTML (preserve line breaks)
      const htmlText = plainText
        .split('\n\n')
        .map(para => `<p>${para.split('\n').join('<br>')}</p>`)
        .join('');
      insertHtmlAtCursor(htmlText);
    }

    // Update state
    setTimeout(() => {
      updateEmptyState();
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
        applyTagColors();
      }
    }, 0);
  }, [onChange, updateEmptyState, applyTagColors]);

  // Sanitize pasted HTML - keep useful formatting, remove dangerous stuff
  const sanitizePastedHtml = (html) => {
    // Create a temporary container to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove dangerous elements
    const dangerousSelectors = [
      'script', 'style', 'iframe', 'object', 'embed', 'form',
      'input', 'button', 'select', 'textarea', 'meta', 'link',
      'noscript', 'frame', 'frameset'
    ];
    dangerousSelectors.forEach(selector => {
      temp.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Remove event handlers and dangerous attributes
    temp.querySelectorAll('*').forEach(el => {
      // Remove all on* event handlers
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });

      // Remove class and id (we'll style with our own)
      el.removeAttribute('class');
      el.removeAttribute('id');
      el.removeAttribute('style'); // Remove inline styles initially
    });

    // Transform elements to our format
    transformPastedElements(temp);

    return temp.innerHTML;
  };

  // Transform pasted elements to match NotionEditor format
  const transformPastedElements = (container) => {
    // First, handle Notion-specific structures
    // Notion uses divs with data-block-id and specific class patterns

    // Convert Notion bullet lists (they use divs with bullet markers)
    container.querySelectorAll('[data-block-id]').forEach(block => {
      // Check if it's a bullet item (Notion adds bullet character or uses specific classes)
      const text = block.textContent || '';
      if (text.startsWith('•') || text.startsWith('-') || text.startsWith('*')) {
        const li = document.createElement('li');
        li.innerHTML = block.innerHTML.replace(/^[•\-\*]\s*/, '');
        block.replaceWith(li);
      }
    });

    // Wrap consecutive li elements in ul
    const allElements = Array.from(container.children);
    let currentList = null;
    allElements.forEach(el => {
      if (el.tagName === 'LI') {
        if (!currentList) {
          currentList = document.createElement('ul');
          el.parentNode.insertBefore(currentList, el);
        }
        currentList.appendChild(el);
      } else {
        currentList = null;
      }
    });

    // Also detect bullet points in plain divs/paragraphs and convert them
    container.querySelectorAll('div, p, span').forEach(el => {
      if (el.children.length === 0 || (el.children.length === 1 && el.children[0].tagName === 'SPAN')) {
        const text = el.textContent || '';
        // Check for bullet patterns at start
        const bulletMatch = text.match(/^[\s]*([•\-\*◦▪▸►])\s+(.+)$/);
        if (bulletMatch) {
          const li = document.createElement('li');
          // Preserve any inner HTML formatting
          let html = el.innerHTML;
          html = html.replace(/^[\s]*[•\-\*◦▪▸►]\s+/, '');
          li.innerHTML = html;

          // Check for indentation (leading spaces or tabs)
          const indent = text.match(/^(\s+)/);
          if (indent) {
            const indentLevel = Math.floor(indent[1].length / 2);
            if (indentLevel > 0) {
              li.setAttribute('data-indent', Math.min(indentLevel, 3));
              li.style.marginLeft = `${indentLevel * 1.5}rem`;
            }
          }
          el.replaceWith(li);
        }
      }
    });

    // Wrap any orphaned li elements in ul
    container.querySelectorAll('li').forEach(li => {
      if (li.parentElement && li.parentElement.tagName !== 'UL' && li.parentElement.tagName !== 'OL') {
        const ul = document.createElement('ul');
        li.parentNode.insertBefore(ul, li);
        ul.appendChild(li);
      }
    });

    // Handle numbered lists (1. 2. 3. patterns)
    container.querySelectorAll('div, p').forEach(el => {
      if (el.children.length === 0 || (el.children.length === 1 && el.children[0].tagName === 'SPAN')) {
        const text = el.textContent || '';
        const numberedMatch = text.match(/^[\s]*(\d+)[.)]\s+(.+)$/);
        if (numberedMatch) {
          const li = document.createElement('li');
          let html = el.innerHTML;
          html = html.replace(/^[\s]*\d+[.)]\s+/, '');
          li.innerHTML = html;
          li.setAttribute('data-list-type', 'ordered');
          el.replaceWith(li);
        }
      }
    });

    // Wrap ordered list items in ol
    container.querySelectorAll('li[data-list-type="ordered"]').forEach(li => {
      if (li.parentElement && li.parentElement.tagName !== 'OL') {
        const ol = document.createElement('ol');
        li.parentNode.insertBefore(ol, li);
        ol.appendChild(li);
        li.removeAttribute('data-list-type');
      }
    });

    // Transform headings (keep h1, h2, h3, convert h4-h6 to h3)
    container.querySelectorAll('h4, h5, h6').forEach(el => {
      const h3 = document.createElement('h3');
      h3.innerHTML = el.innerHTML;
      el.replaceWith(h3);
    });

    // Transform code blocks
    container.querySelectorAll('pre').forEach(pre => {
      // Ensure pre has proper structure
      if (!pre.querySelector('code')) {
        const code = document.createElement('code');
        code.innerHTML = pre.innerHTML;
        pre.innerHTML = '';
        pre.appendChild(code);
      }
    });

    // Transform inline code
    container.querySelectorAll('code').forEach(code => {
      if (code.parentElement?.tagName !== 'PRE') {
        code.style.backgroundColor = 'rgba(250, 189, 47, 0.15)';
        code.style.color = '#fabd2f';
        code.style.padding = '0.125rem 0.375rem';
        code.style.borderRadius = '4px';
        code.style.fontFamily = 'monospace';
        code.style.fontSize = '0.875em';
      }
    });

    // Transform blockquotes
    container.querySelectorAll('blockquote').forEach(bq => {
      bq.style.borderLeft = '3px solid #d79921';
      bq.style.paddingLeft = '1rem';
      bq.style.marginLeft = '0';
      bq.style.color = '#a89984';
      bq.style.fontStyle = 'italic';
    });

    // Transform links - preserve href, style them
    container.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('javascript:')) {
        link.style.color = '#83a598';
        link.style.textDecoration = 'underline';
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      } else {
        // Remove dangerous links
        const span = document.createElement('span');
        span.innerHTML = link.innerHTML;
        link.replaceWith(span);
      }
    });

    // Transform lists
    container.querySelectorAll('ul, ol').forEach(list => {
      list.style.marginLeft = '1.5rem';
      list.style.marginTop = '0.5rem';
      list.style.marginBottom = '0.5rem';
    });

    container.querySelectorAll('li').forEach(li => {
      li.style.marginBottom = '0.25rem';
    });

    // Transform images - wrap in figure if not already
    container.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        // Keep the image with basic styling
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.style.marginTop = '0.5rem';
        img.style.marginBottom = '0.5rem';

        // If not in a figure, wrap it
        if (img.parentElement?.tagName !== 'FIGURE') {
          const figure = document.createElement('figure');
          figure.style.margin = '1rem 0';
          img.parentNode.insertBefore(figure, img);
          figure.appendChild(img);
        }
      } else {
        img.remove();
      }
    });

    // Transform tables to simple format
    container.querySelectorAll('table').forEach(table => {
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginTop = '0.5rem';
      table.style.marginBottom = '0.5rem';
    });

    container.querySelectorAll('th, td').forEach(cell => {
      cell.style.border = '1px solid #504945';
      cell.style.padding = '0.5rem';
      cell.style.textAlign = 'left';
    });

    container.querySelectorAll('th').forEach(th => {
      th.style.backgroundColor = 'rgba(60, 56, 54, 0.5)';
      th.style.fontWeight = '600';
    });

    // Convert divs/spans with specific meanings
    container.querySelectorAll('div, span').forEach(el => {
      // If it's a block-level div with content, keep structure
      if (el.tagName === 'DIV' && el.children.length === 0 && el.textContent.trim()) {
        const p = document.createElement('p');
        p.innerHTML = el.innerHTML;
        el.replaceWith(p);
      }
    });

    // Preserve bold, italic, underline, strikethrough
    container.querySelectorAll('strong, b').forEach(el => {
      el.style.fontWeight = '600';
    });

    container.querySelectorAll('em, i').forEach(el => {
      el.style.fontStyle = 'italic';
    });

    container.querySelectorAll('u').forEach(el => {
      el.style.textDecoration = 'underline';
    });

    container.querySelectorAll('s, strike, del').forEach(el => {
      el.style.textDecoration = 'line-through';
    });

    // Handle highlight/mark
    container.querySelectorAll('mark').forEach(el => {
      el.style.backgroundColor = 'rgba(250, 189, 47, 0.3)';
      el.style.padding = '0 2px';
      el.style.borderRadius = '2px';
    });

    // Convert br sequences to proper paragraphs where appropriate
    // (but keep single br within paragraphs)
  };

  // Insert HTML at cursor position
  const insertHtmlAtCursor = (html) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // Delete any selected content first
    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Create a temporary container to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Insert nodes
    const frag = document.createDocumentFragment();
    const nodes = Array.from(temp.childNodes);

    nodes.forEach(node => {
      frag.appendChild(node.cloneNode(true));
    });

    range.insertNode(frag);

    // Move cursor to end of inserted content
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // Composition handlers for IME
  const handleCompositionStart = () => { isComposing.current = true; };
  const handleCompositionEnd = () => {
    isComposing.current = false;
    handleInput();
  };

  return (
    <div className={`notion-editor relative ${className}`}>
      {/* Placeholder - visible only when empty and no keys pressed yet */}
      {isEmpty && !hasTyped && (
        <div
          className="absolute top-0 pointer-events-none select-none italic"
          style={{ 
            lineHeight: '1.7', 
            left: isFocused ? '4px' : '0',
            color: 'var(--theme-fg-muted)',
            opacity: 0.6,
          }}
          aria-hidden="true"
        >
          {currentPlaceholder}
        </div>
      )}

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          // Reset hasTyped when leaving empty editor so placeholder shows again
          if (editorRef.current) {
            const text = editorRef.current.textContent || '';
            const hasBlocks = editorRef.current.querySelector('h1, h2, h3, blockquote, pre, .todo-item, .callout, .toggle, ul, ol, hr');
            if (!text.trim() && !hasBlocks) {
              setHasTyped(false);
            }
          }
        }}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className="notion-content w-full min-h-full focus:outline-none"
        style={{ color: 'var(--theme-fg)', minHeight: `${minHeight}px`, lineHeight: '1.7' }}
        suppressContentEditableWarning
      />

      {/* Editor styles - Theme-aware using CSS variables */}
      <style>{`
        .notion-content {
          line-height: 1.7;
          font-size: 1rem;
        }
        .notion-content:focus {
          outline: none;
        }
        /* Subtle selection styling - Notion-like */
        .notion-content ::selection {
          background: rgba(45, 170, 219, 0.15);
          color: inherit;
        }
        .notion-content::-moz-selection {
          background: rgba(45, 170, 219, 0.15);
          color: inherit;
        }
        /* Block elements - subtle selection */
        .notion-content p::selection,
        .notion-content h1::selection,
        .notion-content h2::selection,
        .notion-content h3::selection,
        .notion-content li::selection,
        .notion-content blockquote::selection,
        .notion-content pre::selection,
        .notion-content .todo-text::selection,
        .notion-content .callout::selection,
        .notion-content .toggle-title::selection {
          background: rgba(45, 170, 219, 0.15);
          color: inherit;
        }
        /* Prevent selection on non-editable elements */
        .notion-content .inline-tag,
        .notion-content .todo-checkbox,
        .notion-content hr {
          user-select: none;
        }
        .notion-content > *:first-child {
          margin-top: 0;
        }
        .notion-content h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--theme-fg-light);
          margin: 1.5rem 0 0.5rem 0;
          line-height: 1.3;
          position: relative;
          min-height: 1.3em;
        }
        .notion-content h1:empty::after,
        .notion-content h1:has(br:only-child)::after {
          content: attr(data-placeholder);
          color: var(--theme-fg-muted);
          opacity: 0.6;
          font-weight: 700;
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
        }
        .notion-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--theme-fg-light);
          margin: 1.25rem 0 0.5rem 0;
          line-height: 1.3;
          position: relative;
          min-height: 1.3em;
        }
        .notion-content h2:empty::after,
        .notion-content h2:has(br:only-child)::after {
          content: attr(data-placeholder);
          color: var(--theme-fg-muted);
          opacity: 0.6;
          font-weight: 600;
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
        }
        .notion-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--theme-fg-light);
          margin: 1rem 0 0.5rem 0;
          line-height: 1.3;
          position: relative;
          min-height: 1.3em;
        }
        .notion-content h3:empty::after,
        .notion-content h3:has(br:only-child)::after {
          content: attr(data-placeholder);
          color: var(--theme-fg-muted);
          opacity: 0.6;
          font-weight: 600;
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
        }
        .notion-content p {
          margin: 0.125rem 0;
          color: var(--theme-fg);
        }
        .notion-content ul, .notion-content ol {
          margin: 0.5rem 0;
          padding-left: 1.75rem;
        }
        .notion-content ul {
          list-style-type: disc;
        }
        .notion-content ol {
          list-style-type: decimal;
        }
        .notion-content li {
          margin: 0.25rem 0;
          display: list-item;
          color: var(--theme-fg);
        }
        .notion-content ul ul, .notion-content ol ul {
          list-style-type: circle;
          margin: 0.25rem 0;
        }
        .notion-content ul ul ul, .notion-content ol ol ul {
          list-style-type: square;
        }
        .notion-content li[data-indent="1"] {
          margin-left: 1.5rem;
        }
        .notion-content li[data-indent="2"] {
          margin-left: 3rem;
        }
        .notion-content li[data-indent="3"] {
          margin-left: 4.5rem;
        }
        .notion-content blockquote {
          border-left: 3px solid var(--theme-primary);
          padding: 0.5rem 0 0.5rem 1rem;
          margin: 0.75rem 0;
          color: var(--theme-fg-muted);
          position: relative;
          min-height: 1.5em;
        }
        .notion-content blockquote:empty::after,
        .notion-content blockquote:has(br:only-child)::after {
          content: attr(data-placeholder);
          color: var(--theme-fg-muted);
          opacity: 0.6;
          font-style: italic;
          position: absolute;
          left: 1rem;
          top: 0.5rem;
          pointer-events: none;
        }
        .notion-content pre {
          background: var(--theme-bg-darkest);
          border: 1px solid var(--theme-bg-light);
          border-radius: 6px;
          padding: 1rem;
          margin: 0.75rem 0;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          overflow-x: auto;
          color: var(--theme-fg);
          position: relative;
          min-height: 1.5em;
        }
        .notion-content pre:empty::after,
        .notion-content pre:has(br:only-child)::after {
          content: attr(data-placeholder);
          color: var(--theme-fg-muted);
          opacity: 0.6;
          position: absolute;
          left: 1rem;
          top: 1rem;
          pointer-events: none;
        }
        .notion-content hr {
          border: none;
          height: 1px;
          background: var(--theme-bg-lighter);
          margin: 1.5rem 0;
        }
        .notion-content b, .notion-content strong {
          font-weight: 600;
          color: var(--theme-fg-light);
        }
        .notion-content i, .notion-content em {
          font-style: italic;
        }
        .notion-content u {
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .notion-content .inline-tag {
          display: inline-flex;
          align-items: center;
          /* Colors are applied via inline styles from getTagColor() */
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0 2px;
        }
        .notion-content .todo-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0.375rem 0;
          padding: 0.25rem 0;
          transition: padding-left 0.15s ease;
        }
        /* Indent levels for nested todos */
        .notion-content .todo-item[data-indent="1"] {
          padding-left: 1.5rem;
        }
        .notion-content .todo-item[data-indent="2"] {
          padding-left: 3rem;
        }
        .notion-content .todo-item[data-indent="3"] {
          padding-left: 4.5rem;
        }
        .notion-content .todo-item[data-indent="4"] {
          padding-left: 6rem;
        }
        .notion-content .todo-item[data-indent="5"] {
          padding-left: 7.5rem;
        }
        .notion-content .todo-item input[type="checkbox"] {
          /* Reset default appearance */
          -webkit-appearance: none;
          appearance: none;

          /* Circular shape */
          width: 20px;
          height: 20px;
          border-radius: 50%;
          flex-shrink: 0;
          cursor: pointer;

          /* Blend with dark theme - subtle border, transparent bg */
          background: transparent;
          border: 2px solid var(--theme-bg-lighter);

          /* Center the checkmark */
          display: grid;
          place-content: center;

          /* Smooth transitions */
          transition: all 0.2s ease;
        }
        .notion-content .todo-item input[type="checkbox"]:hover {
          border-color: var(--theme-primary);
          background: rgba(var(--glow-color-rgb), 0.1);
        }
        .notion-content .todo-item input[type="checkbox"]::before {
          content: "";
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transform: scale(0);
          transition: transform 0.15s ease-in-out;
          background: var(--theme-primary);
          box-shadow: 0 0 8px rgba(var(--glow-color-rgb), 0.4);
        }
        .notion-content .todo-item input[type="checkbox"]:checked {
          border-color: var(--theme-primary);
          background: rgba(var(--glow-color-rgb), 0.15);
        }
        .notion-content .todo-item input[type="checkbox"]:checked::before {
          transform: scale(1);
        }
        .notion-content .todo-item input[type="checkbox"]:focus {
          outline: none;
          border-color: var(--theme-primary);
          box-shadow: 0 0 0 3px rgba(var(--glow-color-rgb), 0.2);
        }
        .notion-content .todo-item.completed .todo-text {
          text-decoration: line-through;
          color: var(--theme-fg-muted);
          opacity: 0.6;
        }
        .notion-content .todo-text {
          flex: 1;
          outline: none;
          min-width: 50px;
          line-height: 1.5;
          color: var(--theme-fg);
        }
        .notion-content .todo-text:empty::before {
          content: attr(data-placeholder);
          color: var(--theme-fg-muted);
          opacity: 0.6;
          font-style: normal;
        }
        .notion-content .callout {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background: rgba(var(--glow-color-rgb), 0.1);
          border: 1px solid rgba(var(--glow-color-rgb), 0.2);
          border-radius: 6px;
          padding: 1rem;
          margin: 0.75rem 0;
        }
        .notion-content .callout-icon {
          font-size: 1.25rem;
          line-height: 1;
        }
        .notion-content .toggle {
          margin: 0.5rem 0;
        }
        .notion-content .toggle-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0;
        }
        .notion-content .toggle-arrow {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid var(--theme-bg-lighter);
          border-radius: 6px;
          background: transparent;
          color: var(--theme-fg-muted);
          font-size: 0.75rem;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
          padding: 0;
          font-family: inherit;
        }
        .notion-content .toggle-arrow:hover {
          border-color: var(--theme-fg-muted);
          background: var(--theme-bg-light);
          color: var(--theme-fg);
        }
        .notion-content .toggle-arrow:focus {
          outline: none;
          border-color: var(--theme-primary);
        }
        .notion-content .toggle-title {
          outline: none;
          flex: 1;
          cursor: text;
          color: var(--theme-fg);
        }
        .notion-content .toggle-title:empty::before {
          content: attr(data-placeholder);
          color: var(--theme-fg-muted);
          opacity: 0.6;
        }
        .notion-content .toggle-content {
          padding: 0.35rem 0 0.5rem 2rem;
          outline: none;
          color: var(--theme-fg-muted);
          display: none;
        }
        .notion-content .toggle.is-open .toggle-content {
          display: block;
        }
        .notion-content .toggle-content:empty::before {
          content: attr(data-placeholder);
          color: var(--theme-fg-muted);
          opacity: 0.6;
          font-style: italic;
        }
        .notion-content a {
          color: var(--theme-accent-4);
          text-decoration: underline;
        }
        .notion-content code:not(pre code) {
          background: rgba(var(--glow-color-rgb), 0.15);
          color: var(--theme-primary-light);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.875em;
        }
      `}</style>

      {/* Command Menu */}
      {showCommandMenu && (
        <CommandMenu
          commands={filteredCommands}
          selectedIndex={selectedIndex}
          onSelect={handleCommandSelect}
          onClose={() => setShowCommandMenu(false)}
          position={menuPosition}
          filter={filter}
        />
      )}

      {/* Tag Menu */}
      {showTagMenu && filteredTags.length > 0 && (
        <TagMenu
          tags={filteredTags}
          selectedIndex={selectedIndex}
          onSelect={handleTagSelect}
          onClose={() => setShowTagMenu(false)}
          position={menuPosition}
        />
      )}
    </div>
  );
});

NotionEditor.displayName = 'NotionEditor';

export default NotionEditor;
