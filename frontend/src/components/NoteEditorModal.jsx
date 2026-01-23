import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  Plus,
  Palette,
  Check,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import LexicalNoteEditor from "./LexicalNoteEditor";
import GruvboxLoader from "./GruvboxLoader";
import { cn } from "@/lib/utils";
import "./editor/lexical-styles.css";
import { extractTagsFromContent } from "@/utils/tagExtraction";
import {
  getTagColor,
  getAllTagColors,
  setTagColor,
  getColorById,
} from "@/utils/tagColors";
import { DeletableTagPill } from "./TagColorPicker";

/**
 * NoteEditorModal - Calm, distraction-free note editing experience
 *
 * Design Philosophy:
 * - Generous whitespace for breathing room
 * - Nunito font family for warmth and readability
 * - Soft, muted color palette
 * - Minimal chrome, content-first
 * - Subtle animations that don't distract
 */

// Format created date with time
const formatCreatedDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Format edited time as relative
const formatEditedTime = (date) => {
  if (!date) return null;
  const diffMins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Strip hashtags from text content
const stripHashtags = (text) => {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/#[\w-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Strip hashtags from HTML content
const stripHashtagsFromHtml = (html) => {
  if (!html || typeof html !== "string") return html;
  const temp = document.createElement("div");
  temp.innerHTML = html;

  const walker = document.createTreeWalker(
    temp,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );
  const nodesToUpdate = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (/#[\w-]+/.test(node.textContent)) {
      nodesToUpdate.push(node);
    }
  }

  nodesToUpdate.forEach((node) => {
    node.textContent = node.textContent
      .replace(/#[\w-]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  });

  temp.querySelectorAll("p").forEach((p) => {
    if (!p.textContent.trim()) p.remove();
  });

  return temp.innerHTML;
};

// Reduced motion hook
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReduced;
};

// Animation timing constants
const TIMINGS = {
  entrance: { slide: 350, backdrop: 400 },
  exit: { slideAndFade: 320, backdrop: 280 },
  expand: { cardTransform: 400, controlFade: 250 },
  collapse: { cardTransform: 420, controlFade: 300 },
};

// Spring configurations
const getSpringConfig = (prefersReduced) => {
  if (prefersReduced) {
    return { type: "tween", duration: 0.001 };
  }
  return {
    type: "spring",
    stiffness: 300,
    damping: 25,
    mass: 0.8,
  };
};

const getFullscreenSpringConfig = (prefersReduced) => {
  if (prefersReduced) {
    return { type: "tween", duration: 0.001 };
  }
  return {
    type: "spring",
    stiffness: 280,
    damping: 24,
    mass: 1.0,
  };
};

const NoteEditorModal = ({
  isOpen,
  onClose,
  bookmark,
  onSave,
  onDelete,
  availableTags = [],
}) => {
  // Get initial content from bookmark
  const rawContent = useMemo(() => {
    if (!bookmark) return "";
    return (
      bookmark.notesHtml ||
      bookmark.notes ||
      bookmark.content ||
      bookmark.title ||
      ""
    );
  }, [bookmark]);

  // Extract initial tags and strip from content
  const { initialContent, initialTags } = useMemo(() => {
    const rawText =
      bookmark?.notes || bookmark?.content || bookmark?.title || "";
    const extracted = extractTagsFromContent(rawText);
    const bookmarkTags = (bookmark?.tags || []).map((t) => t.toLowerCase());
    const allTags = [...new Set([...extracted, ...bookmarkTags])];
    const strippedHtml = stripHashtagsFromHtml(rawContent);
    const strippedText = stripHashtags(rawText);

    // Build content object for Lexical editor
    // Prefer JSON state for lossless round-trip, fallback to HTML/text
    // Only use HTML path when bookmark has actual HTML content (notesHtml).
    // Plain text (from notes field, e.g. audio notes) should use the text path
    // which properly creates paragraph nodes for each line.
    const hasActualHtml = !!bookmark?.notesHtml;
    const contentObj = {
      json: bookmark?.notesBlocks || null,
      html: hasActualHtml ? strippedHtml : null,
      text: strippedText,
    };

    return { initialContent: contentObj, initialTags: allTags };
  }, [bookmark, rawContent]);

  // State machine enums instead of multiple booleans
  const [modalState, setModalState] = useState("entering"); // 'entering' | 'idle' | 'closing'
  const [fullscreenState, setFullscreenState] = useState("normal"); // 'normal' | 'expanding' | 'fullscreen' | 'collapsing'
  const [saveState, setSaveState] = useState("idle"); // 'idle' | 'saving' | 'feedback'

  // Other state
  const [tags, setTags] = useState(initialTags);
  const [hasChanges, setHasChanges] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [selectedNewTagColor, setSelectedNewTagColor] = useState(null);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isMouseOver, setIsMouseOver] = useState(false);

  // Refs
  const tagDropdownRef = useRef(null);
  const contentRef = useRef({ html: "", text: "", json: null });
  const editorContainerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const editingTimerRef = useRef(null);

  // Get reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  // Guard for preventing conflicting actions
  const isTransitioning =
    modalState !== "idle" ||
    fullscreenState === "expanding" ||
    fullscreenState === "collapsing";

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen && bookmark) {
      contentRef.current = {
        html: initialContent.html,
        text: initialContent.text,
        json: initialContent.json,
      };
      setTags(initialTags);
      setHasChanges(false);
      setSaveState("idle");
      setEditorKey((prev) => prev + 1);
      setShowTagDropdown(false);
      setTagInput("");
      setSelectedNewTagColor(null);
      setShowColorPalette(false);
      setModalState("entering");
      setFullscreenState("normal");
      setIsEditing(false);
      setIsMouseOver(false);

      // Scroll editor to top when modal opens - multiple attempts to handle Lexical initialization
      const scrollToTop = () => {
        if (editorContainerRef.current) {
          editorContainerRef.current.scrollTop = 0;
        }
      };
      // Immediate scroll
      scrollToTop();
      // After React render
      setTimeout(scrollToTop, 0);
      // After Lexical initializes
      setTimeout(scrollToTop, 50);
      setTimeout(scrollToTop, 150);
    }
  }, [isOpen, bookmark, initialContent, initialTags]);

  // Clean up timers
  useEffect(() => {
    return () => {
      clearTimeout(editingTimerRef.current);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(e.target)
      ) {
        setShowTagDropdown(false);
      }
    };

    if (showTagDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTagDropdown]);

  // Animated close - trigger exit animation via parent
  const handleClose = useCallback(() => {
    if (modalState === "closing") return;
    setModalState("closing");
    onClose();
  }, [modalState, onClose]);

  const handleToggleFullscreen = useCallback(() => {
    // Ignore during transition
    if (fullscreenState === "expanding" || fullscreenState === "collapsing") {
      return;
    }

    if (fullscreenState === "fullscreen") {
      setFullscreenState("collapsing");
    } else if (fullscreenState === "normal") {
      setFullscreenState("expanding");
    }
  }, [fullscreenState]);

  const handleSave = useCallback(async () => {
    if (!bookmark || !onSave || isTransitioning) return;

    setSaveState("saving");
    const saveStartTime = Date.now();

    try {
      await onSave({
        ...bookmark,
        title:
          contentRef.current.text.split("\n")[0] ||
          bookmark.title ||
          "Untitled Note",
        notes: contentRef.current.text,
        notesHtml: contentRef.current.html,
        notesBlocks: contentRef.current.json || null,
        tags: tags,
        updatedAt: new Date().toISOString(),
      });

      // Ensure spinner shows for at least 800ms for better UX feedback
      const elapsed = Date.now() - saveStartTime;
      const minSpinnerTime = 800;
      if (elapsed < minSpinnerTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minSpinnerTime - elapsed),
        );
      }

      setSaveState("feedback");
      setHasChanges(false);

      setTimeout(() => {
        setSaveState("idle");
        setModalState("closing");
        onClose();
      }, 600);
    } catch (error) {
      console.error("Failed to save note:", error);
      setSaveState("idle");
    }
  }, [bookmark, onSave, tags, isTransitioning, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showTagDropdown) {
          setShowTagDropdown(false);
        } else {
          handleClose();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (hasChanges) handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [
    isOpen,
    hasChanges,
    showTagDropdown,
    handleClose,
    handleSave,
    handleToggleFullscreen,
  ]);

  // Fullscreen mouse idle detection - hide controls after 2.5s of inactivity
  useEffect(() => {
    if (fullscreenState !== "fullscreen" || !isOpen) {
      setShowControls(true);
      return;
    }

    const resetIdleTimer = () => {
      setShowControls(true);
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    };

    // Show controls initially then start timer
    resetIdleTimer();

    document.addEventListener("mousemove", resetIdleTimer);
    document.addEventListener("mousedown", resetIdleTimer);

    return () => {
      clearTimeout(idleTimerRef.current);
      document.removeEventListener("mousemove", resetIdleTimer);
      document.removeEventListener("mousedown", resetIdleTimer);
    };
  }, [fullscreenState, isOpen]);

  const handleContentChange = useCallback((newContent) => {
    const html = newContent.html;
    const text = newContent.text || newContent.plainText;
    const json = newContent.json;
    contentRef.current = { html, text, json };
    setHasChanges(true);

    // Track editing state - hide footer while typing
    setIsEditing(true);
    clearTimeout(editingTimerRef.current);
    editingTimerRef.current = setTimeout(() => {
      setIsEditing(false);
    }, 1500);
  }, []);

  const handleTagSelect = useCallback(
    (tag) => {
      const normalizedTag = tag.toLowerCase().trim();
      if (normalizedTag && !tags.includes(normalizedTag)) {
        setTags((prev) => [...prev, normalizedTag]);
        setHasChanges(true);
      }
    },
    [tags],
  );

  const addTag = useCallback(
    (tag, customColorId = null) => {
      const normalizedTag = tag.toLowerCase().replace(/^#/, "").trim();
      if (normalizedTag && !tags.includes(normalizedTag)) {
        if (customColorId) setTagColor(normalizedTag, customColorId);
        setTags((prev) => [...prev, normalizedTag]);
        setHasChanges(true);
      }
      setTagInput("");
      setSelectedNewTagColor(null);
      setShowColorPalette(false);
    },
    [tags],
  );

  const removeTag = useCallback((tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
    setHasChanges(true);
  }, []);

  const handleTagInputKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput, selectedNewTagColor);
    }
  };

  const getNewTagPreviewColor = useCallback(() => {
    if (!tagInput.trim()) return null;
    const normalizedTag = tagInput.toLowerCase().replace(/^#/, "").trim();
    if (selectedNewTagColor) return getColorById(selectedNewTagColor);
    return getTagColor(normalizedTag);
  }, [tagInput, selectedNewTagColor]);

  const suggestedTags = useMemo(() => {
    const allAvailable = [
      ...new Set([...availableTags.map((t) => t.toLowerCase())]),
    ];
    return allAvailable.filter((t) => !tags.includes(t));
  }, [availableTags, tags]);

  const isSaving = saveState === "saving";
  const isFeedback = saveState === "feedback";

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 0.6,
      transition: {
        duration: prefersReducedMotion
          ? 0.001
          : TIMINGS.entrance.backdrop / 1000,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: prefersReducedMotion ? 0.001 : TIMINGS.exit.backdrop / 1000,
        ease: "easeIn",
      },
    },
  };

  const containerVariants = {
    hidden: { x: "100%" },
    visible: {
      x: 0,
      transition: prefersReducedMotion
        ? { type: "tween", duration: 0.001 }
        : {
            type: "spring",
            stiffness: 280,
            damping: 28,
            mass: 0.9,
          },
    },
    exit: {
      x: "100%",
      transition: {
        duration: prefersReducedMotion
          ? 0.001
          : TIMINGS.exit.slideAndFade / 1000,
        ease: [0.4, 0, 0.6, 1],
      },
    },
  };

  const cardVariants = {
    normal: {
      width: "755px",
      maxWidth: "100%",
      borderRadius: "20px 0 0 20px",
      transition: prefersReducedMotion
        ? { type: "tween", duration: 0.001 }
        : {
            type: "spring",
            stiffness: 280,
            damping: 24,
            mass: 1.0,
          },
    },
    fullscreen: {
      width: "100vw",
      maxWidth: "100vw",
      borderRadius: "0px",
      transition: prefersReducedMotion
        ? { type: "tween", duration: 0.001 }
        : {
            type: "spring",
            stiffness: 280,
            damping: 24,
            mass: 1.0,
          },
    },
  };

  const controlVariants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion
          ? 0.001
          : TIMINGS.expand.controlFade / 1000,
        ease: "easeOut",
      },
    },
    hidden: {
      opacity: 0,
      y: -10,
      transition: {
        duration: prefersReducedMotion
          ? 0.001
          : TIMINGS.collapse.controlFade / 1000,
        ease: "easeIn",
      },
    },
  };

  // GPU acceleration style
  const layerStyle = {
    willChange: "transform",
    backfaceVisibility: "hidden",
    transform: "translateZ(0)",
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="zen-note-overlay"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: prefersReducedMotion ? 0.001 : 0.2 },
          }}
          exit={{
            opacity: 1,
            transition: { duration: prefersReducedMotion ? 0.001 : 0.4 },
          }}
        >
          {/* Layer 1: Backdrop */}
          <motion.div
            className="zen-note-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
            style={{
              backdropFilter: modalState === "idle" ? "blur(8px)" : "none",
              backgroundColor: "rgba(15, 15, 12, 0.8)",
            }}
          />

          {/* Layer 2: Container */}
          <motion.div
            className={cn(
              "zen-note-container",
              fullscreenState === "fullscreen" &&
                "zen-note-container--fullscreen",
            )}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onAnimationComplete={() => {
              if (modalState === "entering") {
                setModalState("idle");
              }
            }}
            style={layerStyle}
          >
            {/* Layer 3: Editor Card */}
            <motion.div
              className="zen-note-card"
              variants={cardVariants}
              initial="normal"
              animate={
                fullscreenState === "fullscreen" ||
                fullscreenState === "expanding"
                  ? "fullscreen"
                  : "normal"
              }
              onAnimationComplete={() => {
                if (fullscreenState === "expanding") {
                  setFullscreenState("fullscreen");
                } else if (fullscreenState === "collapsing") {
                  setFullscreenState("normal");
                }
              }}
              onMouseEnter={() => setIsMouseOver(true)}
              onMouseLeave={() => setIsMouseOver(false)}
              style={layerStyle}
            >
              {/* Subtle ambient glow */}
              <div className="zen-note-ambient" />

              {/* Always show editor content - feedback is shown in the strip */}
              <>
                {/* Header */}
                <motion.header
                  className={cn(
                    "zen-note-header",
                    fullscreenState === "fullscreen" &&
                      "zen-note-header--fullscreen",
                  )}
                  variants={controlVariants}
                  animate={
                    fullscreenState === "fullscreen" && !showControls
                      ? "hidden"
                      : "visible"
                  }
                >
                  <div className="zen-note-header-left">
                    <div className="zen-note-focus-btn-wrapper">
                      <button
                        onClick={handleToggleFullscreen}
                        className={cn(
                          "zen-note-btn zen-note-btn--fullscreen",
                          fullscreenState === "fullscreen" &&
                            "zen-note-btn--fullscreen-active",
                        )}
                        aria-label={
                          fullscreenState === "fullscreen"
                            ? "Exit focus mode"
                            : "Enter focus mode"
                        }
                      >
                        {fullscreenState === "fullscreen" ? (
                          <PanelRightClose className="w-4 h-4" />
                        ) : (
                          <PanelLeftClose className="w-4 h-4" />
                        )}
                      </button>
                      <span className="zen-note-focus-tooltip">
                        {fullscreenState === "fullscreen"
                          ? "Exit focus"
                          : "Focus mode"}
                        <kbd className="zen-note-focus-kbd">⌘F</kbd>
                      </span>
                    </div>
                    <h2 className="zen-note-title">
                      {bookmark?.isNew ? "New note" : "Edit note"}
                    </h2>
                  </div>
                  <div className="zen-note-actions">
                    <button
                      onClick={handleClose}
                      className="zen-note-btn zen-note-btn--ghost"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.header>

                {/* Tags Section */}
                <motion.div
                  className="zen-note-tags-wrapper"
                  ref={tagDropdownRef}
                  variants={controlVariants}
                  animate={
                    fullscreenState === "fullscreen" && !showControls
                      ? "hidden"
                      : "visible"
                  }
                >
                  <div className="zen-note-tags">
                    {tags.map((tag) => (
                      <DeletableTagPill
                        key={tag}
                        tag={tag}
                        onDelete={removeTag}
                        size="default"
                        showColorPicker={true}
                        className=""
                      />
                    ))}
                    <button
                      className="zen-note-add-tag"
                      onClick={() => setShowTagDropdown(!showTagDropdown)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add tag</span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 transition-transform duration-200",
                          showTagDropdown && "rotate-180",
                        )}
                      />
                    </button>
                  </div>

                  {/* Tag Dropdown */}
                  {showTagDropdown && (
                    <div className="zen-note-tag-dropdown">
                      <div className="zen-note-tag-input-row">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Type a tag name..."
                          className="zen-note-tag-input"
                          autoFocus
                        />
                        <button
                          className={cn(
                            "zen-note-color-btn",
                            showColorPalette && "zen-note-color-btn--active",
                          )}
                          onClick={() => setShowColorPalette(!showColorPalette)}
                          title="Choose tag color"
                        >
                          <div
                            className="zen-note-color-swatch"
                            style={{
                              backgroundColor: selectedNewTagColor
                                ? getColorById(selectedNewTagColor).hover
                                : "transparent",
                              border: selectedNewTagColor
                                ? "none"
                                : "2px dashed rgba(120, 110, 100, 0.4)",
                            }}
                          />
                          <Palette className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {showColorPalette && (
                        <div className="zen-note-color-palette">
                          <span className="zen-note-palette-label">
                            Tag color
                          </span>
                          <div className="zen-note-palette-grid">
                            <button
                              className={cn(
                                "zen-note-palette-btn",
                                !selectedNewTagColor &&
                                  "zen-note-palette-btn--selected",
                              )}
                              onClick={() => setSelectedNewTagColor(null)}
                              title="Auto"
                            >
                              <div
                                className="zen-note-palette-swatch"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #d4a574 0%, #9c8b7a 50%, #7a9b8a 100%)",
                                }}
                              />
                              {!selectedNewTagColor && (
                                <Check
                                  className="w-3 h-3 text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </button>
                            {getAllTagColors().map((color) => (
                              <button
                                key={color.id}
                                className={cn(
                                  "zen-note-palette-btn",
                                  selectedNewTagColor === color.id &&
                                    "zen-note-palette-btn--selected",
                                )}
                                onClick={() => setSelectedNewTagColor(color.id)}
                                title={color.name}
                              >
                                <div
                                  className="zen-note-palette-swatch"
                                  style={{ backgroundColor: color.hover }}
                                />
                                {selectedNewTagColor === color.id && (
                                  <Check
                                    className="w-3 h-3 text-white"
                                    strokeWidth={3}
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {suggestedTags.length > 0 && (
                        <div className="zen-note-suggestions">
                          <span className="zen-note-suggestions-label">
                            Available tags
                          </span>
                          <div className="zen-note-suggestions-list">
                            {suggestedTags.slice(0, 10).map((tag) => {
                              const tagColor = getTagColor(tag);
                              return (
                                <button
                                  key={tag}
                                  className="zen-note-suggestion"
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

                      {tagInput &&
                        !suggestedTags.includes(tagInput.toLowerCase()) &&
                        (() => {
                          const previewColor = getNewTagPreviewColor();
                          return (
                            <button
                              className="zen-note-create-tag"
                              onClick={() => {
                                addTag(tagInput, selectedNewTagColor);
                                setShowTagDropdown(false);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Create</span>
                              <span
                                className="zen-note-create-preview"
                                style={{
                                  backgroundColor: previewColor?.bg,
                                  color: previewColor?.text,
                                  border: `1px solid ${previewColor?.border}`,
                                }}
                              >
                                #
                                {tagInput
                                  .toLowerCase()
                                  .replace(/^#/, "")
                                  .trim()}
                              </span>
                            </button>
                          );
                        })()}
                    </div>
                  )}
                </motion.div>

                {/* Editor Body */}
                <div className="zen-note-editor" ref={editorContainerRef}>
                  <LexicalNoteEditor
                    key={`editor-${editorKey}`}
                    initialContent={initialContent}
                    onContentChange={handleContentChange}
                    placeholder="Let your thoughts flow..."
                    className="zen-lexical-editor"
                  />
                </div>

                {/* Footer - auto-hides when typing or mouse not over editor */}
                {(bookmark?.createdAt || bookmark?.updatedAt) && (
                  <motion.footer
                    className="zen-note-footer"
                    variants={controlVariants}
                    animate={
                      (fullscreenState === "fullscreen" && !showControls) ||
                      (fullscreenState === "normal" &&
                        (isEditing || !isMouseOver))
                        ? "hidden"
                        : "visible"
                    }
                    style={{ minHeight: "30px" }}
                  >
                    {bookmark?.createdAt && (
                      <span>
                        Created {formatCreatedDate(bookmark.createdAt)}
                      </span>
                    )}
                    {bookmark?.updatedAt && (
                      <span>Edited {formatEditedTime(bookmark.updatedAt)}</span>
                    )}
                  </motion.footer>
                )}
              </>
            </motion.div>

            {/* Save Strip - only appears when saving/saved, slides in on ⌘+Enter */}
            {fullscreenState === "normal" && (isSaving || isFeedback) && (
              <div
                className={cn(
                  "zen-note-strip zen-note-strip--visible",
                  isFeedback && "zen-note-strip--saved",
                )}
              >
                {isFeedback ? (
                  <div className="zen-note-strip-feedback">
                    <div className="zen-note-strip-check">
                      <Check className="w-5 h-5" />
                    </div>
                    <span className="zen-note-strip-saved-text">Saved</span>
                  </div>
                ) : (
                  <div className="zen-note-strip-saving">
                    <GruvboxLoader variant="orbit" size="sm" />
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen save indicator - subtle checkmark on save */}
            {fullscreenState === "fullscreen" && (isSaving || isFeedback) && (
              <div className="zen-note-fs-indicator">
                {isFeedback ? (
                  <div className="zen-note-fs-indicator-check">
                    <Check className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="zen-note-fs-indicator-spinner">
                    <GruvboxLoader variant="orbit" size="sm" />
                  </div>
                )}
              </div>
            )}
          </motion.div>

          <style>{`
        /* ===========================================
           ZEN NOTE EDITOR - Calm Writing Experience
           Animations powered by Framer Motion
           =========================================== */

        .zen-note-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: stretch;
          justify-content: flex-end;
        }

        .zen-note-backdrop {
          position: absolute;
          inset: 0;
        }

        .zen-note-container {
          position: relative;
          z-index: 1;
          display: flex;
          height: 100%;
          max-height: 100vh;
        }

        .zen-note-container--fullscreen {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          padding: 0;
        }

        .zen-note-card {
          position: relative;
          flex: none;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(
            168deg,
            var(--theme-bg-dark, rgba(28, 26, 24, 0.98)) 0%,
            var(--theme-bg-darkest, rgba(22, 20, 18, 0.99)) 100%
          );
          border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.06));
          border-right: none;
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.5),
            0 8px 24px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          overflow: hidden;
        }

        .zen-note-container--fullscreen .zen-note-card {
          border: none;
          box-shadow: none;
          height: 100vh;
        }

        .zen-note-ambient {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 100% 80% at 15% 5%,
            color-mix(in srgb, var(--theme-primary, #d79921) 6%, transparent) 0%,
            transparent 50%
          );
          pointer-events: none;
        }

        .zen-note-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 32px 0;
          flex-shrink: 0;
        }

        .zen-note-header--fullscreen {
          transition: none;
        }

        .zen-note-title {
          font-family: 'Nunito', -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.7));
          margin: 0;
        }

        .zen-note-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .zen-note-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .zen-note-btn--ghost {
          background: rgba(255, 255, 255, 0.04);
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.6));
          backdrop-filter: blur(4px);
        }

        .zen-note-btn--ghost:hover {
          background: rgba(255, 255, 255, 0.09);
          color: var(--theme-fg, rgba(235, 225, 210, 0.9));
          transform: scale(1.05);
        }

        .zen-note-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .zen-note-focus-btn-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .zen-note-focus-tooltip {
          position: absolute;
          left: calc(100% + 8px);
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 8px;
          background: var(--theme-bg-darkest, rgba(0, 0, 0, 0.6));
          border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.08));
          font-family: 'Nunito', -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.7));
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        .zen-note-focus-btn-wrapper:hover .zen-note-focus-tooltip {
          opacity: 1;
        }

        .zen-note-focus-kbd {
          display: inline-flex;
          align-items: center;
          padding: 2px 5px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: -apple-system, sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.8));
          letter-spacing: 0.02em;
        }

        .zen-note-btn--fullscreen {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.6));
          padding: 7px 11px;
          border-radius: 10px;
          gap: 6px;
          backdrop-filter: blur(4px);
        }

        .zen-note-btn--fullscreen:hover {
          background: color-mix(in srgb, var(--theme-primary, #d79921) 14%, transparent);
          border-color: color-mix(in srgb, var(--theme-primary, #d79921) 35%, transparent);
          color: var(--theme-primary, #d79921);
          transform: scale(1.04);
        }

        .zen-note-btn--fullscreen-active {
          background: color-mix(in srgb, var(--theme-primary, #d79921) 12%, transparent);
          border-color: color-mix(in srgb, var(--theme-primary, #d79921) 35%, transparent);
          color: var(--theme-primary, #d79921);
        }

        .zen-note-btn--fullscreen-active:hover {
          transform: scale(1.04);
        }

        .zen-note-tags-wrapper {
          position: relative;
          padding: 10px 32px;
          flex-shrink: 0;
        }

        .zen-note-tags {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }


        .zen-note-add-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 20px;
          background: color-mix(in srgb, var(--theme-fg-muted, #a89984) 6%, transparent);
          border: none;
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.45));
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .zen-note-add-tag:hover {
          background: color-mix(in srgb, var(--theme-fg-muted, #a89984) 12%, transparent);
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.7));
        }

        .zen-note-tag-dropdown {
          position: absolute;
          top: 100%;
          left: 32px;
          right: 32px;
          max-width: 300px;
          margin-top: 6px;
          padding: 12px;
          background: var(--theme-bg-dark, rgba(28, 26, 24, 0.98));
          border: 1px solid color-mix(in srgb, var(--theme-fg-muted, #a89984) 10%, transparent);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
          z-index: 10;
        }

        .zen-note-tag-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zen-note-tag-input {
          flex: 1;
          padding: 8px 12px;
          background: color-mix(in srgb, var(--theme-fg-muted, #a89984) 6%, transparent);
          border: 1px solid color-mix(in srgb, var(--theme-fg-muted, #a89984) 10%, transparent);
          border-radius: 8px;
          color: var(--theme-fg, rgba(235, 225, 210, 0.9));
          font-size: 12px;
          font-weight: 400;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .zen-note-tag-input:focus {
          border-color: color-mix(in srgb, var(--theme-primary, #d79921) 40%, transparent);
        }

        .zen-note-tag-input::placeholder {
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.35));
        }

        .zen-note-color-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 10px;
          background: color-mix(in srgb, var(--theme-fg-muted, #a89984) 6%, transparent);
          border: 1px solid color-mix(in srgb, var(--theme-fg-muted, #a89984) 10%, transparent);
          border-radius: 8px;
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.5));
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .zen-note-color-btn:hover,
        .zen-note-color-btn--active {
          background: color-mix(in srgb, var(--theme-primary, #d79921) 10%, transparent);
          border-color: color-mix(in srgb, var(--theme-primary, #d79921) 25%, transparent);
          color: var(--theme-primary, #d79921);
        }

        .zen-note-color-swatch {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .zen-note-color-palette {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid color-mix(in srgb, var(--theme-fg-muted, #a89984) 8%, transparent);
        }

        .zen-note-palette-label,
        .zen-note-suggestions-label {
          display: block;
          margin-bottom: 8px;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.4));
        }

        .zen-note-palette-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .zen-note-palette-btn {
          position: relative;
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease;
        }

        .zen-note-palette-btn:hover {
          transform: scale(1.15);
        }

        .zen-note-palette-btn--selected {
          box-shadow: 0 0 0 1.5px var(--theme-bg-dark, #1d2021), 0 0 0 3px currentColor;
        }

        .zen-note-palette-swatch {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }

        .zen-note-palette-btn svg {
          position: absolute;
        }

        .zen-note-suggestions {
          margin-top: 16px;
        }

        .zen-note-suggestions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .zen-note-suggestion {
          padding: 5px 11px;
          border-radius: 8px;
          font-family: 'Nunito', sans-serif;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
          backdrop-filter: blur(4px);
        }

        .zen-note-suggestion:hover {
          transform: translateY(-1px);
          filter: brightness(1.12);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .zen-note-create-tag {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          margin-top: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.06));
          border-radius: 12px;
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.7));
          font-family: 'Nunito', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .zen-note-create-tag:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          color: var(--theme-fg, rgba(235, 225, 210, 0.9));
        }

        .zen-note-create-preview {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .zen-note-editor {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0 32px;
          scrollbar-width: thin;
          scrollbar-color: rgba(var(--glow-color-rgb, 232, 89, 79), 0.5) transparent;
        }

        .zen-note-editor::-webkit-scrollbar {
          width: 8px;
        }

        .zen-note-editor::-webkit-scrollbar-track {
          background: transparent;
        }

        .zen-note-editor::-webkit-scrollbar-thumb {
          background: rgba(var(--glow-color-rgb, 232, 89, 79), 0.4);
          border-radius: 4px;
        }

        .zen-note-editor::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--glow-color-rgb, 232, 89, 79), 0.6);
        }

        .zen-note-editor .lexical-content-editable {
          min-height: 100%;
          height: auto;
          outline: none;
          font-family: var(--note-font-family, 'Excalifont', 'Nunito', -apple-system, sans-serif);
          font-size: 17px;
          font-weight: 400;
          line-height: 1.8;
          letter-spacing: 0.01em;
          color: var(--theme-fg, rgba(235, 225, 210, 0.88));
          caret-color: var(--theme-primary, #d79921);
          padding: 0;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
          overflow-y: visible;
        }

        .zen-note-editor .lexical-paragraph {
          margin-bottom: 1em;
        }

        .zen-note-editor .lexical-placeholder {
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.35));
          font-style: italic;
          font-family: var(--note-font-family, 'Excalifont', 'Nunito', -apple-system, sans-serif);
          font-size: 17px;
          line-height: 1.8;
          top: 0;
          left: 0;
          right: 0;
          transform: none;
          max-width: 640px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          padding: 0;
        }

        .zen-note-editor .lexical-heading-h1 {
          font-size: 1.75em;
          font-weight: 700;
          margin-bottom: 0.5em;
          color: var(--theme-fg, rgba(235, 225, 210, 0.95));
        }

        .zen-note-editor .lexical-heading-h2 {
          font-size: 1.4em;
          font-weight: 600;
          margin-bottom: 0.5em;
          color: var(--theme-fg, rgba(235, 225, 210, 0.92));
        }

        .zen-note-editor .lexical-heading-h3 {
          font-size: 1.15em;
          font-weight: 600;
          margin-bottom: 0.5em;
          color: var(--theme-fg, rgba(235, 225, 210, 0.9));
        }

        .zen-note-editor .lexical-quote {
          border-left: 3px solid color-mix(in srgb, var(--theme-primary, #d79921) 50%, transparent);
          padding-left: 1em;
          margin-left: 0;
          color: var(--theme-fg-muted, rgba(235, 225, 210, 0.7));
          font-style: italic;
        }

        .zen-note-editor .lexical-text-code {
          background: var(--theme-bg-darkest, rgba(0, 0, 0, 0.2));
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9em;
          color: var(--theme-secondary, rgba(180, 200, 180, 0.9));
        }

        .zen-note-editor .lexical-code {
          background: var(--theme-bg-darkest, rgba(0, 0, 0, 0.25));
          padding: 16px;
          border-radius: 12px;
          overflow-x: auto;
        }

        .zen-note-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 32px 8px;
          font-family: 'Nunito', sans-serif;
          font-size: 11px;
          font-weight: 400;
          color: var(--theme-fg-muted, rgba(180, 170, 155, 0.4));
          flex-shrink: 0;
        }

        .zen-note-strip {
          display: flex;
          align-items: center;
          justify-content: center;
          width: clamp(140px, 16vw, 180px);
          flex-shrink: 0;
          background: linear-gradient(
            180deg,
            var(--theme-bg, rgba(32, 30, 28, 0.95)) 0%,
            var(--theme-bg-dark, rgba(26, 24, 22, 0.98)) 100%
          );
          border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.05));
          border-left: none;
          border-radius: 0 20px 20px 0;
          transition: all 0.3s ease;
          opacity: 0;
          transform: translateX(-20px);
        }

        .zen-note-strip--visible {
          animation: stripAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes stripAppear {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .zen-note-strip-saving {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .zen-note-strip--saved {
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--theme-primary, #d79921) 20%, var(--theme-bg-dark, rgba(28, 26, 24, 0.98))) 0%,
            color-mix(in srgb, var(--theme-primary, #d79921) 12%, var(--theme-bg-darkest, rgba(22, 20, 18, 0.99))) 100%
          );
          border-color: color-mix(in srgb, var(--theme-primary, #d79921) 35%, transparent);
          animation: stripSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes stripSlideIn {
          0% {
            background: linear-gradient(
              180deg,
              var(--theme-bg, rgba(32, 30, 28, 0.95)) 0%,
              var(--theme-bg-dark, rgba(26, 24, 22, 0.98)) 100%
            );
          }
          40% {
            background: linear-gradient(
              180deg,
              color-mix(in srgb, var(--theme-primary, #d79921) 30%, var(--theme-bg-dark, rgba(28, 26, 24, 0.98))) 0%,
              color-mix(in srgb, var(--theme-primary, #d79921) 18%, var(--theme-bg-darkest, rgba(22, 20, 18, 0.99))) 100%
            );
          }
          100% {
            background: linear-gradient(
              180deg,
              color-mix(in srgb, var(--theme-primary, #d79921) 20%, var(--theme-bg-dark, rgba(28, 26, 24, 0.98))) 0%,
              color-mix(in srgb, var(--theme-primary, #d79921) 12%, var(--theme-bg-darkest, rgba(22, 20, 18, 0.99))) 100%
            );
          }
        }

        .zen-note-strip-feedback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          height: 100%;
          animation: feedbackContentIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes feedbackContentIn {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .zen-note-strip-check {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--theme-primary, #d79921) 15%, transparent);
          border: 2px solid var(--theme-primary, #d79921);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--theme-primary, #d79921);
          animation: checkPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
        }

        @keyframes checkPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .zen-note-strip-saved-text {
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--theme-primary, #d79921);
          letter-spacing: 0.5px;
          animation: textFadeIn 0.3s ease 0.25s both;
        }

        @keyframes textFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .zen-note-fs-indicator {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 110;
          animation: fsIndicatorIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fsIndicatorIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .zen-note-fs-indicator-check {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--theme-primary, #d79921) 15%, var(--theme-bg-dark, rgba(28, 26, 24, 0.95)));
          border: 2px solid var(--theme-primary, #d79921);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--theme-primary, #d79921);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          animation: fsCheckPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes fsCheckPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .zen-note-fs-indicator-spinner {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--theme-primary, #d79921) 8%, var(--theme-bg-dark, rgba(28, 26, 24, 0.95)));
          border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.08));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        @media (max-width: 900px) {
          .zen-note-card {
            min-width: 400px;
          }

          .zen-note-editor .lexical-content-editable,
          .zen-note-editor .lexical-placeholder {
            max-width: 100%;
          }
        }

        @media (max-width: 768px) {
          .zen-note-container {
            width: 100%;
            height: 100%;
            flex-direction: column;
          }

          .zen-note-container--fullscreen {
            width: 100%;
            height: 100%;
            padding: 0;
          }

          .zen-note-card {
            width: 100%;
            min-width: unset;
            border-radius: 20px 20px 0 0;
            border-right: 1px solid var(--theme-border, rgba(255, 255, 255, 0.06));
            border-bottom: none;
          }

          .zen-note-strip {
            width: 100%;
            height: 64px;
            border-radius: 0 0 20px 20px;
            border-left: 1px solid var(--theme-border, rgba(255, 255, 255, 0.05));
            border-top: none;
            transform: translateY(-20px);
          }

          .zen-note-strip--visible {
            animation: stripAppearMobile 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          @keyframes stripAppearMobile {
            0% {
              opacity: 0;
              transform: translateY(-20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .zen-note-header,
          .zen-note-tags-wrapper,
          .zen-note-editor,
          .zen-note-footer {
            padding-left: 20px;
            padding-right: 20px;
          }

          .zen-note-fs-indicator {
            bottom: 20px;
            right: 20px;
          }
        }
      `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default NoteEditorModal;
