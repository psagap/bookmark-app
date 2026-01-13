import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, FileText } from 'lucide-react';

/**
 * NoteComposerPanel - Right-side sliding panel for note creation
 *
 * Design: Direction 1 - Slides in from the right, anchored to app frame
 * Features:
 * - Thin vertical accent stripe on left edge
 * - Mixed case header ("New note")
 * - Small "⌘↩ Save" hint bottom-left
 * - Auto-expanding textarea
 * - ⌘+Enter saves, Esc closes
 */

const springs = {
  panel: { type: 'spring', stiffness: 300, damping: 30 },
  content: { type: 'spring', stiffness: 200, damping: 25 },
  backdrop: { duration: 0.2 },
};

import { supabase } from '@/lib/supabaseClient';
import { mapDbBookmark, toDbBookmarkPatch } from '@/lib/bookmarkMapper';

const NoteComposerPanel = ({ isOpen, onClose, onNoteCreated }) => {
  const [content, setContent] = useState('');
  const [state, setState] = useState('idle'); // idle | dirty | saving | feedback
  const textareaRef = useRef(null);
  const panelRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(120, textarea.scrollHeight), 400);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      adjustHeight();
    }
  }, [content, isOpen, adjustHeight]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setState('idle');
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    setState(newContent.trim() ? 'dirty' : 'idle');
  };

  const handleSave = async () => {
    if (state !== 'dirty' || !content.trim()) return;

    setState('saving');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const noteBookmark = {
        user_id: user.id,
        user_email: user.email || '',
        url: `note://${Date.now()}`,
        title: content.split('\n')[0].substring(0, 100) || 'Untitled Note',
        notes: content,
        content: content,
        category: 'Note',
        subCategory: 'note',
        tags: [],
        type: 'note',
      };

      const { data, error } = await supabase
        .from('bookmarks')
        .insert([toDbBookmarkPatch(noteBookmark)])
        .select()
        .single();

      if (error) throw error;

      setState('feedback');

      setTimeout(() => {
        setContent('');
        setState('idle');
        onNoteCreated?.(mapDbBookmark(data));
        onClose();
      }, shouldReduceMotion ? 300 : 600);
    } catch (error) {
      console.error('Error saving note:', error);
      setState('dirty');
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!content.trim()) {
        onClose();
      }
    }
  };

  const handleClose = () => {
    if (state === 'saving' || state === 'feedback') return;
    onClose();
  };

  const isDirty = state === 'dirty';
  const isSaving = state === 'saving';
  const isFeedback = state === 'feedback';
  const isLocked = isSaving || isFeedback;

  const panelContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="note-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springs.backdrop}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className="note-panel"
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={shouldReduceMotion ? { duration: 0.15 } : springs.panel}
          >
            {/* Accent stripe on left edge */}
            <div className="note-panel-accent" />

            {/* Panel content */}
            <div className="note-panel-inner">
              {/* Header */}
              <div className="note-panel-header">
                <div className="note-panel-header-left">
                  <FileText className="w-4 h-4 text-gruvbox-fg-muted" />
                  <span className="note-panel-title">New note</span>
                </div>
                <button
                  onClick={handleClose}
                  className="note-panel-close"
                  aria-label="Close panel"
                  disabled={isLocked}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main content area */}
              <div className="note-panel-content">
                <AnimatePresence mode="wait">
                  {isFeedback ? (
                    <motion.div
                      key="feedback"
                      className="note-panel-feedback"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={springs.content}
                    >
                      <p>Saved!</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="editor"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isSaving ? 0.5 : 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        disabled={isLocked}
                        placeholder="What's on your mind?"
                        className="note-panel-textarea"
                        rows={4}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="note-panel-footer">
                <span className="note-panel-hint">
                  {isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      <kbd>⌘</kbd><span className="note-panel-hint-plus">+</span><kbd>↩</kbd> Save
                    </>
                  )}
                </span>

                <div className="note-panel-actions">
                  <button
                    onClick={handleClose}
                    className="note-panel-btn-secondary"
                    disabled={isLocked}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="note-panel-btn-primary"
                    disabled={!isDirty || isLocked}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(panelContent, document.body)}

      <style>{`
        .note-panel-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
          z-index: 100;
        }

        .note-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 420px;
          background: linear-gradient(
            180deg,
            var(--theme-bg-light) 0%,
            var(--theme-bg) 50%,
            var(--theme-bg-dark) 100%
          );
          border-left: 1px solid hsl(var(--border) / 0.2);
          box-shadow:
            -8px 0 32px rgba(0, 0, 0, 0.4),
            -2px 0 8px rgba(0, 0, 0, 0.2);
          z-index: 101;
          display: flex;
          overflow: hidden;
        }

        /* Accent stripe on left edge */
        .note-panel-accent {
          width: 3px;
          background: linear-gradient(
            180deg,
            var(--theme-primary) 0%,
            rgba(var(--glow-color-rgb), 0.6) 50%,
            rgba(var(--glow-color-rgb), 0.3) 100%
          );
          flex-shrink: 0;
        }

        .note-panel-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        /* Header */
        .note-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid hsl(var(--border) / 0.15);
        }

        .note-panel-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .note-panel-title {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: var(--theme-fg, #ebdbb2);
          letter-spacing: -0.01em;
        }

        .note-panel-close {
          padding: 8px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--theme-fg-muted, #a89984);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-panel-close:hover:not(:disabled) {
          background: hsl(var(--muted) / 0.3);
          color: var(--theme-fg);
        }

        .note-panel-close:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Content area */
        .note-panel-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .note-panel-textarea {
          display: block;
          width: 100%;
          min-height: 120px;
          max-height: 400px;
          padding: 16px;
          border: 1px solid hsl(var(--border) / 0.25);
          border-radius: 12px;
          background: var(--theme-bg-darkest);
          resize: none;
          overflow-y: auto;

          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 1.6;
          color: var(--theme-fg);
          caret-color: var(--theme-primary);

          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .note-panel-textarea::placeholder {
          color: var(--theme-fg-muted);
          opacity: 0.5;
        }

        .note-panel-textarea:focus {
          outline: none;
          border-color: rgba(var(--glow-color-rgb), 0.4);
          box-shadow: 0 0 0 3px rgba(var(--glow-color-rgb), 0.1);
        }

        .note-panel-textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .note-panel-textarea::selection {
          background: rgba(var(--glow-color-rgb), 0.25);
        }

        /* Feedback state */
        .note-panel-feedback {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          padding: 32px;
          background: linear-gradient(
            135deg,
            rgba(var(--glow-color-rgb), 0.15) 0%,
            rgba(var(--glow-color-rgb), 0.08) 100%
          );
          border: 1px solid rgba(var(--glow-color-rgb), 0.3);
          border-radius: 12px;
        }

        .note-panel-feedback p {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 18px;
          font-weight: 500;
          color: var(--theme-primary);
        }

        /* Footer */
        .note-panel-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid hsl(var(--border) / 0.15);
          background: var(--theme-bg-darkest);
        }

        .note-panel-hint {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 12px;
          color: var(--theme-fg-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .note-panel-hint kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          background: hsl(var(--muted) / 0.3);
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: var(--theme-fg);
        }

        .note-panel-hint-plus {
          font-size: 10px;
          opacity: 0.6;
        }

        .note-panel-actions {
          display: flex;
          gap: 8px;
        }

        .note-panel-btn-secondary {
          padding: 8px 16px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid hsl(var(--border) / 0.3);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--theme-fg-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-panel-btn-secondary:hover:not(:disabled) {
          background: hsl(var(--muted) / 0.2);
          border-color: hsl(var(--border) / 0.5);
          color: var(--theme-fg);
        }

        .note-panel-btn-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .note-panel-btn-primary {
          padding: 8px 20px;
          border-radius: 8px;
          background: var(--theme-primary);
          border: none;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--theme-bg-darkest);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-panel-btn-primary:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .note-panel-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .note-panel-btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        /* Mobile responsive */
        @media (max-width: 480px) {
          .note-panel {
            max-width: 100%;
          }

          .note-panel-accent {
            width: 2px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .note-panel,
          .note-panel-backdrop {
            transition: opacity 0.15s ease !important;
          }
        }
      `}</style>
    </>
  );
};

export default NoteComposerPanel;
