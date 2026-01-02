import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Plus, ArrowLeft, FolderOpen,
  MoreHorizontal, Pencil, Trash2, Palette,
  FileText
} from 'lucide-react';
import BookmarkCard from './BookmarkCard';

/**
 * SidesGallery - Clean, modern collection view
 * Inspired by Apple/Linear/Notion design principles
 */

// Simple color palette - just accents, no glows
const FOLDER_PALETTES = [
  { name: 'coral', accent: '#FF6B6B' },
  { name: 'teal', accent: '#4ECDC4' },
  { name: 'amber', accent: '#F59E0B' },
  { name: 'lavender', accent: '#A78BFA' },
  { name: 'mint', accent: '#34D399' },
  { name: 'peach', accent: '#FB923C' },
  { name: 'sky', accent: '#38BDF8' },
  { name: 'rose', accent: '#F472B6' },
];

const COLLECTION_COLORS = [
  { name: 'Coral', value: '#fb4934' },
  { name: 'Amber', value: '#fe8019' },
  { name: 'Gold', value: '#fabd2f' },
  { name: 'Lime', value: '#b8bb26' },
  { name: 'Mint', value: '#8ec07c' },
  { name: 'Sky', value: '#83a598' },
  { name: 'Lavender', value: '#d3869b' },
  { name: 'Slate', value: '#928374' },
];

// Get consistent palette for a collection
const getPaletteForCollection = (id) => {
  const str = String(id);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return FOLDER_PALETTES[Math.abs(hash) % FOLDER_PALETTES.length];
};

// Helper to get corner class based on grid position (3x2 grid = 6 cells)
const getCornerClass = (idx) => {
  switch(idx) {
    case 0: return 'rounded-tl-xl';  // top-left
    case 2: return 'rounded-tr-xl';  // top-right
    case 3: return 'rounded-bl-xl';  // bottom-left
    case 5: return 'rounded-br-xl';  // bottom-right
    default: return '';
  }
};

// Preview Mosaic - static grid, no animations
const PreviewMosaic = ({ previews, accentColor }) => {
  if (previews.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gruvbox-bg-lighter/30 rounded-xl">
        <FolderOpen className="w-10 h-10 text-gruvbox-fg-muted/30" />
      </div>
    );
  }

  const displayPreviews = previews.slice(0, 6);

  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-px bg-gruvbox-bg-darker/20 rounded-xl overflow-hidden">
      {displayPreviews.map((preview, idx) => (
        <div key={idx} className={cn("relative overflow-hidden bg-gruvbox-bg-light", getCornerClass(idx))}>
          {preview.thumbnail ? (
            <img
              src={preview.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gruvbox-bg-lighter/50">
              <FileText className="w-4 h-4 text-gruvbox-fg-muted/20" />
            </div>
          )}
        </div>
      ))}
      {/* Fill empty slots */}
      {Array.from({ length: Math.max(0, 6 - displayPreviews.length) }).map((_, idx) => {
        const actualIdx = displayPreviews.length + idx;
        return (
          <div key={`empty-${idx}`} className={cn("bg-gruvbox-bg-lighter/30", getCornerClass(actualIdx))} />
        );
      })}
    </div>
  );
};

