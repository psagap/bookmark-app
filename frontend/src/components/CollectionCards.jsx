import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FolderOpen, Plus, ArrowLeft } from 'lucide-react';
import BookmarkCard from './BookmarkCard';

/**
 * CollectionCards Component
 * Displays sides (collections) as visual cards with "Pick a Movie" style animation
 * When a side is selected, others collapse away, a divider appears, and bookmarks show below
 */

// Placeholder images for side covers
const PLACEHOLDER_COVERS = [
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=600&fit=crop',
];

const SideCard = ({
  collection,
  index,
  totalCount,
  isSelected,
  selectedIndex,
  hasSelection,
  onSelect,
  bookmarkPreviews = [],
}) => {
  const [currentPreview, setCurrentPreview] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Calculate stagger delay based on position relative to selected card
  // Matches "Pick a Movie" animation: n * 0.2s delay
  const getStaggerIndex = () => {
    if (!hasSelection || isSelected) return 0;

    if (selectedIndex === -1) return index + 1;

    // Cards AFTER selected: --n = totalCount - index + 1 (furthest animates first)
    if (index > selectedIndex) {
      return totalCount - index + 1;
    }
    // Cards BEFORE selected: --n = index + 1 (starts from beginning)
    return index + 1;
  };

  // Slide through bookmark previews on hover
  useEffect(() => {
    if (!isHovering || bookmarkPreviews.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPreview((prev) => (prev + 1) % bookmarkPreviews.length);
    }, 800);
    return () => clearInterval(interval);
  }, [isHovering, bookmarkPreviews.length]);

  // Reset preview when not hovering
  useEffect(() => {
    if (!isHovering) setCurrentPreview(0);
  }, [isHovering]);

  const coverImage = bookmarkPreviews[currentPreview]?.thumbnail ||
    PLACEHOLDER_COVERS[index % PLACEHOLDER_COVERS.length];

  return (
    <div
      className={cn(
        "side-card",
        hasSelection && !isSelected && "side-card--hidden",
        isSelected && "side-card--selected"
      )}
      style={{
        '--n': getStaggerIndex(),
        '--card-color': collection.color,
        '--card-index': index,
      }}
      onClick={() => onSelect(isSelected ? null : collection.id)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Card Container */}
      <div className="side-card-inner">
        {/* Background Image */}
        <div className="absolute inset-0">
          {bookmarkPreviews.length > 0 ? (
            <div className="relative w-full h-full">
              {bookmarkPreviews.map((preview, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    idx === currentPreview ? "opacity-100" : "opacity-0"
                  )}
                >
                  <img
                    src={preview.thumbnail || PLACEHOLDER_COVERS[idx % PLACEHOLDER_COVERS.length]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: `${collection.color}30` }}
            >
              <FolderOpen
                className="w-12 h-12 opacity-40"
                style={{ color: collection.color }}
              />
            </div>
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Hover Glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 30px ${collection.color}40, 0 0 40px ${collection.color}30`,
          }}
        />

        {/* Preview Dots */}
        {isHovering && bookmarkPreviews.length > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {bookmarkPreviews.slice(0, 5).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-200",
                  idx === currentPreview ? "bg-white w-4" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Side Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div
            className="w-3 h-3 rounded-full mb-2"
            style={{ backgroundColor: collection.color }}
          />
          <h3 className="text-white font-semibold text-lg leading-tight mb-1">
            {collection.name}
          </h3>
          <p className="text-white/60 text-sm">
            {collection.bookmarkCount || 0} item{collection.bookmarkCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Hidden checkbox for accessibility */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(isSelected ? null : collection.id)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={`Select ${collection.name} side`}
        />
      </div>
    </div>
  );
};

const CollectionCards = ({
  collections = [],
  bookmarks = [],
  selectedCollection = null,
  onSelectCollection,
  onCreateCollection,
  onBookmarkClick,
  onDeleteBookmark,
  onPinBookmark,
  onRefreshBookmark,
  onCreateSide,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Get bookmark previews for each collection (for card covers)
  const getBookmarkPreviews = (collectionId) => {
    return bookmarks
      .filter(b => b.collectionId === collectionId && b.thumbnail)
      .slice(0, 5);
  };

  // Get all bookmarks for selected collection
  const getCollectionBookmarks = (collectionId) => {
    return bookmarks.filter(b => b.collectionId === collectionId);
  };

  const selectedIndex = collections.findIndex(c => c.id === selectedCollection);
  const hasSelection = selectedCollection !== null;
  const selectedSide = collections.find(c => c.id === selectedCollection);
  const collectionBookmarks = hasSelection ? getCollectionBookmarks(selectedCollection) : [];

  // Handle selection with animation timing
  const handleSelect = (id) => {
    if (id === selectedCollection) {
      // Deselecting - hide bookmarks first, then animate cards back
      setShowBookmarks(false);
      setIsAnimating(true);
      setTimeout(() => {
        onSelectCollection(null);
        setIsAnimating(false);
      }, 300);
    } else {
      // Selecting - animate cards out first, then show bookmarks after collapse completes
      setShowBookmarks(false);
      onSelectCollection(id);
      // Calculate max delay: max n value * 0.2s + 0.3s duration + small buffer
      const maxDelay = (collections.length) * 200 + 300 + 100;
      setTimeout(() => {
        setShowBookmarks(true);
      }, maxDelay);
    }
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

  return (
    <div className="sides-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gruvbox-fg">
          {hasSelection ? selectedSide?.name : 'Your Sides'}
        </h2>
        {hasSelection && (
          <button
            onClick={() => handleSelect(null)}
            className="flex items-center gap-2 text-sm text-gruvbox-fg-muted hover:text-gruvbox-yellow transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all sides
          </button>
        )}
      </div>

      {/* Side Cards Row */}
      <div className={cn(
        "sides-grid",
        hasSelection && "sides-grid--has-selection"
      )}>
        {collections.map((collection, index) => (
          <SideCard
            key={collection.id}
            collection={collection}
            index={index}
            totalCount={collections.length}
            isSelected={selectedCollection === collection.id}
            selectedIndex={selectedIndex}
            hasSelection={hasSelection}
            onSelect={handleSelect}
            bookmarkPreviews={getBookmarkPreviews(collection.id)}
          />
        ))}
      </div>

      {/* Divider Line - appears after collapse animation completes */}
      <div className={cn(
        "sides-divider",
        showBookmarks && "sides-divider--visible"
      )}>
        <div
          className="sides-divider-line"
          style={{ '--divider-color': selectedSide?.color || '#d79921' }}
        />
      </div>

      {/* Bookmarks Grid - appears below after collapse animation */}
      <div className={cn(
        "sides-bookmarks",
        showBookmarks && "sides-bookmarks--visible"
      )}>
        {collectionBookmarks.length === 0 && hasSelection ? (
          <div className="text-center py-12">
            <p className="text-gruvbox-fg-muted">No bookmarks in this side yet</p>
            <p className="text-sm text-gruvbox-fg-muted/60 mt-1">
              Add bookmarks using the three-dot menu on any card
            </p>
          </div>
        ) : (
          <div className="sides-bookmarks-grid">
            {collectionBookmarks.map((bookmark, index) => (
              <div
                key={bookmark.id}
                className="sides-bookmark-item"
                style={{ '--bookmark-index': index }}
                onClick={() => onBookmarkClick?.(bookmark)}
              >
                <BookmarkCard
                  bookmark={bookmark}
                  onDelete={onDeleteBookmark}
                  onPin={onPinBookmark}
                  onCreateSide={onCreateSide}
                  onRefresh={onRefreshBookmark}
                  collection={selectedSide}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionCards;
