import React, { useState, useEffect } from 'react'
import { LayoutGroup } from 'framer-motion'
import Header from '@/components/Header'
import BookmarkCard from '@/components/BookmarkCard'
import BookmarkDetail from '@/components/BookmarkDetail'
import SelectionToolbar from '@/components/SelectionToolbar'
import CollectionModal from '@/components/CollectionModal'
import CollectionBar from '@/components/CollectionBar'
import CollectionCards from '@/components/CollectionCards'
import FolderTabs from '@/components/FolderTabs'
import FerrisWheelLoader from '@/components/FerrisWheelLoader'
import QuickNoteModal from '@/components/QuickNoteModal'
import NoteEditorModal from '@/components/NoteEditorModal'
import SettingsPage from '@/components/SettingsPage'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useCollections } from '@/hooks/useCollections'
import { getTagColors, getTagColor } from '@/utils/tagColors';
import { TagPill } from '@/components/TagColorPicker';
import { Plus, FileText, File, Tag, X } from 'lucide-react'
import AddDropzoneCard from '@/components/AddDropzoneCard'

const AddCard = ({ onAddNote, onAddFile }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="break-inside-avoid mb-4">
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

// Helper to read state from URL
const getInitialStateFromURL = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    tab: params.get('tab') || 'lounge',
    collection: params.get('collection') || null,
    tags: params.get('tags') ? params.get('tags').split(',') : [],
  };
};

// Helper to update URL without reload
const updateURL = (tab, collection, tags) => {
  const params = new URLSearchParams();
  if (tab && tab !== 'lounge') params.set('tab', tab);
  if (collection) params.set('collection', collection);
  if (tags && tags.length > 0) params.set('tags', tags.join(','));

  const newURL = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, '', newURL);
};

