// Simple Express server for bookmark management
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend/dist')));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.');
  }
  return supabase;
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDbTimestamp = (value) => {
  const date = toDate(value);
  return date ? date.toISOString() : null;
};

const toEpochMs = (value) => {
  const date = toDate(value);
  return date ? date.getTime() : null;
};

const toDbBookmark = (bookmark) => ({
  id: bookmark.id,
  user_id: bookmark.userId,
  url: bookmark.url,
  title: bookmark.title,
  thumbnail: bookmark.thumbnail || null,
  created_at: toDbTimestamp(bookmark.createdAt),
  updated_at: toDbTimestamp(bookmark.updatedAt),
  category: bookmark.category || null,
  sub_category: bookmark.subCategory || null,
  tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
  metadata: bookmark.metadata || {},
  notes: bookmark.notes || '',
  archived: bookmark.archived ?? false,
  collection_id: bookmark.collectionId || null,
  description: bookmark.description || null,
});

const fromDbBookmark = (row) => ({
  id: row.id,
  userId: row.user_id,
  url: row.url,
  title: row.title,
  thumbnail: row.thumbnail || '',
  createdAt: toEpochMs(row.created_at),
  updatedAt: toEpochMs(row.updated_at),
  category: row.category || null,
  subCategory: row.sub_category || null,
  tags: Array.isArray(row.tags) ? row.tags : [],
  metadata: row.metadata || {},
  notes: row.notes || '',
  archived: row.archived ?? false,
  collectionId: row.collection_id || null,
  description: row.description || '',
});

const buildBookmarkUpdate = (patch) => {
  const update = {};
  if ('userId' in patch) update.user_id = patch.userId;
  if ('url' in patch) update.url = patch.url;
  if ('title' in patch) update.title = cleanTitle(patch.title);
  if ('thumbnail' in patch) update.thumbnail = patch.thumbnail || null;
  if ('category' in patch) update.category = patch.category || null;
  if ('subCategory' in patch) update.sub_category = patch.subCategory || null;
  if ('subcategory' in patch) update.sub_category = patch.subcategory || null;
  if ('tags' in patch) update.tags = Array.isArray(patch.tags) ? patch.tags : [];
  if ('metadata' in patch) update.metadata = patch.metadata || {};
  if ('notes' in patch) update.notes = patch.notes || '';
  if ('archived' in patch) update.archived = patch.archived;
  if ('collectionId' in patch) update.collection_id = patch.collectionId || null;
  if ('description' in patch) update.description = patch.description || '';
  if ('createdAt' in patch) update.created_at = toDbTimestamp(patch.createdAt);
  if ('updatedAt' in patch) update.updated_at = toDbTimestamp(patch.updatedAt);
  return update;
};

const loadBookmarks = async () => {
  const client = ensureSupabase();
  const pageSize = 1000;
  let from = 0;
  let rows = [];

  while (true) {
    const { data, error } = await client
      .from('bookmarks')
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    rows = rows.concat(data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows.map(fromDbBookmark);
};

const getBookmarkById = async (id) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('bookmarks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromDbBookmark(data) : null;
};

const createBookmark = async (bookmark) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('bookmarks')
    .insert([toDbBookmark(bookmark)])
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return fromDbBookmark(data);
};

const updateBookmarkById = async (id, patch) => {
  const client = ensureSupabase();
  const update = buildBookmarkUpdate(patch);

  if (Object.keys(update).length === 0) {
    return getBookmarkById(id);
  }

  const { data, error } = await client
    .from('bookmarks')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromDbBookmark(data) : null;
};

const deleteBookmarkById = async (id) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('bookmarks')
    .delete()
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromDbBookmark(data) : null;
};

const deleteBookmarksByIds = async (ids) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('bookmarks')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    throw error;
  }

  return data || [];
};

const setCollectionForBookmarks = async (collectionId, bookmarkIds) => {
  const client = ensureSupabase();
  const updatedAt = new Date().toISOString();
  const { data, error } = await client
    .from('bookmarks')
    .update({ collection_id: collectionId, updated_at: updatedAt })
    .in('id', bookmarkIds)
    .select('id');

  if (error) {
    throw error;
  }

  return data || [];
};

const removeCollectionForBookmarks = async (collectionId, bookmarkIds) => {
  const client = ensureSupabase();
  const updatedAt = new Date().toISOString();
  const { data, error } = await client
    .from('bookmarks')
    .update({ collection_id: null, updated_at: updatedAt })
    .eq('collection_id', collectionId)
    .in('id', bookmarkIds)
    .select('id');

  if (error) {
    throw error;
  }

  return data || [];
};

const clearCollectionFromBookmarks = async (collectionId) => {
  const client = ensureSupabase();
  const updatedAt = new Date().toISOString();
  const { data, error } = await client
    .from('bookmarks')
    .update({ collection_id: null, updated_at: updatedAt })
    .eq('collection_id', collectionId)
    .select('id');

  if (error) {
    throw error;
  }

  return data || [];
};

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// Clean up title by removing leading parenthetical numbers like "(2)" or "(34)"
// These are typically browser notification counts or tab numbers
const cleanTitle = (title) => {
  if (!title) return title;
  // Remove leading "(number) " pattern - e.g., "(2) ", "(34) "
  return title.replace(/^\(\d+\)\s*/, '').trim();
};

// Helper to extract YouTube video ID from URL
const extractYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Fetch YouTube video description by scraping the page
const fetchYouTubeDescription = async (videoId) => {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      console.warn(`YouTube fetch failed with status ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Method 1: Look for og:description meta tag
    const ogMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) ||
                    html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/i);
    if (ogMatch && ogMatch[1]) {
      // Decode HTML entities
      return ogMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\\n/g, '\n');
    }

    // Method 2: Look for description in ytInitialPlayerResponse JSON
    const jsonMatch = html.match(/var\s+ytInitialPlayerResponse\s*=\s*({[\s\S]*?});/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        // This JSON can be huge, so we extract just what we need
        const shortDescMatch = jsonMatch[1].match(/"shortDescription"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (shortDescMatch && shortDescMatch[1]) {
          return shortDescMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      } catch (parseError) {
        console.warn('Failed to parse ytInitialPlayerResponse:', parseError.message);
      }
    }

    // Method 3: Look in meta description
    const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (metaDescMatch && metaDescMatch[1]) {
      return metaDescMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch YouTube description:', error.message);
    return null;
  }
};

// Fetch YouTube video details via YouTube Data API (more reliable than scraping)
const fetchYouTubeVideoDetailsAPI = async (videoId) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.log('No YOUTUBE_API_KEY found, falling back to scrape method');
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`YouTube Data API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      console.warn(`No video found for ID: ${videoId}`);
      return null;
    }

    const video = data.items[0];
    const snippet = video.snippet || {};
    const contentDetails = video.contentDetails || {};
    const statistics = video.statistics || {};

    // Parse ISO 8601 duration (e.g., PT4M13S -> "4:13")
    const parseDuration = (isoDuration) => {
      if (!isoDuration) return null;
      const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return null;
      const hours = parseInt(match[1] || 0);
      const minutes = parseInt(match[2] || 0);
      const seconds = parseInt(match[3] || 0);
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    return {
      videoId,
      videoDescription: snippet.description || '',
      channelTitle: snippet.channelTitle || '',
      channelId: snippet.channelId || '',
      publishedAt: snippet.publishedAt || '',
      thumbnails: snippet.thumbnails || {},
      duration: parseDuration(contentDetails.duration),
      durationRaw: contentDetails.duration || '',
      viewCount: statistics.viewCount || '',
      likeCount: statistics.likeCount || '',
      commentCount: statistics.commentCount || '',
      tags: snippet.tags || [],
      categoryId: snippet.categoryId || '',
      fetchedAt: Date.now(),
      source: 'youtube-api'
    };
  } catch (error) {
    console.error('YouTube Data API error:', error.message);
    return null;
  }
};

// Combined YouTube metadata fetch - tries API first, falls back to scrape
const fetchYouTubeMetadata = async (videoId) => {
  // Try YouTube Data API first (more reliable, richer data)
  const apiData = await fetchYouTubeVideoDetailsAPI(videoId);
  if (apiData) {
    return apiData;
  }

  // Fallback to scraping
  const scrapedDescription = await fetchYouTubeDescription(videoId);
  if (scrapedDescription) {
    return {
      videoId,
      videoDescription: scrapedDescription,
      fetchedAt: Date.now(),
      source: 'scrape'
    };
  }

  return null;
};

// Routes

// GET all bookmarks with filters
app.get('/api/bookmarks', asyncHandler(async (req, res) => {
  let bookmarks = await loadBookmarks();
  const { category, search, subcategory } = req.query;

  if (category) {
    bookmarks = bookmarks.filter(b => b.category === category);
  }
  if (subcategory) {
    bookmarks = bookmarks.filter(b => b.subCategory === subcategory);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    bookmarks = bookmarks.filter(b =>
      b.title.toLowerCase().includes(searchLower) ||
      b.url.toLowerCase().includes(searchLower) ||
      (b.metadata?.selectedText || '').toLowerCase().includes(searchLower)
    );
  }

  bookmarks.sort((a, b) => b.createdAt - a.createdAt);
  res.json(bookmarks);
}));

// GET single bookmark
app.get('/api/bookmarks/:id', asyncHandler(async (req, res) => {
  const bookmark = await getBookmarkById(req.params.id);

  if (!bookmark) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  res.json(bookmark);
}));

// GET all unique tags across all bookmarks
app.get('/api/tags', asyncHandler(async (req, res) => {
  const bookmarks = await loadBookmarks();
  const allTags = new Set();

  bookmarks.forEach(bookmark => {
    (bookmark.tags || []).forEach(tag => {
      if (tag && typeof tag === 'string') {
        allTags.add(tag.toLowerCase().trim());
      }
    });
  });

  res.json({
    tags: Array.from(allTags).sort()
  });
}));

