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
    const response = await fetch('http://127.0.0.1:3000/api/bookmarks', {
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
    // If Twitter URL and no thumbnail, try oEmbed first
    if ((bookmark.url.includes('twitter.com') || bookmark.url.includes('x.com'))
        && !bookmark.thumbnail) {
      try {
        const oembedResponse = await fetch(
          `http://127.0.0.1:3000/api/twitter/oembed?url=${encodeURIComponent(bookmark.url)}`
        );

        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();
          if (oembedData.thumbnail) {
            bookmark.thumbnail = oembedData.thumbnail;
            bookmark.metadata = bookmark.metadata || {};
            bookmark.metadata.oembedData = {
              authorName: oembedData.authorName,
              authorUrl: oembedData.authorUrl
            };
          }
        }
      } catch (oembedError) {
        console.warn('oEmbed fetch failed, continuing with original data:', oembedError);
      }
    }

    // Try to save to server
    const savedBookmark = await saveBookmarkToServer(bookmark);
    return { source: 'server', bookmark: savedBookmark };
  } catch (serverError) {
    console.warn('Server unavailable, saving offline:', serverError);
    // Fallback to offline storage
    const offlineId = await saveBookmarkOffline(bookmark);
    return { source: 'offline', id: offlineId, bookmark };
  }
}

// Get offline bookmarks from IndexedDB
async function getOfflineBookmarks() {
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

// Delete offline bookmark after successful sync
async function deleteOfflineBookmark(id) {
  try {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
  } catch (error) {
    console.error('Error deleting offline bookmark:', error);
  }
}

// Sync offline bookmarks to server
async function syncOfflineBookmarks() {
  const offlineBookmarks = await getOfflineBookmarks();

  if (offlineBookmarks.length === 0) {
    return;
  }

  console.log(`Syncing ${offlineBookmarks.length} offline bookmarks...`);

  for (const bookmark of offlineBookmarks) {
    try {
      // Try to save to server
      const response = await fetch('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookmark),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Successfully synced, delete from IndexedDB
      await deleteOfflineBookmark(bookmark.id);
      console.log(`Successfully synced bookmark: ${bookmark.title}`);
    } catch (error) {
      console.warn(`Could not sync bookmark "${bookmark.title}", will retry later:`, error);
      // Keep the bookmark in IndexedDB for next sync attempt
    }
  }
}

// Set up periodic sync (when online)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Bookmark extension installed');
});

// Check for offline bookmarks periodically
setInterval(async () => {
  try {
    await syncOfflineBookmarks();
  } catch (error) {
    console.error('Error during sync attempt:', error);
  }
}, 60000); // Check every minute

// Also try to sync when extension starts
syncOfflineBookmarks().catch(err => console.error('Initial sync failed:', err));
