/**
 * Supabase client for browser extension
 * Uses REST API directly - no build step needed
 */

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
        title: bookmark.title || '',
        url: bookmark.url || '',
        description: bookmark.metadata?.ogDescription || '',
        notes: bookmark.notes || '',
        tags: bookmark.tags || [],
        pinned: false,
        type: bookmark.category || 'Article',
        cover_image: bookmark.thumbnail || '',
    };

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

/**
 * Check if there's an active session by trying to get user
 */
async function isAuthenticated() {
    const token = await getAccessToken();
    return !!token;
}
