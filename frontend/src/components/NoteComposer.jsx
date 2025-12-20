import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * NoteComposer - A minimal, ultra-readable note editor with satisfying save animations
 *
 * States: idle | dirty | saving | feedback | resetting
 */

// Spring configurations for natural motion
const springs = {
  gentle: { type: 'spring', stiffness: 120, damping: 20 },
  snappy: { type: 'spring', stiffness: 300, damping: 30 },
  bounce: { type: 'spring', stiffness: 400, damping: 25 },
};

const NoteComposer = ({ onSave, className }) => {
  const [content, setContent] = useState('');
  const [state, setState] = useState('idle'); // idle | dirty | saving | feedback | resetting
  const textareaRef = useRef(null);
  const cardRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  // Handle content change
  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    setState(newContent.trim() ? 'dirty' : 'idle');
  };

  // Handle save
  const handleSave = useCallback(async () => {
    if (state !== 'dirty' || !content.trim()) return;

    setState('saving');

    // Simulate save (or call actual onSave)
    try {
      if (onSave) {
        await onSave(content);
      }

      // Show feedback
      setState('feedback');

      // Reset after feedback
      setTimeout(() => {
        setState('resetting');
        setTimeout(() => {
          setContent('');
          setState('idle');
          // Refocus textarea
          textareaRef.current?.focus();
        }, shouldReduceMotion ? 100 : 400);
      }, shouldReduceMotion ? 300 : 800);

    } catch (error) {
      console.error('Save failed:', error);
      setState('dirty');
    }
  }, [state, content, onSave, shouldReduceMotion]);

  // Keyboard handler
  const handleKeyDown = (e) => {
    // ⌘/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const isDirty = state === 'dirty';
  const isSaving = state === 'saving';
  const isFeedback = state === 'feedback';
  const isResetting = state === 'resetting';
  const isLocked = isSaving || isFeedback || isResetting;

  return (
    <div className={cn("note-composer-wrapper", className)}>
      <motion.div
        ref={cardRef}
        className="note-composer-card"
        layout={!shouldReduceMotion}
        transition={springs.gentle}
      >
        {/* Card inner gradient overlay */}
        <div className="note-composer-gradient" />

        {/* Content area */}
        <AnimatePresence mode="wait">
          {isFeedback ? (
            // Feedback state - full orange takeover
            <motion.div
              key="feedback"
              className="note-composer-feedback"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={springs.snappy}
            >
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ...springs.gentle }}
                className="note-composer-feedback-text"
              >
                What else is on your mind?
              </motion.p>
            </motion.div>
          ) : (
            // Normal editing state
            <motion.div
              key="editor"
              className="note-composer-content"
              initial={false}
              animate={{
                opacity: isSaving ? 0 : 1,
                y: isSaving ? -8 : 0
              }}
              transition={springs.snappy}
            >
              {/* Label */}
              <motion.label
                className="note-composer-label"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, ...springs.gentle }}
              >
                ADD A NEW NOTE
              </motion.label>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={isLocked}
                placeholder="Start typing here..."
                className="note-composer-textarea"
                rows={1}
                aria-label="Note content"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save bar - morphs into feedback */}
        <AnimatePresence>
          {isDirty && !isFeedback && (
            <motion.button
              className="note-composer-save-bar"
              onClick={handleSave}
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                height: 'auto',
              }}
              exit={{
                opacity: 0,
                y: 10,
                height: 0,
              }}
              transition={springs.snappy}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isLocked}
            >
              <span className="note-composer-save-text">
                PRESS <kbd>⌘</kbd><span className="plus">+</span><kbd>ENTER</kbd> TO SAVE
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        .note-composer-wrapper {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
        }

        .note-composer-card {
          position: relative;
          background: linear-gradient(
            165deg,
            rgba(40, 40, 40, 0.95) 0%,
            rgba(30, 30, 30, 0.98) 50%,
            rgba(25, 25, 25, 1) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          overflow: hidden;
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.4),
            0 1px 2px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .note-composer-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 80% 60% at 20% 10%,
            rgba(254, 128, 25, 0.04) 0%,
            transparent 60%
          );
          pointer-events: none;
        }

        .note-composer-content {
          position: relative;
          padding: 32px 36px;
          min-height: 160px;
        }

        .note-composer-label {
          display: block;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--theme-secondary, #fe8019);
          margin-bottom: 20px;
          user-select: none;
        }

        .note-composer-textarea {
          display: block;
          width: 100%;
          min-height: 60px;
          padding: 0;
          border: none;
          outline: none;
          background: transparent;
          resize: none;
          overflow: hidden;

          /* Typography - large, readable, breathing room */
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: clamp(22px, 4vw, 28px);
          font-weight: 400;
          line-height: 1.6;
          letter-spacing: -0.01em;

          /* Soft white text */
          color: rgba(251, 241, 199, 0.92);

          /* Cursor styling */
          caret-color: var(--theme-secondary, #fe8019);
        }

        .note-composer-textarea::placeholder {
          color: rgba(168, 153, 132, 0.5);
          font-weight: 400;
        }

        .note-composer-textarea:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .note-composer-textarea::selection {
          background: rgba(254, 128, 25, 0.25);
          color: #fbf1c7;
        }

        .note-composer-textarea:focus {
          outline: none;
        }

        /* Save bar */
        .note-composer-save-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 18px 24px;
          background: linear-gradient(
            135deg,
            var(--theme-secondary, #fe8019) 0%,
            #e86a10 100%
          );
          border: none;
          border-radius: 0 0 24px 24px;
          cursor: pointer;
          transition: filter 0.2s ease;
        }

        .note-composer-save-bar:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .note-composer-save-bar:active:not(:disabled) {
          filter: brightness(0.95);
        }

        .note-composer-save-bar:disabled {
          cursor: wait;
          opacity: 0.8;
        }

        .note-composer-save-text {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(29, 32, 33, 0.95);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .note-composer-save-text kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          background: rgba(29, 32, 33, 0.15);
          border-radius: 5px;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
        }

        .note-composer-save-text .plus {
          font-size: 10px;
          opacity: 0.7;
        }

        /* Feedback state */
        .note-composer-feedback {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          padding: 48px 36px;
          background: linear-gradient(
            145deg,
            var(--theme-secondary, #fe8019) 0%,
            #e86a10 50%,
            #d45d0e 100%
          );
          border-radius: 24px;
        }

        .note-composer-feedback-text {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: clamp(18px, 3.5vw, 24px);
          font-weight: 500;
          color: rgba(251, 241, 199, 0.95);
          text-align: center;
          letter-spacing: -0.01em;
        }

        /* Focus visible state */
        .note-composer-textarea:focus-visible {
          outline: none;
        }

        .note-composer-card:focus-within {
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.4),
            0 1px 2px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.03),
            0 0 0 2px rgba(254, 128, 25, 0.15);
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .note-composer-card,
          .note-composer-save-bar,
          .note-composer-feedback {
            transition: opacity 0.2s ease !important;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * NoteFeed - Displays saved notes with insertion animations
 */
const NoteFeed = ({ notes = [] }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="note-feed">
      <AnimatePresence mode="popLayout">
        {notes.map((note, index) => (
          <motion.div
            key={note.id}
            className="note-feed-item"
            layout={!shouldReduceMotion}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              ...springs.gentle,
              delay: index * 0.05,
            }}
          >
            <div className="note-feed-content">
              <p className="note-feed-text">{note.content}</p>
              <span className="note-feed-time">{formatTime(note.createdAt)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        .note-feed {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          padding-top: 24px;
        }

        .note-feed-item {
          background: linear-gradient(
            165deg,
            rgba(50, 48, 47, 0.8) 0%,
            rgba(40, 40, 40, 0.9) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px 28px;
          box-shadow:
            0 2px 12px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.02);
        }

        .note-feed-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .note-feed-text {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: clamp(16px, 2.5vw, 18px);
          font-weight: 400;
          line-height: 1.6;
          color: rgba(235, 219, 178, 0.9);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .note-feed-time {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(168, 153, 132, 0.6);
        }
      `}</style>
    </div>
  );
};

// Helper to format time
const formatTime = (date) => {
  if (!date) return 'Just now';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * NoteComposerIntegrated - Version that integrates with the bookmark API
 */
const NoteComposerIntegrated = ({ onNoteCreated, className }) => {
  const handleSave = async (content) => {
    const noteBookmark = {
      url: `note://${Date.now()}`,
      title: content.split('\n')[0].substring(0, 100) || 'Untitled Note',
      notes: content,
      content: content,
      category: 'Note',
      subCategory: 'note',
      tags: [],
      thumbnail: null,
      type: 'note',
      metadata: {
        isQuickNote: true,
        createdAt: new Date().toISOString(),
      }
    };

    try {
      const response = await fetch('http://127.0.0.1:3000/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteBookmark)
      });

      if (response.ok) {
        const savedNote = await response.json();
        onNoteCreated?.(savedNote);
        return savedNote;
      }
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  };

  return <NoteComposer onSave={handleSave} className={className} />;
};

/**
 * NoteComposerDemo - Complete demo with composer + feed
 */
const NoteComposerDemo = () => {
  const [notes, setNotes] = useState([]);

  const handleSave = async (content) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const newNote = {
      id: Date.now().toString(),
      content,
      createdAt: new Date(),
    };

    setNotes(prev => [newNote, ...prev]);
  };

  return (
    <div className="note-composer-demo">
      <NoteComposer onSave={handleSave} />
      <NoteFeed notes={notes} />

      <style>{`
        .note-composer-demo {
          padding: 40px 20px;
          min-height: 100vh;
          background: var(--theme-bg-darkest, #1d2021);
        }
      `}</style>
    </div>
  );
};

/**
 * InlineNoteComposer - Starts collapsed, expands into full composer inline
 * Features a slide-out drawer on the right edge for save actions
 */
const InlineNoteComposer = ({ onNoteCreated, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [state, setState] = useState('idle');
  const textareaRef = useRef(null);
  const cardRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
    }
  }, []);

  useEffect(() => {
    if (isExpanded) {
      adjustHeight();
    }
  }, [content, isExpanded, adjustHeight]);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    setState(newContent.trim() ? 'dirty' : 'idle');
  };

  const handleSave = async () => {
    if (state !== 'dirty' || !content.trim()) return;

    setState('saving');

    const noteBookmark = {
      url: `note://${Date.now()}`,
      title: content.split('\n')[0].substring(0, 100) || 'Untitled Note',
      notes: content,
      content: content,
      category: 'Note',
      subCategory: 'note',
      tags: [],
      thumbnail: null,
      type: 'note',
      metadata: {
        isQuickNote: true,
        createdAt: new Date().toISOString(),
      }
    };

    try {
      const response = await fetch('http://127.0.0.1:3000/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteBookmark)
      });

      if (response.ok) {
        const savedNote = await response.json();

        setState('feedback');

        setTimeout(() => {
          setState('resetting');
          setTimeout(() => {
            setContent('');
            setState('idle');
            setIsExpanded(false);
            onNoteCreated?.(savedNote);
          }, shouldReduceMotion ? 100 : 400);
        }, shouldReduceMotion ? 300 : 800);
      }
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
    if (e.key === 'Escape' && !content.trim()) {
      setIsExpanded(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    setState('idle');
    setIsExpanded(false);
  };

  const isDirty = state === 'dirty';
  const isSaving = state === 'saving';
  const isFeedback = state === 'feedback';
  const isResetting = state === 'resetting';
  const isLocked = isSaving || isFeedback || isResetting;

  return (
    <div className={cn("inline-note-composer break-inside-avoid mb-4", className)}>
      {/* Collapsed state - Click to expand */}
      {!isExpanded && (
        <motion.div
          className="inline-composer-collapsed"
          onClick={() => setIsExpanded(true)}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snappy}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(true);
            }
          }}
        >
          <div className="inline-composer-collapsed-inner">
            <div className="inline-composer-icon">
              <Plus className="w-5 h-5" />
            </div>
            <span className="inline-composer-label">New note</span>
          </div>
        </motion.div>
      )}

      {/* Expanded state rendered via portal */}
      {isExpanded && createPortal(
        <div className="inline-composer-overlay">
          <div
            className="inline-composer-overlay-bg"
            onClick={handleCancel}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <div
            className="inline-composer-fullwidth-wrapper"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Main editor card */}
            <div className="inline-composer-expanded" ref={cardRef}>
              <div className="inline-composer-gradient" />

              {isFeedback ? (
                <div className="inline-composer-feedback">
                  <div className="inline-composer-feedback-check">✓</div>
                  <p>Saved</p>
                </div>
              ) : (
                <div className="inline-composer-content">
                  <div className="inline-composer-header">
                    <span className="inline-composer-title">New note</span>
                    <button onClick={handleCancel} className="inline-composer-close" aria-label="Cancel">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isLocked}
                    placeholder="What's on your mind?"
                    className="inline-composer-textarea"
                    rows={2}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Right strip - always visible */}
            {!isFeedback && (
              <div className={cn("inline-composer-strip", isDirty && "inline-composer-strip-active")}>
                <button
                  className="inline-composer-strip-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  disabled={!isDirty || isLocked}
                >
                  {isSaving ? (
                    <span className="inline-composer-saving-spinner" />
                  ) : (
                    <span className="inline-composer-strip-text">
                      <kbd>⌘</kbd> + <kbd>Enter</kbd> to save
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .inline-note-composer {
          width: 100%;
        }

        /* Overlay for expanded state */
        .inline-composer-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 120px;
        }

        .inline-composer-overlay-bg {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        .inline-composer-fullwidth-wrapper {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: stretch;
          width: calc(100% - 80px);
          max-width: 800px;
        }

        /* Collapsed state */
        .inline-composer-collapsed {
          cursor: pointer;
          border-radius: 16px;
          background: linear-gradient(
            165deg,
            rgba(40, 40, 40, 0.6) 0%,
            rgba(30, 30, 30, 0.8) 100%
          );
          border: 2px dashed rgba(255, 255, 255, 0.08);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .inline-composer-collapsed:hover {
          border-color: var(--theme-secondary, #fe8019);
          border-style: solid;
          box-shadow:
            inset 0 0 30px rgba(254, 128, 25, 0.08),
            0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .inline-composer-collapsed:focus {
          outline: none;
          border-color: var(--theme-secondary, #fe8019);
        }

        .inline-composer-collapsed-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 24px 20px;
        }

        .inline-composer-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--theme-bg-lighter, #504945);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--theme-fg-muted, #a89984);
          transition: all 0.2s ease;
        }

        .inline-composer-collapsed:hover .inline-composer-icon {
          background: linear-gradient(135deg, var(--theme-secondary, #fe8019) 0%, #e86a10 100%);
          color: var(--theme-bg-darkest, #1d2021);
          transform: rotate(90deg);
          box-shadow: 0 4px 16px rgba(254, 128, 25, 0.4);
        }

        .inline-composer-label {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: var(--theme-fg-muted, #a89984);
          transition: color 0.2s ease;
        }

        .inline-composer-collapsed:hover .inline-composer-label {
          color: var(--theme-fg, #ebdbb2);
        }

        /* Expanded state */
        .inline-composer-expanded {
          position: relative;
          flex: 1;
          min-width: 0;
          background: linear-gradient(
            165deg,
            rgba(40, 40, 40, 0.98) 0%,
            rgba(32, 32, 32, 0.99) 50%,
            rgba(28, 28, 28, 1) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-right: none;
          border-radius: 16px 0 0 16px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .inline-composer-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 80% 60% at 20% 10%,
            rgba(254, 128, 25, 0.04) 0%,
            transparent 60%
          );
          pointer-events: none;
          border-radius: 16px;
        }

        .inline-composer-content {
          position: relative;
          padding: 16px 20px;
        }

        .inline-composer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .inline-composer-title {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: var(--theme-fg, #ebdbb2);
        }

        .inline-composer-close {
          padding: 6px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: var(--theme-fg-muted, #a89984);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .inline-composer-close:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--theme-fg, #ebdbb2);
        }

        .inline-composer-textarea {
          display: block;
          width: 100%;
          min-height: 60px;
          padding: 0;
          border: none;
          outline: none;
          background: transparent;
          resize: none;
          overflow: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 1.6;
          color: rgba(251, 241, 199, 0.9);
          caret-color: var(--theme-secondary, #fe8019);
        }

        .inline-composer-textarea::placeholder {
          color: rgba(168, 153, 132, 0.4);
        }

        .inline-composer-textarea:disabled {
          opacity: 0.6;
        }

        .inline-composer-textarea::selection {
          background: rgba(254, 128, 25, 0.25);
        }

        /* Keyboard hint */
        .inline-composer-hint {
          display: flex;
          align-items: center;
          gap: 3px;
          margin-top: 12px;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          color: var(--theme-fg-muted, #a89984);
          opacity: 0.6;
        }

        .inline-composer-hint kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 500;
        }

        .inline-composer-hint span {
          font-size: 9px;
          opacity: 0.6;
        }

        /* Right-side save strip */
        .inline-composer-strip {
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(
            180deg,
            rgba(50, 48, 47, 0.95) 0%,
            rgba(40, 40, 40, 0.98) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-left: none;
          border-radius: 0 16px 16px 0;
          transition: background 0.2s ease;
        }

        .inline-composer-strip-active {
          background: linear-gradient(
            180deg,
            rgba(60, 56, 54, 0.98) 0%,
            rgba(50, 48, 47, 1) 100%
          );
        }

        .inline-composer-strip-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 20px;
          height: 100%;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: 'Inter', -apple-system, sans-serif;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .inline-composer-strip-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.04);
        }

        .inline-composer-strip-btn:disabled {
          cursor: default;
          opacity: 0.5;
        }

        .inline-composer-strip-btn:not(:disabled):hover {
          background: rgba(254, 128, 25, 0.1);
        }

        .inline-composer-strip-text {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--theme-fg-muted, #a89984);
          letter-spacing: -0.01em;
        }

        .inline-composer-strip-text kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: var(--theme-fg, #ebdbb2);
        }

        .inline-composer-strip-active .inline-composer-strip-text {
          color: var(--theme-fg, #ebdbb2);
        }

        .inline-composer-strip-active .inline-composer-strip-text kbd {
          background: rgba(254, 128, 25, 0.2);
          border-color: rgba(254, 128, 25, 0.3);
          color: var(--theme-secondary, #fe8019);
        }

        .inline-composer-saving-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(168, 153, 132, 0.3);
          border-top-color: var(--theme-secondary, #fe8019);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Feedback state */
        .inline-composer-feedback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 100px;
          padding: 24px;
        }

        .inline-composer-feedback-check {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--theme-secondary, #fe8019) 0%, #e86a10 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          color: var(--theme-bg-darkest, #1d2021);
        }

        .inline-composer-feedback p {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--theme-fg, #ebdbb2);
          text-align: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .inline-composer-collapsed,
          .inline-composer-expanded,
          .inline-composer-drawer {
            transition: opacity 0.15s ease !important;
          }
          .inline-composer-saving-dot {
            animation: none;
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export { NoteComposer, NoteFeed, NoteComposerDemo, NoteComposerIntegrated, InlineNoteComposer };
export default NoteComposer;
