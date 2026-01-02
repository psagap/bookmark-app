import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FolderOpen, Plus, ArrowLeft, Folder, X, FolderInput, Tag, Check, FileText, Image, Film } from 'lucide-react';
import BookmarkCard from './BookmarkCard';

/**
 * CollectionCards Component
 * Displays sides (collections) as elegant folder cards
 * Clean grid layout with beautiful hover animations
 */

// Pixie Folders color palette and image mapping
const PIXIE_FOLDERS = [
  { name: 'yellow', color: '#F9B846', glow: 'rgba(249, 184, 70, 0.3)', image: '/folders/folder-yellow.png' },
  { name: 'aqua', color: '#2BC4C4', glow: 'rgba(43, 196, 196, 0.3)', image: '/folders/folder-aqua.png' },
  { name: 'blue', color: '#7B7EED', glow: 'rgba(123, 126, 237, 0.3)', image: '/folders/folder-blue.png' },
  { name: 'purple', color: '#B687D6', glow: 'rgba(182, 135, 214, 0.3)', image: '/folders/folder-purple.png' },
  { name: 'pink', color: '#F6639B', glow: 'rgba(246, 99, 155, 0.3)', image: '/folders/folder-pink.png' },
  { name: 'salmon', color: '#F87171', glow: 'rgba(248, 113, 113, 0.3)', image: '/folders/folder-salmon.png' },
  { name: 'black', color: '#4a4a4a', glow: 'rgba(74, 74, 74, 0.3)', image: '/folders/folder-black.png' },
];

// Get consistent folder based on collection ID (not array position)
const getFolderForCollection = (collectionId) => {
  const str = String(collectionId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return PIXIE_FOLDERS[Math.abs(hash) % PIXIE_FOLDERS.length];
};

// Preview thumbnail component - shows content type icon or image
const PreviewThumbnail = ({ preview, index }) => {
  const hasImage = preview?.thumbnail;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="absolute rounded-md overflow-hidden shadow-lg border border-white/10"
      style={{
        width: '48px',
        height: '48px',
        top: `${8 + index * 4}px`,
        right: `${8 + index * 6}px`,
        zIndex: 10 - index,
        transform: `rotate(${-5 + index * 5}deg)`,
      }}
    >
      {hasImage ? (
        <img
          src={preview.thumbnail}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gruvbox-bg-lighter flex items-center justify-center">
          <FileText className="w-4 h-4 text-gruvbox-fg-muted/50" />
        </div>
      )}
    </motion.div>
  );
};

