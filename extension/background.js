/**
 * Background service worker
 * Handles communication with local server and offline storage
 */

// Initialize IndexedDB for offline storage
const DB_NAME = 'BookmarkAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingBookmarks';

function initializeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Save bookmark to local server
async function saveBookmarkToServer(bookmark) {
  try {
    const response = await fetch('http://localhost:3000/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookmark),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving to server:', error);
    throw error;
  }
}

// Save bookmark to IndexedDB (for offline)
async function saveBookmarkOffline(bookmark) {
  const db = await initializeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(bookmark);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveBookmark') {
    handleSaveBookmark(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleSaveBookmark(bookmark) {
  try {
    // Try to save to server first
    const savedBookmark = await saveBookmarkToServer(bookmark);
    return { source: 'server', bookmark: savedBookmark };
  } catch (serverError) {
    console.warn('Server unavailable, saving offline:', serverError);
    // Fallback to offline storage
    const offlineId = await saveBookmarkOffline(bookmark);
    return { source: 'offline', id: offlineId, bookmark };
  }
}

// Sync offline bookmarks when server becomes available
async function syncOfflineBookmarks() {
  try {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error reading offline bookmarks:', error);
    return [];
  }
}

// Set up periodic sync (when online)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Bookmark extension installed');
});

// Check for offline bookmarks periodically
setInterval(async () => {
  const offlineBookmarks = await syncOfflineBookmarks();
  if (offlineBookmarks.length > 0) {
    console.log(`Found ${offlineBookmarks.length} offline bookmarks to sync`);
    // Sync logic would go here
  }
}, 60000); // Check every minute
