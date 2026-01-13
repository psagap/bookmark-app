/**
 * Smart URL Categorization System
 * Detects the type of website/content based on URL patterns, domains, and metadata
 */

// Known domain patterns and their categories
const DOMAIN_PATTERNS = {
  // Video platforms
  video: [
    /youtube\.com/i,
    /youtu\.be/i,
    /vimeo\.com/i,
    /dailymotion\.com/i,
    /twitch\.tv/i,
    /tiktok\.com/i,
  ],

  // Social media
  social: [
    /twitter\.com/i,
    /x\.com/i,
    /facebook\.com/i,
    /instagram\.com/i,
    /linkedin\.com\/posts/i,
    /threads\.net/i,
    /mastodon\./i,
    /bsky\.app/i,
  ],

  // Wikipedia / Encyclopedia
  wikipedia: [
    /wikipedia\.org/i,
    /wikimedia\.org/i,
    /wiktionary\.org/i,
    /wikiquote\.org/i,
  ],

  // Code repositories
  repository: [
    /github\.com\/[^\/]+\/[^\/]+$/i,
    /github\.com\/[^\/]+\/[^\/]+\/?$/i,
    /gitlab\.com\/[^\/]+\/[^\/]+/i,
    /bitbucket\.org\/[^\/]+\/[^\/]+/i,
    /codeberg\.org\/[^\/]+\/[^\/]+/i,
  ],

  // GitHub non-repo pages (profiles, orgs, etc)
  github: [
    /github\.com\/[^\/]+\/?$/i,
    /github\.com$/i,
  ],

  // Documentation sites
  documentation: [
    /docs\./i,
    /documentation\./i,
    /developer\./i,
    /devdocs\.io/i,
    /readthedocs\./i,
    /gitbook\.io/i,
    /notion\.site/i,
    /\/docs\//i,
    /\/documentation\//i,
    /\/api\//i,
    /\/reference\//i,
    /mdn\.mozilla\.org/i,
    /w3schools\.com/i,
  ],

  // Developer tools & SaaS platforms
  tool: [
    /supabase\.com/i,
    /vercel\.com/i,
    /netlify\.com/i,
    /heroku\.com/i,
    /aws\.amazon\.com/i,
    /cloud\.google\.com/i,
    /azure\.microsoft\.com/i,
    /digitalocean\.com/i,
    /railway\.app/i,
    /render\.com/i,
    /planetscale\.com/i,
    /firebase\.google\.com/i,
    /stripe\.com/i,
    /twilio\.com/i,
    /sendgrid\.com/i,
    /auth0\.com/i,
    /clerk\.com/i,
    /prisma\.io/i,
    /drizzle\.team/i,
    /tailwindcss\.com/i,
    /figma\.com/i,
    /notion\.so/i,
    /airtable\.com/i,
    /slack\.com/i,
    /discord\.com/i,
    /zoom\.us/i,
    /linear\.app/i,
    /jira\.atlassian\.com/i,
    /trello\.com/i,
    /asana\.com/i,
    /monday\.com/i,
    /clickup\.com/i,
    /miro\.com/i,
    /loom\.com/i,
    /calendly\.com/i,
    /zapier\.com/i,
    /make\.com/i,
    /n8n\.io/i,
    /retool\.com/i,
    /webflow\.com/i,
    /framer\.com/i,
    /bubble\.io/i,
    /adobexd\.com/i,
    /sketch\.com/i,
    /canva\.com/i,
    /openai\.com/i,
    /anthropic\.com/i,
    /huggingface\.co/i,
    /replicate\.com/i,
    /sentry\.io/i,
    /datadog\.com/i,
    /grafana\.com/i,
    /postman\.com/i,
    /insomnia\.rest/i,
    /npm\.js\.com/i,
    /npmjs\.com/i,
    /pypi\.org/i,
    /crates\.io/i,
    /packagist\.org/i,
    /rubygems\.org/i,
  ],

  // Forums & Q&A
  forum: [
    /reddit\.com/i,
    /news\.ycombinator\.com/i,
    /stackoverflow\.com/i,
    /stackexchange\.com/i,
    /quora\.com/i,
    /discourse\./i,
    /community\./i,
    /forum\./i,
    /discuss\./i,
  ],

  // News sites
  news: [
    /nytimes\.com/i,
    /washingtonpost\.com/i,
    /theguardian\.com/i,
    /bbc\.com/i,
    /bbc\.co\.uk/i,
    /cnn\.com/i,
    /reuters\.com/i,
    /apnews\.com/i,
    /bloomberg\.com/i,
    /wsj\.com/i,
    /techcrunch\.com/i,
    /theverge\.com/i,
    /arstechnica\.com/i,
    /wired\.com/i,
    /engadget\.com/i,
    /gizmodo\.com/i,
    /mashable\.com/i,
    /venturebeat\.com/i,
    /zdnet\.com/i,
    /cnet\.com/i,
  ],

  // Blog platforms (likely articles)
  blog: [
    /medium\.com/i,
    /dev\.to/i,
    /hashnode\.dev/i,
    /substack\.com/i,
    /ghost\.io/i,
    /wordpress\.com/i,
    /blogger\.com/i,
    /tumblr\.com/i,
    /mirror\.xyz/i,
  ],

  // Music & Audio
  audio: [
    /spotify\.com/i,
    /soundcloud\.com/i,
    /music\.apple\.com/i,
    /music\.youtube\.com/i,
    /bandcamp\.com/i,
    /deezer\.com/i,
    /tidal\.com/i,
    /podcasts\.apple\.com/i,
    /anchor\.fm/i,
  ],

  // E-commerce / Products
  product: [
    /amazon\.com/i,
    /amazon\.co\./i,
    /ebay\.com/i,
    /etsy\.com/i,
    /shopify\.com/i,
    /aliexpress\.com/i,
    /walmart\.com/i,
    /target\.com/i,
    /bestbuy\.com/i,
    /newegg\.com/i,
    /\/product\//i,
    /\/products\//i,
    /\/item\//i,
    /\/dp\//i,
  ],

  // Academic / Research
  academic: [
    /arxiv\.org/i,
    /scholar\.google/i,
    /researchgate\.net/i,
    /academia\.edu/i,
    /jstor\.org/i,
    /sciencedirect\.com/i,
    /nature\.com/i,
    /science\.org/i,
    /ieee\.org/i,
    /acm\.org/i,
    /springer\.com/i,
    /wiley\.com/i,
    /pubmed\.ncbi/i,
    /\.edu\//i,
  ],

  // Recipe sites
  recipe: [
    /allrecipes\.com/i,
    /epicurious\.com/i,
    /foodnetwork\.com/i,
    /seriouseats\.com/i,
    /bonappetit\.com/i,
    /tasty\.co/i,
    /delish\.com/i,
    /simplyrecipes\.com/i,
    /food52\.com/i,
    /\/recipe\//i,
    /\/recipes\//i,
  ],

  // Design / Inspiration
  design: [
    /dribbble\.com/i,
    /behance\.net/i,
    /awwwards\.com/i,
    /pinterest\.com/i,
    /unsplash\.com/i,
    /pexels\.com/i,
    /designspiration\.com/i,
    /coolors\.co/i,
    /colorhunt\.co/i,
  ],

  // Images
  image: [
    /\.(jpg|jpeg|png|webp|svg|bmp|ico)(\?.*)?$/i,
    /imgur\.com/i,
    /i\.redd\.it/i,
    /i\.imgur\.com/i,
    /giphy\.com\/media/i,
  ],

  // GIFs
  gif: [
    /\.gif(\?.*)?$/i,
    /giphy\.com/i,
    /tenor\.com/i,
    /gfycat\.com/i,
  ],
};

