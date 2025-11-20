// Platform detection patterns
const PLATFORM_PATTERNS = {
  youtube: /youtube\.com|youtu\.be/i,
  vimeo: /vimeo\.com/i,
  reddit: /reddit\.com/i,
  twitter: /twitter\.com|x\.com/i,
  medium: /medium\.com/i,
  substack: /substack\.com/i,
  instagram: /instagram\.com/i,
  tiktok: /tiktok\.com|vm\.tiktok/i,
  spotify: /spotify\.com/i,
  soundcloud: /soundcloud\.com/i,
};

// Categorization rules
const detectCategory = (url, title = '') => {
  const lowerUrl = url.toLowerCase();

  // Video detection
  if (PLATFORM_PATTERNS.youtube.test(lowerUrl)) {
    return { category: 'video', subCategory: 'youtube-video' };
  }
  if (PLATFORM_PATTERNS.vimeo.test(lowerUrl)) {
    return { category: 'video', subCategory: 'vimeo-video' };
  }
  if (PLATFORM_PATTERNS.tiktok.test(lowerUrl)) {
    return { category: 'video', subCategory: 'tiktok-video' };
  }

  // Article detection
  if (PLATFORM_PATTERNS.medium.test(lowerUrl)) {
    return { category: 'article', subCategory: 'medium' };
  }
  if (PLATFORM_PATTERNS.substack.test(lowerUrl)) {
    return { category: 'article', subCategory: 'substack' };
  }

  // Social media detection
  if (PLATFORM_PATTERNS.reddit.test(lowerUrl)) {
    return { category: 'text', subCategory: 'reddit-post' };
  }
  if (PLATFORM_PATTERNS.twitter.test(lowerUrl)) {
    return { category: 'text', subCategory: 'twitter-thread' };
  }
  if (PLATFORM_PATTERNS.instagram.test(lowerUrl)) {
    return { category: 'image', subCategory: 'instagram-post' };
  }

  // Audio detection
  if (PLATFORM_PATTERNS.spotify.test(lowerUrl)) {
    return { category: 'audio', subCategory: 'spotify-song' };
  }
  if (PLATFORM_PATTERNS.soundcloud.test(lowerUrl)) {
    return { category: 'audio', subCategory: 'soundcloud-track' };
  }

  // Image file detection
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerUrl)) {
    return { category: 'image', subCategory: 'image' };
  }

  // Default to article for general URLs that look like articles
  if (lowerUrl.includes('blog') || lowerUrl.includes('article') || lowerUrl.includes('post')) {
    return { category: 'article', subCategory: 'article' };
  }

  // Default to text/webpage
  return { category: 'text', subCategory: 'webpage' };
};

module.exports = {
  detectCategory,
};
