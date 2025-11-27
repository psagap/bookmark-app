// Simple Express server for bookmark management
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Data file path
const dataFile = path.join(__dirname, 'bookmarks.json');

// Helper functions
const loadBookmarks = () => {
  try {
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading bookmarks:', err);
  }
  return [];
};

const saveBookmarks = (bookmarks) => {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(bookmarks, null, 2));
  } catch (err) {
    console.error('Error saving bookmarks:', err);
  }
};

// Clean up title by removing leading parenthetical numbers like "(2)" or "(34)"
// These are typically browser notification counts or tab numbers
const cleanTitle = (title) => {
  if (!title) return title;
  // Remove leading "(number) " pattern - e.g., "(2) ", "(34) "
  return title.replace(/^\(\d+\)\s*/, '').trim();
};

// Routes

// GET all bookmarks with filters
app.get('/api/bookmarks', (req, res) => {
  let bookmarks = loadBookmarks();
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
});

// GET single bookmark
app.get('/api/bookmarks/:id', (req, res) => {
  const bookmarks = loadBookmarks();
  const bookmark = bookmarks.find(b => b.id === req.params.id);

  if (!bookmark) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  res.json(bookmark);
});

// POST new bookmark
app.post('/api/bookmarks', (req, res) => {
  const bookmarks = loadBookmarks();
  const newBookmark = {
    id: req.body.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'local-user',
    url: req.body.url,
    title: cleanTitle(req.body.title),
    thumbnail: req.body.thumbnail || req.body.ogImage || '',
    createdAt: req.body.createdAt || Date.now(),
    updatedAt: Date.now(),
    category: req.body.category,
    subCategory: req.body.subcategory || req.body.subCategory,
    tags: req.body.tags || [],
    metadata: req.body.metadata || {},
    notes: req.body.notes || '',
    archived: req.body.archived || false,
  };

  bookmarks.push(newBookmark);
  saveBookmarks(bookmarks);

  res.status(201).json(newBookmark);
});

// PUT update bookmark
app.put('/api/bookmarks/:id', (req, res) => {
  const bookmarks = loadBookmarks();
  const index = bookmarks.findIndex(b => b.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  const updated = {
    ...bookmarks[index],
    ...req.body,
    id: req.params.id,
    updatedAt: Date.now(),
  };

  bookmarks[index] = updated;
  saveBookmarks(bookmarks);

  res.json(updated);
});

// DELETE bookmark
app.delete('/api/bookmarks/:id', (req, res) => {
  let bookmarks = loadBookmarks();
  const index = bookmarks.findIndex(b => b.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  const deleted = bookmarks[index];
  bookmarks = bookmarks.filter((_, i) => i !== index);
  saveBookmarks(bookmarks);

  res.json(deleted);
});

// POST refresh bookmark metadata (fetch fresh images from oEmbed)
app.post('/api/bookmarks/:id/refresh', async (req, res) => {
  const bookmarks = loadBookmarks();
  const index = bookmarks.findIndex(b => b.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  const bookmark = bookmarks[index];
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

    // Update bookmark
    const updated = {
      ...bookmark,
      thumbnail,
      metadata: updatedMetadata,
      updatedAt: Date.now()
    };

    bookmarks[index] = updated;
    saveBookmarks(bookmarks);

    res.json(updated);
  } catch (error) {
    console.error('Error refreshing bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

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

    const response = await fetch(oembedUrl);

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

// GET statistics
app.get('/api/stats', (req, res) => {
  const bookmarks = loadBookmarks();
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
});

// SPA fallback route - serve index.html for any non-API routes (must be after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`📑 Bookmark server running on http://localhost:${PORT}`);
  console.log(`Data stored in: ${dataFile}`);
});