// Category metadata (display names, icons, colors)
export const CATEGORY_META = {
  video: {
    label: 'Video',
    icon: 'Play',
    color: '#ff0000',
    subCategories: ['youtube', 'vimeo', 'twitch', 'tiktok'],
  },
  social: {
    label: 'Social',
    icon: 'MessageCircle',
    color: '#1da1f2',
    subCategories: ['tweet', 'thread', 'post'],
  },
  wikipedia: {
    label: 'Wikipedia',
    icon: 'BookOpen',
    color: '#636466',
    subCategories: ['encyclopedia'],
  },
  repository: {
    label: 'Repository',
    icon: 'GitBranch',
    color: '#6e5494',
    subCategories: ['github-repo', 'gitlab-repo'],
  },
  github: {
    label: 'GitHub',
    icon: 'Github',
    color: '#24292e',
    subCategories: ['profile', 'organization'],
  },
  documentation: {
    label: 'Docs',
    icon: 'FileText',
    color: '#0070f3',
    subCategories: ['api-docs', 'guide', 'reference'],
  },
  tool: {
    label: 'Tool',
    icon: 'Wrench',
    color: '#10b981',
    subCategories: ['saas', 'platform', 'service'],
  },
  forum: {
    label: 'Forum',
    icon: 'Users',
    color: '#ff4500',
    subCategories: ['reddit', 'hackernews', 'stackoverflow'],
  },
  news: {
    label: 'News',
    icon: 'Newspaper',
    color: '#374151',
    subCategories: ['tech-news', 'world-news'],
  },
  blog: {
    label: 'Blog',
    icon: 'PenTool',
    color: '#00ab6c',
    subCategories: ['medium', 'substack', 'personal'],
  },
  article: {
    label: 'Article',
    icon: 'FileText',
    color: '#6366f1',
    subCategories: ['blog-post', 'tutorial', 'guide'],
  },
  audio: {
    label: 'Audio',
    icon: 'Music',
    color: '#1db954',
    subCategories: ['music', 'podcast'],
  },
  product: {
    label: 'Product',
    icon: 'ShoppingBag',
    color: '#f59e0b',
    subCategories: ['amazon', 'shop'],
  },
  academic: {
    label: 'Academic',
    icon: 'GraduationCap',
    color: '#7c3aed',
    subCategories: ['paper', 'journal', 'research'],
  },
  recipe: {
    label: 'Recipe',
    icon: 'ChefHat',
    color: '#ef4444',
    subCategories: ['cooking', 'baking'],
  },
  design: {
    label: 'Design',
    icon: 'Palette',
    color: '#ec4899',
    subCategories: ['inspiration', 'resource'],
  },
  image: {
    label: 'Image',
    icon: 'Image',
    color: '#06b6d4',
    subCategories: ['photo', 'screenshot'],
  },
  gif: {
    label: 'GIF',
    icon: 'Film',
    color: '#8b5cf6',
    subCategories: ['animated'],
  },
  note: {
    label: 'Note',
    icon: 'StickyNote',
    color: '#fbbf24',
    subCategories: ['personal', 'quick-note'],
  },
  webpage: {
    label: 'Webpage',
    icon: 'Globe',
    color: '#64748b',
    subCategories: ['landing', 'homepage', 'other'],
  },
};

