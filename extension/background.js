/**
 * Background service worker
 * Handles communication with Supabase and offline storage
 */

// Supabase Configuration
const SUPABASE_URL = 'https://oxkhforkxcmeyqdjybmw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94a2hmb3JreGNtZXlxZGp5Ym13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzIzNjEsImV4cCI6MjA4MjU0ODM2MX0.0mdKH3c9Q6LIfTGLFwF5W4yAfA9VJ5Jq-5NFRmVHRyw';

// Session storage key
const SESSION_KEY = 'supabase_session';

/**
 * Get the current session from chrome storage
 */
async function getSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SESSION_KEY], (result) => {
      resolve(result[SESSION_KEY] || null);
    });
  });
}

/**
 * Save session to chrome storage
 */
async function saveSession(session) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SESSION_KEY]: session }, resolve);
  });
}

/**
 * Clear session from chrome storage
 */
async function clearSession() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([SESSION_KEY], resolve);
  });
}

/**
 * Get current user from session
 */
async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Refresh the session if needed
 */
async function refreshSession() {
  const session = await getSession();
  if (!session?.refresh_token) {
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        refresh_token: session.refresh_token,
      }),
    });

    if (!response.ok) {
      await clearSession();
      return null;
    }

    const newSession = await response.json();
    await saveSession(newSession);
    return newSession;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if needed
 */
async function getAccessToken() {
  const session = await getSession();
  if (!session?.access_token) {
    return null;
  }

  // Check if token is expired (with 60s buffer)
  const expiresAt = session.expires_at || 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt - now < 60) {
    const refreshed = await refreshSession();
    return refreshed?.access_token || null;
  }

  return session.access_token;
}

/**
 * Check if there's an active session
 */
async function isAuthenticated() {
  const token = await getAccessToken();
  return !!token;
}

/**
 * Save a bookmark to Supabase
 */
async function saveBookmarkToSupabase(bookmark) {
  const accessToken = await getAccessToken();
  const user = await getCurrentUser();

  if (!accessToken || !user) {
    throw new Error('Not authenticated. Please log in via the main app.');
  }

  // Prepare the bookmark data for Supabase
  const bookmarkData = {
    user_id: user.id,
    user_email: user.email || '',
    title: bookmark.title || '',
    url: bookmark.url || '',
    description: bookmark.metadata?.ogDescription || '',
    notes: bookmark.notes || '',
    tags: bookmark.tags || [],
    pinned: false,
    type: bookmark.category || 'Article',
    cover_image: bookmark.thumbnail || '',
    // Include full metadata for rich content display (tweets, wikipedia, etc.)
    metadata: bookmark.metadata || {},
  };

  // DEBUG: Log what's being saved to Supabase
  console.log('[Background] Saving to Supabase:', JSON.stringify(bookmarkData, null, 2));

  const response = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(bookmarkData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save bookmark');
  }

  const [savedBookmark] = await response.json();
  return savedBookmark;
}

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

  if (request.action === 'checkAuth') {
    isAuthenticated()
      .then(authenticated => sendResponse({ authenticated }))
      .catch(() => sendResponse({ authenticated: false }));
    return true;
  }

  if (request.action === 'setSession') {
    saveSession(request.session)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'clearSession') {
    clearSession()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'registerContextMenu') {
    // Context menu registration - acknowledge the message to prevent callback errors
    sendResponse({ success: true });
    return false; // Synchronous response
  }
});

// Server URL for API calls (og:image fetching, video download, etc.)
const API_SERVER_URL = 'http://localhost:3000';

/**
 * Fetch og:image from a URL via our server (to avoid CORS)
 */
async function fetchOgImage(url) {
  try {
    const response = await fetch(`${API_SERVER_URL}/api/og-image?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      console.warn('[Background] Failed to fetch og:image:', response.status);
      return null;
    }
    const data = await response.json();
    return data.ogImage || null;
  } catch (error) {
    console.warn('[Background] Error fetching og:image:', error);
    return null;
  }
}

/**
 * Download video via Cobalt API (for Twitter/X video caching)
 * This runs in background after bookmark is saved
 */
async function downloadVideoInBackground(url, bookmarkId) {
  const isTwitter = url.includes('twitter.com') || url.includes('x.com');
  if (!isTwitter) return null;

  try {
    console.log('[Background] Downloading video for tweet:', url);
    const response = await fetch(`${API_SERVER_URL}/api/video/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, bookmarkId })
    });

    if (!response.ok) {
      console.warn('[Background] Video download failed:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[Background] Video downloaded:', data.localUrl);
    return data.localUrl;
  } catch (error) {
    console.warn('[Background] Error downloading video:', error);
    return null;
  }
}

async function handleSaveBookmark(bookmark) {
  // Check if authenticated first
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error('Not logged in. Please sign in via the main app first.');
  }

  try {
    // If this is a tweet with an embedded link (cardUrl), fetch the og:image for that link
    const cardUrl = bookmark.metadata?.tweetData?.cardUrl;
    if (cardUrl && !bookmark.thumbnail) {
      console.log('[Background] Tweet has embedded link, fetching og:image for:', cardUrl);
      const ogImage = await fetchOgImage(cardUrl);
      if (ogImage) {
        console.log('[Background] Found og:image for embedded link:', ogImage);
        bookmark.thumbnail = ogImage;
        // Also store in metadata for the frontend to use
        if (bookmark.metadata?.tweetData) {
          bookmark.metadata.tweetData.cardImage = ogImage;
        }
      }
    }

    // Try to save to Supabase
    const savedBookmark = await saveBookmarkToSupabase(bookmark);

    // Check if this is a tweet with video - download it in background
    const isTwitter = bookmark.url?.includes('twitter.com') || bookmark.url?.includes('x.com');
    const hasVideo = bookmark.metadata?.tweetData?.tweetMedia?.some(m => m.type === 'video');

    if (isTwitter && hasVideo && savedBookmark?.id) {
      // Download video asynchronously (don't block the save)
      downloadVideoInBackground(bookmark.url, savedBookmark.id)
        .then(localUrl => {
          if (localUrl) {
            console.log('[Background] Video cached successfully:', localUrl);
          }
        })
        .catch(err => console.warn('[Background] Video download failed:', err));
    }

    return { source: 'supabase', bookmark: savedBookmark };
  } catch (error) {
    console.warn('Supabase unavailable, saving offline:', error);
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

// Sync offline bookmarks to Supabase
async function syncOfflineBookmarks() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return; // Can't sync without auth
  }

  const offlineBookmarks = await getOfflineBookmarks();

  if (offlineBookmarks.length === 0) {
    return;
  }

  console.log(`Syncing ${offlineBookmarks.length} offline bookmarks...`);

  for (const bookmark of offlineBookmarks) {
    try {
      await saveBookmarkToSupabase(bookmark);
      // Successfully synced, delete from IndexedDB
      await deleteOfflineBookmark(bookmark.id);
      console.log(`Successfully synced bookmark: ${bookmark.title}`);
    } catch (error) {
      console.warn(`Could not sync bookmark "${bookmark.title}", will retry later:`, error);
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