// Simple dropdown menu - no scale animations
const FolderMenu = ({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleColorPicker,
  showColorPicker,
  currentColor,
  onSelectColor,
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div className="absolute top-10 right-2 z-50 w-40 py-1 rounded-lg bg-gruvbox-bg-dark border border-gruvbox-bg-lighter shadow-lg">
          {onEdit && (
            <button
              onClick={onEdit}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-gruvbox-fg-muted" />
              Rename
            </button>
          )}
          {onSelectColor && (
            <>
              <button
                onClick={onToggleColorPicker}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50 transition-colors"
              >
                <Palette className="w-3.5 h-3.5 text-gruvbox-fg-muted" />
                Change Color
              </button>
              {showColorPicker && (
                <div className="px-3 pb-2 flex flex-wrap items-center gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => onSelectColor(color.value)}
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-transform",
                        currentColor === color.value ? "border-gruvbox-fg" : "border-transparent"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {onDelete && (
            <>
              <div className="my-1 border-t border-gruvbox-bg-lighter" />
              <button
                onClick={onDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gruvbox-red hover:bg-gruvbox-red/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      </>
    )}
  </AnimatePresence>
);

// Clean card component - single hover effect
const CollectionCard = ({
  collection,
  index,
  previews,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const palette = getPaletteForCollection(collection.id);
  const accentColor = collection.color || palette.accent;
  const fileCount = collection.bookmarkCount || 0;

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setShowColorPicker(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.015, duration: 0.15, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !menuOpen && onSelect(collection.id)}
      className="group relative cursor-pointer"
    >
      {/* Card Container */}
      <div
        className={cn(
          "relative w-full rounded-2xl border transition-all duration-150",
          "bg-gruvbox-bg-light/40",
          isHovered
            ? "border-gruvbox-fg-muted/40 bg-gruvbox-bg-light/60 shadow-md"
            : "border-gruvbox-bg-lighter/50"
        )}
      >
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
          style={{ backgroundColor: accentColor }}
        />

        <div className="relative flex items-center gap-4 p-4">
          <div className="relative w-24 md:w-28 aspect-square flex-shrink-0 rounded-xl overflow-hidden bg-gruvbox-bg-darker/30">
            <PreviewMosaic previews={previews} accentColor={palette.accent} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gruvbox-fg truncate">
              {collection.name}
            </h3>
            <p className="text-xs text-gruvbox-fg-muted/70 mt-1">
              {fileCount} {fileCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        {/* Menu Button - appears on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className={cn(
            "absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center",
            "bg-gruvbox-bg-dark/70 transition-opacity duration-100",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <MoreHorizontal className="w-4 h-4 text-gruvbox-fg-muted" />
        </button>

        <FolderMenu
          isOpen={menuOpen}
          onClose={handleCloseMenu}
          onDelete={onDelete ? () => { onDelete(collection.id); handleCloseMenu(); } : null}
          onToggleColorPicker={() => setShowColorPicker(prev => !prev)}
          showColorPicker={showColorPicker}
          currentColor={collection.color || accentColor}
          onSelectColor={onUpdate ? (color) => { onUpdate(collection.id, { color }); handleCloseMenu(); } : null}
        />
      </div>
    </motion.div>
  );
};

// New collection card
const NewCollectionCard = ({ onClick, index }) => (
  <motion.button
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.015, duration: 0.15, ease: 'easeOut' }}
    onClick={onClick}
    className={cn(
      "group w-full rounded-2xl min-h-[128px]",
      "border-2 border-dashed border-gruvbox-fg-muted/15",
      "hover:border-gruvbox-fg-muted/30 hover:bg-gruvbox-bg-lighter/30",
      "flex items-center gap-4 px-4 py-5 text-left",
      "transition-all duration-150"
    )}
  >
    <div className="w-12 h-12 rounded-xl bg-gruvbox-bg-lighter/50 group-hover:bg-gruvbox-bg-lighter flex items-center justify-center transition-colors">
      <Plus className="w-5 h-5 text-gruvbox-fg-muted/50 group-hover:text-gruvbox-fg-muted transition-colors" />
    </div>
    <div>
      <div className="text-sm font-semibold text-gruvbox-fg-muted group-hover:text-gruvbox-fg transition-colors">
        New Collection
      </div>
      <div className="text-xs text-gruvbox-fg-muted/50 mt-1">
        Start a fresh stack
      </div>
    </div>
  </motion.button>
);

// Detail view when collection is selected
const CollectionDetailView = ({
  collection,
  bookmarks,
  palette,
  onBack,
  onBookmarkClick,
  onDeleteBookmark,
  onPinBookmark,
  onRefreshBookmark,
  onSaveBookmark,
  onCreateSide,
}) => {
  const accentColor = collection.color || palette.accent;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg text-gruvbox-fg-muted hover:text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <h1 className="text-xl font-semibold text-gruvbox-fg">
            {collection.name}
          </h1>
          <span className="text-sm text-gruvbox-fg-muted">
            {bookmarks.length} {bookmarks.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Bookmarks Grid */}
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gruvbox-bg-lighter flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-gruvbox-fg-muted/50" />
          </div>
          <h3 className="text-base font-medium text-gruvbox-fg mb-1">
            This collection is empty
          </h3>
          <p className="text-sm text-gruvbox-fg-muted/60 max-w-xs text-center">
            Add bookmarks from the Lounge using the menu on any card
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {bookmarks.map((bookmark, index) => (
            <motion.div
              key={bookmark.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02, duration: 0.15 }}
              className="break-inside-avoid mb-4"
            >
              <div
                onClick={() => onBookmarkClick?.(bookmark)}
                className="cursor-pointer"
              >
                <BookmarkCard
                  bookmark={bookmark}
                  onDelete={onDeleteBookmark}
                  onPin={onPinBookmark}
                  onCreateSide={onCreateSide}
                  onRefresh={onRefreshBookmark}
                  onSave={onSaveBookmark}
                  collection={collection}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Main Component
const SidesGallery = ({
  collections = [],
  bookmarks = [],
  selectedCollection = null,
  onSelectCollection,
  onBackToFolders,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onBookmarkClick,
  onDeleteBookmark,
  onPinBookmark,
  onRefreshBookmark,
  onSaveBookmark,
  onCreateSide,
}) => {
  // Get previews for each collection
  const getBookmarkPreviews = (collectionId) => {
    return bookmarks
      .filter(b => String(b.collectionId) === String(collectionId))
      .slice(0, 6);
  };

  // Get bookmarks for selected collection
  const getCollectionBookmarks = (collectionId) => {
    return bookmarks.filter(b => String(b.collectionId) === String(collectionId));
  };

  const selectedSide = collections.find(c => String(c.id) === String(selectedCollection));
  const hasSelection = selectedCollection !== null && selectedSide !== null;
  const collectionBookmarks = hasSelection ? getCollectionBookmarks(selectedCollection) : [];
  const selectedPalette = selectedSide ? getPaletteForCollection(selectedSide.id) : FOLDER_PALETTES[0];
  const totalItems = bookmarks.filter(b => b.collectionId !== null && b.collectionId !== undefined).length;

  // Empty state - static, no animations
  if (collections.length === 0 && !hasSelection) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-gruvbox-bg-lighter flex items-center justify-center mb-4">
          <FolderOpen className="w-8 h-8 text-gruvbox-fg-muted/50" />
        </div>
        <h2 className="text-lg font-semibold text-gruvbox-fg mb-2">
          No collections yet
        </h2>
        <p className="text-sm text-gruvbox-fg-muted/60 text-center max-w-xs mb-6">
          Create your first collection to organize your bookmarks.
        </p>
        <button
          onClick={onCreateCollection}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gruvbox-yellow text-gruvbox-bg-darkest font-medium text-sm hover:bg-gruvbox-yellow/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Collection
        </button>
      </div>
    );
  }

  return (
    <div className="sides-gallery px-2">
      <AnimatePresence mode="wait">
        {hasSelection ? (
          <CollectionDetailView
            key="detail"
            collection={selectedSide}
            bookmarks={collectionBookmarks}
            palette={selectedPalette}
            onBack={() => onBackToFolders ? onBackToFolders() : onSelectCollection(null)}
            onBookmarkClick={onBookmarkClick}
            onDeleteBookmark={onDeleteBookmark}
            onPinBookmark={onPinBookmark}
            onRefreshBookmark={onRefreshBookmark}
            onSaveBookmark={onSaveBookmark}
            onCreateSide={onCreateSide}
          />
        ) : (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gruvbox-fg">
                  Collections
                </h1>
                <p className="text-sm text-gruvbox-fg-muted/60 mt-1">
                  {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
                  {' '}•{' '}
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </p>
              </div>
              <button
                onClick={onCreateCollection}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gruvbox-yellow text-gruvbox-bg-darkest font-semibold text-sm hover:bg-gruvbox-yellow/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Collection
              </button>
            </div>

            {/* Uniform Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {collections.map((collection, index) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  index={index}
                  previews={getBookmarkPreviews(collection.id)}
                  onSelect={onSelectCollection}
                  onUpdate={onUpdateCollection}
                  onDelete={onDeleteCollection}
                />
              ))}
              <NewCollectionCard
                onClick={onCreateCollection}
                index={collections.length}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SidesGallery;
