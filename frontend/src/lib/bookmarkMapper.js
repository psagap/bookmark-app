const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const mapDbBookmark = (row = {}) => ({
    ...row,
    id: row.id ?? null,
    userId: row.user_id ?? row.userId ?? null,
    url: row.url ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    notes: row.notes ?? '',
    notesHtml: row.notes_html ?? row.notesHtml ?? null,
    notesBlocks: row.notes_blocks ?? row.notesBlocks ?? null,
    content: row.content ?? row.notes ?? '',
    tags: ensureArray(row.tags),
    pinned: row.pinned ?? false,
    type: row.type ?? null,
    category: row.category ?? null,
    subCategory: row.sub_category ?? row.subCategory ?? null,
    collectionId: row.collection_id ?? row.collectionId ?? null,
    coverImage: row.cover_image ?? row.coverImage ?? null,
    thumbnail: row.thumbnail ?? row.cover_image ?? row.coverImage ?? null,
    metadata: row.metadata ?? {},
    archived: row.archived ?? false,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
});

const assignIfDefined = (payload, key, value) => {
    if (value !== undefined) {
        payload[key] = value;
    }
};

export const toDbBookmarkPatch = (bookmark = {}) => {
    const payload = {};
    assignIfDefined(payload, 'user_id', bookmark.user_id ?? bookmark.userId);
    assignIfDefined(payload, 'user_email', bookmark.user_email ?? bookmark.userEmail);
    assignIfDefined(payload, 'url', bookmark.url);
    assignIfDefined(payload, 'title', bookmark.title);
    assignIfDefined(payload, 'description', bookmark.description);
    assignIfDefined(payload, 'notes', bookmark.notes ?? bookmark.content);
    assignIfDefined(payload, 'notes_html', bookmark.notes_html ?? bookmark.notesHtml);
    assignIfDefined(payload, 'notes_blocks', bookmark.notes_blocks ?? bookmark.notesBlocks);
    assignIfDefined(payload, 'content', bookmark.content ?? bookmark.notes);
    assignIfDefined(payload, 'tags', bookmark.tags);
    assignIfDefined(payload, 'pinned', bookmark.pinned);
    assignIfDefined(payload, 'type', bookmark.type);
    assignIfDefined(payload, 'category', bookmark.category);
    assignIfDefined(payload, 'sub_category', bookmark.sub_category ?? bookmark.subCategory);
    assignIfDefined(payload, 'collection_id', bookmark.collection_id ?? bookmark.collectionId);
    assignIfDefined(payload, 'cover_image', bookmark.cover_image ?? bookmark.coverImage ?? bookmark.thumbnail);
    assignIfDefined(payload, 'thumbnail', bookmark.thumbnail);
    assignIfDefined(payload, 'metadata', bookmark.metadata);
    assignIfDefined(payload, 'archived', bookmark.archived);
    assignIfDefined(payload, 'updated_at', bookmark.updated_at ?? bookmark.updatedAt);
    return payload;
};