function App() {
  const { bookmarks, loading, error, refetch, updateBookmark, removeBookmark } = useBookmarks();
  const { collections, createCollection, addToCollection, refetch: refetchCollections } = useCollections();
  const [selectedBookmark, setSelectedBookmark] = useState(null);
  const [autoPlayOnOpen, setAutoPlayOnOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [showSettings, setShowSettings] = useState(false);

  // Initialize state from URL
  const initialState = getInitialStateFromURL();
  const [activeTags, setActiveTags] = useState(initialState.tags);
  const [activeCollection, setActiveCollection] = useState(initialState.collection);
  const [mainTab, setMainTab] = useState(initialState.tab);

  // Update URL when navigation state changes
  useEffect(() => {
    updateURL(mainTab, activeCollection, activeTags);
  }, [mainTab, activeCollection, activeTags]);

  // Handle tab changes - keep states independent
  const handleTabChange = (newTab) => {
    setMainTab(newTab);
    // Don't clear collection selection - user can go back to it
    // Clear selection mode when changing tabs
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Handle going back from a selected collection to folders view
  const handleBackToFolders = () => {
    setActiveCollection(null);
  };

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [singleBookmarkToAdd, setSingleBookmarkToAdd] = useState(null); // For adding single bookmark via menu
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null); // For expanded note editor modal

  // Keyboard shortcuts for selection mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to exit selection mode
      if (e.key === 'Escape' && selectionMode) {
        setSelectionMode(false);
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionMode]);

  // Power Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState([]);
  const [activeSearchCollections, setActiveSearchCollections] = useState([]);
  const [filterChain, setFilterChain] = useState([]); // Ordered filter chain for hierarchical filtering
  const [dateFilter, setDateFilter] = useState(null); // Date preset filter (today, week, month, etc.)

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

  // Save bookmark (for note cards)
  const handleSaveBookmark = async (bookmark) => {
    // Optimistic update - update local state immediately to preserve scroll position
    updateBookmark(bookmark);

    try {
      await fetch(`http://127.0.0.1:3000/api/bookmarks/${bookmark.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookmark)
      });
      // No refetch needed - local state already updated
    } catch (error) {
      console.error('Error saving bookmark:', error);
      // On error, refetch to restore correct state
      refetch();
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

  // Helper function to determine bookmark type
  const getBookmarkType = (bookmark) => {
    const url = bookmark.url || '';
    if (bookmark.type === 'note' || url.startsWith('note://') || (!url && (bookmark.notes || bookmark.title))) {
      return 'note';
    }
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'tweet';
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    // Check for images
    if (bookmark.type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
      return 'image';
    }
    return 'article';
  };

  // Filter bookmarks based on current view + power search
  const filteredBookmarks = (() => {
    let filtered = bookmarks;

    // Only filter by collection when on collections tab AND a collection is selected
    if (mainTab === 'collections' && activeCollection) {
      filtered = filtered.filter(b => b.collectionId === activeCollection);
    }

    // Filter by tags - bookmark must have ALL selected tags (AND logic)
    if (activeTags.length > 0) {
      filtered = filtered.filter(b =>
        activeTags.every(tag => b.tags?.includes(tag))
      );
    }

    // Power Search filters
    // Filter by type
    if (activeTypes.length > 0) {
      filtered = filtered.filter(b => activeTypes.includes(getBookmarkType(b)));
    }

    // Filter by search collections (from power search)
    if (activeSearchCollections.length > 0) {
      filtered = filtered.filter(b => activeSearchCollections.includes(b.collectionId));
    }

    // Filter by text search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(b => {
        const title = (b.title || '').toLowerCase();
        const notes = (b.notes || '').toLowerCase();
        const url = (b.url || '').toLowerCase();
        const tags = (b.tags || []).join(' ').toLowerCase();
        const description = (b.description || '').toLowerCase();
        return title.includes(query) ||
          notes.includes(query) ||
          url.includes(query) ||
          tags.includes(query) ||
          description.includes(query);
      });
    }

    // Filter by date preset
    if (dateFilter) {
      const presets = {
        today: 0,
        yesterday: 1,
        week: 7,
        month: 30,
        quarter: 90,
        year: 365,
      };
      const days = presets[dateFilter];
      if (days !== undefined) {
        const filterDate = new Date();
        if (days === 0) {
          filterDate.setHours(0, 0, 0, 0);
        } else {
          filterDate.setDate(filterDate.getDate() - days);
          filterDate.setHours(0, 0, 0, 0);
        }
        filtered = filtered.filter(b => {
          const itemDate = new Date(b.createdAt);
          return itemDate >= filterDate;
        });
      }
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

  // Show settings page if active
  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="min-h-screen gruvbox-mesh-bg text-gruvbox-fg flex relative overflow-x-hidden">
      <main className="flex-1 min-h-screen relative w-full max-w-full">
        <LayoutGroup>
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
          onQuickNote={() => setShowQuickNoteModal(true)}
          onAddUrl={() => console.log('Add URL - TODO: implement URL modal')}
          onOpenSettings={() => setShowSettings(true)}
          // Search props
          bookmarks={bookmarks}
          onResultSelect={(bookmark) => setSelectedBookmark(bookmark)}
          onFilterChange={(types) => setActiveTypes(types)}
          activeFilters={activeTypes}
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
        <div className="px-3">
          <FolderTabs
            tabs={mainTabs}
            activeTab={mainTab}
            onTabChange={handleTabChange}
            activeFilters={activeTypes}
            activePillsInSearch={activeTypes}
            onFilterToggle={(typeId) => {
              setActiveTypes(prev =>
                prev.includes(typeId)
                  ? prev.filter(t => t !== typeId)
                  : [...prev, typeId]
              );
            }}
          >
            {/* Lounge Tab Content - All Bookmarks */}
            {mainTab === 'lounge' && (
              <div>
                {/* Active Filter Indicator - matches nav bar tag style, supports multiple tags */}
                {activeTags.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    {activeTags.map((tag) => {
                      const color = getTagColor(tag);
                      return (
                        <div
                          key={tag}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] group cursor-pointer"
                          style={{
                            backgroundColor: color.bg,
                            color: color.text,
                            borderColor: color.border,
                          }}
                        >
                          <Tag className="w-3.5 h-3.5 opacity-80" />
                          <TagPill
                            tag={tag}
                            color={color}
                            size="default"
                            showColorPicker={true}
                            className="!bg-transparent !p-0 !rounded-none"
                          />
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 opacity-60 group-hover:opacity-100 transition-opacity hover:text-gruvbox-red"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <span className="text-sm text-gruvbox-fg-muted ml-1">
                      {sortedBookmarks.length} bookmark{sortedBookmarks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Masonry Grid */}
                <div className="w-full columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 [column-gap:1rem]">
                  {/* Add Dropzone Card - hide in selection mode */}
                  {!selectionMode && (
                    <AddDropzoneCard
                      onAddNote={() => setShowQuickNoteModal(true)}
                    />
                  )}

                  {/* Bookmarks */}
                  {loading ? (
                    <div className="col-span-full flex items-center justify-center animate-in fade-in duration-300" style={{ minHeight: '50vh' }}>
                      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
                        <FerrisWheelLoader label="Loading Bookmarks" subtitle="GATHERING YOUR COLLECTION" size="md" />
                      </div>
                    </div>
                  ) : (
                    sortedBookmarks.map(bookmark => (
                      <div
                        key={bookmark.id}
                        onClick={(e) => {
                          // Shift+Click to enter selection mode and select this card
                          if (e.shiftKey && !selectionMode) {
                            e.preventDefault();
                            setSelectionMode(true);
                            setSelectedIds(new Set([bookmark.id]));
                          } else if (selectionMode) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleSelect(bookmark.id);
                          } else {
                            setSelectedBookmark(bookmark);
                          }
                        }}
                        onMouseDown={(e) => {
                          // Prevent text selection when Shift is held
                          if (e.shiftKey) {
                            e.preventDefault();
                          }
                        }}
                        className={`cursor-pointer ${selectionMode ? 'select-none' : ''}`}
                      >
                        <BookmarkCard
                          bookmark={bookmark}
                          onDelete={handleDelete}
                          onPin={handlePin}
                          onCreateSide={handleCreateSide}
                          onRefresh={handleRefreshBookmark}
                          onUpdate={handleSaveBookmark}
                          selectionMode={selectionMode}
                          isSelected={selectedIds.has(bookmark.id)}
                          onToggleSelect={() => handleToggleSelect(bookmark.id)}
                          collection={collections.find(c => c.id === bookmark.collectionId)}
                          onCardClick={(bm, autoPlay) => { setSelectedBookmark(bm); setAutoPlayOnOpen(autoPlay || false); }}
                          onOpenEditor={(bm) => setNoteToEdit(bm)}
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
                onBackToFolders={handleBackToFolders}
                onCreateCollection={() => setShowCollectionModal(true)}
                onBookmarkClick={setSelectedBookmark}
                onDeleteBookmark={handleDelete}
                onPinBookmark={handlePin}
                onRefreshBookmark={handleRefreshBookmark}
                onSaveBookmark={handleSaveBookmark}
                onCreateSide={handleCreateSide}
              />
            )}
          </FolderTabs>
        </div>
        </LayoutGroup>

        <BookmarkDetail
          bookmark={selectedBookmark}
          open={!!selectedBookmark}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBookmark(null);
              setAutoPlayOnOpen(false);
            }
          }}
          onSave={() => refetch()}
          allTags={allTags}
          autoPlay={autoPlayOnOpen}
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

        {/* Quick Note Modal */}
        <QuickNoteModal
          open={showQuickNoteModal}
          onClose={() => setShowQuickNoteModal(false)}
          onSave={() => {
            refetch();
            setShowQuickNoteModal(false);
          }}
          allTags={allTags}
        />

        {/* Note Editor Modal - for expanded note editing */}
        <NoteEditorModal
          isOpen={!!noteToEdit}
          onClose={() => setNoteToEdit(null)}
          bookmark={noteToEdit}
          onSave={(updatedBookmark) => {
            handleSaveBookmark(updatedBookmark);
            setNoteToEdit(null);
          }}
          onDelete={(bm) => {
            handleDelete(bm);
            setNoteToEdit(null);
          }}
        />
      </main>
    </div>
  )
}

export default App