// POST new bookmark
app.post('/api/bookmarks', asyncHandler(async (req, res) => {
  const url = req.body.url || '';
  const incomingTags = Array.isArray(req.body.tags) ? req.body.tags : [];

  // Auto-categorize the URL
  const { category: detectedCategory, subCategory: detectedSubCategory } = categorizeUrl(url);
  const category = req.body.category || detectedCategory;
  const subCategory = req.body.subCategory || req.body.subcategory || detectedSubCategory;

  console.log(`Bookmark categorized as: ${category}/${subCategory} for ${url}`);

  // Initialize metadata
  let metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
  let extractedThumbnail = '';

  // If it's a YouTube URL, fetch video metadata (API first, then scrape fallback)
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      console.log(`Fetching YouTube metadata for video: ${videoId}`);
      const youtubeData = await fetchYouTubeMetadata(videoId);
      if (youtubeData) {
        metadata = {
          ...metadata,
          ...youtubeData
        };
        console.log(`YouTube metadata fetched (${youtubeData.source}): ${(youtubeData.videoDescription || '').slice(0, 100)}...`);
      }
    }
  }
  // For Wikipedia URLs, fetch Wikipedia-specific metadata
  else if (url.includes('wikipedia.org')) {
    try {
      console.log(`Extracting Wikipedia metadata for: ${url}`);
      const wikiData = await extractWikipediaMetadata(url);
      if (wikiData) {
        metadata = {
          ...metadata,
          wikipediaData: wikiData,
          siteName: 'Wikipedia',
          ogDescription: wikiData.extract
        };
        extractedThumbnail = wikiData.originalImage || wikiData.thumbnail || '';
        console.log(`Wikipedia metadata extracted: ${wikiData.displayTitle}, image: ${extractedThumbnail ? 'yes' : 'no'}`);
      }
    } catch (err) {
      console.log('Wikipedia metadata extraction skipped:', err.message);
    }
  }
  // For X/Twitter URLs, fetch oEmbed AND video URL for reliable media display
  else if (url.includes('twitter.com') || url.includes('x.com')) {
    // Fetch oEmbed for embed HTML
    try {
      console.log(`Fetching X oEmbed for: ${url}`);
      const twitterUrl = url.replace('x.com', 'twitter.com');
      const params = new URLSearchParams({
        url: twitterUrl,
        maxwidth: '550',
        omit_script: '1',
        theme: 'dark',
        hide_thread: '1',
        hide_media: '0',
        dnt: 'true',
        lang: 'en'
      });

      const oembedResponse = await fetch(`https://publish.twitter.com/oembed?${params.toString()}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });

      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        metadata = {
          ...metadata,
          tweetData: {
            ...(metadata.tweetData || {}),
            embedHtml: oembedData.html,
            oembedAuthorName: oembedData.author_name,
            oembedAuthorUrl: oembedData.author_url,
            oembedCacheAge: parseInt(oembedData.cache_age) || 86400
          }
        };
        console.log(`X oEmbed fetched: author=${oembedData.author_name}`);
      }
    } catch (err) {
      console.log('X oEmbed fetch skipped:', err.message);
    }

    // Also fetch direct video URL from FxTwitter for autoplay support
    // This is done AFTER oEmbed to get additional video-specific data
    try {
      console.log(`Fetching X video URL via FxTwitter for: ${url}`);
      const videoResult = await fetchVideoFromFxTwitter(url);

      if (videoResult.success && videoResult.videoUrl) {
        // Update tweetMedia with the direct video URL
        const existingMedia = metadata.tweetData?.tweetMedia || [];
        const hasVideo = existingMedia.some(m => m.type === 'video');

        if (hasVideo) {
          // Update existing video entries with the direct URL
          metadata.tweetData = {
            ...metadata.tweetData,
            tweetMedia: existingMedia.map(m => {
              if (m.type === 'video') {
                return {
                  ...m,
                  url: videoResult.videoUrl, // Replace blob: URL with direct URL
                  fxTwitterUrl: videoResult.videoUrl,
                  poster: m.poster || videoResult.thumbnail
                };
              }
              return m;
            }),
            fxTwitterVideoUrl: videoResult.videoUrl,
            fxTwitterThumbnail: videoResult.thumbnail
          };
        } else {
          // Add video to media array
          metadata.tweetData = {
            ...metadata.tweetData,
            tweetMedia: [
              ...existingMedia,
              {
                type: 'video',
                url: videoResult.videoUrl,
                fxTwitterUrl: videoResult.videoUrl,
                poster: videoResult.thumbnail
              }
            ],
            fxTwitterVideoUrl: videoResult.videoUrl,
            fxTwitterThumbnail: videoResult.thumbnail
          };
        }

        // Also update thumbnail if we got one
        if (videoResult.thumbnail && !extractedThumbnail) {
          extractedThumbnail = videoResult.thumbnail;
        }

        console.log(`X video URL fetched via FxTwitter: ${videoResult.videoUrl.substring(0, 50)}...`);
      } else {
        console.log(`X FxTwitter: ${videoResult.error || 'No video found'}`);
      }
    } catch (err) {
      console.log('X FxTwitter video fetch skipped:', err.message);
    }
  }
  // For article/webpage URLs (not YouTube, Twitter, or Wikipedia), extract metadata
  else {
    try {
      console.log(`Extracting article metadata for: ${url}`);
      const articleData = await extractArticleMetadata(url);
      if (articleData) {
        metadata = {
          ...metadata,
          siteName: articleData.siteName,
          author: articleData.author,
          publishedDate: articleData.publishedDate,
          ogImage: articleData.ogImage,
          ogDescription: articleData.ogDescription
        };
        extractedThumbnail = articleData.ogImage || '';
        console.log(`Article metadata extracted: site=${articleData.siteName}, author=${articleData.author}, ogImage=${articleData.ogImage ? 'yes' : 'no'}`);
      }
    } catch (err) {
      console.log('Article metadata extraction skipped:', err.message);
    }
  }

  const createdAt = toEpochMs(req.body.createdAt) ?? Date.now();
  const newBookmark = {
    id: req.body.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'local-user',
    url: url,
    title: cleanTitle(req.body.title),
    thumbnail: req.body.thumbnail || req.body.ogImage || extractedThumbnail || '',
    category,
    subCategory,
    createdAt,
    updatedAt: Date.now(),
    tags: incomingTags,
    metadata,
    notes: req.body.notes || '',
    archived: req.body.archived || false,
    collectionId: req.body.collectionId || null,
    description: req.body.description || '',
  };

  const created = await createBookmark(newBookmark);
  res.status(201).json(created);
}));

// PUT update bookmark
app.put('/api/bookmarks/:id', asyncHandler(async (req, res) => {
  const updated = await updateBookmarkById(req.params.id, {
    ...req.body,
    updatedAt: Date.now(),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  res.json(updated);
}));

// DELETE bookmark
app.delete('/api/bookmarks/:id', asyncHandler(async (req, res) => {
  const deleted = await deleteBookmarkById(req.params.id);

  if (!deleted) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  res.json(deleted);
}));

// POST bulk delete bookmarks
app.post('/api/bookmarks/bulk-delete', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  const deleted = await deleteBookmarksByIds(ids);
  res.json({ deleted: deleted.length, ids: deleted.map(b => b.id) });
}));

// POST refresh bookmark metadata (fetch fresh images from oEmbed)
app.post('/api/bookmarks/:id/refresh', asyncHandler(async (req, res) => {
  const bookmark = await getBookmarkById(req.params.id);

  if (!bookmark) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  const url = bookmark.url;

  try {
    let updatedMetadata = { ...bookmark.metadata };
    let thumbnail = bookmark.thumbnail;

    // If Twitter/X URL, try oEmbed
    if (url.includes('twitter.com') || url.includes('x.com')) {
      try {
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
        const oembedRes = await fetch(oembedUrl);

        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();

          if (oembedData.thumbnail_url) {
            thumbnail = oembedData.thumbnail_url;
          } else if (oembedData.html) {
            const imgMatch = oembedData.html.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) thumbnail = imgMatch[1];
          }

          updatedMetadata.oembedData = {
            authorName: oembedData.author_name,
            authorUrl: oembedData.author_url
          };
        }
      } catch (oembedError) {
        console.warn('oEmbed refresh failed:', oembedError);
      }
    }

    // If Wikipedia URL, try Wikipedia REST API with extended data
    if (url.includes('wikipedia.org')) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/wiki/');
        const pageTitle = pathParts[1] ? decodeURIComponent(pathParts[1]) : '';

        // Detect language from subdomain
        const langMatch = urlObj.hostname.match(/^(\w+)\.wikipedia\.org/);
        const lang = langMatch ? langMatch[1] : 'en';

        if (pageTitle) {
          const wikiRes = await fetch(
            `http://127.0.0.1:${PORT}/api/wikipedia/metadata?title=${lang}:${encodeURIComponent(pageTitle)}&extended=true`,
            { headers: { 'User-Agent': 'BookmarkApp (local)' } }
          );

          if (wikiRes.ok) {
            const wikiData = await wikiRes.json();
            thumbnail = wikiData.originalImage || wikiData.thumbnail || thumbnail;
            updatedMetadata.ogDescription = wikiData.extract || updatedMetadata.ogDescription;
            updatedMetadata.wikipediaData = {
              title: wikiData.title,
              displayTitle: wikiData.displayTitle,
              description: wikiData.description,
              extract: wikiData.extract,
              thumbnail: wikiData.thumbnail,
              originalImage: wikiData.originalImage,
              categories: wikiData.categories || [],
              pageid: wikiData.pageid,
              lang: wikiData.lang,
              lastModified: wikiData.lastModified,
              type: wikiData.type,
              fetchedAt: Date.now()
            };
          }
        }
      } catch (wikiError) {
        console.warn('Wikipedia refresh failed:', wikiError);
      }
    }

    // If YouTube URL, refresh video metadata
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        const videoId = extractYouTubeVideoId(url);
        if (videoId) {
          console.log(`Refreshing YouTube metadata for video: ${videoId}`);
          const youtubeData = await fetchYouTubeMetadata(videoId);
          if (youtubeData) {
            // Merge YouTube data into metadata
            updatedMetadata = {
              ...updatedMetadata,
              ...youtubeData
            };
            // Update thumbnail to high-quality YouTube thumbnail
            if (youtubeData.thumbnails?.maxres?.url) {
              thumbnail = youtubeData.thumbnails.maxres.url;
            } else if (youtubeData.thumbnails?.high?.url) {
              thumbnail = youtubeData.thumbnails.high.url;
            }
            console.log(`YouTube metadata refreshed (${youtubeData.source})`);
          }
        }
      } catch (ytError) {
        console.warn('YouTube refresh failed:', ytError);
      }
    }

    // For article URLs (not YouTube, Twitter, or Wikipedia), refresh article metadata
    if (!url.includes('youtube.com') && !url.includes('youtu.be') &&
        !url.includes('twitter.com') && !url.includes('x.com') &&
        !url.includes('wikipedia.org')) {
      try {
        console.log(`Refreshing article metadata for: ${url}`);
        const articleData = await extractArticleMetadata(url);
        if (articleData) {
          updatedMetadata = {
            ...updatedMetadata,
            siteName: articleData.siteName,
            author: articleData.author,
            publishedDate: articleData.publishedDate,
            ogImage: articleData.ogImage,
            ogDescription: articleData.ogDescription
          };
          // Use og:image as thumbnail if we don't have one
          if (articleData.ogImage && !thumbnail) {
            thumbnail = articleData.ogImage;
          }
          console.log(`Article metadata refreshed: site=${articleData.siteName}, author=${articleData.author}, ogImage=${articleData.ogImage ? 'yes' : 'no'}`);
        }
      } catch (articleError) {
        console.warn('Article refresh failed:', articleError);
      }
    }

    const updated = await updateBookmarkById(req.params.id, {
      thumbnail,
      metadata: updatedMetadata,
      updatedAt: Date.now()
    });

    res.json(updated);
  } catch (error) {
    console.error('Error refreshing bookmark:', error);
    res.status(500).json({ error: error.message });
  }
}));

