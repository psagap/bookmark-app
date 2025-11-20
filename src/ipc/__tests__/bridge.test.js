const { handleMessage } = require('../bridge');

// Mock the API
jest.mock('../../api/bookmarkApi', () => ({
  createBookmark: jest.fn(),
  getBookmarks: jest.fn(),
  getBookmarkById: jest.fn(),
  updateBookmarkById: jest.fn(),
  deleteBookmarkById: jest.fn(),
  searchBookmarks: jest.fn(),
  getStats: jest.fn(),
}));

const api = require('../../api/bookmarkApi');

describe('IPC Bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handleMessage function exists and is callable', () => {
    expect(typeof handleMessage).toBe('function');
  });

  test('handleMessage routes bookmark:create to api.createBookmark', () => {
    const bookmarkData = {
      url: 'https://example.com',
      title: 'Example',
    };

    api.createBookmark.mockReturnValue({
      id: '123',
      ...bookmarkData,
    });

    const result = handleMessage('bookmark:create', bookmarkData);

    expect(api.createBookmark).toHaveBeenCalledWith(bookmarkData);
    expect(result.id).toBe('123');
  });

  test('handleMessage routes bookmark:get-all to api.getBookmarks', () => {
    const mockBookmarks = [
      { id: '1', title: 'First' },
      { id: '2', title: 'Second' },
    ];

    api.getBookmarks.mockReturnValue(mockBookmarks);

    const result = handleMessage('bookmark:get-all', {});

    expect(api.getBookmarks).toHaveBeenCalledWith({});
    expect(result).toEqual(mockBookmarks);
  });

  test('handleMessage routes bookmark:get-by-id to api.getBookmarkById', () => {
    const mockBookmark = { id: '123', title: 'Test' };

    api.getBookmarkById.mockReturnValue(mockBookmark);

    const result = handleMessage('bookmark:get-by-id', '123');

    expect(api.getBookmarkById).toHaveBeenCalledWith('123');
    expect(result).toEqual(mockBookmark);
  });

  test('handleMessage routes bookmark:update to api.updateBookmarkById', () => {
    const updates = { title: 'Updated Title' };
    const mockUpdated = { id: '123', title: 'Updated Title' };

    api.updateBookmarkById.mockReturnValue(mockUpdated);

    const result = handleMessage('bookmark:update', '123', updates);

    expect(api.updateBookmarkById).toHaveBeenCalledWith('123', updates);
    expect(result).toEqual(mockUpdated);
  });

  test('handleMessage routes bookmark:delete to api.deleteBookmarkById', () => {
    const mockDeleted = { id: '123', title: 'Deleted' };

    api.deleteBookmarkById.mockReturnValue(mockDeleted);

    const result = handleMessage('bookmark:delete', '123');

    expect(api.deleteBookmarkById).toHaveBeenCalledWith('123');
    expect(result).toEqual(mockDeleted);
  });

  test('handleMessage routes bookmark:search to api.searchBookmarks', () => {
    const mockResults = [{ id: '1', title: 'React' }];

    api.searchBookmarks.mockReturnValue(mockResults);

    const result = handleMessage('bookmark:search', 'React');

    expect(api.searchBookmarks).toHaveBeenCalledWith('React');
    expect(result).toEqual(mockResults);
  });

  test('handleMessage routes stats:get to api.getStats', () => {
    const mockStats = { total: 3, categories: { video: 2, article: 1 } };

    api.getStats.mockReturnValue(mockStats);

    const result = handleMessage('stats:get');

    expect(api.getStats).toHaveBeenCalled();
    expect(result).toEqual(mockStats);
  });

  test('handleMessage throws error for unknown message type', () => {
    expect(() => {
      handleMessage('unknown:type', 'arg1');
    }).toThrow('Unknown handler: unknown:type');
  });

  test('handleMessage passes multiple arguments correctly', () => {
    api.updateBookmarkById.mockReturnValue({ id: '123' });

    const updates = { title: 'New Title', notes: 'Some notes' };
    handleMessage('bookmark:update', '123', updates);

    expect(api.updateBookmarkById).toHaveBeenCalledWith('123', updates);
  });
});
