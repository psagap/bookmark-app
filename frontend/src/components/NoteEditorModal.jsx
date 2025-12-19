import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Save, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import NoteBlockEditor, { blocksToText } from './NoteBlockEditor';

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

/**
 * NoteEditorModal - Full-featured modal editor for notes
 * Provides a larger editing area with save/cancel functionality
 */
const NoteEditorModal = ({
  isOpen,
  onClose,
  bookmark,
  onSave,
  onDelete,
}) => {
  // Compute initial content from bookmark - try multiple field names
  const initialPlainText = useMemo(() => {
    if (!bookmark) return '';
    console.log('NoteEditorModal useMemo - full bookmark:', JSON.stringify(bookmark, null, 2));
    const rawContent = bookmark.notes || bookmark.content || bookmark.title || '';
    console.log('NoteEditorModal useMemo - rawContent:', rawContent);
    // Try with HTML conversion
    const plainText = htmlToPlainText(rawContent);
    console.log('NoteEditorModal useMemo - plainText:', plainText);
    // Return the raw content if HTML conversion returns empty
    return plainText || rawContent;
  }, [bookmark]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState({ blocks: null, plainText: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // Initialize state when modal opens or bookmark changes
  useEffect(() => {
    if (isOpen && bookmark) {
      setTitle(bookmark.title || '');
      setContent({
        blocks: bookmark.notesBlocks || null,
        plainText: initialPlainText
      });
      setHasChanges(false);
      // Force editor remount with new key
      setEditorKey(prev => prev + 1);
    }
  }, [isOpen, bookmark, initialPlainText]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setHasChanges(true);
  }, []);

  const handleSave = () => {
    if (bookmark && onSave) {
      onSave({
        ...bookmark,
        title: title || content.plainText.split('\n')[0] || 'Untitled Note',
        notes: content.plainText,
        notesBlocks: content.blocks
      });
    }
    onClose?.();
  };

  const handleClose = () => {
    if (hasChanges) {
      // Could show confirmation dialog here
      // For now, just close
    }
    onClose?.();
  };

  const handleDelete = () => {
    if (bookmark && onDelete) {
      onDelete(bookmark);
    }
    onClose?.();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-4 md:inset-x-[15%] md:inset-y-[10%] bg-gruvbox-bg-light rounded-2xl shadow-2xl z-[101] flex flex-col overflow-hidden border border-gruvbox-bg-lighter"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gruvbox-bg-lighter/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gruvbox-yellow/15">
                  <FileText className="w-5 h-5 text-gruvbox-yellow" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gruvbox-fg">Edit Note</h2>
                  <p className="text-xs text-gruvbox-fg-muted">
                    {hasChanges ? 'Unsaved changes' : 'All changes saved'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-2 text-gruvbox-fg-muted hover:text-gruvbox-red transition-colors rounded-lg hover:bg-gruvbox-red/10"
                    title="Delete note"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="p-2 text-gruvbox-fg-muted hover:text-gruvbox-fg transition-colors rounded-lg hover:bg-gruvbox-bg-lighter/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Title Input */}
            <div className="px-6 py-3 border-b border-gruvbox-bg-lighter/30">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Note title..."
                className="w-full text-xl font-medium bg-transparent text-gruvbox-fg placeholder:text-gruvbox-fg-muted/40 focus:outline-none"
              />
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <NoteBlockEditor
                key={`editor-${editorKey}`}
                initialContent={initialPlainText}
                onChange={handleContentChange}
                placeholder="Start writing your note... Type / for commands"
                autoFocus={true}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gruvbox-bg-lighter/50 bg-gruvbox-bg-dark/30">
              <div className="text-xs text-gruvbox-fg-muted">
                <kbd className="px-1.5 py-0.5 rounded bg-gruvbox-bg-lighter/50 text-[10px]">Cmd+S</kbd>
                {' '}to save • {' '}
                <kbd className="px-1.5 py-0.5 rounded bg-gruvbox-bg-lighter/50 text-[10px]">Esc</kbd>
                {' '}to close
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gruvbox-fg-muted hover:text-gruvbox-fg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gruvbox-yellow text-gruvbox-bg-darkest rounded-lg hover:bg-gruvbox-yellow-light transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Note
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default NoteEditorModal;
