import { useState, useEffect, useCallback } from 'react';

export function useCollections() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCollections = useCallback(() => {
        setLoading(true);
        fetch('/api/collections')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch collections');
                return res.json();
            })
            .then(data => {
                setCollections(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    const createCollection = useCallback(async (name, color) => {
        const response = await fetch('/api/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });
        if (!response.ok) throw new Error('Failed to create collection');
        const newCollection = await response.json();
        setCollections(prev => [...prev, newCollection]);
        return newCollection;
    }, []);

    const addToCollection = useCallback(async (collectionId, bookmarkIds) => {
        const response = await fetch(`/api/collections/${collectionId}/bookmarks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookmarkIds })
        });
        if (!response.ok) throw new Error('Failed to add bookmarks to collection');
        return response.json();
    }, []);

    const deleteCollection = useCallback(async (collectionId) => {
        const response = await fetch(`/api/collections/${collectionId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete collection');
        setCollections(prev => prev.filter(c => c.id !== collectionId));
    }, []);

    const refetch = useCallback(() => {
        fetchCollections();
    }, [fetchCollections]);

    return { collections, loading, error, createCollection, addToCollection, deleteCollection, refetch };
}
