const {
  createBookmark,
  getBookmarks,
  getBookmarkById,
  updateBookmarkById,
  deleteBookmarkById,
  searchBookmarks,
  getStats,
} = require('../bookmarkApi');

// Mock the store
jest.mock('../../storage/bookmarkStore', () => ({
  getAllBookmarks: jest.fn(),
  saveBookmark: jest.fn(),
  getBookmarkById: jest.fn(),
  updateBookmark: jest.fn(),
  deleteBookmark: jest.fn(),
}));

// Mock the detector
jest.mock('../../categorization/basicDetector', () => ({
  detectCategory: jest.fn(),
}));

const store = require('../../storage/bookmarkStore');
const { detectCategory } = require('../../categorization/basicDetector');

describe('Bookmark API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createBookmark detects category and saves', () => {
    const input = {
      url: 'https://youtube.com/watch?v=abc',
      title: 'Video Title',
    };

    detectCategory.mockReturnValue({
      category: 'video',
      subCategory: 'youtube-video',
    });

    store.saveBookmark.mockReturnValue({
      id: '123',
      ...input,
      category: 'video',
      subCategory: 'youtube-video',
      createdAt: Date.now(),
    });

    const result = createBookmark(input);

    expect(detectCategory).toHaveBeenCalledWith(input.url, input.title);
    expect(store.saveBookmark).toHaveBeenCalled();
    expect(result.category).toBe('video');
  });

  test('getBookmarks returns all bookmarks', () => {
    const mockBookmarks = [
      { id: '1', title: 'First', category: 'article' },
      { id: '2', title: 'Second', category: 'video' },
    ];

    store.getAllBookmarks.mockReturnValue(mockBookmarks);

    const result = getBookmarks();
    expect(result).toEqual(mockBookmarks);
  });

  test('getBookmarks filters by category', () => {
    const allBookmarks = [
      { id: '1', title: 'First', category: 'article' },
      { id: '2', title: 'Second', category: 'video' },
    ];

    store.getAllBookmarks.mockReturnValue(allBookmarks);

    const result = getBookmarks({ category: 'video' });
    expect(result).toEqual([{ id: '2', title: 'Second', category: 'video' }]);
  });

  test('getBookmarkById retrieves a bookmark', () => {
    const bookmark = { id: '1', title: 'Test', category: 'article' };
    store.getBookmarkById.mockReturnValue(bookmark);

    const result = getBookmarkById('1');
    expect(result).toEqual(bookmark);
    expect(store.getBookmarkById).toHaveBeenCalledWith('1');
  });

  test('searchBookmarks filters by title', () => {
    const allBookmarks = [
      { id: '1', title: 'React Tutorial', category: 'article' },
      { id: '2', title: 'Vue Guide', category: 'article' },
    ];

    store.getAllBookmarks.mockReturnValue(allBookmarks);

    const result = searchBookmarks('React');
    expect(result).toEqual([{ id: '1', title: 'React Tutorial', category: 'article' }]);
  });

  test('getStats returns statistics', () => {
    const mockBookmarks = [
      { id: '1', title: 'First', category: 'article', subCategory: 'article' },
      { id: '2', title: 'Second', category: 'video', subCategory: 'youtube-video' },
      { id: '3', title: 'Third', category: 'video', subCategory: 'youtube-video' },
    ];

    store.getAllBookmarks.mockReturnValue(mockBookmarks);

    const result = getStats();
    expect(result.total).toBe(3);
    expect(result.categories.article).toBe(1);
    expect(result.categories.video).toBe(2);
    expect(result.subCategories['youtube-video']).toBe(2);
  });
});
