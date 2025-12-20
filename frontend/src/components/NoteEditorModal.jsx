import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import TipTapEditor from './TipTapEditor';
import { cn } from '@/lib/utils';

/**
 * NoteEditorModal - Matches InlineNoteComposer design exactly
 * Card + right strip layout
 */

const springs = {
  snappy: { type: 'spring', stiffness: 300, damping: 30 },
};

// Format created date as "Dec 19, 2025"
const formatCreatedDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format edited time as relative ("5m ago", "2h ago", etc.)
const formatEditedTime = (date) => {
  if (!date) return null;
  const diffMins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const NoteEditorModal = ({
  isOpen,
  onClose,
  bookmark,
  onSave,
  onDelete,
}) => {
  // Get initial HTML content from bookmark
  const initialContent = useMemo(() => {
    if (!bookmark) return '';
    return bookmark.notesHtml || bookmark.notes || bookmark.content || bookmark.title || '';
  }, [bookmark]);

  const [hasChanges, setHasChanges] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | feedback
  const [editorKey, setEditorKey] = useState(0);

  // Store content in ref to avoid re-renders
  const contentRef = useRef({ html: '', text: '' });

  // Initialize state when modal opens or bookmark changes
  useEffect(() => {
    if (isOpen && bookmark) {
      contentRef.current = {
        html: initialContent,
        text: bookmark.notes || bookmark.content || bookmark.title || '',
      };
      setHasChanges(false);
      setSaveState('idle');
      setEditorKey(prev => prev + 1);
    }
  }, [isOpen, bookmark, initialContent]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, hasChanges]);

  const handleContentChange = useCallback((newContent) => {
    contentRef.current = {
      html: newContent.html,
      text: newContent.text || newContent.plainText,
    };
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!bookmark || !onSave) return;

    setSaveState('saving');

    try {
      await onSave({
        ...bookmark,
        title: contentRef.current.text.split('\n')[0] || bookmark.title || 'Untitled Note',
        notes: contentRef.current.text,
        notesHtml: contentRef.current.html,
        notesBlocks: null,
        updatedAt: new Date().toISOString(),
      });

      setSaveState('feedback');
      setHasChanges(false);

      setTimeout(() => {
        setSaveState('idle');
        onClose?.();
      }, 600);
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveState('idle');
    }
  }, [bookmark, onSave, onClose]);

  const handleClose = () => {
    onClose?.();
  };

  const isDirty = hasChanges;
  const isSaving = saveState === 'saving';
  const isFeedback = saveState === 'feedback';

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="note-editor-overlay">
        <div
          className="note-editor-overlay-bg"
          onClick={handleClose}
        />
        <div className="note-editor-wrapper">
          {/* Main editor card */}
          <div className="note-editor-card">
            <div className="note-editor-gradient" />

            {isFeedback ? (
              <div className="note-editor-feedback">
                <div className="note-editor-feedback-check">✓</div>
                <p>Saved</p>
              </div>
            ) : (
              <div className="note-editor-content">
                <div className="note-editor-header">
                  <span className="note-editor-title">Edit note</span>
                  <button onClick={handleClose} className="note-editor-close" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="note-editor-body">
                  <TipTapEditor
                    key={`editor-${editorKey}`}
                    content={initialContent}
                    onChange={handleContentChange}
                    onSave={handleSave}
                    placeholder="What's on your mind?"
                    autoFocus={true}
                  />
                </div>
                {/* Footer with dates */}
                {(bookmark?.createdAt || bookmark?.updatedAt) && (
                  <div className="note-editor-footer">
                    {bookmark?.createdAt && (
                      <span>Created {formatCreatedDate(bookmark.createdAt)}</span>
                    )}
                    {bookmark?.createdAt && bookmark?.updatedAt && (
                      <span className="note-editor-footer-sep">·</span>
                    )}
                    {bookmark?.updatedAt && (
                      <span>Edited {formatEditedTime(bookmark.updatedAt)}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right strip - always visible */}
          {!isFeedback && (
            <div className={cn("note-editor-strip", isDirty && "note-editor-strip-active")}>
              <button
                className="note-editor-strip-btn"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <span className="note-editor-spinner" />
                ) : (
                  <span className="note-editor-strip-text">
                    <kbd>⌘</kbd> + <kbd>Enter</kbd> to save
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .note-editor-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 120px;
        }

        .note-editor-overlay-bg {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        .note-editor-wrapper {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: stretch;
          width: calc(100% - 80px);
          max-width: 700px;
        }

        /* Main card */
        .note-editor-card {
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

        .note-editor-gradient {
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

        .note-editor-content {
          position: relative;
          padding: 16px 20px;
        }

        .note-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .note-editor-title {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: var(--theme-fg, #ebdbb2);
        }

        .note-editor-close {
          padding: 6px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: var(--theme-fg-muted, #a89984);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-editor-close:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--theme-fg, #ebdbb2);
        }

        .note-editor-body {
          min-height: 60px;
          max-height: 50vh;
          overflow-y: auto;
        }

        .note-editor-body .ProseMirror {
          min-height: 60px;
          outline: none;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 1.6;
          color: rgba(251, 241, 199, 0.9);
          caret-color: var(--theme-secondary, #fe8019);
        }

        .note-editor-body .ProseMirror p.is-editor-empty:first-child::before {
          color: rgba(168, 153, 132, 0.4);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .note-editor-body .ProseMirror::selection,
        .note-editor-body .ProseMirror *::selection {
          background: rgba(254, 128, 25, 0.25);
        }

        /* Footer with dates */
        .note-editor-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-top: 12px;
          margin-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 400;
          color: var(--theme-fg-muted, #a89984);
          opacity: 0.7;
        }

        .note-editor-footer-sep {
          color: rgba(168, 153, 132, 0.4);
        }

        /* Right-side save strip */
        .note-editor-strip {
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

        .note-editor-strip-active {
          background: linear-gradient(
            180deg,
            rgba(60, 56, 54, 0.98) 0%,
            rgba(50, 48, 47, 1) 100%
          );
        }

        .note-editor-strip-btn {
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

        .note-editor-strip-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.04);
        }

        .note-editor-strip-btn:disabled {
          cursor: default;
          opacity: 0.5;
        }

        .note-editor-strip-btn:not(:disabled):hover {
          background: rgba(254, 128, 25, 0.1);
        }

        .note-editor-strip-text {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--theme-fg-muted, #a89984);
          letter-spacing: -0.01em;
        }

        .note-editor-strip-text kbd {
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

        .note-editor-strip-active .note-editor-strip-text {
          color: var(--theme-fg, #ebdbb2);
        }

        .note-editor-strip-active .note-editor-strip-text kbd {
          background: rgba(254, 128, 25, 0.2);
          border-color: rgba(254, 128, 25, 0.3);
          color: var(--theme-secondary, #fe8019);
        }

        .note-editor-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(168, 153, 132, 0.3);
          border-top-color: var(--theme-secondary, #fe8019);
          border-radius: 50%;
          animation: note-editor-spin 0.8s linear infinite;
        }

        @keyframes note-editor-spin {
          to { transform: rotate(360deg); }
        }

        /* Feedback state */
        .note-editor-feedback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 100px;
          padding: 24px;
        }

        .note-editor-feedback-check {
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

        .note-editor-feedback p {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--theme-fg, #ebdbb2);
          text-align: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .note-editor-spinner {
            animation: none;
            opacity: 0.6;
          }
        }
      `}</style>
    </>,
    document.body
  );
};

export default NoteEditorModal;
