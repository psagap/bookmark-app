// Bridge for communicating between extension/dashboard and local storage
// In Electron context, this uses IPC; in browser extension, this adapts accordingly

const store = require('../storage/bookmarkStore');
const api = require('../api/bookmarkApi');

const handlers = {
  'bookmark:create': (data) => api.createBookmark(data),
  'bookmark:get-all': (options) => api.getBookmarks(options),
  'bookmark:get-by-id': (id) => api.getBookmarkById(id),
  'bookmark:update': (id, updates) => api.updateBookmarkById(id, updates),
  'bookmark:delete': (id) => api.deleteBookmarkById(id),
  'bookmark:search': (query) => api.searchBookmarks(query),
  'stats:get': () => api.getStats(),
};

const handleMessage = (type, ...args) => {
  const handler = handlers[type];
  if (!handler) {
    throw new Error(`Unknown handler: ${type}`);
  }
  return handler(...args);
};

module.exports = {
  handleMessage,
};
