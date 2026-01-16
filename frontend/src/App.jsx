import React, { useState, useEffect, useRef } from 'react'
import { LayoutGroup } from 'framer-motion'
import Masonry from 'react-masonry-css'
import AppShell from '@/components/AppShell'
import Header from '@/components/Header'
import BookmarkCard from '@/components/BookmarkCard'
import BookmarkDetail from '@/components/BookmarkDetail'
import BookmarkPopup from '@/components/BookmarkPopup'
import SelectionToolbar from '@/components/SelectionToolbar'
import CollectionModal from '@/components/CollectionModal'
import CollectionBar from '@/components/CollectionBar'
import SidesGallery from '@/components/SidesGallery'
import FolderTabs from '@/components/FolderTabs'
import FerrisWheelLoader from '@/components/FerrisWheelLoader'
import QuickNoteModal from '@/components/QuickNoteModal'
import NoteEditorModal from '@/components/NoteEditorModal'
import NoteModule from '@/components/NoteModule'
import SettingsPage from '@/components/SettingsPage'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useCollections } from '@/hooks/useCollections'
import { getTagColors, getTagColor } from '@/utils/tagColors';
import { TagPill } from '@/components/TagColorPicker';
import { extractTagsFromContent } from '@/utils/tagExtraction';
import { parseSearchQuery, matchesSearchFilters } from '@/utils/searchParser';
import { Plus, FileText, File, Tag, X } from 'lucide-react'
import AddDropzoneCard from '@/components/AddDropzoneCard'
import { InlineNoteComposer } from '@/components/NoteComposer'
import ImageDropZone from '@/components/ImageDropZone'
import AuthModal from '@/components/AuthModal'
import UpdatePasswordModal from '@/components/UpdatePasswordModal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { toDbBookmarkPatch } from '@/lib/bookmarkMapper'

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
  const { bookmarks, loading, error, refetch, updateBookmark, removeBookmark, createImageBookmark, deleteBookmark } = useBookmarks();
  const { collections, createCollection, addToCollection, deleteCollection, updateCollection, refetch: refetchCollections } = useCollections();
  const [selectedBookmark, setSelectedBookmark] = useState(null);
  const [autoPlayOnOpen, setAutoPlayOnOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState(false);
  const [isPasswordRecoveryFlow, setIsPasswordRecoveryFlow] = useState(false); // Track if this is from email reset vs manual change
  const { user, signOut } = useAuth();

  // Detect PASSWORD_RECOVERY event from Supabase (user clicked reset link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User arrived via password reset link - show update password modal
        // Don't require current password since they verified via email
        setIsPasswordRecoveryFlow(true);
        setShowUpdatePasswordModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize state from URL
  const initialState = getInitialStateFromURL();
  const [activeTags, setActiveTags] = useState(initialState.tags);
  const [activeCollection, setActiveCollection] = useState(initialState.collection);
  const [mainTab, setMainTab] = useState(initialState.tab);

  // Tag refresh trigger - increment to refetch tags when bookmarks change
  const [tagRefreshTrigger, setTagRefreshTrigger] = useState(0);

  // Helper to refresh bookmarks and tags together
  const refreshBookmarksAndTags = () => {
    refetch();
    setTagRefreshTrigger(prev => prev + 1);
  };

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
  const lastClickedIndexRef = useRef(null); // For shift+click range selection
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [singleBookmarkToAdd, setSingleBookmarkToAdd] = useState(null); // For adding single bookmark via menu
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null); // For expanded note editor modal
  const [showNoteModule, setShowNoteModule] = useState(false); // New Lexical note module
  const [noteModuleData, setNoteModuleData] = useState(null); // For editing existing notes in the module

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if typing in an input, textarea, or contenteditable
      const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) ||
                       document.activeElement?.isContentEditable;

      // Escape to exit selection mode or close modals
      if (e.key === 'Escape') {
        if (selectionMode) {
          setSelectionMode(false);
          setSelectedIds(new Set());
          return;
        }
        if (selectedBookmark) {
          setSelectedBookmark(null);
          setAutoPlayOnOpen(false);
          return;
        }
        if (noteToEdit) {
          setNoteToEdit(null);
          return;
        }
      }

      // N to create new note (when not typing)
      if (e.key === 'n' && !isTyping && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setNoteModuleData(null); // New note
        setShowNoteModule(true);
        return;
      }

      // Enter to focus search (when not typing and no modifiers)
      if (e.key === 'Enter' && !isTyping && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        // Focus the search input
        const searchInput = document.querySelector('input[aria-label="Search filters"]');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionMode, selectedBookmark, noteToEdit]);

  // Power Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState([]);
  const [mediaFilter, setMediaFilter] = useState(null); // Sidebar filter: 'video' | 'image' | 'note' | 'tweet' | 'article' | null
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
    lastClickedIndexRef.current = null;
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} bookmark(s)?`)) return;

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;
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

  // Bulk add tag to selected bookmarks
  const handleBulkAddTag = async (tag) => {
    if (selectedIds.size === 0 || !tag.trim()) return;
    const normalizedTag = tag.trim().toLowerCase();

    try {
      // Get current bookmarks to update their tags
      const { data: currentBookmarks, error: fetchError } = await supabase
        .from('bookmarks')
        .select('id, tags')
        .in('id', Array.from(selectedIds));

      if (fetchError) throw fetchError;

      // Update each bookmark with the new tag (avoiding duplicates)
      const updates = currentBookmarks.map(bm => ({
        id: bm.id,
        tags: [...new Set([...(bm.tags || []), normalizedTag])],
        updated_at: new Date().toISOString()
      }));

      // Perform batch upsert
      for (const update of updates) {
        const { error } = await supabase
          .from('bookmarks')
          .update({ tags: update.tags, updated_at: update.updated_at })
          .eq('id', update.id);
        if (error) throw error;
      }

      refetch();
      handleClearSelection();
    } catch (error) {
      console.error('Error bulk adding tag:', error);
    }
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

  const handleDeleteCollection = async (collectionId) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await deleteCollection(collectionId);
      if (activeCollection === collectionId) {
        setActiveCollection(null);
      }
      refreshBookmarksAndTags();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const handleUpdateCollection = async (collectionId, updates) => {
    try {
      await updateCollection(collectionId, updates);
      refetchCollections();
    } catch (error) {
      console.error('Error updating collection:', error);
    }
  };

  const handleDelete = async (bookmark) => {
    if (!confirm('Delete this bookmark?')) return;
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmark.id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  const handlePin = async (bookmark) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .update({ pinned: !bookmark.pinned })
        .eq('id', bookmark.id);

      if (error) throw error;
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
      const { error } = await supabase
        .from('bookmarks')
        .update(toDbBookmarkPatch(bookmark))
        .eq('id', bookmark.id);

      if (error) throw error;
      // No refetch needed - local state already updated
    } catch (error) {
      console.error('Error saving bookmark:', error);
      // On error, refetch to restore correct state
      refetch();
    }
  };

  // Save note from NoteModule (new Lexical editor)
  // Returns the saved note data (with ID for new notes)
  // Saves to DB silently - homepage only updates when modal closes
  const handleSaveNoteModule = async (noteData) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }
      if (!user) throw new Error('Not authenticated');

      let savedNote = null;

      if (noteData.id) {
        // Update existing note - save to DB only (no local state update)
        // Homepage will update when modal closes via refetch
        const dbPatch = {
          title: noteData.title,
          notes: noteData.notes,
          tags: noteData.tags,
          updated_at: new Date().toISOString(),
        };
        if (noteData.notesBlocks) dbPatch.notes_blocks = noteData.notesBlocks;

        const { data, error } = await supabase
          .from('bookmarks')
          .update(dbPatch)
          .eq('id', noteData.id)
          .select();

        if (error) {
          console.error('Supabase UPDATE error:', error.message, error.code, error.details);
          throw error;
        }
        savedNote = data?.[0] || { id: noteData.id };
      } else {
        // Create new note
        const newNote = {
          user_id: user.id,
          url: `note://${Date.now()}`,
          title: noteData.title || noteData.notes.split('\n')[0].substring(0, 100),
          notes: noteData.notes,
          tags: noteData.tags || [],
          type: 'note',
          created_at: new Date().toISOString(),
        };
        if (noteData.notesBlocks) newNote.notes_blocks = noteData.notesBlocks;

        const { data, error } = await supabase
          .from('bookmarks')
          .insert([newNote])
          .select();

        if (error) {
          console.error('Supabase INSERT error:', error.message, error.code, error.details);
          throw error;
        }
        savedNote = data?.[0];
      }

      // Return saved note data (important for new notes to get their ID)
      return savedNote;
    } catch (error) {
      console.error('Error saving note:', error?.message || error?.code || error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Note data that failed:', JSON.stringify(noteData, null, 2));
      throw error;
    }
  };

  // Delete note from NoteModule
  const handleDeleteNoteModule = async (noteId) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      refreshBookmarksAndTags();
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  };

  // Handle tag deletion from a bookmark card
  const handleTagDelete = async (bookmark, tagToDelete) => {
    // Get current tags (support both tags array and extracted tags from content)
    const currentTags = bookmark.tags || [];
    const noteContent = bookmark.notes || bookmark.content || '';

    // Remove the tag from the tags array
    const updatedTags = currentTags.filter(t => t.toLowerCase() !== tagToDelete.toLowerCase());

    // Also remove the hashtag from the content if present
    const updatedContent = noteContent.replace(
      new RegExp(`#${tagToDelete}\\b`, 'gi'),
      ''
    ).replace(/\s+/g, ' ').trim();

    const updatedBookmark = {
      ...bookmark,
      tags: updatedTags,
      notes: bookmark.notes !== undefined ? updatedContent : bookmark.notes,
      content: bookmark.content !== undefined ? updatedContent : bookmark.content,
    };

    // Use the same save pattern as handleSaveBookmark
    updateBookmark(updatedBookmark);

    try {
      const { error } = await supabase
        .from('bookmarks')
        .update(toDbBookmarkPatch(updatedBookmark))
        .eq('id', bookmark.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting tag:', error);
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000'}/api/bookmarks/${bookmark.id}/refresh`, {
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

  // Handle tag click - filter by single tag
  const handleTagClick = (tagName) => {
    const normalizedTag = tagName.toLowerCase();
    // If tag is already active, clear filter; otherwise set it as the only active tag
    if (activeTags.length === 1 && activeTags[0].toLowerCase() === normalizedTag) {
      setActiveTags([]);
      updateURL(mainTab, activeCollection, []);
    } else {
      setActiveTags([normalizedTag]);
      updateURL(mainTab, activeCollection, [normalizedTag]);
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
    const metadata = bookmark.metadata || {};
    const category = bookmark.category;
    const subCategory = bookmark.subCategory;

    // Note type
    if (bookmark.type === 'note' || url.startsWith('note://') || (!url && (bookmark.notes || bookmark.title))) {
      return 'note';
    }

    // Music - Spotify, Apple Music, SoundCloud, Bandcamp
    if (category === 'audio' ||
        url.includes('spotify.com') ||
        url.includes('music.apple.com') ||
        url.includes('soundcloud.com') ||
        url.includes('bandcamp.com')) {
      return 'music';
    }

    // Recipe - Cooking sites or recipe metadata (check BEFORE images)
    if (metadata?.contentType === 'recipe' ||
        metadata?.cookTime !== undefined ||
        metadata?.ingredients !== undefined ||
        category === 'recipe' ||
        subCategory === 'recipe' ||
        // Major recipe sites
        url.includes('allrecipes.com') ||
        url.includes('seriouseats.com') ||
        url.includes('epicurious.com') ||
        url.includes('food52.com') ||
        url.includes('bonappetit.com') ||
        url.includes('foodnetwork.com') ||
        url.includes('tasty.co') ||
        url.includes('delish.com') ||
        url.includes('simplyrecipes.com') ||
        url.includes('cookinglight.com') ||
        url.includes('eatingwell.com') ||
        url.includes('myrecipes.com') ||
        url.includes('thekitchn.com') ||
        url.includes('food.com') ||
        url.includes('yummly.com') ||
        url.includes('bbcgoodfood.com') ||
        url.includes('jamieoliver.com') ||
        url.includes('budgetbytes.com') ||
        url.includes('minimalistbaker.com') ||
        url.includes('halfbakedharvest.com') ||
        url.includes('skinnytaste.com') ||
        url.includes('pinchofyum.com') ||
        url.includes('sallysbakingaddiction.com') ||
        url.includes('kingarthurbaking.com') ||
        url.includes('recipetineats.com') ||
        url.includes('gimmesomeoven.com') ||
        url.includes('damndelicious.net') ||
        url.includes('cafedelites.com') ||
        url.includes('smittenkitchen.com') ||
        url.includes('101cookbooks.com') ||
        url.includes('loveandlemons.com') ||
        url.includes('cookieandkate.com') ||
        url.includes('hostthetoast.com') ||
        // URL patterns that indicate recipes
        /\/recipes?\//.test(url) ||
        /\/cooking\//.test(url)) {
      return 'recipe';
    }

    // Book - Goodreads, Google Books
    if (subCategory === 'book' ||
        metadata?.contentType === 'book' ||
        url.includes('goodreads.com/book/') ||
        url.includes('books.google.com')) {
      return 'book';
    }

    // Product - Amazon, eBay, Etsy, shopping sites
    if (category === 'product' ||
        metadata?.contentType === 'product' ||
        metadata?.price !== undefined ||
        (url.includes('amazon.') && url.includes('/dp/')) ||
        (url.includes('ebay.') && url.includes('/itm/')) ||
        url.includes('etsy.com/listing/')) {
      return 'product';
    }

    // Social - Twitter/X
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'tweet';
    }

    // Video - YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }

    // Reddit
    if (url.includes('reddit.com') || url.includes('redd.it')) {
      return 'reddit';
    }

    // Wikipedia
    if (url.includes('wikipedia.org')) {
      return 'wikipedia';
    }

    // Images
    if (bookmark.type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
      return 'image';
    }

    return 'article';
  };

  // Calculate media counts for Sidebar - dynamic categories
  const mediaCounts = React.useMemo(() => {
    const counts = {
      video: 0,
      image: 0,
      note: 0,
      tweet: 0,
      article: 0,
      music: 0,
      recipe: 0,
      book: 0,
      product: 0
    };
    bookmarks.forEach(b => {
      const type = getBookmarkType(b);
      if (type === 'youtube') counts.video++;
      else if (type === 'image') counts.image++;
      else if (type === 'note') counts.note++;
      else if (type === 'tweet') counts.tweet++;
      else if (type === 'music') counts.music++;
      else if (type === 'recipe') counts.recipe++;
      else if (type === 'book') counts.book++;
      else if (type === 'product') counts.product++;
      else if (type === 'article' || type === 'reddit' || type === 'wikipedia') counts.article++;
    });
    return counts;
  }, [bookmarks]);

  // Filter bookmarks based on current view + power search
  const filteredBookmarks = (() => {
    let filtered = bookmarks;

    // Only filter by collection when on collections tab AND a collection is selected
    if (mainTab === 'collections' && activeCollection) {
      filtered = filtered.filter(b => b.collectionId === activeCollection);
    }

    // Filter by tags - bookmark must have ALL selected tags (AND logic)
    // Also check for tags extracted from note content
    if (activeTags.length > 0) {
      filtered = filtered.filter(b => {
        // Get tags from bookmark.tags array
        const bookmarkTags = (b.tags || []).map(t => t.toLowerCase());
        // Extract tags from note content
        const noteContent = b.notes || b.content || '';
        const extractedTags = extractTagsFromContent(noteContent);
        // Combine both sources
        const allBookmarkTags = [...new Set([...bookmarkTags, ...extractedTags])];
        // Check if bookmark has all active tags
        return activeTags.every(tag => allBookmarkTags.includes(tag.toLowerCase()));
      });
    }

    // Filter by type (old Power Search)
    if (activeTypes.length > 0) {
      filtered = filtered.filter(b => activeTypes.includes(getBookmarkType(b)));
    }

    // Filter by Sidebar media filter
    if (mediaFilter) {
      filtered = filtered.filter(b => {
        const type = getBookmarkType(b);
        if (mediaFilter === 'video') return type === 'youtube';
        if (mediaFilter === 'article') return type === 'article' || type === 'reddit' || type === 'wikipedia';
        return type === mediaFilter;
      });
    }

    // Filter by search collections (from power search)
    if (activeSearchCollections.length > 0) {
      filtered = filtered.filter(b => activeSearchCollections.includes(b.collectionId));
    }

    // Advanced search query parsing
    if (searchQuery.trim()) {
      const parsedFilters = parseSearchQuery(searchQuery);

      // Apply parsed filters using the advanced search matcher
      filtered = filtered.filter(b => matchesSearchFilters(b, parsedFilters, getBookmarkType));

      // Also apply any types from the parser to activeTypes if not already set
      if (parsedFilters.types.length > 0 && activeTypes.length === 0) {
        // Types are already handled in matchesSearchFilters
      }

      // Apply tags from search query to tag filtering
      if (parsedFilters.tags.length > 0) {
        filtered = filtered.filter(b => {
          const bookmarkTags = (b.tags || []).map(t => t.toLowerCase());
          const noteContent = b.notes || b.content || '';
          const extractedTags = extractTagsFromContent(noteContent);
          const allBookmarkTags = [...new Set([...bookmarkTags, ...extractedTags])];
          return parsedFilters.tags.every(tag => allBookmarkTags.includes(tag));
        });
      }
    }

    // Filter by date preset (external dateFilter state)
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
    <AppShell
      activePage={mainTab}
      onNavigate={handleTabChange}
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
      onAddNew={() => {
        setNoteModuleData(null);
        setShowNoteModule(true);
      }}
      onOpenSettings={() => setShowSettings(true)}
      onSignOut={signOut}
      onSignIn={() => setShowAuthModal(true)}
      mediaCounts={mediaCounts}
      activeFilter={mediaFilter}
      onFilterChange={setMediaFilter}
      // MindSearch props
      activeFilters={activeTypes}
      onTypeFilterChange={setActiveTypes}
      activeTags={activeTags}
      onTagFilterChange={setActiveTags}
      tagRefreshTrigger={tagRefreshTrigger}
    >
      <ImageDropZone onImageDrop={createImageBookmark} disabled={!user}>
        <LayoutGroup>
          {/* Selection Toolbar */}
        {selectionMode && selectedIds.size > 0 && (
          <SelectionToolbar
            selectedCount={selectedIds.size}
            totalCount={sortedBookmarks.length}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onDelete={handleBulkDelete}
            onAddToCollection={handleAddToCollection}
            onAddTag={handleBulkAddTag}
          />
        )}

        {/* Folder Tabs Navigation */}
        <div className="px-3">
          <FolderTabs
            tabs={mainTabs}
            activeTab={mainTab}
            onTabChange={handleTabChange}
            activeFilters={activeTypes}
            bookmarks={bookmarks}
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

                {/* Masonry Grid - horizontal flow with masonry effect */}
                <Masonry
                  breakpointCols={{
                    default: 5,
                    1536: 5,
                    1280: 4,
                    1024: 3,
                    640: 2,
                    480: 1
                  }}
                  className="flex w-full -ml-5"
                  columnClassName="pl-5 bg-clip-padding"
                >
                  {/* Inline Note Composer - use visibility:hidden in selection mode to keep space and prevent layout shift */}
                  <div className={selectionMode ? 'invisible' : ''}>
                    <InlineNoteComposer
                      onNoteCreated={(savedNote) => {
                        // Refresh bookmarks and tags to show the new note
                        refreshBookmarksAndTags();
                      }}
                    />
                  </div>

                  {/* Bookmarks */}
                  {loading ? (
                    <div className="col-span-full flex items-center justify-center animate-in fade-in duration-300" style={{ minHeight: '50vh' }}>
                      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
                        <FerrisWheelLoader label="Loading Bookmarks" subtitle="GATHERING YOUR COLLECTION" size="md" />
                      </div>
                    </div>
                  ) : (
                    sortedBookmarks.map((bookmark, index) => (
                      <div
                        key={bookmark.id}
                        onMouseDown={(e) => {
                          // Prevent text selection when Shift is held
                          if (e.shiftKey) {
                            e.preventDefault();
                          }
                        }}
                        onClick={(e) => {
                          // Shift+Click to toggle single card selection
                          if (e.shiftKey) {
                            e.preventDefault();
                            if (!selectionMode) {
                              // Enter selection mode and select this card
                              setSelectionMode(true);
                              setSelectedIds(new Set([bookmark.id]));
                            } else {
                              // Toggle this card's selection
                              setSelectedIds(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(bookmark.id)) {
                                  newSet.delete(bookmark.id);
                                } else {
                                  newSet.add(bookmark.id);
                                }
                                return newSet;
                              });
                            }
                            return;
                          }
                          // Normal click: open popup (unless in selection mode)
                          if (!selectionMode) {
                            setSelectedBookmark(bookmark);
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
                          onToggleSelect={() => {
                            handleToggleSelect(bookmark.id);
                            lastClickedIndexRef.current = index;
                          }}
                          collection={collections.find(c => c.id === bookmark.collectionId)}
                          onCardClick={(bm, autoPlay) => { setSelectedBookmark(bm); setAutoPlayOnOpen(autoPlay || false); }}
                          onOpenEditor={(bm) => {
                            setNoteModuleData(bm);
                            setShowNoteModule(true);
                          }}
                          onTagClick={handleTagClick}
                          onTagDelete={handleTagDelete}
                        />
                      </div>
                    ))
                  )}
                </Masonry>
              </div>
            )}

            {/* Collections Tab Content */}
            {mainTab === 'collections' && (
              <SidesGallery
                collections={enrichedCollections}
                bookmarks={bookmarks}
                selectedCollection={activeCollection}
                onSelectCollection={setActiveCollection}
                onBackToFolders={handleBackToFolders}
                onCreateCollection={() => setShowCollectionModal(true)}
                onUpdateCollection={handleUpdateCollection}
                onDeleteCollection={handleDeleteCollection}
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
      </ImageDropZone>

      {/* New Modern Popup */}
      <BookmarkPopup
        bookmark={selectedBookmark}
        isOpen={!!selectedBookmark}
        onClose={() => {
          setSelectedBookmark(null);
          setAutoPlayOnOpen(false);
        }}
        onDelete={(bm) => {
          handleDelete(bm);
          setSelectedBookmark(null);
        }}
        onPin={handlePin}
        onTagClick={handleTagClick}
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

      {/* Quick Note Modal (legacy) */}
      <QuickNoteModal
        open={showQuickNoteModal}
        onClose={() => setShowQuickNoteModal(false)}
        onSave={() => {
          refreshBookmarksAndTags();
          setShowQuickNoteModal(false);
        }}
        allTags={allTags}
      />

      {/* New Note Module - Lexical Editor */}
      <NoteModule
        isOpen={showNoteModule}
        onClose={() => {
          setShowNoteModule(false);
          setNoteModuleData(null);
          // Refresh bookmarks to show final changes from the note editor
          refetch();
        }}
        onSave={handleSaveNoteModule}
        onDelete={handleDeleteNoteModule}
        initialNote={noteModuleData}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <UpdatePasswordModal
        isOpen={showUpdatePasswordModal}
        onClose={() => {
          setShowUpdatePasswordModal(false);
          setIsPasswordRecoveryFlow(false);
        }}
        onSuccess={() => {
          // Clear URL hash after successful password update
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsPasswordRecoveryFlow(false);
        }}
        requireCurrentPassword={!isPasswordRecoveryFlow}
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
        availableTags={allTags}
      />

    </AppShell >
  );
}

export default App
