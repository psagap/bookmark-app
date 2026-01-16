import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Tag, Hash, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import LexicalNoteEditor from './LexicalNoteEditor';
import './editor/lexical-styles.css';

// ============================================================================
// NOTE MODULE
// 75% width modal with auto-save functionality
// ============================================================================

// Debounce delay in milliseconds
const AUTO_SAVE_DELAY = 1500;

const NoteModule = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialNote = null,
  className = '',
}) => {
  // Content state
  const [content, setContent] = useState({ text: '', html: '', json: null });
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null); // Timestamp of last save

  // Track the note ID (important for new notes that get saved)
  const [noteId, setNoteId] = useState(null);

  // Refs
  const tagInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const saveInProgressRef = useRef(false);
  const pendingSaveRef = useRef(false); // Track if another save is queued
  const isInitializedRef = useRef(false); // Prevent auto-save on initial load

  // Initialize with existing note data
  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setTitle(initialNote.title || '');
        setTags(initialNote.tags || []);
        setContent({
          text: initialNote.notes || '',
          html: initialNote.notesHtml || '',
          json: initialNote.notesBlocks || null,
        });
        setNoteId(initialNote.id || null);
      } else {
        // New note
        setTitle('');
        setTags([]);
        setContent({ text: '', html: '', json: null });
        setNoteId(null);
      }
      setHasChanges(false);
      setSaveError(null);
      setLastSaved(null);
      isInitializedRef.current = false;

      // Mark as initialized after a short delay to prevent immediate auto-save
      setTimeout(() => {
        isInitializedRef.current = true;
      }, 100);
    }

    // Cleanup on close
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [initialNote, isOpen]);

  // Core save function
  const performSave = useCallback(async () => {
    // Don't save if content is empty
    if (!content.text.trim()) {
      return null;
    }

    // Don't save if already saving - queue it instead
    if (saveInProgressRef.current) {
      pendingSaveRef.current = true;
      return null;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    const savePayload = {
      title: title || content.text.split('\n')[0].substring(0, 100),
      notes: content.text,
      notesHtml: content.html,
      notesBlocks: content.json, // JSON state for lossless round-trip
      tags,
      id: noteId, // Use tracked noteId (may be null for new notes)
    };

    try {
      const savedNote = await onSave(savePayload);

      // If this was a new note, capture the ID for future saves
      if (!noteId && savedNote?.id) {
        setNoteId(savedNote.id);
      }

      setHasChanges(false);
      setLastSaved(new Date());
      return savedNote;
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveError('Failed to save. Will retry...');
      // Don't clear hasChanges on error - keep trying
      return null;
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;

      // If another save was queued while we were saving, trigger it
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        // Small delay before retrying
        setTimeout(() => {
          triggerAutoSave();
        }, 500);
      }
    }
  }, [content, title, tags, noteId, onSave]);

  // Trigger debounced auto-save
  const triggerAutoSave = useCallback(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      performSave();
    }, AUTO_SAVE_DELAY);
  }, [performSave]);

  // Auto-save effect - triggers when content, title, or tags change
  useEffect(() => {
    // Don't auto-save on initial load or if not initialized
    if (!isInitializedRef.current || !isOpen) {
      return;
    }

    // Only save if there are changes and content exists
    if (hasChanges && content.text.trim()) {
      triggerAutoSave();
    }

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, title, tags, hasChanges, isOpen, triggerAutoSave]);

  // Handle content changes from editor
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setHasChanges(true);
    setSaveError(null); // Clear error on new input

    // Auto-extract title from first line if not manually set
    if (!title && newContent.text) {
      const firstLine = newContent.text.split('\n')[0].trim();
      if (firstLine && firstLine.length > 0) {
        const cleanTitle = firstLine.replace(/^#{1,3}\s*/, '');
        if (cleanTitle) {
          setTitle(cleanTitle.substring(0, 100));
        }
      }
    }
  }, [title]);

  // Handle title changes
  const handleTitleChange = useCallback((e) => {
    setTitle(e.target.value);
    setHasChanges(true);
    setSaveError(null);
  }, []);

  // Close handler - save any pending changes first
  const handleClose = async () => {
    // Clear any pending auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // If there are unsaved changes, save immediately before closing
    if (hasChanges && content.text.trim()) {
      await performSave();
    }

    onClose();
  };

  // Delete handler
  const handleDelete = async () => {
    if (!noteId) return;

    const confirm = window.confirm('Are you sure you want to delete this note?');
    if (!confirm) return;

    try {
      await onDelete(noteId);
      onClose();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // Tag management
  const addTag = (tag) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setHasChanges(true);
      setSaveError(null);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
    setHasChanges(true);
    setSaveError(null);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Handle keyboard events within the notepad
  const handlePanelKeyDown = (e) => {
    // ESC to close (will auto-save pending changes)
    if (e.key === 'Escape') {
      handleClose();
      return;
    }
    // Stop all keys from bubbling to global handlers
    e.stopPropagation();
  };

  // Focus tag input when shown
  useEffect(() => {
    if (showTagInput && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [showTagInput]);

  // Fluid spring animation
  const fluidSpring = {
    type: 'spring',
    stiffness: 200,
    damping: 28,
    mass: 0.8,
  };

  // Determine save status for display
  const getSaveStatus = () => {
    if (saveError) {
      return { type: 'error', text: saveError };
    }
    if (isSaving) {
      return { type: 'saving', text: 'Saving...' };
    }
    if (hasChanges && content.text.trim()) {
      return { type: 'pending', text: 'Saving soon...' };
    }
    if (lastSaved) {
      return { type: 'saved', text: 'Auto-saved' };
    }
    if (content.text.trim()) {
      return { type: 'saved', text: 'Saved' };
    }
    return null;
  };

  const saveStatus = getSaveStatus();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dimmed backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Note module panel */}
          <motion.div
            className={cn(
              "fixed z-50 top-0 right-0 h-full flex flex-col",
              "bg-[#1a1a1d]",
              "border-l border-white/[0.08]",
              "shadow-[-12px_0_48px_-12px_rgba(0,0,0,0.7)]",
              className
            )}
            style={{ width: '75%' }}
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={fluidSpring}
            onKeyDown={handlePanelKeyDown}
            onKeyUp={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
              {/* Title input */}
              <div className="flex-1 mr-6">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Untitled Note"
                  className="w-full text-2xl font-semibold bg-transparent text-white placeholder:text-white/30 focus:outline-none"
                  style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Tag button */}
                <button
                  onClick={() => setShowTagInput(!showTagInput)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    showTagInput
                      ? "bg-primary/20 text-primary"
                      : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                  )}
                  title="Add tags"
                >
                  <Tag className="w-5 h-5" />
                </button>

                {/* Delete button (only for existing notes) */}
                {noteId && (
                  <button
                    onClick={handleDelete}
                    className="p-2.5 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete note"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-all ml-2"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Tags bar */}
            <AnimatePresence>
              {(showTagInput || tags.length > 0) && (
                <motion.div
                  className="px-8 py-3 border-b border-white/[0.04] flex items-center gap-2 flex-wrap"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Hash className="w-4 h-4 text-white/30" />

                  {/* Existing tags */}
                  {tags.map((tag) => (
                    <motion.span
                      key={tag}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-primary/15 text-primary"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}

                  {/* Tag input */}
                  {showTagInput && (
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={() => {
                        if (tagInput.trim()) addTag(tagInput);
                        setShowTagInput(false);
                      }}
                      placeholder="Add tag..."
                      className="flex-1 min-w-[100px] max-w-[200px] px-2 py-1 text-sm bg-transparent text-white placeholder:text-white/30 focus:outline-none"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Editor area */}
            <div className="flex-1 overflow-hidden">
              <LexicalNoteEditor
                key={initialNote?.id || 'new-note'}
                initialContent={initialNote ? { text: initialNote.notes || '', html: initialNote.notesHtml || '', json: initialNote.notesBlocks || null } : null}
                onContentChange={handleContentChange}
                placeholder="Start writing your note... (Use # for headings, - for lists, > for quotes)"
              />
            </div>

            {/* Footer with hints and live status */}
            <footer className="px-8 py-3 border-t border-white/[0.06] flex items-center justify-between text-sm text-white/40">
              <div className="flex items-center gap-4">
                <span><code className="bg-white/[0.06] px-1.5 py-0.5 rounded">#</code> Heading</span>
                <span><code className="bg-white/[0.06] px-1.5 py-0.5 rounded">-</code> List</span>
                <span><code className="bg-white/[0.06] px-1.5 py-0.5 rounded">&gt;</code> Quote</span>
                <span><code className="bg-white/[0.06] px-1.5 py-0.5 rounded">```</code> Code</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Character count */}
                <span className="text-white/30">
                  {content.text.length > 0 && `${content.text.length} chars`}
                </span>
                {/* Live save status */}
                <AnimatePresence mode="wait">
                  {saveStatus?.type === 'saving' && (
                    <motion.span
                      key="saving"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-primary flex items-center gap-1.5"
                    >
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full"
                      />
                      {saveStatus.text}
                    </motion.span>
                  )}
                  {saveStatus?.type === 'pending' && (
                    <motion.span
                      key="pending"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-white/50 flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                      {saveStatus.text}
                    </motion.span>
                  )}
                  {saveStatus?.type === 'saved' && (
                    <motion.span
                      key="saved"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-emerald-400/70 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {saveStatus.text}
                    </motion.span>
                  )}
                  {saveStatus?.type === 'error' && (
                    <motion.span
                      key="error"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-400/80 flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {saveStatus.text}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NoteModule;
