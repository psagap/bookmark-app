/**
 * Book JSON-LD Adapter
 * Extracts book information from Schema.org Book type
 */

/**
 * Extract book data from JSON-LD
 * @param {object} jsonLd - The JSON-LD object with @type: "Book"
 * @returns {object} - Normalized book data
 */
function extractBookFromJsonLd(jsonLd) {
  if (!jsonLd) return null;

  // Extract author (can be string, object, or array)
  let author = jsonLd.author;
  if (Array.isArray(author)) {
    author = author.map(a => typeof a === 'object' ? a.name : a).join(', ');
  } else if (typeof author === 'object') {
    author = author.name;
  }

  // Extract rating
  const aggregateRating = jsonLd.aggregateRating;
  let rating = null;
  let ratingCount = null;

  if (aggregateRating) {
    rating = parseFloat(aggregateRating.ratingValue) || null;
    ratingCount = parseInt(aggregateRating.ratingCount) || parseInt(aggregateRating.reviewCount) || null;
  }

  // Extract publisher
  let publisher = jsonLd.publisher;
  if (typeof publisher === 'object') {
    publisher = publisher.name;
  }

  // Extract image (can be string, array, or ImageObject)
  let image = jsonLd.image;
  if (Array.isArray(image)) {
    image = image[0];
  }
  if (typeof image === 'object') {
    image = image.url || image.contentUrl;
  }

  // Extract page count
  const pageCount = jsonLd.numberOfPages || jsonLd.pagination;

  // Extract ISBN (various formats)
  let isbn = jsonLd.isbn;
  if (!isbn && jsonLd.workExample) {
    // Sometimes ISBN is in workExample
    const example = Array.isArray(jsonLd.workExample) ? jsonLd.workExample[0] : jsonLd.workExample;
    isbn = example?.isbn;
  }

  // Extract genre/category
  let genre = jsonLd.genre;
  if (Array.isArray(genre)) {
    genre = genre.join(', ');
  }

  // Extract publish date
  let publishDate = jsonLd.datePublished || jsonLd.copyrightYear;
  if (publishDate) {
    // Try to format as year only if it's a full date
    const year = new Date(publishDate).getFullYear();
    if (!isNaN(year) && year > 1000) {
      publishDate = year.toString();
    }
  }

  return {
    contentType: 'book',
    name: jsonLd.name,
    title: jsonLd.name,
    description: jsonLd.description || jsonLd.abstract,
    author: author,
    isbn: isbn,
    pageCount: pageCount ? parseInt(pageCount) : null,
    rating: rating,
    ratingCount: ratingCount,
    publisher: publisher,
    publishDate: publishDate,
    genre: genre,
    language: jsonLd.inLanguage,
    image: image,
    url: jsonLd.url,
  };
}

/**
 * Try to extract book info from Goodreads-specific patterns
 * Goodreads pages often have meta tags with book info
 * @param {string} html - The HTML content
 * @returns {object|null} - Extracted book data or null
 */
function extractFromGoodreadsHtml(html) {
  if (!html) return null;

  const extractMeta = (name) => {
    const match = html.match(new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
    return match ? match[1].trim() : null;
  };

  // Goodreads uses specific meta tags
  const title = extractMeta('og:title') || extractMeta('twitter:title');
  const description = extractMeta('og:description') || extractMeta('twitter:description');
  const image = extractMeta('og:image') || extractMeta('twitter:image');

  // Try to extract author from title pattern "Book Title by Author Name"
  let author = null;
  let bookTitle = title;
  if (title) {
    const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
    if (byMatch) {
      bookTitle = byMatch[1].trim();
      author = byMatch[2].trim();
    }
  }

  // Try to extract rating from the page
  const ratingMatch = html.match(/itemprop="ratingValue"[^>]*>([0-9.]+)/i) ||
                      html.match(/data-testid="ratingsCount"[^>]*>([0-9.]+)/i);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  // Try to extract page count
  const pageMatch = html.match(/(\d+)\s*pages/i);
  const pageCount = pageMatch ? parseInt(pageMatch[1]) : null;

  if (!bookTitle && !author) return null;

  return {
    contentType: 'book',
    name: bookTitle,
    title: bookTitle,
    description: description,
    author: author,
    rating: rating,
    pageCount: pageCount,
    image: image,
  };
}

/**
 * Format rating as stars (for display)
 * @param {number} rating - Rating value (usually 0-5)
 * @param {number} maxStars - Maximum stars (default 5)
 * @returns {string} - Star display string
 */
function formatRatingStars(rating, maxStars = 5) {
  if (rating === null || rating === undefined) return '';

  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalf ? 1 : 0);

  return '★'.repeat(fullStars) + (hasHalf ? '½' : '') + '☆'.repeat(emptyStars);
}

module.exports = {
  extractBookFromJsonLd,
  extractFromGoodreadsHtml,
  formatRatingStars,
};