/**
 * Categorize a URL based on domain patterns and URL structure
 * @param {string} url - The URL to categorize
 * @param {object} metadata - Optional metadata (og:type, title, etc.)
 * @returns {object} - { category, subCategory, confidence }
 */
export function categorizeUrl(url, metadata = {}) {
  if (!url || url.startsWith('note://')) {
    return { category: 'note', subCategory: 'personal', confidence: 1 };
  }

  try {
    const urlLower = url.toLowerCase();
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    // Check each category's patterns
    for (const [category, patterns] of Object.entries(DOMAIN_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          const subCategory = getSubCategory(category, url, hostname, pathname);
          return { category, subCategory, confidence: 0.9 };
        }
      }
    }

    // Check metadata hints
    if (metadata.ogType) {
      const ogType = metadata.ogType.toLowerCase();
      if (ogType === 'article' || ogType === 'blog') {
        return { category: 'article', subCategory: 'blog-post', confidence: 0.8 };
      }
      if (ogType === 'video' || ogType === 'video.other') {
        return { category: 'video', subCategory: 'video', confidence: 0.8 };
      }
      if (ogType === 'product') {
        return { category: 'product', subCategory: 'shop', confidence: 0.8 };
      }
      if (ogType === 'music.song' || ogType === 'music.album') {
        return { category: 'audio', subCategory: 'music', confidence: 0.8 };
      }
    }

    // Check for article indicators in URL path
    if (pathname.match(/\/(blog|article|post|news|story)\//i)) {
      return { category: 'article', subCategory: 'blog-post', confidence: 0.7 };
    }

    // Check for date patterns in URL (common in blog posts)
    if (pathname.match(/\/\d{4}\/\d{2}\//)) {
      return { category: 'article', subCategory: 'blog-post', confidence: 0.6 };
    }

    // Default to webpage
    return { category: 'webpage', subCategory: 'other', confidence: 0.5 };
  } catch (e) {
    return { category: 'webpage', subCategory: 'other', confidence: 0.3 };
  }
}

/**
 * Get a more specific sub-category based on the URL
 */
function getSubCategory(category, url, hostname, pathname) {
  switch (category) {
    case 'video':
      if (hostname.includes('youtube') || hostname.includes('youtu.be')) {
        if (pathname.includes('/shorts/')) return 'youtube-shorts';
        return 'youtube-video';
      }
      if (hostname.includes('vimeo')) return 'vimeo-video';
      if (hostname.includes('twitch')) return 'twitch-stream';
      if (hostname.includes('tiktok')) return 'tiktok-video';
      return 'video';

    case 'social':
      if (hostname.includes('twitter') || hostname.includes('x.com')) return 'tweet';
      if (hostname.includes('linkedin')) return 'linkedin-post';
      if (hostname.includes('instagram')) return 'instagram-post';
      if (hostname.includes('threads')) return 'thread';
      return 'social-post';

    case 'repository':
      if (hostname.includes('github')) return 'github-repo';
      if (hostname.includes('gitlab')) return 'gitlab-repo';
      return 'git-repo';

    case 'forum':
      if (hostname.includes('reddit')) return 'reddit';
      if (hostname.includes('ycombinator')) return 'hackernews';
      if (hostname.includes('stackoverflow')) return 'stackoverflow';
      return 'discussion';

    case 'blog':
      if (hostname.includes('medium')) return 'medium';
      if (hostname.includes('substack')) return 'substack';
      if (hostname.includes('dev.to')) return 'devto';
      return 'blog-post';

    case 'tool':
      return 'saas';

    case 'documentation':
      if (pathname.includes('/api')) return 'api-docs';
      return 'docs';

    default:
      return category;
  }
}

/**
 * Get display info for a category
 */
export function getCategoryDisplayInfo(category) {
  return CATEGORY_META[category] || CATEGORY_META.webpage;
}

/**
 * Check if a bookmark should be rendered as a specific type
 */
export function getCardType(bookmark) {
  const { url, type, category, subCategory } = bookmark;

  // Explicit note type
  if (type === 'note' || url?.startsWith('note://') || (!url && (bookmark.notes || bookmark.title))) {
    return 'note';
  }

  // Use existing category/subCategory if set
  if (category) {
    // Map category to card type
    switch (category) {
      case 'video':
        return 'video';
      case 'social':
        if (subCategory === 'tweet' || url?.includes('twitter.com') || url?.includes('x.com')) {
          return 'tweet';
        }
        return 'social';
      case 'wikipedia':
        return 'wikipedia';
      case 'image':
        return 'image';
      case 'gif':
        return 'gif';
      case 'repository':
        return 'repository';
      case 'tool':
        return 'tool';
      case 'documentation':
        return 'documentation';
      case 'forum':
        return 'forum';
      case 'news':
      case 'blog':
      case 'article':
        return 'article';
      case 'audio':
        return 'audio';
      case 'product':
        return 'product';
      case 'academic':
        return 'academic';
      case 'design':
        return 'design';
      default:
        return 'webpage';
    }
  }

  // Auto-detect from URL
  if (url) {
    const { category: detectedCategory } = categorizeUrl(url);
    return getCardType({ ...bookmark, category: detectedCategory });
  }

  return 'webpage';
}

export default categorizeUrl;
