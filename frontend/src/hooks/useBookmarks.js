import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { mapDbBookmark } from '../lib/bookmarkMapper';

export function useBookmarks() {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBookmarks = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const mapped = (data || []).map(mapDbBookmark);
            setBookmarks(mapped);
        } catch (err) {
            console.error('Error fetching bookmarks:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookmarks();

        // Listen for auth state changes to clear/refetch bookmarks
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                // Clear bookmarks when user logs out
                setBookmarks([]);
                setLoading(false);
            } else if (event === 'SIGNED_IN') {
                // Refetch bookmarks when user logs in
                fetchBookmarks();
            }
        });

        // Optional: Set up real-time subscription for bookmark changes
        const dbSubscription = supabase
            .channel('bookmarks-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks' }, () => {
                fetchBookmarks();
            })
            .subscribe();

        return () => {
            authSubscription.unsubscribe();
            dbSubscription.unsubscribe();
        };
    }, [fetchBookmarks]);

    const refetch = useCallback(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    const updateBookmark = useCallback((updatedBookmark) => {
        setBookmarks(prev => prev.map(b =>
            b.id === updatedBookmark.id ? { ...b, ...updatedBookmark } : b
        ));
    }, []);

    const removeBookmark = useCallback((bookmarkId) => {
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    }, []);

    return { bookmarks, loading, error, refetch, updateBookmark, removeBookmark };
}
