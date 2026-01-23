import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { mapDbBookmark, toDbBookmarkPatch } from '../lib/bookmarkMapper';
import { uploadImage, getImageDimensions, deleteImage } from '../lib/imageStorage';

export function useBookmarks() {
    const [allBookmarks, setAllBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Separate published bookmarks from drafts
    const bookmarks = useMemo(() =>
        allBookmarks.filter(b => b.status !== 'draft'),
        [allBookmarks]
    );

    const drafts = useMemo(() =>
        allBookmarks.filter(b => b.status === 'draft'),
        [allBookmarks]
    );

    const fetchBookmarks = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const mapped = (data || []).map(mapDbBookmark);
            setAllBookmarks(mapped);
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

        // Real-time subscription for bookmark changes
        // Only refetch for INSERT and DELETE - UPDATE is handled by optimistic updates
        const dbSubscription = supabase
            .channel('bookmarks-db-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookmarks' }, () => {
                fetchBookmarks();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookmarks' }, () => {
                fetchBookmarks();
            })
            // UPDATE events are handled optimistically - no refetch needed
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
        setAllBookmarks(prev => prev.map(b =>
            b.id === updatedBookmark.id ? { ...b, ...updatedBookmark } : b
        ));
    }, []);

    const removeBookmark = useCallback((bookmarkId) => {
        setAllBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    }, []);

    /**
     * Save an audio note as a draft
     */
    const saveDraft = useCallback(async (draftData) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            throw new Error('You must be logged in to save drafts');
        }

        const title = draftData.polishedText?.split('\n')[0]?.substring(0, 100) || 'Audio Note Draft';

        // If we have an existing draft ID, update it
        if (draftData.draftId) {
            const updatePayload = {
                title,
                notes: draftData.polishedText,
                tags: draftData.tags || [],
                metadata: {
                    rawTranscript: draftData.rawTranscript,
                    detectedFormat: draftData.detectedFormat,
                    processingTimeMs: draftData.processingTime,
                },
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('bookmarks')
                .update(updatePayload)
                .eq('id', draftData.draftId)
                .select()
                .single();

            if (error) throw error;
            const mapped = mapDbBookmark(data);
            updateBookmark(mapped);
            return mapped;
        }

        // Create new draft
        const newDraft = {
            user_id: user.id,
            url: `audio-note://${Date.now()}`,
            title,
            notes: draftData.polishedText,
            tags: draftData.tags || [],
            type: 'audio-note',
            status: 'draft',
            metadata: {
                rawTranscript: draftData.rawTranscript,
                detectedFormat: draftData.detectedFormat,
                processingTimeMs: draftData.processingTime,
            },
        };

        const { data, error } = await supabase
            .from('bookmarks')
            .insert([newDraft])
            .select()
            .single();

        if (error) throw error;
        const mapped = mapDbBookmark(data);
        setAllBookmarks(prev => [mapped, ...prev]);
        return mapped;
    }, [updateBookmark]);

    /**
     * Delete a draft
     */
    const deleteDraft = useCallback(async (draftId) => {
        const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('id', draftId);

        if (error) throw error;
        removeBookmark(draftId);
    }, [removeBookmark]);

    /**
     * Convert a draft to a published note
     */
    const publishDraft = useCallback(async (draftId, updates = {}) => {
        const { data, error } = await supabase
            .from('bookmarks')
            .update({
                status: 'published',
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', draftId)
            .select()
            .single();

        if (error) throw error;
        const mapped = mapDbBookmark(data);
        updateBookmark(mapped);
        return mapped;
    }, [updateBookmark]);

    /**
     * Create a new image bookmark from a dropped file
     */
    const createImageBookmark = useCallback(async (imageFile) => {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            throw new Error('You must be logged in to upload images');
        }

        // Get image dimensions
        const dimensions = await getImageDimensions(imageFile);

        // Upload to Supabase Storage
        const { url, path } = await uploadImage(imageFile);

        // Create bookmark record
        const imageBookmark = {
            user_id: user.id,
            user_email: user.email,
            url: url,
            title: imageFile.name,
            type: 'image',
            category: 'image',
            subCategory: 'uploaded',
            thumbnail: url,
            coverImage: url,
            metadata: {
                storagePath: path,
                width: dimensions.width,
                height: dimensions.height,
                fileSize: imageFile.size,
                mimeType: imageFile.type,
            },
        };

        const { data, error } = await supabase
            .from('bookmarks')
            .insert([toDbBookmarkPatch(imageBookmark)])
            .select()
            .single();

        if (error) {
            // Clean up uploaded image on failure
            await deleteImage(path);
            throw error;
        }

        const mapped = mapDbBookmark(data);

        // Add to local state immediately (real-time will also catch this)
        setAllBookmarks(prev => [mapped, ...prev]);

        return mapped;
    }, []);

    /**
     * Delete a bookmark, including storage cleanup for images
     */
    const deleteBookmark = useCallback(async (bookmark) => {
        // If it's an image with a storage path, delete from storage first
        if (bookmark.type === 'image' && bookmark.metadata?.storagePath) {
            await deleteImage(bookmark.metadata.storagePath);
        }

        // Delete from database
        const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('id', bookmark.id);

        if (error) throw error;

        // Remove from local state
        removeBookmark(bookmark.id);
    }, [removeBookmark]);

    return {
        bookmarks,
        drafts,
        loading,
        error,
        refetch,
        updateBookmark,
        removeBookmark,
        createImageBookmark,
        deleteBookmark,
        saveDraft,
        deleteDraft,
        publishDraft,
    };
}
