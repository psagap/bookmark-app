import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2, ChevronDown, Plus, Palette, Check } from 'lucide-react';
import TipTapEditor from './TipTapEditor';
import { cn } from '@/lib/utils';
import { extractTagsFromContent } from '@/utils/tagExtraction';
import { getTagColor, getAllTagColors, setTagColor, getColorById } from '@/utils/tagColors';
import { DeletableTagPill } from './TagColorPicker';

/**
 * NoteEditorModal - Matches InlineNoteComposer design exactly
 * Card + right strip layout with tag management
 */

// Format created date with time as "3:45 PM, Dec 19, 2025"
const formatCreatedDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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

// Strip hashtags from text content
const stripHashtags = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/#[\w-]+/g, '').replace(/\s+/g, ' ').trim();
};

// Strip hashtags from HTML content
const stripHashtagsFromHtml = (html) => {
  if (!html || typeof html !== 'string') return html;
  // Create temp element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Walk through text nodes and remove hashtags
  const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false);
  const nodesToUpdate = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (/#[\w-]+/.test(node.textContent)) {
      nodesToUpdate.push(node);
    }
  }

  nodesToUpdate.forEach(node => {
    node.textContent = node.textContent.replace(/#[\w-]+/g, '').replace(/\s+/g, ' ').trim();
  });

  // Remove empty paragraphs
  temp.querySelectorAll('p').forEach(p => {
    if (!p.textContent.trim()) {
      p.remove();
    }
  });

  return temp.innerHTML;
};

