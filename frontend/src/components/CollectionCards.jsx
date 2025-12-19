import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FolderOpen, Plus, ArrowLeft, Folder, X, FolderInput, Tag, Check } from 'lucide-react';
import BookmarkCard from './BookmarkCard';

/**
 * CollectionCards Component
 * Displays sides (collections) as Pixie Folder cards
 * Documents peek out from behind and rise on hover
 */

// Pixie Folders color palette and image mapping
const PIXIE_FOLDERS = [
  { name: 'yellow', color: '#F9B846', image: '/folders/folder-yellow.png' },
  { name: 'aqua', color: '#2BC4C4', image: '/folders/folder-aqua.png' },
  { name: 'blue', color: '#7B7EED', image: '/folders/folder-blue.png' },
  { name: 'purple', color: '#B687D6', image: '/folders/folder-purple.png' },
  { name: 'pink', color: '#F6639B', image: '/folders/folder-pink.png' },
  { name: 'salmon', color: '#F87171', image: '/folders/folder-salmon.png' },
  { name: 'black', color: '#2D2D2D', image: '/folders/folder-black.png' },
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

// Legacy color array for backward compatibility
const FOLDER_COLORS = PIXIE_FOLDERS.map(f => f.color);

const SideCard = ({
  collection,
  index,
  totalCount,
  isSelected,
  isMultiSelected,
  hasSelection,
  onSelect,
  onShiftSelect,
  bookmarkPreviews = [],
}) => {
  // Get documents with thumbnails (up to 3 for visual effect)
  const documentPreviews = bookmarkPreviews.filter(p => p?.thumbnail).slice(0, 3);
  const hasDocuments = documentPreviews.length > 0;

  // Get Pixie Folder based on collection ID (consistent regardless of array position)
  const pixieFolder = getFolderForCollection(collection.id);
  const folderImage = pixieFolder.image;
  const folderColor = pixieFolder.color;

  const handleClick = (e) => {
    if (e.shiftKey) {
      // Shift+click for multi-select
      onShiftSelect(collection.id);
    } else {
      // Normal click to open folder
      onSelect(isSelected ? null : collection.id);
    }
  };

  return (
    <div
      className={cn(
        "side-card pixie-folder",
        hasSelection && !isSelected && "side-card--hidden",
        isSelected && "side-card--selected",
        isMultiSelected && "side-card--multi-selected"
      )}
      style={{
        '--card-color': folderColor,
        '--card-index': index,
      }}
      onClick={handleClick}
    >
      <div className="pixie-folder-wrapper">
        {/* Multi-select checkmark */}
        {isMultiSelected && (
          <div className="pixie-folder-check">
            <Check className="w-4 h-4" />
          </div>
        )}
        {/* Pixie Folder Image with documents inside */}
        <div className="pixie-folder-image">
          <img
            src={folderImage}
            alt={collection.name}
            draggable="false"
          />
          {/* Documents inside the folder's white paper area */}
          {hasDocuments && (
            <div className="pixie-documents">
              {documentPreviews.map((preview, idx) => (
                <div
                  key={idx}
                  className="pixie-document"
                  style={{ '--doc-index': idx }}
                >
                  <img
                    src={preview.thumbnail}
                    alt=""
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Folder Info - below the folder */}
      <div className="pixie-folder-info">
        <h3>{collection.name}</h3>
        <span className="pixie-folder-count">
          {collection.bookmarkCount || 0} {collection.bookmarkCount === 1 ? 'file' : 'files'}
        </span>
      </div>
    </div>
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
      <div className="flex items-center justify-between mb-6">
        {hasSelection ? (
          // Breadcrumb when inside a folder
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gruvbox-fg-muted hover:text-gruvbox-yellow hover:bg-gruvbox-bg-light/50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Sides</span>
            </button>
            <div className="flex items-center gap-2">
              <img
                src={selectedPixieFolder.image}
                alt=""
                className="w-6 h-6 object-contain"
              />
              <h2 className="text-xl font-semibold text-gruvbox-fg">
                {selectedSide?.name}
              </h2>
            </div>
          </div>
        ) : (
          // Default header when viewing all folders
          <h2 className="text-xl font-semibold text-gruvbox-fg">Your Sides</h2>
        )}

        {/* Create new side button */}
        {!hasSelection && (
          <button
            onClick={onCreateCollection}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gruvbox-fg-muted hover:text-gruvbox-yellow hover:bg-gruvbox-bg-light/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Side
          </button>
        )}
      </div>

      {/* Side Cards Grid - shown when no selection */}
      <div className={cn(
        "sides-grid",
        hasSelection && "sides-grid--has-selection",
        isAnimating && "sides-grid--animating"
      )}>
        {collections.map((collection, index) => (
          <SideCard
            key={collection.id}
            collection={collection}
            index={index}
            totalCount={collections.length}
            isSelected={String(selectedCollection) === String(collection.id)}
            isMultiSelected={multiSelectedIds.has(collection.id)}
            hasSelection={hasSelection}
            onSelect={handleSelect}
            onShiftSelect={handleShiftSelect}
            bookmarkPreviews={getBookmarkPreviews(collection.id)}
          />
        ))}
      </div>

      {/* Bookmarks Grid - shown when a folder is selected */}
      {hasSelection && (
        <div className={cn(
          "sides-selected-view relative",
          showBookmarks && "sides-selected-view--visible"
        )}>
          {/* Bookmark Cards - masonry grid */}
          {collectionBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="w-16 h-16 text-gruvbox-fg-muted/30 mb-4" />
              <p className="text-gruvbox-fg-muted text-lg">No bookmarks in this side yet</p>
              <p className="text-sm text-gruvbox-fg-muted/60 mt-2">
                Add bookmarks using the three-dot menu on any card in the Lounge
              </p>
            </div>
          ) : (
            <div className="w-full columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 [column-gap:1rem] pb-12">
              {collectionBookmarks.map((bookmark, index) => (
                <div
                  key={bookmark.id}
                  className="sides-combined-bookmark break-inside-avoid"
                  style={{ '--bookmark-index': index }}
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
                </div>
              ))}
            </div>
          )}

          {/* File count - bottom right */}
          <div className="fixed bottom-6 right-6 px-4 py-2 rounded-xl bg-gruvbox-bg-dark/80 backdrop-blur-sm border border-gruvbox-bg-light/30 text-gruvbox-fg-muted text-sm">
            {collectionBookmarks.length} {collectionBookmarks.length === 1 ? 'file' : 'files'}
          </div>
        </div>
      )}

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