// POST backfill YouTube metadata for existing bookmarks missing videoDescription
app.post('/api/youtube/backfill', asyncHandler(async (req, res) => {
  try {
    let bookmarks = await loadBookmarks();
    
    // Find YouTube bookmarks missing or with generic videoDescription
    const genericYouTubeDesc = "Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube.";
    const youtubeBookmarks = bookmarks.filter(b => {
      const url = b.url || '';
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const videoDesc = b.metadata?.videoDescription;
      // Process if missing, empty, or equals the generic YouTube description
      const needsUpdate = !videoDesc ||
        videoDesc === '' ||
        videoDesc === genericYouTubeDesc ||
        videoDesc === b.metadata?.ogDescription;
      return isYouTube && needsUpdate;
    });

    if (youtubeBookmarks.length === 0) {
      return res.json({ 
        message: 'No YouTube bookmarks need backfilling',
        processed: 0,
        total: bookmarks.filter(b => (b.url || '').includes('youtube') || (b.url || '').includes('youtu.be')).length
      });
    }

    console.log(`Backfilling ${youtubeBookmarks.length} YouTube bookmarks...`);
    
    let processed = 0;
    let failed = 0;
    const results = [];

    for (const bookmark of youtubeBookmarks) {
      const videoId = extractYouTubeVideoId(bookmark.url);
      if (!videoId) {
        failed++;
        results.push({ id: bookmark.id, status: 'failed', reason: 'Could not extract video ID' });
        continue;
      }

      try {
        const youtubeData = await fetchYouTubeMetadata(videoId);
        if (youtubeData) {
          const update = {
            metadata: {
              ...bookmark.metadata,
              ...youtubeData
            },
            updatedAt: Date.now()
          };

          if (youtubeData.thumbnails?.maxres?.url) {
            update.thumbnail = youtubeData.thumbnails.maxres.url;
          } else if (youtubeData.thumbnails?.high?.url) {
            update.thumbnail = youtubeData.thumbnails.high.url;
          }

          const updated = await updateBookmarkById(bookmark.id, update);
          if (!updated) {
            failed++;
            results.push({ id: bookmark.id, status: 'failed', reason: 'Bookmark not found' });
          } else {
            processed++;
            results.push({ 
              id: bookmark.id, 
              title: bookmark.title,
              status: 'success', 
              source: youtubeData.source 
            });
          }
        } else {
          failed++;
          results.push({ id: bookmark.id, status: 'failed', reason: 'No data returned' });
        }
      } catch (err) {
        failed++;
        results.push({ id: bookmark.id, status: 'failed', reason: err.message });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    res.json({
      message: `Backfill complete`,
      processed,
      failed,
      total: youtubeBookmarks.length,
      results
    });
  } catch (error) {
    console.error('YouTube backfill error:', error);
    res.status(500).json({ error: error.message });
  }
}));

// POST backfill article metadata for existing bookmarks missing siteName/author/thumbnail
app.post('/api/article/backfill', asyncHandler(async (req, res) => {
  try {
    let bookmarks = await loadBookmarks();

    // Find article bookmarks (not YouTube, Twitter, Wikipedia) missing metadata or thumbnail
    const articleBookmarks = bookmarks.filter(b => {
      const url = b.url || '';
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const isTwitter = url.includes('twitter.com') || url.includes('x.com');
      const isWikipedia = url.includes('wikipedia.org');
      const missingMetadata = !b.metadata?.siteName && !b.metadata?.author;
      const missingThumbnail = !b.thumbnail;
      return !isYouTube && !isTwitter && !isWikipedia && (missingMetadata || missingThumbnail) && url;
    });

    if (articleBookmarks.length === 0) {
      return res.json({
        message: 'No article bookmarks need backfilling',
        processed: 0,
        total: 0
      });
    }

    console.log(`Backfilling ${articleBookmarks.length} article bookmarks...`);

    let processed = 0;
    let failed = 0;
    const results = [];

    for (const bookmark of articleBookmarks) {
      try {
        const articleData = await extractArticleMetadata(bookmark.url);
        if (articleData) {
          const updateData = {
            metadata: {
              ...bookmark.metadata,
              siteName: articleData.siteName,
              author: articleData.author,
              publishedDate: articleData.publishedDate,
              ogImage: articleData.ogImage,
              ogDescription: articleData.ogDescription
            },
            updatedAt: Date.now()
          };

          // Add thumbnail if we got an og:image and bookmark doesn't have one
          if (articleData.ogImage && !bookmark.thumbnail) {
            updateData.thumbnail = articleData.ogImage;
          }

          const updated = await updateBookmarkById(bookmark.id, updateData);

          if (!updated) {
            failed++;
            results.push({ id: bookmark.id, status: 'failed', reason: 'Bookmark not found' });
          } else {
            processed++;
            results.push({
              id: bookmark.id,
              title: bookmark.title,
              status: 'success',
              siteName: articleData.siteName,
              author: articleData.author,
              thumbnail: articleData.ogImage ? 'fetched' : 'none'
            });
          }
        } else {
          failed++;
          results.push({ id: bookmark.id, status: 'failed', reason: 'No metadata found' });
        }
      } catch (err) {
        failed++;
        results.push({ id: bookmark.id, status: 'failed', reason: err.message });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
      message: 'Article backfill complete',
      processed,
      failed,
      total: articleBookmarks.length,
      results
    });
  } catch (error) {
    console.error('Article backfill error:', error);
    res.status(500).json({ error: error.message });
  }
}));

// POST backfill X/Twitter oEmbed data for existing bookmarks
// This fetches oEmbed for X bookmarks that are missing embedHtml
app.post('/api/x/backfill', asyncHandler(async (req, res) => {
  try {
    const bookmarks = await loadBookmarks();

    // Find X/Twitter bookmarks missing oEmbed data
    const xBookmarks = bookmarks.filter(b => {
      const url = b.url || '';
      const isTwitter = url.includes('twitter.com') || url.includes('x.com');
      const hasEmbedHtml = b.metadata?.tweetData?.embedHtml;
      return isTwitter && !hasEmbedHtml;
    });

    if (xBookmarks.length === 0) {
      return res.json({
        message: 'No X bookmarks need oEmbed backfilling',
        processed: 0,
        total: 0
      });
    }

    console.log(`[X Backfill] Processing ${xBookmarks.length} X bookmarks for oEmbed...`);

    let processed = 0;
    let failed = 0;
    const results = [];

    // Limit concurrent requests
    const limit = req.body.limit || 10;
    const toProcess = xBookmarks.slice(0, limit);

    for (const bookmark of toProcess) {
      try {
        const twitterUrl = bookmark.url.replace('x.com', 'twitter.com');
        const params = new URLSearchParams({
          url: twitterUrl,
          maxwidth: '550',
          omit_script: '1',
          theme: 'dark',
          hide_thread: '1',
          hide_media: '0',
          dnt: 'true',
          lang: 'en'
        });

        const oembedResponse = await fetch(`https://publish.twitter.com/oembed?${params.toString()}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();

          const updateData = {
            metadata: {
              ...bookmark.metadata,
              tweetData: {
                ...(bookmark.metadata?.tweetData || {}),
                embedHtml: oembedData.html,
                oembedAuthorName: oembedData.author_name,
                oembedAuthorUrl: oembedData.author_url,
                oembedCacheAge: parseInt(oembedData.cache_age) || 86400,
                // If we didn't have author info from extraction, use oEmbed data
                authorName: bookmark.metadata?.tweetData?.authorName || oembedData.author_name
              }
            },
            updatedAt: Date.now()
          };

          await updateBookmarkById(bookmark.id, updateData);
          processed++;
          results.push({
            id: bookmark.id,
            status: 'success',
            authorName: oembedData.author_name
          });
        } else {
          failed++;
          results.push({
            id: bookmark.id,
            status: 'failed',
            reason: `oEmbed returned ${oembedResponse.status}`
          });
        }
      } catch (err) {
        failed++;
        results.push({ id: bookmark.id, status: 'failed', reason: err.message });
      }

      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
      message: 'X oEmbed backfill complete',
      processed,
      failed,
      remaining: xBookmarks.length - toProcess.length,
      total: xBookmarks.length,
      results
    });
  } catch (error) {
    console.error('[X Backfill] Error:', error);
    res.status(500).json({ error: error.message });
  }
}));

// In-memory cache for oEmbed responses
const oembedCache = new Map();

// GET Twitter oEmbed data with proper parameters for video embeds
app.get('/api/twitter/oembed', async (req, res) => {
  const { url, maxwidth } = req.query;

  if (!url || !(url.includes('twitter.com') || url.includes('x.com'))) {
    return res.status(400).json({ error: 'Invalid Twitter URL' });
  }

  // Check cache first (include maxwidth in cache key)
  const cacheKey = `${url}:${maxwidth || '550'}`;
  const cached = oembedCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  try {
    // Convert x.com URLs to twitter.com for the oEmbed API
    const twitterUrl = url.replace('x.com', 'twitter.com');

    // Build oEmbed URL with all recommended parameters from X's guide
    const params = new URLSearchParams({
      url: twitterUrl,
      maxwidth: maxwidth || '550',  // Responsive width (default 550)
      omit_script: '1',        // We load widgets.js once in our app shell
      theme: 'dark',           // Match our dark theme
      hide_thread: '1',        // Don't show parent tweets
      hide_media: '0',         // IMPORTANT: Show media (videos/images)
      dnt: 'true',             // Do Not Track for privacy
      lang: 'en'               // Language
    });

    const oembedUrl = `https://publish.twitter.com/oembed?${params.toString()}`;
    console.log('Fetching oEmbed:', oembedUrl);

    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error(`oEmbed API returned ${response.status}`);
    }

    const data = await response.json();

    const result = {
      html: data.html,
      authorName: data.author_name,
      authorUrl: data.author_url,
      width: data.width,
      height: data.height,
      cacheAge: data.cache_age || 3153600000, // Default ~100 years if not specified
      provider: data.provider_name,
      type: data.type
    };

    // Cache the response
    oembedCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + (result.cacheAge * 1000)
    });

    res.json(result);
  } catch (error) {
    console.error('oEmbed fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-memory cache for FxTwitter video responses
const fxTwitterVideoCache = new Map();

// GET /api/twitter/video - Fetch direct video URL from FxTwitter
// This is the PRIMARY method for getting autoplay-compatible video URLs
app.get('/api/twitter/video', asyncHandler(async (req, res) => {
  const { url } = req.query;

  if (!url || !(url.includes('twitter.com') || url.includes('x.com'))) {
    return res.status(400).json({ error: 'Invalid Twitter/X URL' });
  }

  // Check cache first (24 hour cache for videos)
  const cached = fxTwitterVideoCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    console.log('[FxTwitter] Cache hit for:', url);
    return res.json(cached.data);
  }

  try {
    console.log('[FxTwitter] Fetching video URL for:', url);
    const result = await fetchVideoFromFxTwitter(url);

    if (result.success) {
      const responseData = {
        success: true,
        videoUrl: result.videoUrl,
        thumbnail: result.thumbnail,
        photos: result.photos || [],
        hasImages: result.hasImages || false,
        authorName: result.authorName,
        authorHandle: result.authorHandle,
        tweetText: result.tweetText?.substring(0, 280),
        directDownloadUrl: getFxTwitterDirectVideoUrl(url)
      };

      // Cache successful responses for 24 hours
      fxTwitterVideoCache.set(url, {
        data: responseData,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      });

      res.json(responseData);
    } else {
      // Return a fallback with the direct download URL even if API failed
      // This allows frontend to try the d.fxtwitter.com URL directly
      res.json({
        success: false,
        error: result.error,
        directDownloadUrl: getFxTwitterDirectVideoUrl(url),
        hasImages: result.hasImages,
        photos: result.photos || []
      });
    }
  } catch (error) {
    console.error('[FxTwitter] Video fetch error:', error);
    // Still provide the direct URL as fallback
    res.json({
      success: false,
      error: error.message,
      directDownloadUrl: getFxTwitterDirectVideoUrl(url)
    });
  }
}));

// GET /api/twitter/video/proxy - Proxy video from FxTwitter to avoid CORS
// This streams the video through our server for autoplay support
app.get('/api/twitter/video/proxy', asyncHandler(async (req, res) => {
  const { url } = req.query;

  if (!url || !(url.includes('twitter.com') || url.includes('x.com'))) {
    return res.status(400).json({ error: 'Invalid Twitter/X URL' });
  }

  try {
    // First try to get direct video URL from FxTwitter API
    const result = await fetchVideoFromFxTwitter(url);

    if (result.success && result.videoUrl) {
      // Redirect to the actual video URL (most efficient)
      // Twitter's CDN usually allows cross-origin requests
      return res.redirect(result.videoUrl);
    }

    // Fallback to FxTwitter direct download URL
    const directUrl = getFxTwitterDirectVideoUrl(url);
    if (directUrl) {
      return res.redirect(directUrl);
    }

    res.status(404).json({ error: 'No video found' });
  } catch (error) {
    console.error('[FxTwitter] Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}));

// GET og:image from any URL - used for embedded link previews
// This fetches the page server-side to avoid CORS and extracts Open Graph metadata
const ogImageCache = new Map();
app.get('/api/og-image', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Check cache first (1 hour cache)
  const cached = ogImageCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  try {
    console.log('[og-image] Fetching:', url);

    // Fetch the page with a browser-like user agent
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph metadata using regex (simple and fast)
    const extractMeta = (property) => {
      // Try og: prefix first
      let match = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i'));
      if (!match) {
        match = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i'));
      }
      // Try twitter: prefix as fallback
      if (!match) {
        match = html.match(new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`, 'i'));
      }
      if (!match) {
        match = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:${property}["']`, 'i'));
      }
      return match ? match[1] : null;
    };

    const ogImage = extractMeta('image');
    const ogTitle = extractMeta('title');
    const ogDescription = extractMeta('description');

    // Also try to extract title from <title> tag if og:title not found
    let title = ogTitle;
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : null;
    }

    const result = {
      url,
      ogImage: ogImage || null,
      title: title || null,
      description: ogDescription || null,
      fetchedAt: Date.now()
    };

    console.log('[og-image] Found:', { url, ogImage: ogImage?.substring(0, 100) });

    // Cache for 1 hour
    ogImageCache.set(url, {
      data: result,
      expiresAt: Date.now() + (60 * 60 * 1000)
    });

    res.json(result);
  } catch (error) {
    console.error('[og-image] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET Wikipedia metadata (enhanced with extended data)
app.get('/api/wikipedia/metadata', async (req, res) => {
  const { title, extended } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  try {
    // Detect language from title if prefixed (e.g., "es:Título")
    let lang = 'en';
    let articleTitle = title;
    const langMatch = title.match(/^(\w{2,3}):/);
    if (langMatch) {
      lang = langMatch[1];
      articleTitle = title.slice(langMatch[0].length);
    }

    // Fetch summary data from Wikipedia REST API
    const summaryResponse = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`,
      { headers: { 'User-Agent': 'BookmarkApp/1.0 (local development)' } }
    );

    if (!summaryResponse.ok) {
      throw new Error(`Wikipedia API returned ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();

    const result = {
      title: summaryData.title,
      displayTitle: summaryData.displaytitle,
      description: summaryData.description,
      extract: summaryData.extract,
      extractHtml: summaryData.extract_html,
      thumbnail: summaryData.thumbnail?.source,
      thumbnailWidth: summaryData.thumbnail?.width,
      thumbnailHeight: summaryData.thumbnail?.height,
      originalImage: summaryData.originalimage?.source,
      originalImageWidth: summaryData.originalimage?.width,
      originalImageHeight: summaryData.originalimage?.height,
      contentUrls: summaryData.content_urls,
      pageid: summaryData.pageid,
      lang: lang,
      lastModified: summaryData.timestamp,
      type: summaryData.type // 'standard', 'disambiguation', 'no-extract', etc.
    };

    // Fetch extended data (categories) if requested
    if (extended === 'true') {
      try {
        const categoriesResponse = await fetch(
          `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=categories&cllimit=10&clshow=!hidden&format=json&origin=*`,
          { headers: { 'User-Agent': 'BookmarkApp/1.0 (local development)' } }
        );

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          const pages = categoriesData.query?.pages;
          if (pages) {
            const pageData = Object.values(pages)[0];
            result.categories = pageData.categories?.map(c =>
              c.title.replace('Category:', '')
            ) || [];
          }
        }
      } catch (catError) {
        console.warn('Categories fetch failed:', catError);
        result.categories = [];
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Wikipedia API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-memory cache for Wikipedia full articles
const wikiArticleCache = new Map();

// GET full Wikipedia article content with HTML
app.get('/api/wikipedia/article', async (req, res) => {
  const { title } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  // Check cache first
  const cacheKey = title;
  const cached = wikiArticleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  try {
    // Detect language from title if prefixed (e.g., "es:Título")
    let lang = 'en';
    let articleTitle = title;
    const langMatch = title.match(/^(\w{2,3}):/);
    if (langMatch) {
      lang = langMatch[1];
      articleTitle = title.slice(langMatch[0].length);
    }

    // Fetch the mobile HTML version (cleaner, better structured)
    const mobileHtmlResponse = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(articleTitle)}`,
      { headers: { 'User-Agent': 'BookmarkApp/1.0 (local development)' } }
    );

    // Also fetch summary for metadata
    const summaryResponse = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`,
      { headers: { 'User-Agent': 'BookmarkApp/1.0 (local development)' } }
    );

    // Fetch media list for images
    const mediaResponse = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(articleTitle)}`,
      { headers: { 'User-Agent': 'BookmarkApp/1.0 (local development)' } }
    );

    if (!summaryResponse.ok) {
      throw new Error(`Wikipedia API returned ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();
    let mobileHtml = '';
    let mediaList = [];

    if (mobileHtmlResponse.ok) {
      mobileHtml = await mobileHtmlResponse.text();
    }

    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json();
      mediaList = mediaData.items || [];
    }

    // Parse sections from mobile HTML - more robust approach
    const sections = [];

    // Skip these sections entirely
    const skipSections = ['references', 'notes', 'external links', 'see also', 'further reading', 'bibliography', 'sources', 'citations', 'footnotes'];

    // Find all section tags with their positions
    const sectionRegex = /<section[^>]*data-mw-section-id="(\d+)"[^>]*>/gi;
    const sectionStarts = [];
    let match;

    while ((match = sectionRegex.exec(mobileHtml)) !== null) {
      sectionStarts.push({
        id: parseInt(match[1]),
        startIndex: match.index,
        tagEnd: match.index + match[0].length,
        fullTag: match[0]
      });
    }

    // Process each section
    for (let i = 0; i < sectionStarts.length; i++) {
      const section = sectionStarts[i];
      const nextSection = sectionStarts[i + 1];

      // Find where this section ends (before next section or end of content)
      let endIndex;
      if (nextSection) {
        // Find the </section> tag before the next section starts
        const searchArea = mobileHtml.substring(section.tagEnd, nextSection.startIndex);
        const lastClosingTag = searchArea.lastIndexOf('</section>');
        if (lastClosingTag !== -1) {
          endIndex = section.tagEnd + lastClosingTag;
        } else {
          endIndex = nextSection.startIndex;
        }
      } else {
        // Last section - find its closing tag
        const remaining = mobileHtml.substring(section.tagEnd);
        const closingIndex = remaining.indexOf('</section>');
        endIndex = closingIndex !== -1 ? section.tagEnd + closingIndex : mobileHtml.length;
      }

      // Extract section content
      let sectionContent = mobileHtml.substring(section.tagEnd, endIndex);

      // Extract title from heading if present
      let title = null;
      let level = 0;
      const headingMatch = sectionContent.match(/<h(\d)[^>]*>([\s\S]*?)<\/h\1>/i);
      if (headingMatch) {
        level = parseInt(headingMatch[1]);
        // Strip HTML tags from title
        title = headingMatch[2].replace(/<[^>]+>/g, '').trim();
        // Remove the heading from content since we display it separately
        sectionContent = sectionContent.replace(headingMatch[0], '');
      }

      // Skip unwanted sections
      if (title && skipSections.includes(title.toLowerCase())) {
        continue;
      }

      // Skip empty sections
      const textContent = sectionContent.replace(/<[^>]+>/g, '').trim();
      if (!textContent && !sectionContent.includes('<img') && !sectionContent.includes('<figure')) {
        continue;
      }

      sections.push({
        id: section.id,
        title: title,
        level: level,
        html: sectionContent.trim()
      });
    }

    // Extract infobox data from the HTML
    let infobox = null;
    const infoboxMatch = mobileHtml.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (infoboxMatch) {
      const infoboxHtml = infoboxMatch[0];
      const rows = [];

      // Extract rows from infobox
      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      while ((rowMatch = rowPattern.exec(infoboxHtml)) !== null) {
        const rowHtml = rowMatch[1];

        // Check for header row (th spanning columns)
        const headerMatch = rowHtml.match(/<th[^>]*colspan[^>]*>([\s\S]*?)<\/th>/i);
        if (headerMatch) {
          const headerText = headerMatch[1].replace(/<[^>]+>/g, '').trim();
          if (headerText) {
            rows.push({ type: 'header', text: headerText });
          }
          continue;
        }

        // Check for label-value pair
        const labelMatch = rowHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
        const valueMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);

        if (labelMatch && valueMatch) {
          const label = labelMatch[1].replace(/<[^>]+>/g, '').trim();
          let value = valueMatch[1].replace(/<[^>]+>/g, '').trim();
          // Clean up excessive whitespace
          value = value.replace(/\s+/g, ' ').trim();

          if (label && value && value.length < 500) {
            rows.push({ type: 'row', label, value });
          }
        }
      }

      if (rows.length > 0) {
        infobox = { rows };
      }
    }

    // Get main image
    const mainImage = summaryData.originalimage?.source || summaryData.thumbnail?.source;

    // Find caption for main image from media list
    let mainImageCaption = '';
    if (mainImage && mediaList.length > 0) {
      // The first image in the media list is typically the lead image
      const firstImage = mediaList.find(item => item.type === 'image' && item.caption?.text);
      if (firstImage) {
        mainImageCaption = firstImage.caption.text;
      }
    }

    // Get ALL images from media list (not just 5)
    const images = mediaList
      .filter(item => {
        if (item.type !== 'image') return false;
        if (!item.srcset || item.srcset.length === 0) return false;
        // Skip icons, logos, and tiny images
        const title = (item.title || '').toLowerCase();
        if (title.includes('icon') || title.includes('logo') || title.includes('symbol')) return false;
        // Skip flags and small emblems
        if (title.includes('flag of') || title.includes('coat of arms')) return false;
        return true;
      })
      .map(item => {
        // Get the best quality image from srcset (last one is usually largest)
        const srcset = item.srcset || [];
        const bestSrc = srcset.length > 0
          ? (srcset[srcset.length - 1]?.src || srcset[0]?.src || '')
          : '';
        // Fix protocol-relative URLs
        const src = bestSrc.startsWith('//') ? `https:${bestSrc}` : bestSrc;
        return {
          src,
          caption: item.caption?.text || '',
          title: item.title || '',
          // Include section info if available
          sectionId: item.section_id
        };
      })
      .filter(img => img.src); // Remove any without valid src

    const result = {
      title: summaryData.title,
      displayTitle: summaryData.displaytitle,
      description: summaryData.description,
      extract: summaryData.extract,
      extractHtml: summaryData.extract_html,
      mainImage,
      mainImageCaption,
      images,
      infobox,
      sections,
      lang,
      pageid: summaryData.pageid,
      lastModified: summaryData.timestamp,
      contentUrls: summaryData.content_urls
    };

    // Cache for 1 hour
    wikiArticleCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + (60 * 60 * 1000)
    });

    res.json(result);
  } catch (error) {
    console.error('Wikipedia article fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-memory cache for article content
const articleCache = new Map();

// Helper function to extract article metadata (author, date, site name, cover image)
const extractArticleMetadata = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract og:image (cover photo) - try multiple patterns
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i) ||
                         html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"[^>]*>/i) ||
                         html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"[^>]*>/i) ||
                         html.match(/<meta[^>]*content="([^"]*)"[^>]*name="twitter:image"[^>]*>/i);

    // Extract author
    const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]*)"[^>]*>/i) ||
                        html.match(/<meta[^>]*property="article:author"[^>]*content="([^"]*)"[^>]*>/i) ||
                        html.match(/<meta[^>]*content="([^"]*)"[^>]*name="author"[^>]*>/i);

    // Extract published date
    const dateMatch = html.match(/<meta[^>]*property="article:published_time"[^>]*content="([^"]*)"[^>]*>/i) ||
                      html.match(/<meta[^>]*content="([^"]*)"[^>]*property="article:published_time"[^>]*>/i) ||
                      html.match(/<time[^>]*datetime="([^"]*)"[^>]*>/i);

    // Extract site name
    const siteNameMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"[^>]*>/i) ||
                          html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:site_name"[^>]*>/i);

    // Extract og:description
    const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i) ||
                      html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"[^>]*>/i) ||
                      html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);

    const siteName = siteNameMatch?.[1] || new URL(url).hostname.replace('www.', '');
    const author = authorMatch?.[1] || '';
    const publishedDate = dateMatch?.[1] || '';

    // Process og:image - make absolute URL if relative
    let ogImage = ogImageMatch?.[1] || '';
    if (ogImage && !ogImage.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        if (ogImage.startsWith('//')) {
          ogImage = `https:${ogImage}`;
        } else if (ogImage.startsWith('/')) {
          ogImage = `${urlObj.protocol}//${urlObj.host}${ogImage}`;
        }
      } catch (e) {
        // Keep original value if URL parsing fails
      }
    }

    const ogDescription = descMatch?.[1] || '';

    // Return data if we found anything useful
    if (siteName || author || publishedDate || ogImage) {
      return { siteName, author, publishedDate, ogImage, ogDescription };
    }
    return null;
  } catch (err) {
    console.log('Article metadata extraction failed:', err.message);
    return null;
  }
};

