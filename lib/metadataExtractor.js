/**
 * Smart Metadata Extraction Pipeline
 * Extracts structured data from URLs using JSON-LD, Open Graph, and oEmbed
 */

const spotifyAdapter = require('./adapters/spotify');
const productAdapter = require('./adapters/product');
const bookAdapter = require('./adapters/book');
const recipeAdapter = require('./adapters/recipe');

// Browser-like headers for fetching pages
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Cache for extracted metadata (1 hour TTL)
const metadataCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Extract all JSON-LD scripts from HTML
 * @param {string} html - The HTML content
 * @returns {Array} - Array of parsed JSON-LD objects
 */
function extractJsonLd(html) {
  const results = [];

  // Match all JSON-LD script tags
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const parsed = JSON.parse(jsonStr);

      // Handle @graph arrays
      if (parsed['@graph']) {
        results.push(...parsed['@graph']);
      } else if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch (e) {
      // Skip malformed JSON-LD
      console.warn('[metadataExtractor] Failed to parse JSON-LD:', e.message);
    }
  }

  return results;
}

/**
 * Find the most relevant JSON-LD object by @type
 * Priority: Recipe > Product > Book > Article > WebPage
 * @param {Array} jsonLdArray - Array of JSON-LD objects
 * @returns {object|null} - The most relevant object or null
 */
function findBestJsonLd(jsonLdArray) {
  const typePriority = ['Recipe', 'Product', 'Book', 'MusicAlbum', 'MusicRecording', 'Article', 'BlogPosting', 'NewsArticle', 'WebPage'];

  for (const type of typePriority) {
    const found = jsonLdArray.find(item => {
      const itemType = item['@type'];
      if (Array.isArray(itemType)) {
        return itemType.includes(type);
      }
      return itemType === type;
    });
    if (found) return found;
  }

  return jsonLdArray[0] || null;
}

/**
 * Extract Open Graph metadata from HTML
 * @param {string} html - The HTML content
 * @returns {object} - Extracted OG metadata
 */
