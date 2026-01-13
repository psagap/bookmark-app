/**
 * Advanced Search Parser
 * Parses search queries with special syntax:
 * - Multiple keywords: "shoe red" (AND search)
 * - OR search: "cats || dogs"
 * - Exact match: "shoes" (quoted)
 * - Exclude: -red or -"exact phrase"
 * - Object in images: object:car
 * - Text in images/notes: text:car
 * - Card type: type:article, type:note, type:video
 * - Format: format:pdf
 * - Date: date:yesterday, date:lastweek, date:2024-01-15
 * - Site filter: site:youtube
 * - Tag filter: tag:tagname or #tagname
 */

// Date preset mappings
const DATE_PRESETS = {
  'today': 0,
  'yesterday': 1,
  'lastweek': 7,
  'last week': 7,
  'thisweek': 7,
  'this week': 7,
  'lastmonth': 30,
  'last month': 30,
  'thismonth': 30,
  'this month': 30,
};

// Card type mappings
const TYPE_MAPPINGS = {
  'article': ['article', 'website', 'link'],
  'articles': ['article', 'website', 'link'],
  'website': ['article'],
  'websites': ['article'],
  'note': ['note'],
  'notes': ['note'],
  'video': ['youtube'],
  'videos': ['youtube'],
  'youtube': ['youtube'],
  'image': ['image'],
  'images': ['image'],
  'tweet': ['tweet'],
  'tweets': ['tweet'],
  'post': ['tweet', 'reddit'],
  'posts': ['tweet', 'reddit'],
  'snippet': ['note'],
  'snippets': ['note'],
  'reddit': ['reddit'],
};

/**
 * Parse a search query into structured filters
 * @param {string} query - The raw search query
 * @returns {Object} Parsed search filters
 */
export function parseSearchQuery(query) {
  const result = {
    // Plain text terms (AND by default)
    terms: [],
    // OR groups (each group is ANDed with other filters)
    orGroups: [],
    // Exact match phrases
    exactPhrases: [],
    // Excluded terms
    excludeTerms: [],
    // Excluded exact phrases
    excludePhrases: [],
    // Object detection search (for images)
    objectSearch: [],
    // Text search within images/OCR
    textSearch: [],
    // Card types to filter
    types: [],
    // File formats
    formats: [],
    // Date filters
    dateFilter: null,
    dateRange: null,
    // Site/domain filter
    sites: [],
    // Tag filters
    tags: [],
    // Raw remaining query for fuzzy search
    rawQuery: '',
  };

  if (!query || typeof query !== 'string') {
    return result;
  }

  let remaining = query.trim();

  // Extract quoted exact phrases first (including negative)
  // Negative exact phrases: -"phrase"
  const negativeExactRegex = /-"([^"]+)"/g;
  let match;
  while ((match = negativeExactRegex.exec(remaining)) !== null) {
    result.excludePhrases.push(match[1].toLowerCase());
  }
  remaining = remaining.replace(negativeExactRegex, ' ');

  // Positive exact phrases: "phrase"
  const exactRegex = /"([^"]+)"/g;
  while ((match = exactRegex.exec(remaining)) !== null) {
    result.exactPhrases.push(match[1].toLowerCase());
  }
  remaining = remaining.replace(exactRegex, ' ');

  // Extract OR groups: cats || dogs
  const orRegex = /(\S+)\s*\|\|\s*(\S+)/g;
  while ((match = orRegex.exec(remaining)) !== null) {
    result.orGroups.push([match[1].toLowerCase(), match[2].toLowerCase()]);
  }
  remaining = remaining.replace(orRegex, ' ');

  // Extract special filters
  const filters = [
    // object:car
    { regex: /object:(\S+)/gi, handler: (m) => result.objectSearch.push(m[1].toLowerCase()) },
    // text:car
    { regex: /text:(\S+)/gi, handler: (m) => result.textSearch.push(m[1].toLowerCase()) },
    // type:article or type:note
    {
      regex: /type:(\S+)/gi,
      handler: (m) => {
        const types = TYPE_MAPPINGS[m[1].toLowerCase()];
        if (types) result.types.push(...types);
      }
    },
    // format:pdf
    { regex: /format:(\S+)/gi, handler: (m) => result.formats.push(m[1].toLowerCase()) },
    // date:yesterday or date:2024-01-15
    {
      regex: /date:(\S+)/gi,
      handler: (m) => {
        const dateStr = m[1].toLowerCase();
        if (DATE_PRESETS[dateStr] !== undefined) {
          result.dateFilter = dateStr;
        } else {
          // Try to parse as date
          const parsed = new Date(m[1]);
          if (!isNaN(parsed.getTime())) {
            result.dateRange = { start: parsed, end: parsed };
          }
        }
      }
    },
    // site:youtube
    { regex: /site:(\S+)/gi, handler: (m) => result.sites.push(m[1].toLowerCase()) },
    // tag:tagname or #tagname
    { regex: /tag:(\S+)/gi, handler: (m) => result.tags.push(m[1].toLowerCase()) },
    { regex: /#(\w+)/gi, handler: (m) => result.tags.push(m[1].toLowerCase()) },
  ];

  for (const filter of filters) {
    while ((match = filter.regex.exec(remaining)) !== null) {
      filter.handler(match);
    }
    remaining = remaining.replace(filter.regex, ' ');
  }

  // Extract excluded terms: -word
  const excludeRegex = /-(\S+)/g;
  while ((match = excludeRegex.exec(remaining)) !== null) {
    // Make sure it's not a hyphenated word
    if (!remaining.includes(`${match[1]}-`) && !remaining.includes(`-${match[1]}`)) {
      result.excludeTerms.push(match[1].toLowerCase());
    }
  }
  remaining = remaining.replace(/(?<!\S)-(\S+)/g, ' ');

  // Remaining terms are AND search terms
  const terms = remaining.trim().split(/\s+/).filter(t => t.length > 0);
  result.terms = terms.map(t => t.toLowerCase());

  // Build raw query for fuzzy matching
  result.rawQuery = [...result.terms, ...result.exactPhrases].join(' ');

  return result;
}

