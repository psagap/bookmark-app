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