const NoteEditorModal = ({
  isOpen,
  onClose,
  bookmark,
  onSave,
  onDelete,
  availableTags = [], // All tags from the page
}) => {
  // Get initial content from bookmark
  const rawContent = useMemo(() => {
    if (!bookmark) return '';
    return bookmark.notesHtml || bookmark.notes || bookmark.content || bookmark.title || '';
  }, [bookmark]);

  // Extract initial tags and strip from content
  const { initialContent, initialTags } = useMemo(() => {
    const rawText = bookmark?.notes || bookmark?.content || bookmark?.title || '';
    const extracted = extractTagsFromContent(rawText);
    const bookmarkTags = (bookmark?.tags || []).map(t => t.toLowerCase());
    const allTags = [...new Set([...extracted, ...bookmarkTags])];

    // Strip hashtags from content for editor
    const strippedHtml = stripHashtagsFromHtml(rawContent);

    return {
      initialContent: strippedHtml,
      initialTags: allTags,
    };
  }, [bookmark, rawContent]);

  const [tags, setTags] = useState(initialTags);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [editorKey, setEditorKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [selectedNewTagColor, setSelectedNewTagColor] = useState(null); // null = use default hash-based color
  const [showColorPalette, setShowColorPalette] = useState(false);
  const tagDropdownRef = useRef(null);

  // Store content in ref
  const contentRef = useRef({ html: '', text: '' });

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen && bookmark) {
      contentRef.current = {
        html: initialContent,
        text: stripHashtags(bookmark.notes || bookmark.content || bookmark.title || ''),
      };
      setTags(initialTags);
      setHasChanges(false);
      setSaveState('idle');
      setEditorKey(prev => prev + 1);
      setShowTagDropdown(false);
      setTagInput('');
      setSelectedNewTagColor(null);
      setShowColorPalette(false);
    }
  }, [isOpen, bookmark, initialContent, initialTags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
        setShowTagDropdown(false);
      }
    };

    if (showTagDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTagDropdown]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showTagDropdown) {
          setShowTagDropdown(false);
        } else {
          handleClose();
        }
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
  }, [isOpen, hasChanges, showTagDropdown]);

  // Handle content change - no auto-extraction, tags come from # suggestions
  const handleContentChange = useCallback((newContent) => {
    const html = newContent.html;
    const text = newContent.text || newContent.plainText;

    contentRef.current = { html, text };
    setHasChanges(true);
  }, []);

  // Handle tag selection from TipTap # suggestion
  const handleTagSelect = useCallback((tag) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags(prev => [...prev, normalizedTag]);
      setHasChanges(true);
    }
  }, [tags]);

  // Add a tag
  const addTag = useCallback((tag, customColorId = null) => {
    const normalizedTag = tag.toLowerCase().replace(/^#/, '').trim();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      // Apply custom color if selected
      if (customColorId) {
        setTagColor(normalizedTag, customColorId);
      }
      setTags(prev => [...prev, normalizedTag]);
      setHasChanges(true);
    }
    setTagInput('');
    setSelectedNewTagColor(null);
    setShowColorPalette(false);
  }, [tags]);

  // Remove a tag
  const removeTag = useCallback((tagToRemove) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
    setHasChanges(true);
  }, []);

  // Handle tag input
  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput, selectedNewTagColor);
    }
  };

  // Get the color preview for the new tag being created
  const getNewTagPreviewColor = useCallback(() => {
    if (!tagInput.trim()) return null;
    const normalizedTag = tagInput.toLowerCase().replace(/^#/, '').trim();
    if (selectedNewTagColor) {
      return getColorById(selectedNewTagColor);
    }
    return getTagColor(normalizedTag);
  }, [tagInput, selectedNewTagColor]);

  // Save handler
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
        tags: tags, // Save tags separately
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
  }, [bookmark, onSave, onClose, tags]);

  const handleClose = () => {
    onClose?.();
  };

  // Get available tags not already added
  const suggestedTags = useMemo(() => {
    const allAvailable = [...new Set([...availableTags.map(t => t.toLowerCase())])];
    return allAvailable.filter(t => !tags.includes(t));
  }, [availableTags, tags]);

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
        <div className={cn("note-editor-wrapper", isExpanded && "note-editor-wrapper-expanded")}>
          {/* Main editor card */}
          <div className={cn("note-editor-card", isExpanded && "note-editor-card-expanded")}>
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
                  <div className="note-editor-header-actions">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="note-editor-expand"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button onClick={handleClose} className="note-editor-close" aria-label="Close">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tags section with dropdown */}
                <div className="note-editor-tags-section" ref={tagDropdownRef}>
                  <div className="note-editor-tags">
                    {tags.map((tag) => (
                      <DeletableTagPill
                        key={tag}
                        tag={tag}
                        onDelete={removeTag}
                        size="default"
                        showColorPicker={true}
                      />
                    ))}
                    <button
                      className="note-editor-add-tag-btn"
                      onClick={() => setShowTagDropdown(!showTagDropdown)}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add tag</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showTagDropdown && "rotate-180")} />
                    </button>
                  </div>

                  {/* Tag dropdown */}
                  {showTagDropdown && (
                    <div className="note-editor-tag-dropdown">
                      <div className="note-editor-tag-input-row">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Type a tag name..."
                          className="note-editor-tag-input"
                          autoFocus
                        />
                        {/* Color picker button */}
                        <button
                          className={cn(
                            "note-editor-color-picker-btn",
                            showColorPalette && "note-editor-color-picker-btn-active"
                          )}
                          onClick={() => setShowColorPalette(!showColorPalette)}
                          title="Choose tag color"
                          style={{
                            '--swatch-color': selectedNewTagColor
                              ? getColorById(selectedNewTagColor).hover
                              : 'rgba(168, 153, 132, 0.5)'
                          }}
                        >
                          <div
                            className="note-editor-color-swatch"
                            style={{
                              backgroundColor: selectedNewTagColor
                                ? getColorById(selectedNewTagColor).hover
                                : 'transparent',
                              border: selectedNewTagColor
                                ? 'none'
                                : '2px dashed rgba(168, 153, 132, 0.5)'
                            }}
                          />
                          <Palette className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Inline color palette */}
                      {showColorPalette && (
                        <div className="note-editor-color-palette">
                          <span className="note-editor-color-palette-label">Tag color</span>
                          <div className="note-editor-color-palette-grid">
                            {/* Default (auto) option */}
                            <button
                              className={cn(
                                "note-editor-color-swatch-btn",
                                !selectedNewTagColor && "note-editor-color-swatch-btn-selected"
                              )}
                              onClick={() => setSelectedNewTagColor(null)}
                              title="Auto (based on tag name)"
                            >
                              <div
                                className="note-editor-color-swatch-inner"
                                style={{
                                  background: 'linear-gradient(135deg, #fabd2f 0%, #b16286 50%, #83a598 100%)',
                                }}
                              />
                              {!selectedNewTagColor && <Check className="w-3 h-3 text-gruvbox-bg-darkest" strokeWidth={3} />}
                            </button>
                            {getAllTagColors().map((color) => (
                              <button
                                key={color.id}
                                className={cn(
                                  "note-editor-color-swatch-btn",
                                  selectedNewTagColor === color.id && "note-editor-color-swatch-btn-selected"
                                )}
                                onClick={() => setSelectedNewTagColor(color.id)}
                                title={color.name}
                              >
                                <div
                                  className="note-editor-color-swatch-inner"
                                  style={{ backgroundColor: color.hover }}
                                />
                                {selectedNewTagColor === color.id && (
                                  <Check className="w-3 h-3 text-gruvbox-bg-darkest" strokeWidth={3} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {suggestedTags.length > 0 && (
                        <div className="note-editor-tag-suggestions">
                          <span className="note-editor-tag-suggestions-label">Available tags</span>
                          <div className="note-editor-tag-suggestions-list">
                            {suggestedTags.slice(0, 10).map((tag) => {
                              const tagColor = getTagColor(tag);
                              return (
                                <button
                                  key={tag}
                                  className="note-editor-tag-suggestion"
                                  onClick={() => {
                                    addTag(tag);
                                    setShowTagDropdown(false);
                                  }}
                                  style={{
                                    backgroundColor: tagColor.bg,
                                    color: tagColor.text,
                                    border: `1px solid ${tagColor.border}`,
                                  }}
                                >
                                  #{tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {tagInput && !suggestedTags.includes(tagInput.toLowerCase()) && (() => {
                        const previewColor = getNewTagPreviewColor();
                        return (
                          <button
                            className="note-editor-create-tag"
                            onClick={() => {
                              addTag(tagInput, selectedNewTagColor);
                              setShowTagDropdown(false);
                            }}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Create</span>
                            <span
                              className="note-editor-create-tag-preview"
                              style={{
                                backgroundColor: previewColor?.bg,
                                color: previewColor?.text,
                                border: `1px solid ${previewColor?.border}`,
                              }}
                            >
                              #{tagInput.toLowerCase().replace(/^#/, '').trim()}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="note-editor-body">
                  <TipTapEditor
                    key={`editor-${editorKey}`}
                    content={initialContent}
                    onChange={handleContentChange}
                    onSave={handleSave}
                    placeholder="What's on your mind? Type # for tags"
                    autoFocus={true}
                    availableTags={[...new Set([...availableTags, ...tags])]}
                    onTagSelect={handleTagSelect}
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

          {/* Right strip */}
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
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .note-editor-overlay-bg {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
        }

        .note-editor-wrapper {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: stretch;
          width: clamp(720px, 82vw, 1200px);
          height: clamp(460px, 74vh, 820px);
          max-height: 90vh;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .note-editor-wrapper-expanded {
          width: min(92vw, 1400px);
          height: min(88vh, 900px);
        }

        .note-editor-card {
          position: relative;
          flex: 1;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
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
          border-radius: 16px 0 0 16px;
        }

        .note-editor-content {
          position: relative;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          padding: 20px 24px;
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

        .note-editor-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .note-editor-expand,
        .note-editor-close {
          padding: 6px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: var(--theme-fg-muted, #a89984);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-editor-expand:hover {
          background: rgba(254, 128, 25, 0.1);
          color: var(--theme-secondary, #fe8019);
        }

        .note-editor-close:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--theme-fg, #ebdbb2);
        }

        /* Tags section */
        .note-editor-tags-section {
          position: relative;
          margin-bottom: 16px;
        }

        .note-editor-tags {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .note-editor-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px 4px 10px;
          border-radius: 9999px;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 500;
          transition: transform 0.15s ease;
        }

        .note-editor-tag:hover {
          transform: scale(1.02);
        }

        .note-editor-tag-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          padding: 0;
          margin-left: 2px;
          border: none;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 50%;
          color: inherit;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          opacity: 0.7;
          transition: all 0.15s ease;
        }

        .note-editor-tag-remove:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.4);
        }

        .note-editor-add-tag-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          color: var(--theme-fg-muted, #a89984);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-editor-add-tag-btn:hover {
          background: rgba(254, 128, 25, 0.1);
          border-color: rgba(254, 128, 25, 0.3);
          color: var(--theme-secondary, #fe8019);
        }

        /* Tag dropdown */
        .note-editor-tag-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-width: 320px;
          margin-top: 8px;
          padding: 12px;
          background: rgba(40, 40, 40, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: 10;
        }

        .note-editor-tag-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .note-editor-tag-input {
          flex: 1;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--theme-fg, #ebdbb2);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .note-editor-tag-input:focus {
          border-color: rgba(254, 128, 25, 0.5);
        }

        .note-editor-tag-input::placeholder {
          color: var(--theme-fg-muted, #a89984);
          opacity: 0.5;
        }

        .note-editor-color-picker-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--theme-fg-muted, #a89984);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-editor-color-picker-btn:hover,
        .note-editor-color-picker-btn-active {
          background: rgba(254, 128, 25, 0.1);
          border-color: rgba(254, 128, 25, 0.3);
          color: var(--theme-secondary, #fe8019);
        }

        .note-editor-color-swatch {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .note-editor-color-palette {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .note-editor-color-palette-label {
          display: block;
          margin-bottom: 8px;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--theme-fg-muted, #a89984);
          opacity: 0.6;
        }

        .note-editor-color-palette-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .note-editor-color-swatch-btn {
          position: relative;
          width: 28px;
          height: 28px;
          padding: 0;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .note-editor-color-swatch-btn:hover {
          transform: scale(1.1);
        }

        .note-editor-color-swatch-btn-selected {
          ring: 2px solid white;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
        }

        .note-editor-color-swatch-inner {
          width: 100%;
          height: 100%;
          border-radius: 6px;
        }

        .note-editor-color-swatch-btn svg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .note-editor-tag-suggestions {
          margin-top: 12px;
        }

        .note-editor-tag-suggestions-label {
          display: block;
          margin-bottom: 8px;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--theme-fg-muted, #a89984);
          opacity: 0.6;
        }

        .note-editor-tag-suggestions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .note-editor-tag-suggestion {
          padding: 4px 10px;
          border-radius: 9999px;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-editor-tag-suggestion:hover {
          transform: scale(1.05);
          filter: brightness(1.1);
        }

        .note-editor-create-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: var(--theme-fg-muted, #a89984);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .note-editor-create-tag:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
          color: var(--theme-fg, #ebdbb2);
        }

        .note-editor-create-tag-preview {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.15s ease;
        }

        .note-editor-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .note-editor-body .ProseMirror {
          min-height: 100%;
          height: 100%;
          outline: none;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 1.7;
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

        .note-editor-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-top: 16px;
          margin-top: auto;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 400;
          color: var(--theme-fg-muted, #a89984);
          opacity: 0.7;
          flex-shrink: 0;
        }

        .note-editor-footer-sep {
          color: rgba(168, 153, 132, 0.4);
        }

        /* Right strip */
        .note-editor-strip {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: clamp(140px, 18vw, 200px);
          flex-shrink: 0;
          overflow: hidden;
          background: linear-gradient(
            180deg,
            rgba(50, 48, 47, 0.95) 0%,
            rgba(40, 40, 40, 0.98) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-left: none;
          border-radius: 0 16px 16px 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

        .note-editor-feedback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex: 1;
          padding: 24px;
        }

        .note-editor-feedback-check {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--theme-secondary, #fe8019) 0%, #e86a10 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
          color: var(--theme-bg-darkest, #1d2021);
        }

        .note-editor-feedback p {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: var(--theme-fg, #ebdbb2);
          text-align: center;
        }

        @media (max-width: 800px) {
          .note-editor-wrapper {
            width: calc(100vw - 32px);
            height: calc(100vh - 48px);
            max-height: none;
          }

          .note-editor-wrapper-expanded {
            width: calc(100vw - 32px);
            height: calc(100vh - 48px);
          }

          .note-editor-strip {
            width: 100px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .note-editor-spinner {
            animation: none;
            opacity: 0.6;
          }

          .note-editor-wrapper {
            transition: none;
          }
        }
      `}</style>
    </>,
    document.body
  );
};

export default NoteEditorModal;