// Helper function to extract Wikipedia metadata using Wikipedia API
const extractWikipediaMetadata = async (url) => {
  try {
    // Extract article title from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const wikiIndex = pathParts.indexOf('wiki');
    if (wikiIndex === -1 || !pathParts[wikiIndex + 1]) {
      return null;
    }

    const articleTitle = decodeURIComponent(pathParts[wikiIndex + 1]);
    const lang = urlObj.hostname.split('.')[0]; // e.g., 'en' from 'en.wikipedia.org'

    // Use Wikipedia REST API for page summary (includes image and extract)
    const apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'BookmarkApp/1.0 (https://github.com/bookmark-app)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.log(`Wikipedia API returned ${response.status} for ${articleTitle}`);
      return null;
    }

    const data = await response.json();

    // Build result object
    const result = {
      displayTitle: data.displaytitle || data.title || articleTitle,
      extract: data.extract || data.description || '',
      description: data.description || '',
      thumbnail: data.thumbnail?.source || null,
      originalImage: data.originalimage?.source || null,
      pageUrl: data.content_urls?.desktop?.page || url,
      wikibaseItem: data.wikibase_item || null,
      type: data.type || 'standard',
    };

    console.log(`Wikipedia metadata extracted: ${result.displayTitle}, image: ${result.thumbnail ? 'yes' : 'no'}`);
    return result;
  } catch (err) {
    console.log('Wikipedia metadata extraction failed:', err.message);
    return null;
  }
};

