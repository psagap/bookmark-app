import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useCollections() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCollections = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('collections')
                .select('*')
                .order('name');

            if (error) throw error;
            setCollections(data || []);
        } catch (err) {
            console.error('Error fetching collections:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    const createCollection = useCallback(async (name, color) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('collections')
            .insert([{ name, color, user_id: user.id, user_email: user.email || '' }])
            .select()
            .single();

        if (error) throw error;
        setCollections(prev => [...prev, data]);
        return data;
    }, []);

    const addToCollection = useCallback(async (collectionId, bookmarkIds) => {
        // In our schema, many bookmarks can belong to one collection (one-to-many)
        // So we update the collection_id of the bookmarks
        const { error } = await supabase
            .from('bookmarks')
            .update({ collection_id: collectionId })
            .in('id', bookmarkIds);

        if (error) throw error;
    }, []);

    const deleteCollection = useCallback(async (collectionId) => {
        const { error } = await supabase
            .from('collections')
            .delete()
            .eq('id', collectionId);

        if (error) throw error;
        setCollections(prev => prev.filter(c => c.id !== collectionId));
    }, []);

    const updateCollection = useCallback(async (collectionId, updates) => {
        const { data, error } = await supabase
            .from('collections')
            .update(updates)
            .eq('id', collectionId)
            .select()
            .single();

        if (error) throw error;
        setCollections(prev => prev.map(c => (c.id === collectionId ? { ...c, ...data } : c)));
        return data;
    }, []);

    const refetch = useCallback(() => {
        fetchCollections();
    }, [fetchCollections]);

    return { collections, loading, error, createCollection, addToCollection, deleteCollection, updateCollection, refetch };
}
