const store = require('../storage/bookmarkStore');
const { detectCategory } = require('../categorization/basicDetector');

// Create a new bookmark
const createBookmark = (bookmarkData) => {
  const { url, title, notes = '', tags = [] } = bookmarkData;

  // Auto-detect category
  const { category, subCategory } = detectCategory(url, title);

  const bookmarkToSave = {
    url,
    title,
    notes,
    tags,
    category,
    subCategory,
    metadata: {
      selectedText: bookmarkData.selectedText || '',
      isThread: false,
      threadReplies: [],
    },
    archived: false,
  };

  return store.saveBookmark(bookmarkToSave);
};

// Get all bookmarks with optional filters
const getBookmarks = (options = {}) => {
  let bookmarks = store.getAllBookmarks();

  const { category, subCategory, search } = options;

  if (category) {
    bookmarks = bookmarks.filter(b => b.category === category);
  }

  if (subCategory) {
    bookmarks = bookmarks.filter(b => b.subCategory === subCategory);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    bookmarks = bookmarks.filter(b =>
      (b.title || '').toLowerCase().includes(searchLower) ||
      (b.url || '').toLowerCase().includes(searchLower) ||
      (b.notes || '').toLowerCase().includes(searchLower)
    );
  }

  // Sort by newest first
  return bookmarks.sort((a, b) => b.createdAt - a.createdAt);
};

// Get bookmark by ID
const getBookmarkById = (id) => {
  return store.getBookmarkById(id);
};

// Update bookmark
const updateBookmarkById = (id, updates) => {
  return store.updateBookmark(id, updates);
};

// Delete bookmark
const deleteBookmarkById = (id) => {
  return store.deleteBookmark(id);
};

// Search bookmarks
const searchBookmarks = (query) => {
  return getBookmarks({ search: query });
};

// Get statistics
const getStats = () => {
  const bookmarks = store.getAllBookmarks();

  const stats = {
    total: bookmarks.length,
    categories: {},
    subCategories: {},
  };

  bookmarks.forEach(bookmark => {
    stats.categories[bookmark.category] = (stats.categories[bookmark.category] || 0) + 1;
    stats.subCategories[bookmark.subCategory] = (stats.subCategories[bookmark.subCategory] || 0) + 1;
  });

  return stats;
};

module.exports = {
  createBookmark,
  getBookmarks,
  getBookmarkById,
  updateBookmarkById,
  deleteBookmarkById,
  searchBookmarks,
  getStats,
};
