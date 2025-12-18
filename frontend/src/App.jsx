import React, { useState } from 'react'
import Header from '@/components/Header'
import BookmarkCard from '@/components/BookmarkCard'
import BookmarkDetail from '@/components/BookmarkDetail'
import SelectionToolbar from '@/components/SelectionToolbar'
import CollectionModal from '@/components/CollectionModal'
import CollectionBar from '@/components/CollectionBar'
import CollectionCards from '@/components/CollectionCards'
import FolderTabs from '@/components/FolderTabs'
import FerrisWheelLoader from '@/components/FerrisWheelLoader'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useCollections } from '@/hooks/useCollections'
import { getTagColors } from '@/utils/tagColors'
import { Plus, FileText, File, Tag, X } from 'lucide-react'

const AddCard = ({ onAddNote, onAddFile }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="break-inside-avoid mb-6">
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="bg-vintage-navy-dark rounded-xl border border-amber-900/30 h-32 flex items-center justify-center cursor-pointer group transition-all duration-300 hover:border-amber-500/50 hover:bg-vintage-navy-light"
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center transition-all duration-300 group-hover:border-amber-400 group-hover:scale-110">
            <Plus className="w-6 h-6 text-amber-500/50 transition-all duration-300 group-hover:text-amber-400 group-hover:rotate-90" />
          </div>
        </div>

        {/* Popup Menu */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-vintage-navy-light/95 backdrop-blur-md border border-amber-900/40 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                <button
                  onClick={() => {
                    onAddNote?.();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-amber-100 hover:bg-vintage-navy transition-colors"
                >
                  <FileText className="w-4 h-4 text-amber-500/60" />
                  <span>Add a new note</span>
                </button>
                <div className="h-px bg-amber-900/30 mx-3" />
                <button
                  onClick={() => {
                    onAddFile?.();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-amber-100 hover:bg-vintage-navy transition-colors"
                >
                  <File className="w-4 h-4 text-amber-500/60" />
                  <span>Add a file</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function App() {
  const { bookmarks, loading, error, refetch } = useBookmarks();
  const { collections, createCollection, addToCollection, refetch: refetchCollections } = useCollections();
  const [selectedBookmark, setSelectedBookmark] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const [activeTags, setActiveTags] = useState([]); // Array for multiple tag filtering
  const [activeCollection, setActiveCollection] = useState(null);
  const [mainTab, setMainTab] = useState('lounge'); // Folder tabs: 'lounge' or 'collections'

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [singleBookmarkToAdd, setSingleBookmarkToAdd] = useState(null); // For adding single bookmark via menu

  // Extract unique tags from bookmarks
  const allTags = [...new Set(bookmarks.flatMap(b => b.tags || []))];

  const handleNavigate = (page, tag = null, collectionId = null) => {
    setActivePage(page);
    // If tag is provided, toggle it in the activeTags array
    if (tag) {
      setActiveTags(prev => {
        if (prev.includes(tag)) {
          return prev.filter(t => t !== tag);
        }
        return [...prev, tag];
      });
    } else {
      setActiveTags([]);
    }
    setActiveCollection(collectionId);
    // Clear selection when navigating
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Remove a specific tag from the filter
  const handleRemoveTag = (tagToRemove) => {
    setActiveTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // Clear all tag filters
  const handleClearAllTags = () => {
    setActiveTags([]);
  };

  // Selection handlers
  const handleToggleSelect = (bookmarkId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookmarkId)) {
        newSet.delete(bookmarkId);
      } else {
        newSet.add(bookmarkId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(sortedBookmarks.map(b => b.id));
    setSelectedIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} bookmark(s)?`)) return;

    try {
      await fetch('http://127.0.0.1:3000/api/bookmarks/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      refetch();
      handleClearSelection();
    } catch (error) {
      console.error('Error bulk deleting bookmarks:', error);
    }
  };

  const handleAddToCollection = () => {
    if (selectedIds.size === 0) return;
    setShowCollectionModal(true);
  };

  const handleCollectionSelect = async (collectionId) => {
    // Get bookmark IDs to add - either from bulk selection or single bookmark
    const bookmarkIds = singleBookmarkToAdd
      ? [singleBookmarkToAdd.id]
      : Array.from(selectedIds);

    if (bookmarkIds.length === 0) return;

    try {
      await addToCollection(collectionId, bookmarkIds);
      refetch();
      if (!singleBookmarkToAdd) {
        handleClearSelection();
      }
      setSingleBookmarkToAdd(null);
      setShowCollectionModal(false);
    } catch (error) {
      console.error('Error adding to collection:', error);
    }
  };

  const handleCreateCollection = async (name, color) => {
    try {
      const newCollection = await createCollection(name, color);

      // Get bookmark IDs to add - either from bulk selection or single bookmark
      const bookmarkIds = singleBookmarkToAdd
        ? [singleBookmarkToAdd.id]
        : Array.from(selectedIds);

      if (bookmarkIds.length > 0) {
        await addToCollection(newCollection.id, bookmarkIds);
        refetch();
        if (!singleBookmarkToAdd) {
          handleClearSelection();
        }
      }

      setSingleBookmarkToAdd(null);
      refetchCollections();
      setShowCollectionModal(false);
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const handleDelete = async (bookmark) => {
    if (!confirm('Delete this bookmark?')) return;
    try {
      await fetch(`http://127.0.0.1:3000/api/bookmarks/${bookmark.id}`, {
        method: 'DELETE'
      });
      refetch();
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  const handlePin = async (bookmark) => {
    try {
      await fetch(`http://127.0.0.1:3000/api/bookmarks/${bookmark.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookmark, pinned: !bookmark.pinned })
      });
      refetch();
    } catch (error) {
      console.error('Error pinning bookmark:', error);
    }
  };

  const handleCreateSide = (bookmark) => {
    // Open the collection modal for this single bookmark
    setSingleBookmarkToAdd(bookmark);
    setShowCollectionModal(true);
  };

  const handleRefreshBookmark = async (bookmark) => {
    try {
      const response = await fetch(`http://127.0.0.1:3000/api/bookmarks/${bookmark.id}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // Trigger refetch of all bookmarks
        refetch();
        return await response.json();
      }
    } catch (error) {
      console.error('Error refreshing bookmark:', error);
    }
  };

  // Enrich collections with bookmark counts
  const enrichedCollections = collections.map(collection => ({
    ...collection,
    bookmarkCount: bookmarks.filter(b => b.collectionId === collection.id).length
  }));

  // Filter by collection and/or tags
  const filteredBookmarks = (() => {
    let filtered = bookmarks;

    // Filter by collection if viewing a collection
    if (activeCollection) {
      filtered = filtered.filter(b => b.collectionId === activeCollection);
    }

    // Filter by tags - bookmark must have ALL selected tags (AND logic)
    if (activeTags.length > 0) {
      filtered = filtered.filter(b =>
        activeTags.every(tag => b.tags?.includes(tag))
      );
    }

    return filtered;
  })();

  // Sort bookmarks: pinned first, then by date
  const sortedBookmarks = [...filteredBookmarks].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt - a.createdAt;
  });

  // Main folder tabs for page navigation (Lounge, Sides)
  const mainTabs = [
    { id: 'lounge', label: 'Lounge' },
    { id: 'collections', label: 'Sides' },
  ];

  return (
    <div className="min-h-screen gruvbox-mesh-bg text-gruvbox-fg flex relative overflow-x-hidden">
      <main className="flex-1 min-h-screen relative overflow-x-hidden">
        <Header
          activePage={activePage}
          onNavigate={handleNavigate}
          tags={allTags.length > 0 ? allTags : ['Technology', 'Design', 'Articles', 'Videos', 'Social', 'Research']}
          collections={enrichedCollections}
          activeCollection={activeCollection}
          activeTags={activeTags}
          selectionMode={selectionMode}
          onToggleSelectionMode={() => {
            setSelectionMode(!selectionMode);
            if (selectionMode) setSelectedIds(new Set());
          }}
        />

        {/* Selection Toolbar */}
        {selectionMode && selectedIds.size > 0 && (
          <SelectionToolbar
            selectedCount={selectedIds.size}
            totalCount={sortedBookmarks.length}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onDelete={handleBulkDelete}
            onAddToCollection={handleAddToCollection}
          />
        )}

        {/* Folder Tabs Navigation */}
        <div className="px-2 pt-1">
          <FolderTabs
            tabs={mainTabs}
            activeTab={mainTab}
            onTabChange={setMainTab}
          >
            {/* Lounge Tab Content - All Bookmarks */}
            {mainTab === 'lounge' && (
              <div>
                {/* Active Filter Indicator - matches nav bar tag style, supports multiple tags */}
                {activeTags.length > 0 && (() => {
                  const tagColors = getTagColors(activeTags);
                  return (
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                      {activeTags.map((tag, idx) => {
                        const color = tagColors[idx];
                        return (
                          <button
                            key={tag}
                            onClick={() => handleRemoveTag(tag)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] group"
                            style={{
                              backgroundColor: color.bg,
                              color: color.text,
                              borderColor: color.border,
                            }}
                          >
                            <Tag className="w-3.5 h-3.5 opacity-80" />
                            <span>{tag}</span>
                            <X className="w-3.5 h-3.5 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                      <span className="text-sm text-gruvbox-fg-muted ml-1">
                        {sortedBookmarks.length} bookmark{sortedBookmarks.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })()}

                {/* Masonry Grid */}
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 space-y-4">
                  {/* Add Card - hide in selection mode */}
                  {!selectionMode && (
                    <AddCard
                      onAddNote={() => console.log('Add note')}
                      onAddFile={() => console.log('Add file')}
                    />
                  )}

                  {/* Bookmarks */}
                  {loading ? (
                    <div className="col-span-full flex items-center justify-center" style={{ minHeight: '50vh' }}>
                      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
                        <FerrisWheelLoader label="Loading Bookmarks" subtitle="GATHERING YOUR COLLECTION" />
                      </div>
                    </div>
                  ) : (
                    sortedBookmarks.map(bookmark => (
                      <div
                        key={bookmark.id}
                        onClick={() => {
                          if (selectionMode) {
                            handleToggleSelect(bookmark.id);
                          } else {
                            setSelectedBookmark(bookmark);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <BookmarkCard
                          bookmark={bookmark}
                          onDelete={handleDelete}
                          onPin={handlePin}
                          onCreateSide={handleCreateSide}
                          onRefresh={handleRefreshBookmark}
                          selectionMode={selectionMode}
                          isSelected={selectedIds.has(bookmark.id)}
                          onToggleSelect={() => handleToggleSelect(bookmark.id)}
                          collection={collections.find(c => c.id === bookmark.collectionId)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Collections Tab Content */}
            {mainTab === 'collections' && (
              <CollectionCards
                collections={enrichedCollections}
                bookmarks={bookmarks}
                selectedCollection={activeCollection}
                onSelectCollection={setActiveCollection}
                onCreateCollection={() => setShowCollectionModal(true)}
                onBookmarkClick={setSelectedBookmark}
                onDeleteBookmark={handleDelete}
                onPinBookmark={handlePin}
                onRefreshBookmark={handleRefreshBookmark}
                onCreateSide={handleCreateSide}
              />
            )}
          </FolderTabs>
        </div>

        <BookmarkDetail
          bookmark={selectedBookmark}
          open={!!selectedBookmark}
          onOpenChange={(open) => !open && setSelectedBookmark(null)}
          onSave={() => refetch()}
        />

        {/* Collection Modal */}
        <CollectionModal
          open={showCollectionModal}
          onOpenChange={(open) => {
            setShowCollectionModal(open);
            if (!open) setSingleBookmarkToAdd(null);
          }}
          collections={collections}
          onSelectCollection={handleCollectionSelect}
          onCreateCollection={handleCreateCollection}
        />
      </main>
    </div>
  )
}

export default App
