/**
 * AI Content Classifier
 * Uses Groq's free tier (14,400 req/day) with Llama models for fallback classification
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Model to use - llama-3.1-8b-instant is fast and free
const MODEL = 'llama-3.1-8b-instant';

// Cache to avoid repeated API calls for same content
const classificationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Classify content using AI when structured data is unavailable
 * @param {string} url - The URL being classified
 * @param {object} ogData - Open Graph data extracted from the page
 * @returns {object} - Classification result with contentType and tags
 */
async function classifyWithAI(url, ogData = {}) {
  // Check if API key is configured
  if (!GROQ_API_KEY) {
    console.warn('[aiClassifier] GROQ_API_KEY not configured, skipping AI classification');
    return {
      contentType: 'article',
      tags: [],
      confidence: 0.3,
      source: 'fallback-no-api-key',
    };
  }

  // Create cache key from URL + title
  const cacheKey = `${url}:${ogData.title || ''}`;
  const cached = classificationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log('[aiClassifier] Cache hit for:', url);
    return cached.data;
  }

  console.log('[aiClassifier] Classifying with AI:', url);

  const prompt = `Analyze this URL and its metadata to classify the content type and suggest relevant tags.

URL: ${url}
Title: ${ogData.title || 'N/A'}
Description: ${ogData.description || 'N/A'}
Site Name: ${ogData.siteName || 'N/A'}
OG Type: ${ogData.type || 'N/A'}

Based on this information, classify the content into ONE of these types:
- product (shopping, e-commerce, items for sale)
- book (books, ebooks, audiobooks)
- recipe (cooking recipes, food preparation)
- music (songs, albums, playlists, podcasts)
- video (videos, movies, streaming content)
- article (blog posts, news, tutorials)
- other (anything that doesn't fit above)

Also suggest 3-5 relevant tags that describe the content.

Respond with ONLY valid JSON in this exact format:
{
  "contentType": "article",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.8,
  "reasoning": "Brief explanation"
}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a content classification assistant. Analyze URLs and metadata to determine content type. Always respond with valid JSON only, no markdown or explanations outside the JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[aiClassifier] Groq API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    // Parse the JSON response
    let result;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('[aiClassifier] Failed to parse response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and normalize the result
    const validTypes = ['product', 'book', 'recipe', 'music', 'video', 'article', 'other'];
    if (!validTypes.includes(result.contentType)) {
      result.contentType = 'article';
    }

    // Ensure tags is an array
    if (!Array.isArray(result.tags)) {
      result.tags = [];
    }

    // Limit tags to 5
    result.tags = result.tags.slice(0, 5);

    // Ensure confidence is a number between 0 and 1
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.7;
    }

    result.source = 'groq-ai';

    // Cache the result
    classificationCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL,
    });

    console.log('[aiClassifier] Classification result:', result);
    return result;

  } catch (error) {
    console.error('[aiClassifier] Error:', error.message);

    // Return a default classification on error
    return {
      contentType: 'article',
      tags: [],
      confidence: 0.3,
      source: 'fallback-error',
      error: error.message,
    };
  }
}

/**
 * Generate tags for existing content using AI
 * Useful for enriching bookmarks that already have a type
 * @param {object} bookmark - The bookmark object
 * @returns {string[]} - Array of generated tags
 */
async function generateTags(bookmark) {
  if (!GROQ_API_KEY) {
    return [];
  }

  const cacheKey = `tags:${bookmark.url}`;
  const cached = classificationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const prompt = `Generate 5 relevant tags for this content:

Title: ${bookmark.title || 'N/A'}
URL: ${bookmark.url || 'N/A'}
Description: ${bookmark.description || 'N/A'}
Type: ${bookmark.category || bookmark.contentType || 'webpage'}

Return ONLY a JSON array of 5 short tag strings, like: ["tag1", "tag2", "tag3", "tag4", "tag5"]`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Parse the array
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const tags = JSON.parse(jsonMatch[0]);
      if (Array.isArray(tags)) {
        classificationCache.set(cacheKey, {
          data: tags,
          expiresAt: Date.now() + CACHE_TTL,
        });
        return tags;
      }
    }

    return [];
  } catch (error) {
    console.error('[aiClassifier] generateTags error:', error.message);
    return [];
  }
}

/**
 * Check if AI classification is available
 * @returns {boolean}
 */
function isAvailable() {
  return !!GROQ_API_KEY;
}

/**
 * Clear the classification cache
 */
function clearCache() {
  classificationCache.clear();
}

module.exports = {
  classifyWithAI,
  generateTags,
  isAvailable,
  clearCache,
};
