const fs = require('fs');
const { getBookmarksFilePath, ensureStorageDirectory } = require('./paths');

// In-memory cache of bookmarks
let bookmarksCache = null;

// Load bookmarks from file
const loadAllBookmarks = () => {
  ensureStorageDirectory();
  const filePath = getBookmarksFilePath();

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      bookmarksCache = JSON.parse(content);
    } else {
      bookmarksCache = [];
    }
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    bookmarksCache = [];
  }

  return bookmarksCache;
};

// Save bookmarks to file
const saveToFile = (bookmarks) => {
  ensureStorageDirectory();
  const filePath = getBookmarksFilePath();

  try {
    fs.writeFileSync(filePath, JSON.stringify(bookmarks, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving bookmarks:', error);
    throw error;
  }
};

// Get all bookmarks (from cache or file)
const getAllBookmarks = () => {
  if (bookmarksCache === null) {
    loadAllBookmarks();
  }
  return bookmarksCache || [];
};

// Generate unique ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Save a new bookmark
const saveBookmark = (bookmarkData) => {
  const bookmarks = getAllBookmarks();

  const newBookmark = {
    id: generateId(),
    ...bookmarkData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  bookmarks.push(newBookmark);
  bookmarksCache = bookmarks;
  saveToFile(bookmarks);

  return newBookmark;
};

// Get bookmark by ID
const getBookmarkById = (id) => {
  const bookmarks = getAllBookmarks();
  return bookmarks.find(b => b.id === id);
};

// Update a bookmark
const updateBookmark = (id, updates) => {
  const bookmarks = getAllBookmarks();
  const index = bookmarks.findIndex(b => b.id === id);

  if (index === -1) {
    throw new Error(`Bookmark with ID ${id} not found`);
  }

  const updated = {
    ...bookmarks[index],
    ...updates,
    id, // Preserve ID
    updatedAt: Date.now(),
  };

  bookmarks[index] = updated;
  bookmarksCache = bookmarks;
  saveToFile(bookmarks);

  return updated;
};

// Delete a bookmark
const deleteBookmark = (id) => {
  const bookmarks = getAllBookmarks();
  const index = bookmarks.findIndex(b => b.id === id);

  if (index === -1) {
    throw new Error(`Bookmark with ID ${id} not found`);
  }

  const deleted = bookmarks[index];
  bookmarks.splice(index, 1);
  bookmarksCache = bookmarks;
  saveToFile(bookmarks);

  return deleted;
};

module.exports = {
  getAllBookmarks,
  saveBookmark,
  getBookmarkById,
  updateBookmark,
  deleteBookmark,
  loadAllBookmarks,
};