const SideCard = ({
  collection,
  index,
  isSelected,
  isMultiSelected,
  hasSelection,
  onSelect,
  onShiftSelect,
  bookmarkPreviews = [],
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Get documents with thumbnails (up to 3 for visual effect)
  const documentPreviews = bookmarkPreviews.filter(p => p?.thumbnail).slice(0, 3);
  const hasDocuments = documentPreviews.length > 0;
  const fileCount = collection.bookmarkCount || 0;

  // Get Pixie Folder based on collection ID
  const pixieFolder = getFolderForCollection(collection.id);

  const handleClick = (e) => {
    if (e.shiftKey) {
      onShiftSelect(collection.id);
    } else {
      onSelect(isSelected ? null : collection.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{
        opacity: hasSelection && !isSelected ? 0 : 1,
        scale: hasSelection && !isSelected ? 0.8 : 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 30,
          delay: index * 0.03
        }
      }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      whileHover={{
        y: -8,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      className={cn(
        "side-card-modern relative cursor-pointer select-none",
        hasSelection && !isSelected && "pointer-events-none",
        isMultiSelected && "ring-2 ring-gruvbox-yellow ring-offset-2 ring-offset-gruvbox-bg-dark"
      )}
      style={{
        '--folder-color': pixieFolder.color,
        '--folder-glow': pixieFolder.glow,
      }}
    >
      {/* Multi-select checkmark */}
      <AnimatePresence>
        {isMultiSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-gruvbox-yellow flex items-center justify-center shadow-lg"
          >
            <Check className="w-3.5 h-3.5 text-gruvbox-bg-darkest" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Card Container */}
      <div
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden transition-shadow duration-300"
        style={{
          boxShadow: isHovered
            ? `0 20px 40px -12px ${pixieFolder.glow}, 0 8px 16px -8px rgba(0,0,0,0.3)`
            : '0 4px 12px -4px rgba(0,0,0,0.2)',
        }}
      >
        {/* Folder Image */}
        <img
          src={pixieFolder.image}
          alt={collection.name}
          draggable="false"
          className="w-full h-full object-contain"
        />

        {/* Preview Thumbnails - stacked in corner */}
        {hasDocuments && (
          <div className="absolute inset-0 pointer-events-none">
            {documentPreviews.slice(0, 3).map((preview, idx) => (
              <PreviewThumbnail key={idx} preview={preview} index={idx} />
            ))}
          </div>
        )}

        {/* Hover Overlay */}
        <motion.div
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"
        />

        {/* File Count Badge */}
        <motion.div
          initial={false}
          animate={{
            y: isHovered ? 0 : 8,
            opacity: isHovered ? 1 : 0.7
          }}
          className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          <span className="tabular-nums">{fileCount}</span>
          <span className="opacity-70">{fileCount === 1 ? 'file' : 'files'}</span>
        </motion.div>
      </div>

      {/* Folder Name */}
      <motion.div
        className="mt-3 px-1"
        animate={{ y: isHovered ? -2 : 0 }}
      >
        <h3
          className="text-sm font-semibold text-gruvbox-fg truncate"
          title={collection.name}
        >
          {collection.name}
        </h3>
      </motion.div>
    </motion.div>
  );
};

const CollectionCards = ({
  collections = [],
  bookmarks = [],
  selectedCollection = null,
  onSelectCollection,
  onBackToFolders,
  onCreateCollection,
  onBookmarkClick,
  onDeleteBookmark,
  onPinBookmark,
  onRefreshBookmark,
  onSaveBookmark,
  onCreateSide,
  onMoveToFolder,
  onAddTags,
  allCollections = [],
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState(new Set());
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Sync showBookmarks with selectedCollection from parent
  useEffect(() => {
    if (selectedCollection) {
      // Delay showing bookmarks for animation
      const timer = setTimeout(() => setShowBookmarks(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowBookmarks(false);
    }
  }, [selectedCollection]);

  // Get bookmark previews for each collection (for card covers)
  const getBookmarkPreviews = (collectionId) => {
    return bookmarks
      .filter(b => b.collectionId === collectionId && b.thumbnail)
      .slice(0, 5);
  };

  // Get all bookmarks for selected collection (handle string/number ID comparison)
  const getCollectionBookmarks = (collectionId) => {
    return bookmarks.filter(b => String(b.collectionId) === String(collectionId));
  };

  // Find the selected collection
  const selectedSide = collections.find(c => String(c.id) === String(selectedCollection));

  const hasSelection = selectedCollection !== null && selectedSide !== null;
  const collectionBookmarks = hasSelection ? getCollectionBookmarks(selectedCollection) : [];

  // Get the correct Pixie Folder - uses same function as SideCard for consistency
  const selectedPixieFolder = selectedSide ? getFolderForCollection(selectedSide.id) : PIXIE_FOLDERS[0];
  const selectedFolderColor = selectedPixieFolder.color;

  // Handle selection with fluid animation
  // Selected folder glows while others fade, then combined view appears
  const handleSelect = (id) => {
    // Clear multi-selection when opening a folder
    if (multiSelectedIds.size > 0) {
      setMultiSelectedIds(new Set());
    }

    if (id === selectedCollection) {
      // Deselecting - fade out combined view, then show all cards
      setShowBookmarks(false);
      setIsAnimating(true);
      setTimeout(() => {
        onSelectCollection(null);
        setIsAnimating(false);
      }, 400);
    } else {
      // Selecting - selected card glows while others fade
      // Then combined view slides in
      onSelectCollection(id);
      setIsAnimating(true);

      // Show combined view after cards fade (0.4s)
      setTimeout(() => {
        setShowBookmarks(true);
        setIsAnimating(false);
      }, 450);
    }
  };

  // Handle shift+click multi-select
  const handleShiftSelect = (id) => {
    setMultiSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Clear multi-selection
  const clearMultiSelection = () => {
    setMultiSelectedIds(new Set());
    setShowMoveMenu(false);
    setShowTagInput(false);
    setTagInput('');
  };

  // Handle move to folder
  const handleMoveToFolder = (targetFolderId) => {
    if (onMoveToFolder && multiSelectedIds.size > 0) {
      onMoveToFolder(Array.from(multiSelectedIds), targetFolderId);
    }
    clearMultiSelection();
  };

  // Handle add tags
  const handleAddTags = () => {
    if (onAddTags && multiSelectedIds.size > 0 && tagInput.trim()) {
      const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
      onAddTags(Array.from(multiSelectedIds), tags);
    }
    clearMultiSelection();
  };

  if (collections.length === 0) {
    return (
      <div className="text-center py-16">
        <FolderOpen className="w-20 h-20 mx-auto text-gruvbox-fg-muted/30 mb-4" />
        <h3 className="text-xl font-semibold text-gruvbox-fg mb-2">No Sides Yet</h3>
        <p className="text-gruvbox-fg-muted mb-6">
          Create your first side to organize your bookmarks
        </p>
        <button
          onClick={onCreateCollection}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gruvbox-yellow text-gruvbox-bg-darkest font-semibold hover:bg-gruvbox-yellow-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Side
        </button>
      </div>
    );
  }

  // Handle back navigation - use parent handler if provided
  const handleBack = () => {
    if (onBackToFolders) {
      onBackToFolders();
    } else {
      handleSelect(null);
    }
  };

  return (
    <div className="sides-container">
      {/* Header with Breadcrumb Navigation */}
      <motion.div
        layout
        className="flex items-center justify-between mb-8"
      >
        <AnimatePresence mode="wait">
          {hasSelection ? (
            // Breadcrumb when inside a folder
            <motion.div
              key="breadcrumb"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3"
            >
              <button
                onClick={handleBack}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gruvbox-fg-muted hover:text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50 transition-all"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back to Sides</span>
              </button>
              <div className="w-px h-6 bg-gruvbox-fg-muted/20" />
              <div className="flex items-center gap-3">
                <img
                  src={selectedPixieFolder.image}
                  alt=""
                  className="w-8 h-8 object-contain drop-shadow-lg"
                />
                <div>
                  <h2 className="text-lg font-bold text-gruvbox-fg tracking-tight">
                    {selectedSide?.name}
                  </h2>
                  <p className="text-xs text-gruvbox-fg-muted/70">
                    {collectionBookmarks.length} {collectionBookmarks.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            // Default header when viewing all folders
            <motion.div
              key="title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gruvbox-fg tracking-tight">Your Sides</h2>
              <p className="text-sm text-gruvbox-fg-muted/70 mt-1">
                {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Side Cards Grid - shown when no selection */}
      <AnimatePresence mode="wait">
        {!hasSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 p-2"
          >
            {collections.map((collection, index) => (
              <SideCard
                key={collection.id}
                collection={collection}
                index={index}
                isSelected={String(selectedCollection) === String(collection.id)}
                isMultiSelected={multiSelectedIds.has(collection.id)}
                hasSelection={hasSelection}
                onSelect={handleSelect}
                onShiftSelect={handleShiftSelect}
                bookmarkPreviews={getBookmarkPreviews(collection.id)}
              />
            ))}

            {/* Add New Side Card */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: collections.length * 0.03 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateCollection}
              className="group relative aspect-[4/3] rounded-2xl border-2 border-dashed border-gruvbox-fg-muted/20 hover:border-gruvbox-yellow/50 bg-gruvbox-bg-lighter/20 hover:bg-gruvbox-bg-lighter/40 transition-all duration-300 flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-gruvbox-fg-muted/10 group-hover:bg-gruvbox-yellow/20 flex items-center justify-center transition-colors">
                <Plus className="w-6 h-6 text-gruvbox-fg-muted/50 group-hover:text-gruvbox-yellow transition-colors" />
              </div>
              <span className="text-sm font-medium text-gruvbox-fg-muted/60 group-hover:text-gruvbox-fg-muted transition-colors">
                New Side
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks Grid - shown when a folder is selected */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative"
          >
            {/* Bookmark Cards - masonry grid */}
            {collectionBookmarks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gruvbox-fg-muted/10"
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${selectedPixieFolder.glow}` }}
                >
                  <FolderOpen className="w-10 h-10 text-gruvbox-fg-muted/50" />
                </div>
                <p className="text-gruvbox-fg font-medium text-lg">This side is empty</p>
                <p className="text-sm text-gruvbox-fg-muted/60 mt-2 max-w-xs text-center">
                  Add bookmarks using the menu on any card in the Lounge
                </p>
              </motion.div>
            ) : (
              <div className="w-full columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 [column-gap:1rem] pb-12">
                {collectionBookmarks.map((bookmark, index) => (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="break-inside-avoid mb-4"
                  >
                    <div onClick={() => onBookmarkClick?.(bookmark)} className="cursor-pointer">
                      <BookmarkCard
                        bookmark={bookmark}
                        onDelete={onDeleteBookmark}
                        onPin={onPinBookmark}
                        onCreateSide={onCreateSide}
                        onRefresh={onRefreshBookmark}
                        onSave={onSaveBookmark}
                        collection={selectedSide}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Multi-selection action bar */}
      {multiSelectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gruvbox-bg-dark/95 backdrop-blur-md border border-gruvbox-bg-light/30 shadow-xl">
            {/* Selection count */}
            <div className="flex items-center gap-2 pr-3 border-r border-gruvbox-bg-light/30">
              <span className="text-gruvbox-yellow font-semibold">{multiSelectedIds.size}</span>
              <span className="text-gruvbox-fg-muted text-sm">selected</span>
            </div>

            {/* Move to folder button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowMoveMenu(!showMoveMenu);
                  setShowTagInput(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gruvbox-fg-muted hover:text-gruvbox-yellow hover:bg-gruvbox-bg-light/50 transition-all"
              >
                <FolderInput className="w-4 h-4" />
                <span className="text-sm">Move</span>
              </button>

              {/* Folder dropdown */}
              {showMoveMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 py-2 rounded-xl bg-gruvbox-bg-dark border border-gruvbox-bg-light/30 shadow-xl max-h-64 overflow-y-auto">
                  {(allCollections.length > 0 ? allCollections : collections).map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => handleMoveToFolder(folder.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gruvbox-fg hover:bg-gruvbox-bg-light/50 transition-colors"
                    >
                      <img
                        src={getFolderForCollection(folder.id).image}
                        alt=""
                        className="w-5 h-5 object-contain"
                      />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add tags button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowTagInput(!showTagInput);
                  setShowMoveMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gruvbox-fg-muted hover:text-gruvbox-aqua hover:bg-gruvbox-bg-light/50 transition-all"
              >
                <Tag className="w-4 h-4" />
                <span className="text-sm">Tag</span>
              </button>

              {/* Tag input dropdown */}
              {showTagInput && (
                <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl bg-gruvbox-bg-dark border border-gruvbox-bg-light/30 shadow-xl">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTags()}
                    placeholder="Enter tags (comma separated)"
                    className="w-full px-3 py-2 rounded-lg bg-gruvbox-bg text-gruvbox-fg text-sm border border-gruvbox-bg-light/30 focus:border-gruvbox-aqua focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleAddTags}
                    className="mt-2 w-full px-3 py-1.5 rounded-lg bg-gruvbox-aqua text-gruvbox-bg-darkest text-sm font-medium hover:bg-gruvbox-aqua/80 transition-colors"
                  >
                    Add Tags
                  </button>
                </div>
              )}
            </div>

            {/* Clear selection */}
            <button
              onClick={clearMultiSelection}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gruvbox-fg-muted hover:text-gruvbox-red hover:bg-gruvbox-bg-light/50 transition-all ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionCards;