// URL categorization helper
const categorizeUrl = (url) => {
  if (!url) return { category: 'webpage', subCategory: 'other' };

  const urlLower = url.toLowerCase();

  // Video platforms
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return { category: 'video', subCategory: urlLower.includes('/shorts/') ? 'youtube-shorts' : 'youtube-video' };
  }
  if (urlLower.includes('vimeo.com')) return { category: 'video', subCategory: 'vimeo-video' };
  if (urlLower.includes('twitch.tv')) return { category: 'video', subCategory: 'twitch-stream' };
  if (urlLower.includes('tiktok.com')) return { category: 'video', subCategory: 'tiktok-video' };

  // Social media
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return { category: 'social', subCategory: 'tweet' };

  // Wikipedia
  if (urlLower.includes('wikipedia.org')) return { category: 'wikipedia', subCategory: 'encyclopedia' };

  // GitHub repositories
  if (urlLower.match(/github\.com\/[^\/]+\/[^\/]+/)) return { category: 'repository', subCategory: 'github-repo' };
  if (urlLower.includes('gitlab.com')) return { category: 'repository', subCategory: 'gitlab-repo' };

  // Documentation
  if (urlLower.includes('/docs/') || urlLower.includes('/documentation/') || urlLower.includes('docs.') || urlLower.includes('developer.')) {
    return { category: 'documentation', subCategory: 'docs' };
  }

  // Developer tools & SaaS
  const toolDomains = ['supabase.com', 'vercel.com', 'netlify.com', 'heroku.com', 'railway.app', 'render.com',
    'planetscale.com', 'firebase.google.com', 'stripe.com', 'auth0.com', 'clerk.com', 'prisma.io',
    'tailwindcss.com', 'figma.com', 'notion.so', 'slack.com', 'discord.com', 'linear.app', 'openai.com',
    'anthropic.com', 'huggingface.co', 'npmjs.com', 'pypi.org'];
  if (toolDomains.some(domain => urlLower.includes(domain))) {
    return { category: 'tool', subCategory: 'saas' };
  }

  // Forums
  if (urlLower.includes('reddit.com')) return { category: 'forum', subCategory: 'reddit' };
  if (urlLower.includes('ycombinator.com') || urlLower.includes('news.ycombinator')) return { category: 'forum', subCategory: 'hackernews' };
  if (urlLower.includes('stackoverflow.com')) return { category: 'forum', subCategory: 'stackoverflow' };

  // Blog platforms
  if (urlLower.includes('medium.com') || urlLower.includes('dev.to') || urlLower.includes('substack.com')) {
    return { category: 'blog', subCategory: 'blog-post' };
  }

  // News sites
  const newsDomains = ['nytimes.com', 'washingtonpost.com', 'theguardian.com', 'bbc.com', 'cnn.com',
    'reuters.com', 'techcrunch.com', 'theverge.com', 'arstechnica.com', 'wired.com'];
  if (newsDomains.some(domain => urlLower.includes(domain))) {
    return { category: 'news', subCategory: 'tech-news' };
  }

  // Images
  if (urlLower.match(/\.(jpg|jpeg|png|webp|svg|bmp|ico)(\?.*)?$/i)) {
    return { category: 'image', subCategory: 'photo' };
  }

  // GIFs
  if (urlLower.match(/\.gif(\?.*)?$/i) || urlLower.includes('giphy.com') || urlLower.includes('tenor.com')) {
    return { category: 'gif', subCategory: 'animated' };
  }

  // Default to webpage
  return { category: 'webpage', subCategory: 'other' };
};

