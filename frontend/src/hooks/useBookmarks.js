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

    return { bookmarks, loading, error, refetch };
}
