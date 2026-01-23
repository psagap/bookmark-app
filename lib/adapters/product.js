/**
 * Product JSON-LD Adapter
 * Extracts product information from Schema.org Product type
 */

/**
 * Extract product data from JSON-LD
 * @param {object} jsonLd - The JSON-LD object with @type: "Product"
 * @returns {object} - Normalized product data
 */
function extractProductFromJsonLd(jsonLd) {
  if (!jsonLd) return null;

  // Handle offers (can be single object or array)
  let offer = jsonLd.offers;
  if (Array.isArray(offer)) {
    // Take the first valid offer, or one that's in stock
    offer = offer.find(o => o.availability?.includes('InStock')) || offer[0];
  }

  // Extract price - handle different formats
  let price = offer?.price;
  let currency = offer?.priceCurrency;

  // Sometimes price is in priceSpecification
  if (!price && offer?.priceSpecification) {
    const priceSpec = Array.isArray(offer.priceSpecification)
      ? offer.priceSpecification[0]
      : offer.priceSpecification;
    price = priceSpec?.price;
    currency = priceSpec?.priceCurrency || currency;
  }

  // Handle price as string with currency symbol
  if (typeof price === 'string' && !currency) {
    const priceMatch = price.match(/([£$€¥])?[\s]*([\d,]+\.?\d*)/);
    if (priceMatch) {
      const [, symbol, amount] = priceMatch;
      price = parseFloat(amount.replace(/,/g, ''));
      if (symbol) {
        currency = { '£': 'GBP', '$': 'USD', '€': 'EUR', '¥': 'JPY' }[symbol];
      }
    }
  }

  // Normalize availability URL to human-readable status
  const availabilityUrl = offer?.availability || '';
  let availability = 'unknown';
  if (availabilityUrl.includes('InStock')) availability = 'in_stock';
  else if (availabilityUrl.includes('OutOfStock')) availability = 'out_of_stock';
  else if (availabilityUrl.includes('PreOrder')) availability = 'pre_order';
  else if (availabilityUrl.includes('SoldOut')) availability = 'sold_out';
  else if (availabilityUrl.includes('LimitedAvailability')) availability = 'limited';
  else if (availabilityUrl.includes('OnlineOnly')) availability = 'online_only';

  // Extract rating
  const aggregateRating = jsonLd.aggregateRating;
  let rating = null;
  let reviewCount = null;
  let ratingCount = null;

  if (aggregateRating) {
    rating = parseFloat(aggregateRating.ratingValue) || null;
    reviewCount = parseInt(aggregateRating.reviewCount) || null;
    ratingCount = parseInt(aggregateRating.ratingCount) || null;
  }

  // Extract brand
  let brand = jsonLd.brand;
  if (typeof brand === 'object') {
    brand = brand.name;
  }

  // Extract image (can be string, array, or ImageObject)
  let image = jsonLd.image;
  if (Array.isArray(image)) {
    image = image[0];
  }
  if (typeof image === 'object') {
    image = image.url || image.contentUrl;
  }

  // Extract seller/merchant
  let seller = offer?.seller;
  if (typeof seller === 'object') {
    seller = seller.name;
  }

  return {
    contentType: 'product',
    name: jsonLd.name,
    description: jsonLd.description,
    price: price,
    currency: currency || 'USD',
    availability: availability,
    rating: rating,
    reviewCount: reviewCount || ratingCount,
    brand: brand,
    seller: seller,
    image: image,
    sku: jsonLd.sku,
    gtin: jsonLd.gtin || jsonLd.gtin13 || jsonLd.gtin14,
    mpn: jsonLd.mpn,
    category: jsonLd.category,
    url: jsonLd.url,
  };
}

/**
 * Format price with currency symbol
 * @param {number} price - The price value
 * @param {string} currency - Currency code (USD, EUR, etc.)
 * @returns {string} - Formatted price string
 */
function formatPrice(price, currency = 'USD') {
  if (price === null || price === undefined) return null;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  } catch {
    // Fallback for unknown currencies
    const symbols = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥',
      CAD: 'CA$', AUD: 'A$', INR: '₹',
    };
    const symbol = symbols[currency] || currency + ' ';
    return `${symbol}${price.toFixed(2)}`;
  }
}

/**
 * Get availability display info
 * @param {string} availability - Normalized availability status
 * @returns {object} - { label, color, icon }
 */
function getAvailabilityInfo(availability) {
  const info = {
    in_stock: { label: 'In Stock', color: '#10b981', icon: 'check' },
    out_of_stock: { label: 'Out of Stock', color: '#ef4444', icon: 'x' },
    pre_order: { label: 'Pre-Order', color: '#f59e0b', icon: 'clock' },
    sold_out: { label: 'Sold Out', color: '#ef4444', icon: 'x' },
    limited: { label: 'Limited', color: '#f59e0b', icon: 'alert' },
    online_only: { label: 'Online Only', color: '#3b82f6', icon: 'globe' },
    unknown: { label: 'Check Site', color: '#6b7280', icon: 'help' },
  };

  return info[availability] || info.unknown;
}

module.exports = {
  extractProductFromJsonLd,
  formatPrice,
  getAvailabilityInfo,
};