// GET article content extraction
app.get('/api/article/extract', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  // Check cache first
  const cached = articleCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Extract metadata and content from HTML
    const result = {
      url,
      title: '',
      description: '',
      author: '',
      publishedDate: '',
      siteName: '',
      images: [],
      content: [],
      favicon: ''
    };

    // Extract Open Graph / meta tags
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i) ||
                         html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"[^>]*>/i);
    const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    result.title = ogTitleMatch?.[1] || titleTagMatch?.[1] || '';
    result.title = result.title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i) ||
                        html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"[^>]*>/i) ||
                        html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
    result.description = ogDescMatch?.[1] || '';
    result.description = result.description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]*)"[^>]*>/i) ||
                        html.match(/<meta[^>]*property="article:author"[^>]*content="([^"]*)"[^>]*>/i);
    result.author = authorMatch?.[1] || '';

    const dateMatch = html.match(/<meta[^>]*property="article:published_time"[^>]*content="([^"]*)"[^>]*>/i) ||
                      html.match(/<time[^>]*datetime="([^"]*)"[^>]*>/i);
    result.publishedDate = dateMatch?.[1] || '';

    const siteNameMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"[^>]*>/i);
    result.siteName = siteNameMatch?.[1] || new URL(url).hostname.replace('www.', '');

    // Extract main image
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i) ||
                         html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"[^>]*>/i);
    if (ogImageMatch?.[1]) {
      let imageUrl = ogImageMatch[1];
      // Make relative URLs absolute
      if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url);
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
      }
      result.images.push({ src: imageUrl, type: 'hero' });
    }

    // Get favicon
    const faviconMatch = html.match(/<link[^>]*rel="(?:shortcut )?icon"[^>]*href="([^"]*)"[^>]*>/i) ||
                         html.match(/<link[^>]*href="([^"]*)"[^>]*rel="(?:shortcut )?icon"[^>]*>/i);
    if (faviconMatch?.[1]) {
      let faviconUrl = faviconMatch[1];
      if (faviconUrl.startsWith('/')) {
        const urlObj = new URL(url);
        faviconUrl = `${urlObj.protocol}//${urlObj.host}${faviconUrl}`;
      }
      result.favicon = faviconUrl;
    } else {
      const urlObj = new URL(url);
      result.favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    }

    // Extract article content - look for common article containers
    // Try to find the main article content
    let articleHtml = '';

    // Common article selectors patterns in HTML
    const articlePatterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*(?:article-body|post-content|entry-content|story-body|article-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
    ];

    for (const pattern of articlePatterns) {
      const match = html.match(pattern);
      if (match && match[0]) {
        articleHtml = match[0];
        break;
      }
    }

    // If no article container found, use body
    if (!articleHtml) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      articleHtml = bodyMatch?.[1] || html;
    }

    // Helper to decode HTML entities
    const decodeEntities = (text) => {
      return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .trim();
    };

    // Helper to make URLs absolute
    const makeAbsolute = (src) => {
      if (!src) return null;
      if (src.startsWith('data:')) return null;
      if (src.startsWith('//')) return `https:${src}`;
      if (src.startsWith('/')) {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}${src}`;
      }
      if (!src.startsWith('http')) return null;
      return src;
    };

    // Helper to check if image should be skipped
    const shouldSkipImage = (src) => {
      if (!src) return true;
      const skipPatterns = ['avatar', 'icon', 'logo', 'pixel', 'tracking', '1x1', 'spinner', 'loading', 'placeholder', 'spacer', 'blank', 'transparent', 'badge', 'button'];
      return skipPatterns.some(p => src.toLowerCase().includes(p));
    };

    // Extract content blocks in document order
    // This regex matches paragraphs, headings, figures, and images in order
    const contentPattern = /<(p|h[1-6]|figure|img)([^>]*)>([\s\S]*?)<\/\1>|<img([^>]*)>/gi;
    let match;
    let imgCount = 0;
    const maxImages = 8;
    const seenImages = new Set();

    while ((match = contentPattern.exec(articleHtml)) !== null) {
      const fullMatch = match[0];
      const tagName = (match[1] || 'img').toLowerCase();

      if (tagName === 'p') {
        // Paragraph - extract text
        let text = match[3] || '';
        text = text.replace(/<[^>]+>/g, ''); // Remove HTML tags
        text = decodeEntities(text);

        if (text.length > 40) {
          result.content.push({ type: 'paragraph', text });
        }
      } else if (tagName.match(/^h[1-6]$/)) {
        // Heading
        let text = match[3] || '';
        text = text.replace(/<[^>]+>/g, '');
        text = decodeEntities(text);
        const level = parseInt(tagName[1]);

        if (text.length > 0 && text.length < 200) {
          result.content.push({ type: 'heading', level, text });
        }
      } else if (tagName === 'figure') {
        // Figure - extract image and caption
        const figureHtml = fullMatch;
        const imgMatch = figureHtml.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
        const captionMatch = figureHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);

        if (imgMatch && imgCount < maxImages) {
          let imgSrc = makeAbsolute(imgMatch[1]);
          if (imgSrc && !shouldSkipImage(imgSrc) && !seenImages.has(imgSrc)) {
            seenImages.add(imgSrc);
            let caption = '';
            if (captionMatch) {
              caption = captionMatch[1].replace(/<[^>]+>/g, '');
              caption = decodeEntities(caption);
            }
            // Also try to get alt text
            const altMatch = figureHtml.match(/alt=["']([^"']+)["']/i);
            const alt = altMatch ? decodeEntities(altMatch[1]) : '';

            result.content.push({
              type: 'image',
              src: imgSrc,
              caption: caption || alt,
            });
            imgCount++;
          }
        }
      } else if (tagName === 'img') {
        // Standalone image
        const imgAttrs = match[4] || match[2] || '';
        const srcMatch = imgAttrs.match(/src=["']([^"']+)["']/i) ||
                        fullMatch.match(/src=["']([^"']+)["']/i);

        if (srcMatch && imgCount < maxImages) {
          let imgSrc = makeAbsolute(srcMatch[1]);
          if (imgSrc && !shouldSkipImage(imgSrc) && !seenImages.has(imgSrc)) {
            seenImages.add(imgSrc);
            const altMatch = (imgAttrs || fullMatch).match(/alt=["']([^"']+)["']/i);
            const alt = altMatch ? decodeEntities(altMatch[1]) : '';

            result.content.push({
              type: 'image',
              src: imgSrc,
              caption: alt,
            });
            imgCount++;
          }
        }
      }
    }

    // If we didn't get much content, try a simpler approach
    if (result.content.filter(c => c.type === 'paragraph').length < 2) {
      // Reset and try simpler extraction
      const simpleParagraphs = [];
      const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      while ((match = pPattern.exec(articleHtml)) !== null) {
        let text = match[1].replace(/<[^>]+>/g, '');
        text = decodeEntities(text);
        if (text.length > 40) {
          simpleParagraphs.push({ type: 'paragraph', text });
        }
      }
      if (simpleParagraphs.length > result.content.filter(c => c.type === 'paragraph').length) {
        // Merge: keep images in order but use simple paragraphs
        const images = result.content.filter(c => c.type === 'image');
        result.content = [];
        // Interleave: add images roughly every 2-3 paragraphs
        simpleParagraphs.forEach((p, idx) => {
          result.content.push(p);
          const imgIdx = Math.floor(idx / 3);
          if (idx % 3 === 2 && images[imgIdx]) {
            result.content.push(images[imgIdx]);
          }
        });
        // Add remaining images at end
        const usedImgs = Math.floor(simpleParagraphs.length / 3);
        images.slice(usedImgs).forEach(img => result.content.push(img));
      }
    }

    // Cache for 1 hour
    articleCache.set(url, {
      data: result,
      expiresAt: Date.now() + (60 * 60 * 1000)
    });

    res.json(result);
  } catch (error) {
    console.error('Article extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== COLLECTIONS API ====================

// Collections data file
const collectionsFile = path.join(__dirname, 'collections.json');

// Helper functions for collections
const loadCollections = () => {
  try {
    if (fs.existsSync(collectionsFile)) {
      return JSON.parse(fs.readFileSync(collectionsFile, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading collections:', err);
  }
  return [];
};

const saveCollections = (collections) => {
  try {
    fs.writeFileSync(collectionsFile, JSON.stringify(collections, null, 2));
  } catch (err) {
    console.error('Error saving collections:', err);
  }
};

// GET all collections
app.get('/api/collections', asyncHandler(async (req, res) => {
  const collections = loadCollections();
  const bookmarks = await loadBookmarks();

  // Add bookmark count to each collection
  const collectionsWithCounts = collections.map(c => ({
    ...c,
    bookmarkCount: bookmarks.filter(b => b.collectionId === c.id).length
  }));

  res.json(collectionsWithCounts);
}));

// GET single collection
app.get('/api/collections/:id', asyncHandler(async (req, res) => {
  const collections = loadCollections();
  const collection = collections.find(c => c.id === req.params.id);

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const bookmarks = await loadBookmarks();
  collection.bookmarkCount = bookmarks.filter(b => b.collectionId === collection.id).length;

  res.json(collection);
}));

// POST create new collection
app.post('/api/collections', (req, res) => {
  const { name, color } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Collection name is required' });
  }

  const collections = loadCollections();
  const newCollection = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    color: color || '#f59e0b',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  collections.push(newCollection);
  saveCollections(collections);

  res.status(201).json(newCollection);
});

// PUT update collection
app.put('/api/collections/:id', (req, res) => {
  const collections = loadCollections();
  const index = collections.findIndex(c => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const updated = {
    ...collections[index],
    ...req.body,
    id: req.params.id,
    updatedAt: Date.now()
  };

  collections[index] = updated;
  saveCollections(collections);

  res.json(updated);
});

// DELETE collection
app.delete('/api/collections/:id', asyncHandler(async (req, res) => {
  let collections = loadCollections();
  const index = collections.findIndex(c => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  // Also remove collection reference from bookmarks
  await clearCollectionFromBookmarks(req.params.id);

  const deleted = collections[index];
  collections = collections.filter((_, i) => i !== index);
  saveCollections(collections);

  res.json(deleted);
}));

// POST add bookmarks to collection
app.post('/api/collections/:id/bookmarks', asyncHandler(async (req, res) => {
  const { bookmarkIds } = req.body;

  if (!bookmarkIds || !Array.isArray(bookmarkIds)) {
    return res.status(400).json({ error: 'bookmarkIds array is required' });
  }

  const collections = loadCollections();
  const collection = collections.find(c => c.id === req.params.id);

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const updated = await setCollectionForBookmarks(req.params.id, bookmarkIds);

  res.json({ updated: updated.length, collectionId: req.params.id });
}));

// DELETE remove bookmarks from collection
app.delete('/api/collections/:id/bookmarks', asyncHandler(async (req, res) => {
  const { bookmarkIds } = req.body;

  if (!bookmarkIds || !Array.isArray(bookmarkIds)) {
    return res.status(400).json({ error: 'bookmarkIds array is required' });
  }

  const updated = await removeCollectionForBookmarks(req.params.id, bookmarkIds);

  res.json({ updated: updated.length });
}));

// ==================== END COLLECTIONS API ====================

// ==================== POWER SEARCH API ====================

// In-memory Fuse.js instance for fuzzy search
let fuseInstance = null;
let fuseDataHash = null;

// Simple hash function to detect data changes
const hashData = (data) => {
  return JSON.stringify(data).length + '_' + data.length;
};

// Initialize or update Fuse.js instance
const getFuseInstance = (bookmarks) => {
  const currentHash = hashData(bookmarks);

  if (!fuseInstance || fuseDataHash !== currentHash) {
    // Fuse.js configuration
    const Fuse = require('fuse.js');

    fuseInstance = new Fuse(bookmarks, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'notes', weight: 0.25 },
        { name: 'description', weight: 0.15 },
        { name: 'tags', weight: 0.15 },
        { name: 'metadata.ocrText', weight: 0.05 },
      ],
      threshold: 0.4,
      distance: 100,
      ignoreLocation: true,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      useExtendedSearch: true,
    });

    fuseDataHash = currentHash;
  }

  return fuseInstance;
};

// Helper to determine bookmark type
const getBookmarkType = (bookmark) => {
  const url = bookmark.url || '';
  if (bookmark.type === 'note' || url.startsWith('note://') || (!url && (bookmark.notes || bookmark.title))) {
    return 'note';
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'tweet';
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  return 'link';
};

// Date preset calculations
const getDateFromPreset = (presetId) => {
  const presets = {
    today: 0,
    yesterday: 1,
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  };

  const days = presets[presetId];
  if (days === undefined) return null;

  const date = new Date();
  if (days === 0) {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

// POST /api/search - Advanced search endpoint
app.post('/api/search', asyncHandler(async (req, res) => {
  const {
    query = '',
    filters = {},
    page = 1,
    limit = 20,
    sortBy = 'relevance',
  } = req.body;

  let bookmarks = await loadBookmarks();

  // Add type to each bookmark
  bookmarks = bookmarks.map(b => ({
    ...b,
    type: getBookmarkType(b),
  }));

  const fuse = getFuseInstance(bookmarks);

  // Start with all bookmarks or fuzzy search results
  let results;
  if (query && query.trim()) {
    results = fuse.search(query.trim()).map(r => ({
      item: r.item,
      score: r.score,
      matches: r.matches,
    }));
  } else {
    results = bookmarks.map(item => ({
      item,
      score: 0,
      matches: [],
    }));
  }

  // Apply type filter
  if (filters.types && filters.types.length > 0) {
    results = results.filter(r => filters.types.includes(r.item.type));
  }

  // Apply collection filter
  if (filters.collections && filters.collections.length > 0) {
    results = results.filter(r => filters.collections.includes(r.item.collectionId));
  }

  // Apply tag filter (OR logic - item has at least one of the tags)
  if (filters.tags && filters.tags.length > 0) {
    results = results.filter(r =>
      filters.tags.some(tag => r.item.tags?.includes(tag))
    );
  }

  // Apply date filter
  if (filters.datePreset) {
    const filterDate = getDateFromPreset(filters.datePreset);
    if (filterDate) {
      results = results.filter(r => {
        const itemDate = new Date(r.item.createdAt);
        return itemDate >= filterDate;
      });
    }
  } else if (filters.dateFrom || filters.dateTo) {
    results = results.filter(r => {
      const itemDate = new Date(r.item.createdAt);
      if (filters.dateFrom && itemDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && itemDate > new Date(filters.dateTo)) return false;
      return true;
    });
  }

  // Apply source filter (appSource in metadata)
  if (filters.sources && filters.sources.length > 0) {
    results = results.filter(r =>
      filters.sources.includes(r.item.metadata?.appSource)
    );
  }

  // Sort results
  if (sortBy === 'date') {
    results.sort((a, b) => (b.item.createdAt || 0) - (a.item.createdAt || 0));
  } else if (sortBy === 'title') {
    results.sort((a, b) => (a.item.title || '').localeCompare(b.item.title || ''));
  }
  // 'relevance' is default from Fuse.js

  // Pagination
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedResults = results.slice(startIndex, startIndex + limit);

  // Generate suggestions based on results
  const tagCounts = {};
  results.forEach(r => {
    r.item.tags?.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const suggestions = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => `#${tag}`);

  res.json({
    results: paginatedResults,
    total,
    page,
    totalPages,
    suggestions,
    query,
    filters,
  });
}));

