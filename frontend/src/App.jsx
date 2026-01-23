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
import AudioNoteModule from '@/components/AudioNoteModule'
import AudioRecordingHero from '@/components/AudioRecordingHero'
import SettingsPage from '@/components/SettingsPage'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useCollections } from '@/hooks/useCollections'
import { getTagColor } from '@/utils/tagColors';
import { extractTagsFromContent } from '@/utils/tagExtraction';
import { parseSearchQuery, matchesSearchFilters } from '@/utils/searchParser';
import { Plus, FileText, File, X } from 'lucide-react'
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
  const { bookmarks, drafts, loading, error, refetch, updateBookmark, removeBookmark, createImageBookmark, deleteBookmark, saveDraft, deleteDraft, publishDraft } = useBookmarks();
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
  // clearFilter defaults to true for direct tab clicks, but can be false when called programmatically
  const handleTabChange = (newTab, clearFilter = true) => {
    setMainTab(newTab);
    // Don't clear collection selection - user can go back to it
    // Clear selection mode when changing tabs
    setSelectionMode(false);
    setSelectedIds(new Set());
    // Clear media filter when navigating to a main tab (MAL-21: Sidebar behavior fix)
    // But not when the navigation is triggered by setting a library filter
    if (clearFilter) {
      setMediaFilter(null);
    }
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
  const [showAudioNoteModule, setShowAudioNoteModule] = useState(false); // Audio recording modal
  const [audioNoteInitialData, setAudioNoteInitialData] = useState(null); // For resuming audio note drafts

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
        setNoteToEdit({ isNew: true, type: 'note', tags: [], notes: '', title: '', content: '' });
        return;
      }

      // A to create new audio note (when not typing)
      if (e.key === 'a' && !isTyping && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setAudioNoteInitialData(null);
        setShowAudioNoteModule(true);
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
    console.log('[DEBUG] handleSaveNoteModule called with:', {
      id: noteData?.id,
      title: noteData?.title,
      notesLength: noteData?.notes?.length,
      hasNotesHtml: !!noteData?.notesHtml,
      hasNotesBlocks: !!noteData?.notesBlocks,
      tags: noteData?.tags,
    });

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
        if (noteData.notesHtml) dbPatch.notes_html = noteData.notesHtml;

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
          title: noteData.title || (noteData.notes || '').split('\n')[0].substring(0, 100) || 'Untitled Note',
          notes: noteData.notes || '',
          tags: noteData.tags || [],
          type: 'note',
          created_at: new Date().toISOString(),
        };
        if (noteData.notesBlocks) newNote.notes_blocks = noteData.notesBlocks;
        if (noteData.notesHtml) newNote.notes_html = noteData.notesHtml;

        console.log('[DEBUG] Creating new note with:', JSON.stringify(newNote, null, 2));

        const { data, error } = await supabase
          .from('bookmarks')
          .insert([newNote])
          .select();

        if (error) {
          console.error('Supabase INSERT error:', error.message, error.code, error.details);
          console.error('Full error:', error);
          throw error;
        }
        savedNote = data?.[0];
      }

      // Return saved note data (important for new notes to get their ID)
      return savedNote;
    } catch (error) {
      console.error('Error saving note:', error?.message || error?.code || error);
      console.error('Full error object:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
      });
      throw error;
    }
  };

  // Save audio note from AudioNoteModule
  const handleSaveAudioNote = async (noteData) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/audio-notes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteData.polishedText.split('\n')[0].substring(0, 100) || 'Audio Note',
          rawTranscript: noteData.rawTranscript,
          polishedText: noteData.polishedText,
          tags: noteData.tags || [],
          userId: user.id,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to save audio note');

      // If this was converted from a draft, delete the draft
      if (noteData.draftId) {
        await deleteDraft(noteData.draftId);
      }

      refreshBookmarksAndTags();
      setAudioNoteInitialData(null); // Clear draft data

      // Open saved note in the side-panel editor
      setNoteToEdit(data.audioNote);

      return data.audioNote;
    } catch (error) {
      console.error('Error saving audio note:', error);
      throw error;
    }
  };

  // Save audio note as draft
  const handleSaveAudioDraft = async (draftData) => {
    try {
      await saveDraft(draftData);
      setAudioNoteInitialData(null); // Clear after saving
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    }
  };

  // Resume editing a draft
  const handleResumeDraft = (draft) => {
    setAudioNoteInitialData({
      polishedText: draft.notes,
      rawTranscript: draft.metadata?.rawTranscript || '',
      tags: draft.tags || [],
      draftId: draft.id,
    });
    setShowAudioNoteModule(true);
  };

  // Delete a draft
  const handleDeleteDraft = async (draftId) => {
    if (!confirm('Delete this draft?')) return;
    try {
      await deleteDraft(draftId);
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  // Publish a draft (convert to regular note)
  const handlePublishDraft = async (draft) => {
    try {
      await publishDraft(draft.id);
      refreshBookmarksAndTags();
    } catch (error) {
      console.error('Error publishing draft:', error);
    }
  };

  // Handle recording complete from AudioRecordingHero
  // Saves the note directly and opens the side-panel NoteEditorModal
  const handleAudioRecordingComplete = async (recordingData) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      const polishedText = recordingData.polishedText || '';
      const response = await fetch('/api/audio-notes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: polishedText.split('\n')[0].substring(0, 100) || 'Audio Note',
          rawTranscript: recordingData.rawTranscript || '',
          polishedText,
          tags: recordingData.tags || [],
          userId: user.id,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to save audio note');

      refreshBookmarksAndTags();
      // Open saved note in the side-panel editor
      setNoteToEdit(data.audioNote);
    } catch (error) {
      console.error('Error saving audio note after recording:', error);
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

    // Audio note type
    if (bookmark.type === 'audio-note' || url.startsWith('audio-note://')) {
      return 'audio-note';
    }

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
  // Note: 'note' count includes BOTH regular notes AND audio notes for dual visibility
  const mediaCounts = React.useMemo(() => {
    const counts = {
      video: 0,
      image: 0,
      note: 0,           // Combined count (text notes + audio notes)
      'audio-note': 0,   // Audio notes only
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
      else if (type === 'audio-note') {
        counts['audio-note']++;
        counts.note++; // Also count in combined notes for dual visibility
      }
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
        // 'note' filter shows both regular notes and audio notes (dual visibility)
        if (mediaFilter === 'note') return type === 'note' || type === 'audio-note';
        // 'audio-note' filter shows only audio notes
        if (mediaFilter === 'audio-note') return type === 'audio-note';
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

  // Main folder tabs for page navigation (Lounge, Sides, Audio)
  const mainTabs = [
    { id: 'lounge', label: 'Lounge' },
    { id: 'collections', label: 'Sides' },
    { id: 'audio', label: 'Audio' },
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
        setNoteToEdit({ isNew: true, type: 'note', tags: [], notes: '', title: '', content: '' });
      }}
      onOpenSettings={() => setShowSettings(true)}
      onSignOut={signOut}
      onSignIn={() => setShowAuthModal(true)}
      mediaCounts={mediaCounts}
      activeFilter={mediaFilter}
      onFilterChange={setMediaFilter}
      draftsCount={drafts.length}
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
                {/* Full-page Loading Animation - Minimal & Elegant */}
                {loading && (
                  <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
                    {/* Pulsing dots */}
                    <div className="flex items-center gap-2 mb-6">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-theme-primary"
                          style={{
                            animation: 'pulse-dot 1.4s ease-in-out infinite',
                            animationDelay: `${i * 0.15}s`,
                            opacity: 0.4,
                          }}
                        />
                      ))}
                    </div>
                    {/* Subtle text */}
                    <p className="text-sm text-theme-text-secondary/60 tracking-wide">
                      Loading your bookmarks
                    </p>
                    <style>{`
                      @keyframes pulse-dot {
                        0%, 80%, 100% {
                          transform: scale(1);
                          opacity: 0.3;
                        }
                        40% {
                          transform: scale(1.5);
                          opacity: 1;
                        }
                      }
                    `}</style>
                  </div>
                )}

                {/* Content - only show when not loading */}
                {!loading && (
                  <>
                    {/* Active Filter Indicator - minimal tag pills */}
                    {activeTags.length > 0 && (
                      <div className="mb-4 flex flex-wrap items-center gap-1.5">
                        {activeTags.map((tag) => {
                          const color = getTagColor(tag);
                          return (
                            <div
                              key={tag}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 group cursor-pointer"
                              style={{
                                backgroundColor: color.bg,
                                color: color.text,
                              }}
                            >
                              <span>{tag}</span>
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                        <span className="text-[11px] opacity-40 ml-1" style={{ color: 'var(--theme-fg-muted, #a89984)' }}>
                          {sortedBookmarks.length} result{sortedBookmarks.length !== 1 ? 's' : ''}
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
                          onClick={() => {
                            setNoteToEdit({ isNew: true, type: 'note', tags: [], notes: '', title: '', content: '' });
                          }}
                          onNoteCreated={(savedNote) => {
                            // Refresh bookmarks and tags to show the new note
                            refreshBookmarksAndTags();
                          }}
                        />
                      </div>

                      {/* Bookmarks */}
                      {sortedBookmarks.map((bookmark, index) => (
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
                              if (bookmark.type === 'audio-note' || bookmark.url?.startsWith('audio-note://')) {
                                setNoteToEdit(bookmark);
                              } else {
                                setSelectedBookmark(bookmark);
                              }
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
                            onCardClick={(bm, autoPlay) => {
                              if (bm.type === 'audio-note' || bm.url?.startsWith('audio-note://')) {
                                setNoteToEdit(bm);
                              } else {
                                setSelectedBookmark(bm);
                                setAutoPlayOnOpen(autoPlay || false);
                              }
                            }}
                            onOpenEditor={(bm) => {
                              setNoteToEdit(bm);
                            }}
                            onTagClick={handleTagClick}
                            onTagDelete={handleTagDelete}
                          />
                        </div>
                      ))}
                    </Masonry>
                  </>
                )}
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

            {/* Audio Tab Content */}
            {mainTab === 'audio' && (
              <div className="py-6">
                {/* Hero Recording Section */}
                <div className="mb-12">
                  <AudioRecordingHero
                    onRecordingComplete={handleAudioRecordingComplete}
                  />
                </div>

                {/* Divider with gradient */}
                {(() => {
                  const audioNotes = sortedBookmarks.filter(b => getBookmarkType(b) === 'audio-note');
                  if (audioNotes.length > 0) {
                    return (
                      <>
                        <div className="flex items-center gap-4 mb-8">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-theme-border to-transparent" />
                          <h2 className="text-lg font-medium text-theme-text-secondary">Your Audio Notes</h2>
                          <div className="flex-1 h-px bg-gradient-to-r from-theme-border via-transparent to-transparent" />
                        </div>

                        {/* Audio Notes Grid */}
                        <Masonry
                          breakpointCols={{
                            default: 4,
                            1536: 4,
                            1280: 3,
                            1024: 2,
                            640: 1
                          }}
                          className="flex w-full -ml-5"
                          columnClassName="pl-5 bg-clip-padding"
                        >
                          {audioNotes.map((bookmark) => (
                            <div
                              key={bookmark.id}
                              onClick={() => {
                                if (bookmark.type === 'audio-note' || bookmark.url?.startsWith('audio-note://')) {
                                  setNoteToEdit(bookmark);
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
                                onUpdate={handleSaveBookmark}
                                collection={collections.find(c => c.id === bookmark.collectionId)}
                                onCardClick={(bm) => {
                                  if (bm.type === 'audio-note' || bm.url?.startsWith('audio-note://')) {
                                    setNoteToEdit(bm);
                                  } else {
                                    setSelectedBookmark(bm);
                                  }
                                }}
                                onOpenEditor={(bm) => {
                                  setNoteToEdit(bm);
                                }}
                                onTagClick={handleTagClick}
                                onTagDelete={handleTagDelete}
                              />
                            </div>
                          ))}
                        </Masonry>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Drafts Tab Content */}
            {mainTab === 'drafts' && (
              <div className="py-6">
                {/* Drafts Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-theme-text-primary">Drafts</h2>
                  <span className="text-sm text-theme-text-secondary">
                    {drafts.length} unsaved {drafts.length === 1 ? 'note' : 'notes'}
                  </span>
                </div>

                {/* Drafts List */}
                {drafts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-amber-500/50" />
                    </div>
                    <h3 className="text-lg font-medium text-theme-text-primary mb-2">No drafts</h3>
                    <p className="text-sm text-theme-text-secondary max-w-sm">
                      When you close an audio note without saving, it will be saved here as a draft.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="group relative p-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border-2 border-dashed border-amber-300/50 dark:border-amber-700/30 hover:border-amber-400/70 dark:hover:border-amber-600/50 transition-colors cursor-pointer"
                        onClick={() => setNoteToEdit(draft)}
                      >
                        {/* Draft Badge */}
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-1 text-xs font-medium bg-amber-200/70 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 rounded-full">
                            Draft
                          </span>
                        </div>

                        {/* Content Preview */}
                        <div className="pr-16">
                          <h4 className="font-medium text-theme-text-primary mb-2 line-clamp-1">
                            {draft.title || 'Untitled Draft'}
                          </h4>
                          <p className="text-sm text-theme-text-secondary line-clamp-3 font-serif">
                            {draft.notes}
                          </p>
                        </div>

                        {/* Tags */}
                        {draft.tags && draft.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {draft.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-xs bg-amber-200/50 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {draft.tags.length > 3 && (
                              <span className="px-2 py-0.5 text-xs text-amber-600/70 dark:text-amber-400/70">
                                +{draft.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-800/30">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteToEdit(draft);
                            }}
                            className="flex-1 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-200/50 dark:bg-amber-800/30 rounded-lg hover:bg-amber-300/50 dark:hover:bg-amber-700/40 transition-colors"
                          >
                            Continue Editing
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePublishDraft(draft);
                            }}
                            className="px-3 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                          >
                            Publish
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDraft(draft.id);
                            }}
                            className="p-2 text-amber-600/70 dark:text-amber-400/70 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Created date */}
                        <p className="mt-2 text-xs text-theme-text-secondary/60">
                          {new Date(draft.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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


      {/* Audio Note Module - Voice Recording with LLM Processing */}
      <AudioNoteModule
        isOpen={showAudioNoteModule}
        onClose={() => {
          setShowAudioNoteModule(false);
          setAudioNoteInitialData(null);
        }}
        onSave={handleSaveAudioNote}
        onSaveDraft={handleSaveAudioDraft}
        initialData={audioNoteInitialData}
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
        onSave={async (updatedBookmark) => {
          if (updatedBookmark.id) {
            // Existing note - update
            handleSaveBookmark(updatedBookmark);
          } else {
            // New note - create via handleSaveNoteModule
            await handleSaveNoteModule(updatedBookmark);
            refetch();
          }
          setNoteToEdit(null);
        }}
        onDelete={(bm) => {
          if (bm?.id) handleDelete(bm);
          setNoteToEdit(null);
        }}
        availableTags={allTags}
      />

    </AppShell >
  );
}

export default App
