const path = require('path');
const os = require('os');
const fs = require('fs');

// Test directory path - use mockTestDir so jest.mock() allows it
const mockTestDir = path.join(os.homedir(), '.bookmarks-app-integration-test');

// Use manual mock setup
jest.doMock('../storage/paths', () => ({
  getStoragePath: () => mockTestDir,
  getBookmarksFilePath: () => path.join(mockTestDir, 'bookmarks.json'),
  ensureStorageDirectory: () => {
    if (!fs.existsSync(mockTestDir)) {
      fs.mkdirSync(mockTestDir, { recursive: true });
    }
  },
}));

// Need to require after doMock is set up
let createBookmark, getBookmarks, deleteBookmarkById, getStats;

beforeAll(async () => {
  // Clean up test directory
  if (fs.existsSync(mockTestDir)) {
    fs.rmSync(mockTestDir, { recursive: true });
  }

  // Now require the API
  const api = require('../api/bookmarkApi');
  createBookmark = api.createBookmark;
  getBookmarks = api.getBookmarks;
  deleteBookmarkById = api.deleteBookmarkById;
  getStats = api.getStats;
});

// Clear bookmarks between tests
beforeEach(() => {
  if (fs.existsSync(mockTestDir)) {
    fs.rmSync(mockTestDir, { recursive: true });
  }
  fs.mkdirSync(mockTestDir, { recursive: true });

  const bookmarkStore = require('../storage/bookmarkStore');
  bookmarkStore.loadAllBookmarks();
});

describe('Integration: Full Bookmark Flow', () => {
  afterAll(() => {
    if (fs.existsSync(mockTestDir)) {
      fs.rmSync(mockTestDir, { recursive: true });
    }
  });

  test('end-to-end: save YouTube video, search, and delete', () => {
    // 1. Create a bookmark
    const bookmark = createBookmark({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      notes: 'Classic video',
      tags: ['music', 'entertainment'],
    });

    expect(bookmark.id).toBeDefined();
    expect(bookmark.category).toBe('video');
    expect(bookmark.subCategory).toBe('youtube-video');

    // 2. Retrieve all bookmarks
    const all = getBookmarks();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(bookmark.id);

    // 3. Get stats
    const stats = getStats();
    expect(stats.total).toBe(1);
    expect(stats.categories.video).toBe(1);

    // 4. Delete
    deleteBookmarkById(bookmark.id);
    const afterDelete = getBookmarks();
    expect(afterDelete.length).toBe(0);
  });

  test('end-to-end: save multiple bookmarks of different types', () => {
    // Save 3 different types
    const video = createBookmark({
      url: 'https://youtube.com/watch?v=abc',
      title: 'Tutorial Video',
    });

    const article = createBookmark({
      url: 'https://medium.com/@author/article',
      title: 'Medium Article',
    });

    const redditPost = createBookmark({
      url: 'https://reddit.com/r/programming/comments/xyz',
      title: 'Reddit Discussion',
    });

    const all = getBookmarks();
    expect(all.length).toBe(3);

    const stats = getStats();
    expect(stats.total).toBe(3);
    expect(stats.categories.video).toBe(1);
    expect(stats.categories.article).toBe(1);
    expect(stats.categories.text).toBe(1);
  });

  test('data persists across reloads', () => {
    const bookmarkStore = require('../storage/bookmarkStore');

    // Save a bookmark
    const bookmark = createBookmark({
      url: 'https://example.com/persist',
      title: 'Persist Test',
    });

    // Reload from disk
    bookmarkStore.loadAllBookmarks();

    // Should still exist
    const retrieved = getBookmarks();
    expect(retrieved.some(b => b.id === bookmark.id)).toBe(true);
  });

  test('stats are calculated correctly for mixed types', () => {
    // Create various types
    createBookmark({
      url: 'https://youtube.com/watch?v=video1',
      title: 'Video 1',
    });

    createBookmark({
      url: 'https://youtube.com/watch?v=video2',
      title: 'Video 2',
    });

    createBookmark({
      url: 'https://medium.com/@user/article1',
      title: 'Article 1',
    });

    createBookmark({
      url: 'https://reddit.com/r/news/comments/abc',
      title: 'Reddit Post 1',
    });

    const stats = getStats();
    expect(stats.total).toBe(4);
    expect(stats.categories.video).toBe(2);
    expect(stats.categories.article).toBe(1);
    expect(stats.categories.text).toBe(1);
    expect(stats.subCategories['youtube-video']).toBe(2);
    expect(stats.subCategories['medium']).toBe(1);
    expect(stats.subCategories['reddit-post']).toBe(1);
  });
});