// POST /api/ocr - Extract text from image (server-side OCR)
app.post('/api/ocr', async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  try {
    // Note: For production, integrate with Google Cloud Vision or AWS Textract
    // This is a placeholder that returns mock OCR text based on image URL

    // Simulate OCR processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real implementation, you would:
    // 1. Download the image
    // 2. Send to OCR service (Google Vision, AWS Textract, Tesseract)
    // 3. Return extracted text

    // For demo, return mock text based on URL hash
    const hash = imageUrl.split('/').pop() || 'default';
    const mockTexts = {
      'arch1': 'API Gateway Load Balancer User Service Auth Service Database Cluster',
      'wire1': 'Dashboard Home Analytics Settings Profile Logout Navigation Menu',
      'err1': 'TypeError Cannot read property map of undefined at UserList component line 45',
      'db1': 'Users Table id email password Roles Table id name Permissions Table id action resource',
      'app1': 'Shop Now Add to Cart Checkout Payment Method Shipping Address Order Confirmation',
      'default': 'Sample extracted text from image',
    };

    const text = mockTexts[hash] || mockTexts.default;

    res.json({ text, confidence: 0.95 });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

// GET /api/search/suggestions - Get search suggestions
app.get('/api/search/suggestions', asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const bookmarks = await loadBookmarks();

  // Collect all unique tags
  const tagSet = new Set();
  bookmarks.forEach(b => {
    b.tags?.forEach(tag => tagSet.add(tag));
  });

  // Filter suggestions based on query
  const query = q.toLowerCase();
  const suggestions = [];

  // Add matching tags
  Array.from(tagSet)
    .filter(tag => tag.toLowerCase().includes(query))
    .slice(0, 5)
    .forEach(tag => {
      suggestions.push({ type: 'tag', value: tag, label: `#${tag}` });
    });

  // Add type suggestions
  ['note', 'link', 'tweet', 'youtube'].forEach(type => {
    if (type.includes(query)) {
      suggestions.push({ type: 'type', value: type, label: `type:${type}` });
    }
  });

  // Add date suggestions
  ['today', 'week', 'month', 'year'].forEach(preset => {
    if (preset.includes(query)) {
      suggestions.push({ type: 'date', value: preset, label: `date:${preset}` });
    }
  });

  res.json({ suggestions: suggestions.slice(0, 10) });
}));

// ==================== SEMANTIC SEARCH API ====================

// In-memory cache for embeddings
const embeddingsCache = new Map();
let openaiClient = null;

// Initialize OpenAI client if API key is available
const getOpenAIClient = () => {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('No OpenAI API key found, semantic search will use fallback similarity');
    return null;
  }

  try {
    const OpenAI = require('openai');
    openaiClient = new OpenAI({ apiKey });
    console.log('OpenAI client initialized for semantic search');
    return openaiClient;
  } catch (error) {
    console.warn('Failed to initialize OpenAI:', error.message);
    return null;
  }
};

// Generate embedding using OpenAI or fallback
const getEmbedding = async (text) => {
  const cacheKey = text.slice(0, 100); // Use first 100 chars as cache key
  if (embeddingsCache.has(cacheKey)) {
    return embeddingsCache.get(cacheKey);
  }

  const openai = getOpenAIClient();

  if (openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Limit input length
      });
      const embedding = response.data[0].embedding;
      embeddingsCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.warn('OpenAI embedding failed, using fallback:', error.message);
    }
  }

  // Fallback: Simple TF-IDF-like vector based on word frequencies
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const wordCounts = {};
  words.forEach(w => {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  });

  // Create a simple 384-dimension vector (matches OpenAI small model)
  const vector = new Array(384).fill(0);
  Object.entries(wordCounts).forEach(([word, count], idx) => {
    const hash = word.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
    const position = Math.abs(hash) % 384;
    vector[position] += count / words.length;
  });

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  const normalized = vector.map(v => v / magnitude);

  embeddingsCache.set(cacheKey, normalized);
  return normalized;
};

// Cosine similarity between two vectors
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
};

