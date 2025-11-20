const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock setup - must be before importing the module under test
jest.mock('../paths');

// Import the mocked paths
const pathsModule = require('../paths');

// Configure the mock before importing bookmarkStore
pathsModule.getBookmarksFilePath.mockImplementation(() => {
  return path.join(os.homedir(), '.bookmarks-app-test', 'bookmarks.json');
});

pathsModule.ensureStorageDirectory.mockImplementation(() => {
  const testPath = path.join(os.homedir(), '.bookmarks-app-test');
  if (!fs.existsSync(testPath)) {
    fs.mkdirSync(testPath, { recursive: true });
  }
});

const {
  getAllBookmarks,
  saveBookmark,
  getBookmarkById,
  updateBookmark,
  deleteBookmark,
  loadAllBookmarks
} = require('../bookmarkStore');

// Use a test directory
const testStoragePath = path.join(os.homedir(), '.bookmarks-app-test');
const testFilePath = path.join(testStoragePath, 'bookmarks.json');

// Helper to clean up test data
const cleanupTest = () => {
  if (fs.existsSync(testStoragePath)) {
    fs.rmSync(testStoragePath, { recursive: true });
  }
};

describe('Bookmark Store', () => {
  beforeEach(() => {
    cleanupTest();
  });

  afterAll(() => {
    cleanupTest();
  });

  test('getAllBookmarks returns empty array when no bookmarks exist', () => {
    const bookmarks = getAllBookmarks();
    expect(Array.isArray(bookmarks)).toBe(true);
    expect(bookmarks.length).toBe(0);
  });

  test('saveBookmark creates a new bookmark with ID', () => {
    const newBookmark = {
      url: 'https://example.com',
      title: 'Example Article',
      category: 'article',
    };

    const saved = saveBookmark(newBookmark);

    expect(saved.id).toBeDefined();
    expect(saved.url).toBe('https://example.com');
    expect(saved.title).toBe('Example Article');
    expect(saved.createdAt).toBeDefined();
  });

  test('getBookmarkById retrieves saved bookmark', () => {
    const newBookmark = {
      url: 'https://test.com',
      title: 'Test',
      category: 'article',
    };

    const saved = saveBookmark(newBookmark);
    const retrieved = getBookmarkById(saved.id);

    expect(retrieved).toEqual(saved);
  });

  test('updateBookmark modifies existing bookmark', () => {
    const newBookmark = {
      url: 'https://test.com',
      title: 'Original Title',
      category: 'article',
    };

    const saved = saveBookmark(newBookmark);
    const updated = updateBookmark(saved.id, { title: 'Updated Title' });

    expect(updated.title).toBe('Updated Title');
    expect(updated.id).toBe(saved.id);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(saved.createdAt);
  });

  test('deleteBookmark removes bookmark and returns it', () => {
    const newBookmark = {
      url: 'https://test.com',
      title: 'To Delete',
      category: 'article',
    };

    const saved = saveBookmark(newBookmark);
    const deleted = deleteBookmark(saved.id);

    expect(deleted.id).toBe(saved.id);
    expect(getBookmarkById(saved.id)).toBeUndefined();
  });

  test('bookmarks persist to file system', () => {
    const newBookmark = {
      url: 'https://persist.com',
      title: 'Persist Test',
      category: 'article',
    };

    const saved = saveBookmark(newBookmark);

    // Verify file exists
    expect(fs.existsSync(testFilePath)).toBe(true);

    // Load from disk and verify
    const fileContent = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
    expect(fileContent.some(b => b.id === saved.id)).toBe(true);
  });

  test('loadAllBookmarks reloads from file system', () => {
    const bookmark1 = saveBookmark({
      url: 'https://a.com',
      title: 'A',
      category: 'article',
    });

    // Reload from disk
    const reloaded = loadAllBookmarks();
    expect(reloaded.some(b => b.id === bookmark1.id)).toBe(true);
  });
});
