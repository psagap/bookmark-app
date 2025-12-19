import { useState, useEffect, useCallback } from 'react';

export function useBookmarks() {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBookmarks = useCallback(() => {
        setLoading(true);
        fetch('/api/bookmarks')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch bookmarks');
                return res.json();
            })
            .then(data => {
                setBookmarks(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    const refetch = useCallback(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    // Optimistic update - updates local state without refetching
    // This preserves scroll position and provides instant feedback
    const updateBookmark = useCallback((updatedBookmark) => {
        setBookmarks(prev => prev.map(b =>
            b.id === updatedBookmark.id ? { ...b, ...updatedBookmark } : b
        ));
    }, []);

    // Remove a bookmark from local state
    const removeBookmark = useCallback((bookmarkId) => {
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    }, []);

    return { bookmarks, loading, error, refetch, updateBookmark, removeBookmark };
}