/**
 * Check if a bookmark matches the parsed search filters
 * @param {Object} bookmark - The bookmark to check
 * @param {Object} filters - Parsed search filters from parseSearchQuery
 * @param {Function} getBookmarkType - Function to determine bookmark type
 * @returns {boolean} Whether the bookmark matches
 */
export function matchesSearchFilters(bookmark, filters, getBookmarkType) {
  const title = (bookmark.title || '').toLowerCase();
  const notes = (bookmark.notes || '').toLowerCase();
  const content = (bookmark.content || '').toLowerCase();
  const url = (bookmark.url || '').toLowerCase();
  const description = (bookmark.description || '').toLowerCase();
  const tags = (bookmark.tags || []).map(t => t.toLowerCase());
  const searchableText = `${title} ${notes} ${content} ${url} ${description} ${tags.join(' ')}`;

  // Check excluded terms first
  for (const term of filters.excludeTerms) {
    if (searchableText.includes(term)) return false;
  }

  // Check excluded phrases
  for (const phrase of filters.excludePhrases) {
    if (searchableText.includes(phrase)) return false;
  }

  // Check exact phrases (must all match)
  for (const phrase of filters.exactPhrases) {
    if (!searchableText.includes(phrase)) return false;
  }

  // Check OR groups (at least one in each group must match)
  for (const group of filters.orGroups) {
    const hasMatch = group.some(term => searchableText.includes(term));
    if (!hasMatch) return false;
  }

  // Check AND terms (all must match)
  for (const term of filters.terms) {
    if (!searchableText.includes(term)) return false;
  }

  // Check type filters
  if (filters.types.length > 0) {
    const bookmarkType = getBookmarkType(bookmark);
    if (!filters.types.includes(bookmarkType)) return false;
  }

  // Check site filters
  if (filters.sites.length > 0) {
    const matchesSite = filters.sites.some(site => url.includes(site));
    if (!matchesSite) return false;
  }

  // Check tag filters
  if (filters.tags.length > 0) {
    const matchesTag = filters.tags.every(tag => tags.includes(tag));
    if (!matchesTag) return false;
  }

  // Check format filters (check URL extension)
  if (filters.formats.length > 0) {
    const matchesFormat = filters.formats.some(format => {
      const extension = url.split('.').pop()?.toLowerCase();
      return extension === format || url.includes(`.${format}`);
    });
    if (!matchesFormat) return false;
  }

  // Check date filter
  if (filters.dateFilter) {
    const days = DATE_PRESETS[filters.dateFilter];
    if (days !== undefined) {
      const filterDate = new Date();
      if (days === 0) {
        filterDate.setHours(0, 0, 0, 0);
      } else {
        filterDate.setDate(filterDate.getDate() - days);
        filterDate.setHours(0, 0, 0, 0);
      }
      const itemDate = new Date(bookmark.createdAt);
      if (itemDate < filterDate) return false;
    }
  }

  // Check date range
  if (filters.dateRange) {
    const itemDate = new Date(bookmark.createdAt);
    const startOfDay = new Date(filters.dateRange.start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filters.dateRange.end);
    endOfDay.setHours(23, 59, 59, 999);
    if (itemDate < startOfDay || itemDate > endOfDay) return false;
  }

  // Object search and text search would require ML/OCR integration
  // For now, we'll search in description and any extracted text
  if (filters.objectSearch.length > 0) {
    const matchesObject = filters.objectSearch.some(obj =>
      description.includes(obj) || notes.includes(obj)
    );
    if (!matchesObject) return false;
  }

  if (filters.textSearch.length > 0) {
    const matchesText = filters.textSearch.some(text =>
      notes.includes(text) || content.includes(text) || description.includes(text)
    );
    if (!matchesText) return false;
  }

  return true;
}

/**
 * Get search syntax help for display
 */
export const SEARCH_SYNTAX_HELP = {
  refineResults: [
    { description: 'Press ENTER after a keyword to create a deep search', example: ['SHOE', '+', 'RED'] },
    { description: 'Search for objects inside images', example: ['object: CAR'] },
    { description: 'OR Search', example: ['cats || dogs'] },
    { description: 'Search for text within images or inside notes', example: ['text: CAR'] },
    { description: 'Search by card type', example: ['ARTICLES', 'WEBSITES', 'NOTES', 'SNIPPETS'], isChips: true },
    { description: 'Search files by format', example: ['format: PDF'] },
    { description: 'Search by date', example: ['YESTERDAY', 'LAST WEEK', 'MAY 19TH'], isChips: true },
    { description: 'Exclude something from the search results', example: ['SHOE', '+', '-RED'] },
    { description: 'To find an exact match (text or text in images)', example: ['"SHOES"'] },
    { description: 'Filter results by a specific website', example: ['site: YOUTUBE'] },
    { description: 'Filter results by a specific tag', example: ['tag: NAMEOFTAG'] },
  ],
  globalShortcuts: [
    { description: 'Shortcut to create a new note', keys: ['N'] },
    { description: 'Saves note as a new card', keys: ['⌘', '+', 'ENTER'] },
    { description: 'Exit a card view', keys: ['ESC'] },
    { description: 'Focus on the search field', keys: ['ENTER'] },
  ],
};
