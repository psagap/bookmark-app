import React, { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import BookmarkCard from '@/components/BookmarkCard'
import BookmarkDetail from '@/components/BookmarkDetail'
import { useBookmarks } from '@/hooks/useBookmarks'
import { Plus, FileText, File } from 'lucide-react'

const AddCard = ({ onAddNote, onAddFile }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="break-inside-avoid mb-6">
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="bg-card rounded-xl border border-border h-32 flex items-center justify-center cursor-pointer group transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-primary group-hover:scale-110">
            <Plus className="w-6 h-6 text-muted-foreground/50 transition-all duration-300 group-hover:text-primary group-hover:rotate-90" />
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
              <div className="bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                <button
                  onClick={() => {
                    onAddNote?.();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>Add a new note</span>
                </button>
                <div className="h-px bg-border mx-3" />
                <button
                  onClick={() => {
                    onAddFile?.();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors"
                >
                  <File className="w-4 h-4 text-muted-foreground" />
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
  const [selectedBookmark, setSelectedBookmark] = useState(null);

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
    // TODO: Implement create side functionality
    console.log('Create side for:', bookmark);
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

  // Sort bookmarks: pinned first, then by date
  const sortedBookmarks = [...bookmarks].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex relative">
      {/* Background gradient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[128px]" />
      </div>

      <Sidebar />
      <main className="flex-1 pl-14 min-h-screen relative">
        <Header />
        <div className="px-6 pb-8">

          {/* Masonry Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">

            {/* Add Card */}
            <AddCard
              onAddNote={() => console.log('Add note')}
              onAddFile={() => console.log('Add file')}
            />

            {/* Bookmarks */}
            {loading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : (
              sortedBookmarks.map(bookmark => (
                <div key={bookmark.id} onClick={() => setSelectedBookmark(bookmark)} className="cursor-pointer">
                  <BookmarkCard
                    bookmark={bookmark}
                    onDelete={handleDelete}
                    onPin={handlePin}
                    onCreateSide={handleCreateSide}
                    onRefresh={handleRefreshBookmark}
                  />
                </div>
              ))
            )}
          </div>

        </div>

        <BookmarkDetail
          bookmark={selectedBookmark}
          open={!!selectedBookmark}
          onOpenChange={(open) => !open && setSelectedBookmark(null)}
          onSave={() => refetch()}
        />
      </main>
    </div>
  )
}

export default App