// POST /api/semantic-search - Semantic search with embeddings
app.post('/api/semantic-search', asyncHandler(async (req, res) => {
  const {
    query = '',
    filters = {},
    limit = 20,
    threshold = 0.3, // Minimum similarity score
  } = req.body;

  if (!query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    let bookmarks = await loadBookmarks();

    // Add type to each bookmark
    bookmarks = bookmarks.map(b => ({
      ...b,
      type: getBookmarkType(b),
    }));

    // Apply pre-filters (same as regular search)
    if (filters.types && filters.types.length > 0) {
      bookmarks = bookmarks.filter(b => filters.types.includes(b.type));
    }
    if (filters.collections && filters.collections.length > 0) {
      bookmarks = bookmarks.filter(b => filters.collections.includes(b.collectionId));
    }
    if (filters.tags && filters.tags.length > 0) {
      bookmarks = bookmarks.filter(b =>
        filters.tags.some(tag => b.tags?.includes(tag))
      );
    }

    // Get query embedding
    const queryEmbedding = await getEmbedding(query);

    // Calculate similarity for each bookmark
    const results = await Promise.all(
      bookmarks.map(async (bookmark) => {
        // Create searchable text from bookmark
        const searchText = [
          bookmark.title || '',
          bookmark.notes || '',
          bookmark.description || '',
          (bookmark.tags || []).join(' '),
          bookmark.metadata?.ocrText || '',
        ].join(' ').trim();

        if (!searchText) {
          return { item: bookmark, score: 0, similarity: 0 };
        }

        const bookmarkEmbedding = await getEmbedding(searchText);
        const similarity = cosineSimilarity(queryEmbedding, bookmarkEmbedding);

        return {
          item: bookmark,
          score: 1 - similarity, // Invert for consistency with Fuse (lower is better)
          similarity,
        };
      })
    );

    // Filter by threshold and sort by similarity
    const filteredResults = results
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    res.json({
      results: filteredResults,
      total: filteredResults.length,
      query,
      method: getOpenAIClient() ? 'openai' : 'fallback',
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Semantic search failed' });
  }
}));

// POST /api/embeddings/generate - Pre-generate embeddings for all bookmarks
app.post('/api/embeddings/generate', asyncHandler(async (req, res) => {
  try {
    const bookmarks = await loadBookmarks();
    let processed = 0;

    for (const bookmark of bookmarks) {
      const searchText = [
        bookmark.title || '',
        bookmark.notes || '',
        (bookmark.tags || []).join(' '),
      ].join(' ').trim();

      if (searchText) {
        await getEmbedding(searchText);
        processed++;
      }
    }

    res.json({
      processed,
      total: bookmarks.length,
      cacheSize: embeddingsCache.size,
    });
  } catch (error) {
    console.error('Embedding generation error:', error);
    res.status(500).json({ error: 'Failed to generate embeddings' });
  }
}));

// ==================== END SEMANTIC SEARCH API ====================

// ==================== END POWER SEARCH API ====================

// GET statistics
app.get('/api/stats', asyncHandler(async (req, res) => {
  const bookmarks = await loadBookmarks();
  const stats = {
    total: bookmarks.length,
    categories: {},
    subCategories: {},
  };

  bookmarks.forEach(b => {
    stats.categories[b.category] = (stats.categories[b.category] || 0) + 1;
    stats.subCategories[b.subCategory] = (stats.subCategories[b.subCategory] || 0) + 1;
  });

  res.json(stats);
}));

// ==================== MANUAL MEDIA UPDATE API ====================

// PATCH /api/bookmarks/:id/media - Manually update bookmark thumbnail/media
// Use this when automatic extraction fails
app.patch('/api/bookmarks/:id/media', asyncHandler(async (req, res) => {
  const { thumbnail, tweetMedia, localVideoUrl } = req.body;
  const bookmark = await getBookmarkById(req.params.id);

  if (!bookmark) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  const updates = { updatedAt: Date.now() };

  if (thumbnail) {
    updates.thumbnail = thumbnail;
  }

  if (tweetMedia || localVideoUrl) {
    updates.metadata = {
      ...bookmark.metadata,
      tweetData: {
        ...(bookmark.metadata?.tweetData || {}),
        ...(tweetMedia && { tweetMedia }),
        ...(localVideoUrl && { localVideoUrl })
      }
    };
  }

  const updated = await updateBookmarkById(req.params.id, updates);
  res.json(updated);
}));

// ==================== VIDEO DOWNLOAD API (Cobalt) ====================

// Media storage directory
const MEDIA_DIR = path.join(__dirname, 'media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  console.log('Created media storage directory:', MEDIA_DIR);
}

// Serve static media files
app.use('/api/media', express.static(MEDIA_DIR, {
  maxAge: '30d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    }
  }
}));

// ============================================================
// FxTwitter Video URL Fetching
// Uses FxTwitter API to get direct video URLs for X/Twitter posts
// This is the PRIMARY method for getting video URLs - no auth required
// ============================================================

/**
 * Extract tweet ID and username from X/Twitter URL
 */
function parseTweetUrl(url) {
  const match = url.match(/(?:twitter|x)\.com\/(\w+)\/status\/(\d+)/);
  if (match) {
    return { username: match[1], tweetId: match[2] };
  }
  return null;
}

/**
 * Fetch video URL from FxTwitter API
 * FxTwitter provides direct video URLs without authentication
 * API endpoint: https://api.fxtwitter.com/{username}/status/{tweetId}
 */
async function fetchVideoFromFxTwitter(tweetUrl) {
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed) {
    throw new Error('Invalid Twitter/X URL');
  }

  const { username, tweetId } = parsed;
  console.log(`[FxTwitter] Fetching video for @${username}/status/${tweetId}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const apiUrl = `https://api.fxtwitter.com/${username}/status/${tweetId}`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BookmarkApp/1.0)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`FxTwitter API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 200 || !data.tweet) {
      throw new Error(data.message || 'Tweet not found');
    }

    const tweet = data.tweet;

    // Extract video URL from media
    if (tweet.media?.videos && tweet.media.videos.length > 0) {
      const video = tweet.media.videos[0];
      // FxTwitter provides multiple quality variants, pick the best one
      const videoUrl = video.url || (video.variants?.length > 0
        ? video.variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.url
        : null);

      if (videoUrl) {
        console.log(`[FxTwitter] Found video URL: ${videoUrl.substring(0, 50)}...`);
        return {
          success: true,
          videoUrl,
          thumbnail: video.thumbnail_url || tweet.media?.photos?.[0]?.url,
          authorName: tweet.author?.name,
          authorHandle: tweet.author?.screen_name,
          tweetText: tweet.text,
          tweetDate: tweet.created_at
        };
      }
    }

    // Check for GIFs (they're technically videos)
    if (tweet.media?.videos) {
      for (const video of tweet.media.videos) {
        if (video.url) {
          return {
            success: true,
            videoUrl: video.url,
            thumbnail: video.thumbnail_url,
            authorName: tweet.author?.name,
            authorHandle: tweet.author?.screen_name,
            tweetText: tweet.text,
            tweetDate: tweet.created_at
          };
        }
      }
    }

    // No video found - return photos if available
    const photos = tweet.media?.photos || [];
    return {
      success: true,
      videoUrl: null,
      error: 'No video found in tweet',
      hasImages: photos.length > 0,
      photos: photos.map(p => ({ url: p.url, width: p.width, height: p.height })),
      thumbnail: photos.length > 0 ? photos[0].url : null,
      authorName: tweet.author?.name,
      authorHandle: tweet.author?.screen_name,
      tweetText: tweet.text,
      tweetDate: tweet.created_at
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[FxTwitter] Request timed out');
      return { success: false, error: 'Request timed out' };
    }
    console.error('[FxTwitter] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get direct video URL using FxTwitter's d. subdomain (fallback method)
 * This constructs a URL that FxTwitter will redirect to the actual video
 */
function getFxTwitterDirectVideoUrl(tweetUrl) {
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed) return null;

  const { username, tweetId } = parsed;
  // d.fxtwitter.com/{user}/status/{id}.mp4 redirects to video
  return `https://d.fxtwitter.com/${username}/status/${tweetId}.mp4`;
}

// Cobalt API configuration
// Self-hosted instance recommended (public api.cobalt.tools requires auth)
// Set COBALT_API_URL to your self-hosted instance, e.g., http://localhost:9000
// Set COBALT_API_KEY if your instance requires authentication
const COBALT_API_URL = process.env.COBALT_API_URL || 'https://api.cobalt.tools';
const COBALT_API_KEY = process.env.COBALT_API_KEY || '';

/**
 * Download video from URL using Cobalt API
 * Cobalt supports: Twitter/X, YouTube, TikTok, Instagram, etc.
 * Note: Public api.cobalt.tools requires authentication - use self-hosted for unrestricted access
 */
async function downloadVideoWithCobalt(videoUrl) {
  console.log(`[Cobalt] Downloading video from: ${videoUrl}`);

  try {
    // Build headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Add auth if API key provided
    if (COBALT_API_KEY) {
      headers['Authorization'] = `Api-Key ${COBALT_API_KEY}`;
    }

    // Call Cobalt API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(`${COBALT_API_URL}/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: videoUrl,
        videoQuality: '720',  // Balance between quality and size
        filenameStyle: 'basic',
        downloadMode: 'auto'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cobalt API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Cobalt] Response status: ${result.status}`);

    // Handle different response types
    if (result.status === 'error') {
      const errorCode = result.error?.code || 'Unknown Cobalt error';
      // Check for auth errors
      if (errorCode.includes('auth')) {
        console.warn('[Cobalt] Auth required. Set COBALT_API_KEY or use self-hosted instance.');
      }
      throw new Error(errorCode);
    }

    if (result.status === 'redirect' || result.status === 'tunnel') {
      // Direct URL to video
      return { type: 'url', url: result.url, filename: result.filename };
    }

    if (result.status === 'picker') {
      // Multiple options available, pick the first video
      const videoOption = result.picker?.find(p => p.type === 'video') || result.picker?.[0];
      if (videoOption) {
        return { type: 'url', url: videoOption.url, filename: videoOption.filename };
      }
    }

    throw new Error(`Unexpected Cobalt response: ${result.status}`);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[Cobalt] Request timed out');
      throw new Error('Cobalt API request timed out');
    }
    console.error('[Cobalt] Download failed:', error.message);
    throw error;
  }
}

/**
 * Download video file from URL and save to media directory
 */
async function saveVideoToMedia(videoUrl, filename) {
  const response = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(MEDIA_DIR, filename);

  fs.writeFileSync(filePath, buffer);
  console.log(`[Media] Saved video: ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  return filename;
}

/**
 * Generate unique filename for video
 */
function generateVideoFilename(url, extension = 'mp4') {
  const timestamp = Date.now();
  const urlHash = Buffer.from(url).toString('base64').slice(0, 10).replace(/[/+=]/g, '_');
  return `video_${timestamp}_${urlHash}.${extension}`;
}

/**
 * Check if video is already cached
 */
function findCachedVideo(urlHash) {
  if (!fs.existsSync(MEDIA_DIR)) return null;

  const files = fs.readdirSync(MEDIA_DIR);
  const cached = files.find(f => f.includes(urlHash) && (f.endsWith('.mp4') || f.endsWith('.webm')));
  return cached || null;
}

// POST /api/video/download - Download video and cache locally
app.post('/api/video/download', asyncHandler(async (req, res) => {
  const { url, bookmarkId } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check if URL is from a supported platform
  const isTwitter = url.includes('twitter.com') || url.includes('x.com');
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isTikTok = url.includes('tiktok.com');
  const isInstagram = url.includes('instagram.com');

  if (!isTwitter && !isYouTube && !isTikTok && !isInstagram) {
    return res.status(400).json({
      error: 'Unsupported platform',
      supported: ['twitter.com', 'x.com', 'youtube.com', 'tiktok.com', 'instagram.com']
    });
  }

  try {
    // Check cache first
    const urlHash = Buffer.from(url).toString('base64').slice(0, 10).replace(/[/+=]/g, '_');
    const cached = findCachedVideo(urlHash);

    if (cached) {
      console.log(`[Video] Cache hit: ${cached}`);
      return res.json({
        success: true,
        cached: true,
        filename: cached,
        localUrl: `/api/media/${cached}`
      });
    }

    // Download with Cobalt
    const cobaltResult = await downloadVideoWithCobalt(url);

    if (cobaltResult.type === 'url') {
      // Generate filename and save
      const extension = cobaltResult.url.includes('.webm') ? 'webm' : 'mp4';
      const filename = generateVideoFilename(url, extension);

      await saveVideoToMedia(cobaltResult.url, filename);

      // If bookmarkId provided, update the bookmark with local video URL
      if (bookmarkId) {
        try {
          const bookmark = await getBookmarkById(bookmarkId);
          if (bookmark && bookmark.metadata?.tweetData?.tweetMedia) {
            const updatedMedia = bookmark.metadata.tweetData.tweetMedia.map(m => {
              if (m.type === 'video') {
                return { ...m, localUrl: `/api/media/${filename}` };
              }
              return m;
            });

            await updateBookmarkById(bookmarkId, {
              metadata: {
                ...bookmark.metadata,
                tweetData: {
                  ...bookmark.metadata.tweetData,
                  tweetMedia: updatedMedia,
                  localVideoUrl: `/api/media/${filename}`
                }
              }
            });
            console.log(`[Video] Updated bookmark ${bookmarkId} with local video URL`);
          }
        } catch (updateErr) {
          console.warn('[Video] Failed to update bookmark:', updateErr.message);
        }
      }

      return res.json({
        success: true,
        cached: false,
        filename,
        localUrl: `/api/media/${filename}`,
        originalUrl: cobaltResult.url
      });
    }

    res.status(500).json({ error: 'Failed to get video URL from Cobalt' });
  } catch (error) {
    console.error('[Video] Download error:', error);
    res.status(500).json({
      error: error.message,
      fallback: 'Video unavailable for local caching. Will play from source.'
    });
  }
}));

// GET /api/video/status/:filename - Check if video exists
app.get('/api/video/status/:filename', (req, res) => {
  const filePath = path.join(MEDIA_DIR, req.params.filename);

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    res.json({
      exists: true,
      filename: req.params.filename,
      size: stats.size,
      url: `/api/media/${req.params.filename}`
    });
  } else {
    res.json({ exists: false });
  }
});

// POST /api/video/backfill - Download videos for existing tweet bookmarks
app.post('/api/video/backfill', asyncHandler(async (req, res) => {
  try {
    const bookmarks = await loadBookmarks();

    // Find tweet bookmarks with video media but no local video URL
    const tweetBookmarks = bookmarks.filter(b => {
      const url = b.url || '';
      const isTwitter = url.includes('twitter.com') || url.includes('x.com');
      const hasVideo = b.metadata?.tweetData?.tweetMedia?.some(m => m.type === 'video');
      const hasLocalVideo = b.metadata?.tweetData?.localVideoUrl;
      return isTwitter && hasVideo && !hasLocalVideo;
    });

    if (tweetBookmarks.length === 0) {
      return res.json({
        message: 'No tweet videos need backfilling',
        processed: 0,
        total: 0
      });
    }

    console.log(`[Video Backfill] Processing ${tweetBookmarks.length} tweets with videos...`);

    let processed = 0;
    let failed = 0;
    const results = [];

    // Limit concurrent downloads
    const limit = req.body.limit || 5;
    const toProcess = tweetBookmarks.slice(0, limit);

    for (const bookmark of toProcess) {
      try {
        const cobaltResult = await downloadVideoWithCobalt(bookmark.url);

        if (cobaltResult.type === 'url') {
          const extension = cobaltResult.url.includes('.webm') ? 'webm' : 'mp4';
          const filename = generateVideoFilename(bookmark.url, extension);

          await saveVideoToMedia(cobaltResult.url, filename);

          // Update bookmark
          const updatedMedia = bookmark.metadata.tweetData.tweetMedia.map(m => {
            if (m.type === 'video') {
              return { ...m, localUrl: `/api/media/${filename}` };
            }
            return m;
          });

          await updateBookmarkById(bookmark.id, {
            metadata: {
              ...bookmark.metadata,
              tweetData: {
                ...bookmark.metadata.tweetData,
                tweetMedia: updatedMedia,
                localVideoUrl: `/api/media/${filename}`
              }
            }
          });

          processed++;
          results.push({ id: bookmark.id, status: 'success', filename });
        }
      } catch (err) {
        failed++;
        results.push({ id: bookmark.id, status: 'failed', reason: err.message });
      }

      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      message: 'Video backfill complete',
      processed,
      failed,
      remaining: tweetBookmarks.length - toProcess.length,
      results
    });
  } catch (error) {
    console.error('[Video Backfill] Error:', error);
    res.status(500).json({ error: error.message });
  }
}));

// ==================== END VIDEO DOWNLOAD API ====================

// SPA fallback route - serve index.html for any non-API routes (must be after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`📑 Bookmark server running on http://localhost:${PORT}`);
  if (supabase) {
    console.log('Storage: Supabase (bookmarks table)');
  } else {
    console.log('⚠️ Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
});
