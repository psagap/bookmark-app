import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, StickyNote } from 'lucide-react';
import NoteBlockEditor from './NoteBlockEditor';
import { CreepyButton } from './CreepyButton';

const QuickNoteModal = ({ open, onClose, onSave, allTags = [] }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState({ blocks: null, plainText: '' });
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
  }, []);

  // Focus title input when modal opens
  useEffect(() => {
    if (open && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTitle('');
      setContent({ blocks: null, plainText: '' });
    }
  }, [open]);

  // Handle escape key and prevent body scroll
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  const handleSave = async () => {
    if (!content.plainText.trim() && !title.trim()) return;

    setSaving(true);
    try {
      const noteBookmark = {
        url: `note://${Date.now()}`,
        title: title.trim() || content.plainText.split('\n')[0] || 'Untitled Note',
        notes: content.plainText,
        notesBlocks: content.blocks,
        category: 'Note',
        subCategory: 'note',
        tags: [],
        thumbnail: null,
        metadata: {
          isQuickNote: true,
          createdAt: new Date().toISOString(),
        }
      };

      const response = await fetch('http://127.0.0.1:3000/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteBookmark)
      });

      if (response.ok) {
        const savedNote = await response.json();
        onSave?.(savedNote);
        onClose();
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // Use portal to render at document.body level
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ isolation: 'isolate' }}>
      {/* Backdrop - absolute to fill the container, behind the modal */}
      <div
        className="absolute inset-0 bg-black/85 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - relative to the flex container, sits on top of backdrop */}
      <div
        className="relative z-10 w-full max-w-3xl bg-gruvbox-bg-darkest border border-gruvbox-bg-lighter rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all"
        style={{
          minHeight: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Note Header */}
        <div className="flex-shrink-0 px-8 pt-8 pb-5 border-b border-gruvbox-bg-lighter/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gruvbox-yellow/20 flex items-center justify-center flex-shrink-0">
                <StickyNote className="w-6 h-6 text-gruvbox-yellow" />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled Note"
                  className="w-full bg-transparent text-2xl font-semibold text-gruvbox-fg placeholder:text-gruvbox-fg-muted/40 focus:outline-none"
                />
                <p className="text-xs text-gruvbox-fg-muted mt-1">
                  New note
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Save button - CreepyButton for consistency */}
              <div className="creepy-btn-small">
                <CreepyButton
                  onClick={handleSave}
                  disabled={saving || (!content.plainText.trim() && !title.trim())}
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </CreepyButton>
              </div>
              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl text-gruvbox-fg-muted hover:text-gruvbox-fg hover:bg-gruvbox-bg-light transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Note Content - Block Editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-4">
            <NoteBlockEditor
              initialContent={content.plainText}
              onChange={handleContentChange}
              placeholder="Start writing your note... Type / for commands"
              autoFocus={false}
            />
          </div>
        </div>

        {/* Note Footer */}
        <div className="flex-shrink-0 px-8 py-3 border-t border-gruvbox-bg-lighter/30 bg-gruvbox-bg-dark/50">
          <div className="flex items-center justify-between text-xs text-gruvbox-fg-muted">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 rounded bg-gruvbox-bg-dark border border-gruvbox-bg-lighter">/</kbd> block commands</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-gruvbox-bg-dark border border-gruvbox-bg-lighter">Enter</kbd> new block</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-gruvbox-bg-dark border border-gruvbox-bg-lighter">Backspace</kbd> delete empty</span>
            </div>
            <span>Press Escape to cancel</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuickNoteModal;