function extractOpenGraph(html) {
  const extractMeta = (property) => {
    // Try og: prefix
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
    return match ? decodeHtmlEntities(match[1]) : null;
  };

  // Extract <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;

  return {
    title: extractMeta('title') || pageTitle,
    description: extractMeta('description'),
    image: extractMeta('image'),
    type: extractMeta('type'),
    siteName: extractMeta('site_name'),
    url: extractMeta('url'),
    locale: extractMeta('locale'),
  };
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Parse ISO 8601 duration to human readable
 * e.g., "PT30M" -> "30 min", "PT1H30M" -> "1h 30min"
 */
function parseDuration(duration) {
  if (!duration) return null;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return duration;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}min`);
  if (seconds && !hours && !minutes) parts.push(`${seconds}s`);

  return parts.join(' ') || null;
}

/**
 * Detect content type from URL patterns
 */
function detectContentTypeFromUrl(url) {
  const urlLower = url.toLowerCase();

  // Music platforms
  if (/spotify\.com\/(track|album|playlist|artist|episode|show)/.test(urlLower)) {
    return { contentType: 'music', platform: 'spotify' };
  }
  if (/music\.apple\.com/.test(urlLower)) {
    return { contentType: 'music', platform: 'apple-music' };
  }
  if (/soundcloud\.com/.test(urlLower)) {
    return { contentType: 'music', platform: 'soundcloud' };
  }
  if (/bandcamp\.com/.test(urlLower)) {
    return { contentType: 'music', platform: 'bandcamp' };
  }

  // Products
  if (/amazon\.(com|co\.uk|de|fr|es|it|ca|com\.au).*\/dp\//.test(urlLower)) {
    return { contentType: 'product', platform: 'amazon' };
  }
  if (/ebay\.(com|co\.uk)\/itm\//.test(urlLower)) {
    return { contentType: 'product', platform: 'ebay' };
  }
  if (/etsy\.com\/listing\//.test(urlLower)) {
    return { contentType: 'product', platform: 'etsy' };
  }

  // Books
  if (/goodreads\.com\/book\/show\//.test(urlLower)) {
    return { contentType: 'book', platform: 'goodreads' };
  }
  if (/books\.google\.com/.test(urlLower)) {
    return { contentType: 'book', platform: 'google-books' };
  }

  // Recipes
  if (/allrecipes\.com\/recipe\//.test(urlLower)) {
    return { contentType: 'recipe', platform: 'allrecipes' };
  }
  if (/seriouseats\.com\/(recipes|[^/]+\/\d+)/.test(urlLower)) {
    return { contentType: 'recipe', platform: 'seriouseats' };
  }
  if (/epicurious\.com\/recipes\//.test(urlLower)) {
    return { contentType: 'recipe', platform: 'epicurious' };
  }
  if (/food52\.com\/recipes\//.test(urlLower)) {
    return { contentType: 'recipe', platform: 'food52' };
  }
  if (/bonappetit\.com\/recipe\//.test(urlLower)) {
    return { contentType: 'recipe', platform: 'bonappetit' };
  }

  return null;
}

/**
 * Main extraction pipeline
 * @param {string} url - The URL to extract metadata from
 * @returns {object} - Normalized metadata object
 */
async function extractMetadata(url) {
  // Check cache first
  const cached = metadataCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    console.log('[metadataExtractor] Cache hit:', url);
    return cached.data;
  }

  console.log('[metadataExtractor] Extracting metadata from:', url);

  // Detect content type from URL pattern first
  const urlTypeHint = detectContentTypeFromUrl(url);

  try {
    // Step 1: Try platform-specific adapters first (oEmbed, APIs)
    if (urlTypeHint?.platform === 'spotify') {
      const spotifyData = await spotifyAdapter.extractSpotifyMetadata(url);
      if (spotifyData) {
        const result = normalizeResult(spotifyData, url, 'spotify');
        cacheResult(url, result);
        return result;
      }
    }

    // Step 2: Fetch the page HTML
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: 'follow',
      timeout: 15000,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Step 3: Extract JSON-LD (most structured data)
    const jsonLdArray = extractJsonLd(html);
    const bestJsonLd = findBestJsonLd(jsonLdArray);

    if (bestJsonLd) {
      const type = bestJsonLd['@type'];
      const typeStr = Array.isArray(type) ? type[0] : type;

      console.log('[metadataExtractor] Found JSON-LD type:', typeStr);

      // Route to appropriate adapter based on @type
      if (typeStr === 'Recipe') {
        const recipeData = recipeAdapter.extractRecipeFromJsonLd(bestJsonLd);
        const result = normalizeResult({ contentType: 'recipe', ...recipeData }, url, 'json-ld');
        cacheResult(url, result);
        return result;
      }

      if (typeStr === 'Product') {
        const productData = productAdapter.extractProductFromJsonLd(bestJsonLd);
        const result = normalizeResult({ contentType: 'product', ...productData }, url, 'json-ld');
        cacheResult(url, result);
        return result;
      }

      if (typeStr === 'Book') {
        const bookData = bookAdapter.extractBookFromJsonLd(bestJsonLd);
        const result = normalizeResult({ contentType: 'book', ...bookData }, url, 'json-ld');
        cacheResult(url, result);
        return result;
      }

      if (typeStr === 'MusicAlbum' || typeStr === 'MusicRecording') {
        const musicData = {
          contentType: 'music',
          name: bestJsonLd.name,
          artist: bestJsonLd.byArtist?.name || bestJsonLd.byArtist,
          album: bestJsonLd.inAlbum?.name,
          duration: parseDuration(bestJsonLd.duration),
          image: bestJsonLd.image?.[0] || bestJsonLd.image,
        };
        const result = normalizeResult(musicData, url, 'json-ld');
        cacheResult(url, result);
        return result;
      }
    }

    // Step 4: Fall back to Open Graph
    const og = extractOpenGraph(html);

    // Map og:type to content type
    let contentType = 'article'; // default
    if (og.type) {
      const ogType = og.type.toLowerCase();
      if (ogType === 'product' || ogType === 'og:product') {
        contentType = 'product';
      } else if (ogType.startsWith('music.')) {
        contentType = 'music';
      } else if (ogType === 'book') {
        contentType = 'book';
      } else if (ogType === 'video' || ogType.startsWith('video.')) {
        contentType = 'video';
      }
    }

    // Use URL hint if OG didn't give us a specific type
    if (contentType === 'article' && urlTypeHint) {
      contentType = urlTypeHint.contentType;
    }

    const result = normalizeResult({
      contentType,
      title: og.title,
      description: og.description,
      image: og.image,
      siteName: og.siteName,
    }, url, 'open-graph');

    cacheResult(url, result);
    return result;

  } catch (error) {
    console.error('[metadataExtractor] Error:', error.message);

    // Return basic result with URL hint if available
    return {
      url,
      contentType: urlTypeHint?.contentType || 'article',
      platform: urlTypeHint?.platform || null,
      source: 'error',
      error: error.message,
      fetchedAt: Date.now(),
    };
  }
}

/**
 * Normalize result to consistent format
 */
function normalizeResult(data, url, source) {
  return {
    url,
    contentType: data.contentType || 'article',
    source,
    title: data.name || data.title || null,
    description: data.description || null,
    image: data.image || null,
    // Type-specific fields
    ...(data.contentType === 'product' && {
      price: data.price,
      currency: data.currency,
      availability: data.availability,
      rating: data.rating,
      reviewCount: data.reviewCount,
      brand: data.brand,
    }),
    ...(data.contentType === 'book' && {
      author: data.author,
      isbn: data.isbn,
      pageCount: data.pageCount,
      rating: data.rating,
      publisher: data.publisher,
      publishDate: data.publishDate,
    }),
    ...(data.contentType === 'recipe' && {
      cookTime: data.cookTime,
      prepTime: data.prepTime,
      totalTime: data.totalTime,
      servings: data.servings,
      calories: data.calories,
      ingredients: data.ingredients,
      instructions: data.instructions,
      rating: data.rating,
      ratingCount: data.ratingCount,
      author: data.author,
      cuisine: data.cuisine,
      category: data.category,
      keywords: data.keywords,
    }),
    ...(data.contentType === 'music' && {
      artist: data.artist,
      album: data.album,
      duration: data.duration,
      trackNumber: data.trackNumber,
      embedHtml: data.embedHtml,
      platform: data.platform,
    }),
    siteName: data.siteName || null,
    fetchedAt: Date.now(),
  };
}

/**
 * Cache result
 */
function cacheResult(url, result) {
  metadataCache.set(url, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

/**
 * Clear cache (useful for testing)
 */
function clearCache() {
  metadataCache.clear();
}

module.exports = {
  extractMetadata,
  extractJsonLd,
  extractOpenGraph,
  parseDuration,
  clearCache,
};
