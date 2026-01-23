import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Hash, Check, AlertCircle, PanelLeftClose, PanelRightClose, PenTool, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferences, NOTE_FONTS } from '@/contexts/PreferencesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LexicalNoteEditor from './LexicalNoteEditor';
import './editor/lexical-styles.css';

// ============================================================================
// NOTE MODULE
// 75% width modal with auto-save functionality
// ============================================================================

// Debounce delay in milliseconds
const AUTO_SAVE_DELAY = 1500;

// Helper to extract H1 heading text from Lexical JSON state
const extractH1FromLexicalJson = (editorStateJson) => {
  if (!editorStateJson?.root?.children) return null;

  for (const child of editorStateJson.root.children) {
    // Check if it's an H1 heading node
    if (child.type === 'heading' && child.tag === 'h1' && child.children?.length > 0) {
      // Extract text from all text children
      const textParts = child.children
        .filter(c => c.type === 'text' || c.type === 'linebreak')
        .map(c => c.type === 'linebreak' ? '' : c.text || '')
        .join('');

      if (textParts.trim()) {
        return textParts.trim();
      }
    }
  }
  return null;
};

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

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null); // Timestamp of last save

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Save animation state
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);

  // Track the note ID (important for new notes that get saved)
  const [noteId, setNoteId] = useState(null);

  // Floating toolbar state
  const [showToolbar, setShowToolbar] = useState(false);
  const [showTagsExpanded, setShowTagsExpanded] = useState(false);
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);
  const toolbarTimeoutRef = useRef(null);

  // Note font preference
  const { noteFont, setNoteFont, noteFonts } = usePreferences();

  // Refs
  const tagInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const saveInProgressRef = useRef(false);
  const pendingSaveRef = useRef(false); // Track if another save is queued
  const isInitializedRef = useRef(false); // Prevent auto-save on initial load
  const titleManuallySetRef = useRef(false); // Track if user manually edited title

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
        // If note already has a title, consider it manually set (user can still overwrite)
        titleManuallySetRef.current = !!initialNote.title;
      } else {
        // New note
        setTitle('');
        setTags([]);
        setContent({ text: '', html: '', json: null });
        setNoteId(null);
        titleManuallySetRef.current = false; // New notes get auto-title from H1
      }
      setHasChanges(false);
      setSaveError(null);
      setLastSaved(null);
      setIsFullscreen(false);
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

      // Trigger save animation
      setShowSaveAnimation(true);
      setTimeout(() => setShowSaveAnimation(false), 1500);

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

    // Hide toolbar when user starts typing
    if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    setShowToolbar(false);
    setShowTagsExpanded(false);

    // Auto-extract title from H1 heading if not manually set
    // This allows the H1 to automatically become the card title for new notes
    if (!titleManuallySetRef.current && newContent.json) {
      const h1Title = extractH1FromLexicalJson(newContent.json);
      if (h1Title) {
        setTitle(h1Title.substring(0, 100));
      }
    }
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
      setShowTagsExpanded(false);
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Floating toolbar - show on mouse movement, hide after delay or on typing
  const TOOLBAR_VISIBLE_DURATION = 3000; // 3 seconds

  // Check if user is actively interacting with any toolbar control
  const isInteracting = isFontPickerOpen || showTagsExpanded || isTagInputFocused;

  const startAutoHideTimer = useCallback(() => {
    if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    toolbarTimeoutRef.current = setTimeout(() => {
      // Don't hide if user is interacting with controls
      if (!isFontPickerOpen && !showTagsExpanded && !isTagInputFocused) {
        setShowToolbar(false);
      }
    }, TOOLBAR_VISIBLE_DURATION);
  }, [isFontPickerOpen, showTagsExpanded, isTagInputFocused]);

  const handleMouseMove = useCallback(() => {
    // Show toolbar on mouse movement
    setShowToolbar(true);

    // Only start auto-hide timer if not interacting with controls
    if (!isInteracting) {
      startAutoHideTimer();
    }
  }, [isInteracting, startAutoHideTimer]);

  const handleMouseLeave = useCallback(() => {
    // Don't hide if user is interacting with controls
    if (isInteracting) return;

    // Hide after short delay when mouse leaves
    if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    toolbarTimeoutRef.current = setTimeout(() => {
      if (!isFontPickerOpen && !showTagsExpanded && !isTagInputFocused) {
        setShowToolbar(false);
      }
    }, 300);
  }, [isInteracting, isFontPickerOpen, showTagsExpanded, isTagInputFocused]);

  const handleToolbarMouseEnter = () => {
    // Keep toolbar visible while hovering over it
    if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
  };

  const handleToolbarMouseLeave = useCallback(() => {
    // Don't start timer if interacting with controls
    if (isInteracting) return;

    // Restart auto-hide timer when leaving a toolbar button
    startAutoHideTimer();
  }, [isInteracting, startAutoHideTimer]);

  // When interactions end, restart the auto-hide timer
  useEffect(() => {
    if (showToolbar && !isInteracting) {
      startAutoHideTimer();
    }
  }, [isInteracting, showToolbar, startAutoHideTimer]);

  // Cleanup toolbar timeout on unmount
  useEffect(() => {
    return () => {
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard events within the notepad
  const handlePanelKeyDown = (e) => {
    // ESC to close (will auto-save pending changes)
    if (e.key === 'Escape') {
      handleClose();
      return;
    }
    // Cmd+Enter or Ctrl+Enter to quick save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      performSave();
      return;
    }
    // Stop all keys from bubbling to global handlers
    e.stopPropagation();
  };

  // Focus tag input when expanded
  useEffect(() => {
    if (showTagsExpanded && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [showTagsExpanded]);

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

          {/* Note module panel - slides from right, expands left for fullscreen */}
          <motion.div
            className={cn(
              "fixed z-50 top-0 right-0 h-full flex flex-col",
              "bg-[#1a1a1d]",
              "border-l border-white/[0.08]",
              "shadow-[-20px_0_60px_rgba(0,0,0,0.5)]",
              className
            )}
            initial={{ x: '100%', opacity: 0.8, width: '755px', borderRadius: '16px 0 0 16px' }}
            animate={{
              x: 0,
              opacity: 1,
              width: isFullscreen ? '100vw' : '755px',
              borderRadius: isFullscreen ? '0px' : '16px 0 0 16px',
            }}
            exit={{ x: '100%', opacity: 0.8, width: '755px' }}
            transition={{
              x: {
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              },
              width: {
                type: 'spring',
                stiffness: 200,
                damping: 25,
                mass: 0.6,
              },
              borderRadius: {
                duration: 0.3,
              },
              opacity: {
                duration: 0.2,
              },
            }}
            onKeyDown={handlePanelKeyDown}
            onKeyUp={(e) => e.stopPropagation()}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Save Animation - Bottom right minimalist indicator */}
            <AnimatePresence>
              {showSaveAnimation && (
                <motion.div
                  className="save-indicator"
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -5 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 25
                  }}
                >
                  {/* Ripple ring */}
                  <motion.div
                    className="save-indicator-ring"
                    initial={{ scale: 0.8, opacity: 1 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                  {/* Inner glow */}
                  <motion.div
                    className="save-indicator-glow"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.6, 0] }}
                    transition={{ duration: 1.0 }}
                  />
                  {/* Checkmark icon */}
                  <motion.svg
                    className="save-indicator-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                  >
                    <motion.path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                    />
                  </motion.svg>
                  <style>{`
                    .save-indicator {
                      position: absolute;
                      bottom: 24px;
                      right: 24px;
                      width: 36px;
                      height: 36px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      pointer-events: none;
                      z-index: 100;
                    }
                    .save-indicator-ring {
                      position: absolute;
                      width: 100%;
                      height: 100%;
                      border-radius: 50%;
                      border: 2px solid hsl(var(--primary));
                    }
                    .save-indicator-glow {
                      position: absolute;
                      width: 100%;
                      height: 100%;
                      border-radius: 50%;
                      background: hsl(var(--primary));
                      filter: blur(8px);
                    }
                    .save-indicator-check {
                      position: relative;
                      width: 20px;
                      height: 20px;
                      color: hsl(var(--primary));
                      filter: drop-shadow(0 0 6px hsl(var(--primary) / 0.5));
                    }
                  `}</style>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Corner Buttons - appear on hover */}
            <AnimatePresence>
              {showToolbar && (
                <>
                  {/* Top-left: Sidebar toggle */}
                  <motion.button
                    className={cn(
                      "absolute top-4 left-4 z-50 p-2.5 rounded-xl backdrop-blur-md transition-colors",
                      isFullscreen
                        ? "bg-primary/20 text-primary"
                        : "bg-black/40 text-white/60 hover:text-white hover:bg-black/60"
                    )}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    onMouseEnter={handleToolbarMouseEnter}
                    onMouseLeave={handleToolbarMouseLeave}
                    title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
                  >
                    {isFullscreen ? (
                      <PanelRightClose className="w-4 h-4" />
                    ) : (
                      <PanelLeftClose className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Top-right: Close button */}
                  <motion.button
                    className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-black/40 backdrop-blur-md text-white/60 hover:text-white hover:bg-black/60 transition-colors"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.02 }}
                    onClick={handleClose}
                    onMouseEnter={handleToolbarMouseEnter}
                    onMouseLeave={handleToolbarMouseLeave}
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>

                  {/* Bottom-left: Font picker + Tags */}
                  <motion.div
                    className="absolute bottom-4 left-4 z-50 flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.04 }}
                    onMouseEnter={handleToolbarMouseEnter}
                    onMouseLeave={handleToolbarMouseLeave}
                  >
                    {/* Font Select */}
                    <Select
                      value={noteFont}
                      onValueChange={setNoteFont}
                      open={isFontPickerOpen}
                      onOpenChange={setIsFontPickerOpen}
                    >
                      <SelectTrigger className="h-9 text-sm bg-black/40 backdrop-blur-md border-white/10 !w-auto hover:bg-black/60 transition-colors">
                        <div className="flex items-center gap-1.5">
                          {noteFont === 'excalifont' ? (
                            <PenTool className="w-3.5 h-3.5 opacity-60" />
                          ) : (
                            <Type className="w-3.5 h-3.5 opacity-60" />
                          )}
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(noteFonts).map((font) => (
                          <SelectItem key={font.id} value={font.id}>
                            <span style={{ fontFamily: font.fontFamily }}>{font.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Tags button */}
                    <button
                      onClick={() => setShowTagsExpanded(!showTagsExpanded)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 h-9 rounded-lg backdrop-blur-md transition-colors",
                        showTagsExpanded
                          ? "bg-primary/20 text-primary"
                          : "bg-black/40 hover:bg-black/60 text-white/60 hover:text-white"
                      )}
                      title="Manage tags"
                    >
                      <Hash className="w-3.5 h-3.5" />
                      {tags.length > 0 && <span className="text-sm">{tags.length}</span>}
                    </button>
                  </motion.div>

                  {/* Bottom-right: Delete button (only for existing notes) */}
                  {noteId && (
                    <motion.button
                      className="absolute bottom-4 right-4 z-50 p-2.5 rounded-xl bg-black/40 backdrop-blur-md text-white/60 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.06 }}
                      onClick={handleDelete}
                      onMouseEnter={handleToolbarMouseEnter}
                      onMouseLeave={handleToolbarMouseLeave}
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}

                  {/* Tags panel - expands from bottom-left */}
                  <AnimatePresence>
                    {showTagsExpanded && (
                      <motion.div
                        className="absolute bottom-16 left-4 z-50 p-3 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 min-w-[200px] max-w-[320px]"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onMouseEnter={handleToolbarMouseEnter}
                        onMouseLeave={handleToolbarMouseLeave}
                      >
                        {/* Existing tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {tags.map((tag) => (
                              <motion.span
                                key={tag}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/15 text-primary"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                              >
                                {tag}
                                <button
                                  onClick={() => removeTag(tag)}
                                  className="hover:bg-primary/20 rounded-full p-0.5"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </motion.span>
                            ))}
                          </div>
                        )}

                        {/* Tag input */}
                        <input
                          ref={tagInputRef}
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          onFocus={() => setIsTagInputFocused(true)}
                          onBlur={() => setIsTagInputFocused(false)}
                          placeholder="Add tag..."
                          className="w-full px-2 py-1.5 text-sm bg-white/5 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </AnimatePresence>

            {/* Editor area - scrollbar always on right edge, content centered at 640px */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden note-module-scroll relative">
              <div className="note-module-content-center">
                <LexicalNoteEditor
                  key={initialNote?.id || 'new-note'}
                  initialContent={initialNote ? { text: initialNote.notes || '', html: initialNote.notesHtml || '', json: initialNote.notesBlocks || null } : null}
                  onContentChange={handleContentChange}
                  placeholder="Start writing your note... (Use # for headings, - for lists, > for quotes)"
                />
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NoteModule;
