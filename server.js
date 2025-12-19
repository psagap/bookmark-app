// Simple Express server for bookmark management
require('dotenv').config();
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
app.post('/api/bookmarks', async (req, res) => {
  const bookmarks = loadBookmarks();
  const url = req.body.url || '';

  // Initialize metadata
  let metadata = req.body.metadata || {};

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
  // For article URLs (not YouTube, Twitter, or Wikipedia), extract metadata
  else if (!url.includes('twitter.com') && !url.includes('x.com') && !url.includes('wikipedia.org')) {
    try {
      console.log(`Extracting article metadata for: ${url}`);
      const articleData = await extractArticleMetadata(url);
      if (articleData) {
        metadata = {
          ...metadata,
          siteName: articleData.siteName,
          author: articleData.author,
          publishedDate: articleData.publishedDate
        };
        console.log(`Article metadata extracted: site=${articleData.siteName}, author=${articleData.author}`);
      }
    } catch (err) {
      console.log('Article metadata extraction skipped:', err.message);
    }
  }

  const newBookmark = {
    id: req.body.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'local-user',
    url: url,
    title: cleanTitle(req.body.title),
    thumbnail: req.body.thumbnail || req.body.ogImage || '',
    createdAt: req.body.createdAt || Date.now(),
    updatedAt: Date.now(),
    category: req.body.category,
    subCategory: req.body.subcategory || req.body.subCategory,
    tags: req.body.tags || [],
    metadata: metadata,
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

// POST bulk delete bookmarks
app.post('/api/bookmarks/bulk-delete', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  let bookmarks = loadBookmarks();
  const idsSet = new Set(ids);
  const deleted = bookmarks.filter(b => idsSet.has(b.id));
  bookmarks = bookmarks.filter(b => !idsSet.has(b.id));
  saveBookmarks(bookmarks);

  res.json({ deleted: deleted.length, ids: deleted.map(b => b.id) });
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
            publishedDate: articleData.publishedDate
          };
          console.log(`Article metadata refreshed: site=${articleData.siteName}, author=${articleData.author}`);
        }
      } catch (articleError) {
        console.warn('Article refresh failed:', articleError);
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

// POST backfill YouTube metadata for existing bookmarks missing videoDescription
app.post('/api/youtube/backfill', async (req, res) => {
  try {
    let bookmarks = loadBookmarks();
    
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
          // Find and update the bookmark in the array
          const index = bookmarks.findIndex(b => b.id === bookmark.id);
          if (index !== -1) {
            bookmarks[index] = {
              ...bookmarks[index],
              metadata: {
                ...bookmarks[index].metadata,
                ...youtubeData
              },
              updatedAt: Date.now()
            };
            // Update thumbnail if we got a better one
            if (youtubeData.thumbnails?.maxres?.url) {
              bookmarks[index].thumbnail = youtubeData.thumbnails.maxres.url;
            } else if (youtubeData.thumbnails?.high?.url) {
              bookmarks[index].thumbnail = youtubeData.thumbnails.high.url;
            }
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

    // Save all updated bookmarks
    saveBookmarks(bookmarks);

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
});

// POST backfill article metadata for existing bookmarks missing siteName/author
app.post('/api/article/backfill', async (req, res) => {
  try {
    let bookmarks = loadBookmarks();

    // Find article bookmarks (not YouTube, Twitter, Wikipedia) missing metadata
    const articleBookmarks = bookmarks.filter(b => {
      const url = b.url || '';
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const isTwitter = url.includes('twitter.com') || url.includes('x.com');
      const isWikipedia = url.includes('wikipedia.org');
      const missingMetadata = !b.metadata?.siteName && !b.metadata?.author;
      return !isYouTube && !isTwitter && !isWikipedia && missingMetadata && url;
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
          const index = bookmarks.findIndex(b => b.id === bookmark.id);
          if (index !== -1) {
            bookmarks[index] = {
              ...bookmarks[index],
              metadata: {
                ...bookmarks[index].metadata,
                siteName: articleData.siteName,
                author: articleData.author,
                publishedDate: articleData.publishedDate
              },
              updatedAt: Date.now()
            };
            processed++;
            results.push({
              id: bookmark.id,
              title: bookmark.title,
              status: 'success',
              siteName: articleData.siteName,
              author: articleData.author
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

    saveBookmarks(bookmarks);

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

// Helper function to extract article metadata (author, date, site name)
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

    const siteName = siteNameMatch?.[1] || new URL(url).hostname.replace('www.', '');
    const author = authorMatch?.[1] || '';
    const publishedDate = dateMatch?.[1] || '';

    // Only return if we found at least some useful data
    if (siteName || author || publishedDate) {
      return { siteName, author, publishedDate };
    }
    return null;
  } catch (err) {
    console.log('Article metadata extraction failed:', err.message);
    return null;
  }
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
app.get('/api/collections', (req, res) => {
  const collections = loadCollections();
  const bookmarks = loadBookmarks();

  // Add bookmark count to each collection
  const collectionsWithCounts = collections.map(c => ({
    ...c,
    bookmarkCount: bookmarks.filter(b => b.collectionId === c.id).length
  }));

  res.json(collectionsWithCounts);
});

// GET single collection
app.get('/api/collections/:id', (req, res) => {
  const collections = loadCollections();
  const collection = collections.find(c => c.id === req.params.id);

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const bookmarks = loadBookmarks();
  collection.bookmarkCount = bookmarks.filter(b => b.collectionId === collection.id).length;

  res.json(collection);
});

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
app.delete('/api/collections/:id', (req, res) => {
  let collections = loadCollections();
  const index = collections.findIndex(c => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  // Also remove collection reference from bookmarks
  let bookmarks = loadBookmarks();
  bookmarks = bookmarks.map(b => {
    if (b.collectionId === req.params.id) {
      const { collectionId, ...rest } = b;
      return rest;
    }
    return b;
  });
  saveBookmarks(bookmarks);

  const deleted = collections[index];
  collections = collections.filter((_, i) => i !== index);
  saveCollections(collections);

  res.json(deleted);
});

// POST add bookmarks to collection
app.post('/api/collections/:id/bookmarks', (req, res) => {
  const { bookmarkIds } = req.body;

  if (!bookmarkIds || !Array.isArray(bookmarkIds)) {
    return res.status(400).json({ error: 'bookmarkIds array is required' });
  }

  const collections = loadCollections();
  const collection = collections.find(c => c.id === req.params.id);

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  let bookmarks = loadBookmarks();
  const idsSet = new Set(bookmarkIds);
  let updated = 0;

  bookmarks = bookmarks.map(b => {
    if (idsSet.has(b.id)) {
      updated++;
      return { ...b, collectionId: req.params.id, updatedAt: Date.now() };
    }
    return b;
  });

  saveBookmarks(bookmarks);

  res.json({ updated, collectionId: req.params.id });
});

// DELETE remove bookmarks from collection
app.delete('/api/collections/:id/bookmarks', (req, res) => {
  const { bookmarkIds } = req.body;

  if (!bookmarkIds || !Array.isArray(bookmarkIds)) {
    return res.status(400).json({ error: 'bookmarkIds array is required' });
  }

  let bookmarks = loadBookmarks();
  const idsSet = new Set(bookmarkIds);
  let updated = 0;

  bookmarks = bookmarks.map(b => {
    if (idsSet.has(b.id) && b.collectionId === req.params.id) {
      updated++;
      const { collectionId, ...rest } = b;
      return { ...rest, updatedAt: Date.now() };
    }
    return b;
  });

  saveBookmarks(bookmarks);

  res.json({ updated });
});

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
app.post('/api/search', (req, res) => {
  const {
    query = '',
    filters = {},
    page = 1,
    limit = 20,
    sortBy = 'relevance',
  } = req.body;

  let bookmarks = loadBookmarks();

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
});

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
app.get('/api/search/suggestions', (req, res) => {
  const { q = '' } = req.query;
  const bookmarks = loadBookmarks();

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
});

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
app.post('/api/semantic-search', async (req, res) => {
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
    let bookmarks = loadBookmarks();

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
});

// POST /api/embeddings/generate - Pre-generate embeddings for all bookmarks
app.post('/api/embeddings/generate', async (req, res) => {
  try {
    const bookmarks = loadBookmarks();
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
});

// ==================== END SEMANTIC SEARCH API ====================

// ==================== END POWER SEARCH API ====================

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
