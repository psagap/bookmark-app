import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen, StickyNote, Video, Image, Hash } from 'lucide-react';

// X (Twitter) Logo SVG Component
const XLogo = ({ className, style, ...props }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Reddit Logo SVG Component
const RedditLogo = ({ className, style, ...props }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" {...props}>
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

// Wikipedia Logo SVG Component
const WikipediaLogo = ({ className, style, ...props }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" {...props}>
    <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.22-.812-.24l-.201-.021c-.052 0-.098-.015-.145-.051-.045-.031-.067-.076-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178-.646.03-.782.095-1.023.439-.12.186-.375.589-.646 1.039l-2.301 4.273-.065.135 2.792 5.712.17.048 4.396-10.438c.154-.422.129-.722-.064-.895-.197-.172-.346-.273-.857-.295l-.42-.016c-.061 0-.105-.014-.152-.045-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18-.648.03-1.127.18-1.443.421-.314.255-.557.616-.736 1.067 0 0-4.043 9.258-5.426 12.339-.525 1.007-1.053.917-1.503-.031-.571-1.171-1.773-3.786-2.646-5.71l.053-.036z" />
  </svg>
);

import { cn } from '@/lib/utils';

// ============================================================================
// PLACEHOLDER TEXTS - Humorous search prompts that rotate on each visit
// ============================================================================

const SEARCH_PLACEHOLDERS = [
  "Where did I put that thing...",
  "Digging through the archives...",
  "What was that article about?",
  "Finding hidden treasures...",
  "Summoning forgotten bookmarks...",
  "Unearthing buried gems...",
  "What was I reading last week?",
  "Searching the memory palace...",
  "Hunting for that one link...",
  "Consulting the oracle...",
  "Where's that video I loved?",
  "Spelunking through saves...",
  "Retrieving digital memories...",
  "Looking for buried treasure...",
  "What did past-me save?",
  "Ransacking the vault...",
  "Seeking inspiration from the past...",
  "Exploring the rabbit holes...",
  "Rewinding through history...",
  "What enlightened me before?",
  "Chasing half-remembered ideas...",
  "Excavating old discoveries...",
  "Tracking down that thought...",
  "What sparked that idea?",
  "Journey into the stash...",
  "Rifling through the collection...",
  "Detective mode activated...",
  "What caught my eye back then?",
  "Scanning the knowledge base...",
  "Rediscovering forgotten finds...",
];

// Get a random placeholder (cached per session)
const getRandomPlaceholder = () => {
  const cached = sessionStorage.getItem('search-placeholder');
  if (cached) return cached;

  const random = SEARCH_PLACEHOLDERS[Math.floor(Math.random() * SEARCH_PLACEHOLDERS.length)];
  sessionStorage.setItem('search-placeholder', random);
  return random;
};

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

const MIND_CATEGORIES = [
  {
    id: 'image',
    keywords: ['images', 'image', 'photos', 'pictures', 'pics'],
    label: 'Images',
    icon: Image,
    color: 'gruvbox-purple',
    bgClass: 'bg-gruvbox-purple/20',
    textClass: 'text-gruvbox-purple',
    borderClass: 'border-gruvbox-purple/30',
    hexColor: '#d3869b',
  },
  {
    id: 'youtube',
    keywords: ['videos', 'video', 'youtube', 'yt'],
    label: 'Videos',
    icon: Video,
    color: 'gruvbox-red',
    bgClass: 'bg-gruvbox-red/20',
    textClass: 'text-gruvbox-red',
    borderClass: 'border-gruvbox-red/30',
    hexColor: '#fb4934',
  },
  {
    id: 'note',
    keywords: ['notes', 'note', 'thoughts'],
    label: 'Notes',
    icon: StickyNote,
    color: 'gruvbox-yellow',
    bgClass: 'bg-gruvbox-yellow/20',
    textClass: 'text-gruvbox-yellow',
    borderClass: 'border-gruvbox-yellow/30',
    hexColor: '#fabd2f',
  },
  {
    id: 'tweet',
    keywords: ['tweets', 'tweet', 'twitter', 'x', 'x posts', 'x post', 'xposts', 'xpost'],
    label: 'Posts',
    icon: XLogo,
    color: 'gruvbox-fg',
    bgClass: 'bg-gruvbox-fg/20',
    textClass: 'text-gruvbox-fg',
    borderClass: 'border-gruvbox-fg/30',
    hexColor: '#a89984',
  },
  {
    id: 'reddit',
    keywords: ['reddit', 'subreddit', 'subreddits', 'r/'],
    label: 'Posts',
    icon: RedditLogo,
    color: 'gruvbox-orange',
    bgClass: 'bg-gruvbox-orange/20',
    textClass: 'text-gruvbox-orange',
    borderClass: 'border-gruvbox-orange/30',
    hexColor: '#ff4500',
  },
  {
    id: 'wikipedia',
    keywords: ['wiki', 'wikipedia', 'encyclopedia'],
    label: 'Articles',
    icon: WikipediaLogo,
    color: 'gruvbox-aqua',
    bgClass: 'bg-gruvbox-aqua/20',
    textClass: 'text-gruvbox-aqua',
    borderClass: 'border-gruvbox-aqua/30',
    hexColor: '#83a598',
  },
  {
    id: 'article',
    keywords: ['articles', 'article', 'links', 'link', 'websites', 'web', 'pages', 'reads', 'reading'],
    label: 'Articles',
    icon: BookOpen,
    color: 'gruvbox-green',
    bgClass: 'bg-gruvbox-green/20',
    textClass: 'text-gruvbox-green',
    borderClass: 'border-gruvbox-green/30',
    hexColor: '#8ec07c',
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Map category IDs to mediaCounts keys
const getCountForCategory = (categoryId, mediaCounts) => {
  const mapping = {
    'youtube': mediaCounts?.video || 0,
    'image': mediaCounts?.image || 0,
    'note': mediaCounts?.note || 0,
    'tweet': mediaCounts?.tweet || 0,
    'article': mediaCounts?.article || 0,
    'reddit': mediaCounts?.article || 0, // Reddit counts toward article
    'wikipedia': mediaCounts?.article || 0, // Wikipedia counts toward article
  };
  return mapping[categoryId] || 0;
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

// Calculate ghost text prediction based on current query
const useGhostText = (query, categories) => {
  return useMemo(() => {
    if (!query || query.length < 2) return { ghostText: '', matchedCategory: null };

    const lowerQuery = query.toLowerCase().trim();

    for (const category of categories) {
      for (const keyword of category.keywords) {
        if (keyword.startsWith(lowerQuery) && keyword !== lowerQuery) {
          return {
            ghostText: keyword.slice(lowerQuery.length),
            matchedCategory: category
          };
        }
      }
    }
    return { ghostText: '', matchedCategory: null };
  }, [query, categories]);
};

// Hook to determine which categories to show as suggestions based on query
const useCategorySuggestions = (query, categories, activeFilters, mediaCounts) => {
  return useMemo(() => {
    // Don't show if query is empty, too short, or typing a hashtag
    if (!query || query.length < 2 || query.includes('#')) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();

    // Find matching categories
    const matches = categories.filter(category => {
      // Skip if already active
      if (activeFilters.includes(category.id)) return false;

      // Check if any keyword starts with or includes the query
      return category.keywords.some(keyword =>
        keyword.toLowerCase().includes(lowerQuery)
      );
    });

    // Sort by count (highest first), then by relevance
    return matches.sort((a, b) => {
      const countA = getCountForCategory(a.id, mediaCounts);
      const countB = getCountForCategory(b.id, mediaCounts);
      if (countB !== countA) return countB - countA;

      // If counts are equal, prioritize exact prefix matches
      const aHasPrefix = a.keywords.some(k => k.toLowerCase().startsWith(lowerQuery));
      const bHasPrefix = b.keywords.some(k => k.toLowerCase().startsWith(lowerQuery));
      if (aHasPrefix && !bHasPrefix) return -1;
      if (!aHasPrefix && bHasPrefix) return 1;
      return 0;
    });
  }, [query, categories, activeFilters, mediaCounts]);
};

// Find category by exact keyword match
const findCategoryByKeyword = (keyword) => {
  const lowerKeyword = keyword.toLowerCase().trim();
  for (const category of MIND_CATEGORIES) {
    if (category.keywords.includes(lowerKeyword)) {
      return category;
    }
  }
  return null;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Active pill in search bar - uses inline styles for consistent colors with FolderTabs
const ActiveSearchPill = ({ category, onRemove, isCompact = false }) => {
  const Icon = category.icon;
  
  // Size values based on compact mode
  const pillPadding = isCompact ? '6px 12px' : '10px 18px';
  const pillGap = isCompact ? '6px' : '10px';
  const pillFontSize = isCompact ? '13px' : '16px';
  const iconSize = isCompact ? '14px' : '18px';

  return (
    <motion.div
      layoutId={`filter-pill-${category.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="active-search-pill group flex items-center rounded-full font-medium"
      style={{
        backgroundColor: `${category.hexColor}20`,
        color: category.hexColor,
        padding: pillPadding,
        gap: pillGap,
        fontSize: pillFontSize,
      }}
    >
      <Icon style={{ width: iconSize, height: iconSize }} />
      <span className="font-medium">{category.label}</span>
      <span className="active-search-pill-remove overflow-hidden transition-all duration-200 ease-out opacity-0 group-hover:opacity-100 flex items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-black/20 transition-colors"
          style={{ color: category.hexColor }}
          aria-label={`Remove ${category.label} filter`}
        >
          <X style={{ width: iconSize, height: iconSize }} />
        </button>
      </span>
      <style>{`
        .active-search-pill .active-search-pill-remove {
          max-width: 0;
          padding-right: 0;
          transition: max-width 0.2s ease-out, opacity 0.15s ease-out, padding 0.2s ease-out;
        }
        .active-search-pill:hover .active-search-pill-remove {
          max-width: 18px;
          padding-right: 6px;
        }
      `}</style>
    </motion.div>
  );
};

// Ghost text overlay that appears after the typed text
const GhostTextOverlay = ({ query, ghostText }) => {
  if (!ghostText) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center overflow-hidden"
      aria-hidden="true"
    >
      <span
        className="text-transparent whitespace-pre font-light tracking-wide"
        style={{ fontFamily: 'Georgia, serif', fontSize: 'var(--ui-search-text)' }}
      >
        {query}
      </span>
      <span
        className="text-gruvbox-fg-muted/30 font-light tracking-wide italic"
        style={{ fontFamily: 'Georgia, serif', fontSize: 'var(--ui-search-text)' }}
      >
        {ghostText}
      </span>
    </div>
  );
};

// Category Suggestion Dropdown - shows matching categories when typing
const CategorySuggestionDropdown = ({ categories, selectedIndex, onSelect, mediaCounts }) => {
  if (categories.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="absolute left-0 top-full mt-2 w-72 bg-gruvbox-bg-dark rounded-xl border border-gruvbox-bg-lighter/30 shadow-2xl overflow-hidden z-50"
    >
      <div className="px-3 py-2 text-xs font-medium text-gruvbox-fg-muted border-b border-gruvbox-bg-lighter/20 flex items-center gap-2">
        <Search className="w-3 h-3" />
        Categories
      </div>
      <div className="max-h-64 overflow-y-auto">
        {categories.map((category, index) => {
          const Icon = category.icon;
          const count = getCountForCategory(category.id, mediaCounts);
          const isSelected = index === selectedIndex;

          return (
            <button
              key={category.id}
              onClick={() => onSelect(category)}
              className={cn(
                "w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors",
                isSelected
                  ? "text-gruvbox-fg"
                  : "text-gruvbox-fg hover:bg-gruvbox-bg-lighter/20"
              )}
              style={isSelected ? {
                backgroundColor: `${category.hexColor}20`,
                color: category.hexColor
              } : {}}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isSelected ? category.hexColor : category.hexColor + '80' }}
              />
              <span className="font-medium flex-1">{category.label}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full bg-gruvbox-bg-lighter/40 text-gruvbox-fg-muted"
                style={isSelected ? {
                  backgroundColor: `${category.hexColor}30`,
                  color: category.hexColor
                } : {}}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="px-3 py-2 text-[10px] text-gruvbox-fg-muted/50 border-t border-gruvbox-bg-lighter/20">
        ↑↓ navigate • Enter to select • Esc to close
      </div>
    </motion.div>
  );
};

// Bottom tab pill - animates out when active with shared layoutId
// Each pill has its own hover state with subtle category color
const TabPill = ({ category, isActive, onClick }) => {
  const Icon = category.icon;
  const [isHovered, setIsHovered] = useState(false);

  // Get hover styles based on category color (same as FolderTabs)
  const getHoverStyles = () => {
    if (isActive || !isHovered) return {};

    return {
      backgroundColor: `${category.hexColor}33`, // 33 = ~20% opacity in hex
      borderColor: `${category.hexColor}4D`, // 4D = ~30% opacity
      color: category.hexColor,
      boxShadow: `0 2px 10px ${category.hexColor}66`, // 40% opacity - matches FolderTabs hover
    };
  };

  return (
    <AnimatePresence mode="popLayout">
      {!isActive && (
        <motion.button
          key={category.id}
          layoutId={`filter-pill-${category.id}`}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "flex items-center rounded-full font-medium border transition-colors duration-200 bg-transparent border-gruvbox-bg-lighter/40 text-gruvbox-fg-muted/50",
            isHovered && "shadow-lg"
          )}
          style={{
            padding: 'var(--ui-pill-py) var(--ui-pill-px)',
            gap: 'var(--ui-pill-gap)',
            fontSize: 'var(--ui-pill-text)',
            ...getHoverStyles()
          }}
          initial={{ opacity: 1, scale: 1, width: 'auto' }}
          exit={{
            opacity: 0,
            scale: 0.8,
            width: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginLeft: 0,
            marginRight: 0,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35,
            opacity: { duration: 0.15 }
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
        >
          <Icon
            className={cn(
              "transition-opacity duration-200",
              isHovered ? "opacity-80" : "opacity-50"
            )}
            style={{ width: 'var(--ui-pill-icon)', height: 'var(--ui-pill-icon)' }}
          />
          <span className={cn(
            "transition-opacity duration-200",
            isHovered ? "opacity-90" : "opacity-60"
          )}>{category.label}</span>
          {/* Hidden placeholder for X button to match ActiveSearchPill size */}
          <span className="ml-0.5 p-0.5 opacity-0 pointer-events-none">
            <X style={{ width: 'var(--ui-pill-icon)', height: 'var(--ui-pill-icon)' }} />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MindSearch = ({
  onFilterChange,
  showInlineFilters = false,
  activeFilters = [], // External filter IDs - this is the source of truth
  activeTags = [], // External tag filters
  onTagFilterChange, // Callback for tag filter changes
  tagRefreshTrigger = 0, // Trigger to refetch tags
  mediaCounts = {}, // Counts for each category (video, image, note, tweet, article)
  isCompact = false, // Compact mode when scrolled
  sidebarCollapsed = false, // Sidebar collapse state for fluid animation
}) => {
  // ========== STATE ==========
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [placeholder] = useState(() => getRandomPlaceholder());

  // Tag search state
  const [allTags, setAllTags] = useState([]);
  const [isTypingTag, setIsTypingTag] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [selectedTagIndex, setSelectedTagIndex] = useState(0);

  // Category suggestion state
  const [categorySuggestionIndex, setCategorySuggestionIndex] = useState(0);

  // ========== REFS ==========
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const tagDropdownRef = useRef(null);

  // ========== FETCH TAGS ==========
  useEffect(() => {
    const fetchTags = async () => {
      try {
        // Import supabase client dynamically to avoid circular deps
        const { supabase } = await import('../lib/supabaseClient');
        const { data, error } = await supabase
          .from('bookmarks')
          .select('tags');

        if (error) throw error;

        // Extract unique tags from all bookmarks
        const uniqueTags = [...new Set((data || []).flatMap(b => b.tags || []))];
        setAllTags(uniqueTags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    fetchTags();
  }, [tagRefreshTrigger]);

  // ========== FILTERED TAGS ==========
  const filteredTags = useMemo(() => {
    if (!isTypingTag) return [];
    const query = tagQuery.toLowerCase();
    return allTags
      .filter(tag => !activeTags.includes(tag)) // Exclude already selected tags
      .filter(tag => tag.toLowerCase().includes(query))
      .slice(0, 10); // Limit to 10 suggestions
  }, [allTags, tagQuery, isTypingTag, activeTags]);

  // ========== TAG MANAGEMENT ==========
  const handleTagSelect = useCallback((tag) => {
    onTagFilterChange?.([...activeTags, tag]);
    setQuery(query.replace(/#\w*$/, '').trim());
    setIsTypingTag(false);
    setTagQuery('');
    setSelectedTagIndex(0);
    inputRef.current?.focus();
  }, [activeTags, onTagFilterChange, query]);

  const removeTag = useCallback((tag) => {
    onTagFilterChange?.(activeTags.filter(t => t !== tag));
  }, [activeTags, onTagFilterChange]);

  // ========== QUERY CHANGE WITH HASHTAG DETECTION ==========
  const handleQueryChange = useCallback((value) => {
    setQuery(value);

    // Detect hashtag typing
    const hashMatch = value.match(/#(\w*)$/);
    if (hashMatch) {
      setIsTypingTag(true);
      setTagQuery(hashMatch[1]);
      setSelectedTagIndex(0);
    } else {
      setIsTypingTag(false);
      setTagQuery('');
    }
  }, []);

  // ========== DERIVED STATE ==========
  // Convert activeFilters IDs to full category objects
  const activePills = useMemo(() => {
    return activeFilters
      .map(id => MIND_CATEGORIES.find(c => c.id === id))
      .filter(Boolean);
  }, [activeFilters]);

  const { ghostText, matchedCategory } = useGhostText(query, MIND_CATEGORIES);
  const categorySuggestions = useCategorySuggestions(query, MIND_CATEGORIES, activeFilters, mediaCounts);
  const hasActivePills = activePills.length > 0 || activeTags.length > 0;
  const isInteracting = isFocused || isHovered || query.length > 0;
  const activeIds = useMemo(() => new Set(activePills.map(p => p.id)), [activePills]);

  // Reset category suggestion index when suggestions change
  useEffect(() => {
    setCategorySuggestionIndex(0);
  }, [categorySuggestions.length]);

  // ========== PILL MANAGEMENT ==========
  // All pill changes go through onFilterChange to update external state
  const addPill = useCallback((category) => {
    if (!activeFilters.includes(category.id)) {
      onFilterChange?.([...activeFilters, category.id]);
      setQuery('');
    }
  }, [activeFilters, onFilterChange]);

  const removePill = useCallback((categoryId) => {
    onFilterChange?.(activeFilters.filter(id => id !== categoryId));
  }, [activeFilters, onFilterChange]);

  const togglePill = useCallback((category) => {
    if (activeFilters.includes(category.id)) {
      removePill(category.id);
    } else {
      addPill(category);
    }
  }, [activeFilters, addPill, removePill]);

  const clearAll = useCallback(() => {
    onFilterChange?.([]);
    onTagFilterChange?.([]);
    setQuery('');
    setIsTypingTag(false);
    setTagQuery('');
  }, [onFilterChange, onTagFilterChange]);

  // ========== KEYBOARD HANDLING ==========
  const handleKeyDown = useCallback((e) => {
    // Category suggestion dropdown navigation (takes precedence when visible)
    if (categorySuggestions.length > 0 && !isTypingTag) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCategorySuggestionIndex(prev => Math.min(prev + 1, categorySuggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCategorySuggestionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        addPill(categorySuggestions[categorySuggestionIndex]);
        setCategorySuggestionIndex(0);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setQuery('');
        setCategorySuggestionIndex(0);
        return;
      }
    }

    // Tag dropdown navigation
    if (isTypingTag && filteredTags.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedTagIndex(prev => Math.min(prev + 1, filteredTags.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedTagIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleTagSelect(filteredTags[selectedTagIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsTypingTag(false);
        setTagQuery('');
        return;
      }
    }

    if ((e.key === 'Tab' || e.key === 'Enter') && query.trim()) {
      if (ghostText && matchedCategory) {
        e.preventDefault();
        addPill(matchedCategory);
        return;
      }
      const exactMatch = findCategoryByKeyword(query);
      if (exactMatch && !activeFilters.includes(exactMatch.id)) {
        e.preventDefault();
        addPill(exactMatch);
        return;
      }
    }

    if (e.key === ' ' && query.trim()) {
      const exactMatch = findCategoryByKeyword(query);
      if (exactMatch && !activeFilters.includes(exactMatch.id)) {
        e.preventDefault();
        addPill(exactMatch);
        return;
      }
    }

    if (e.key === 'Backspace' && !query && activeFilters.length > 0) {
      // Remove the last filter
      onFilterChange?.(activeFilters.slice(0, -1));
      return;
    }

    if (e.key === 'Escape') {
      if (isTypingTag) {
        setIsTypingTag(false);
        setTagQuery('');
        return;
      }
      if (query || activeFilters.length > 0) {
        clearAll();
      } else {
        inputRef.current?.blur();
      }
      return;
    }
  }, [query, ghostText, matchedCategory, activeFilters, addPill, clearAll, onFilterChange, isTypingTag, filteredTags, selectedTagIndex, handleTagSelect, categorySuggestions, categorySuggestionIndex]);

  // ========== GLOBAL KEYBOARD SHORTCUT (Cmd+K) ==========
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsFocused(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsFocused(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ========== CLICK OUTSIDE ==========
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFocused]);

  // ========== DYNAMIC PLACEHOLDER ==========
  const getPlaceholder = () => {
    if (hasActivePills) {
      return "Add more filters...";
    }
    return placeholder;
  };

  // ========== RENDER ==========
  // Fluid spring config for sidebar collapse/expand animation
  const fluidSpring = {
    type: "spring",
    stiffness: 120,
    damping: 20,
    mass: 0.8,
  };

  return (
    <motion.div 
      ref={containerRef} 
      className={cn(
        "relative flex-1 mr-6",
        isCompact ? "max-w-2xl" : "max-w-4xl"
      )}
      layout
      transition={fluidSpring}
    >
      {/* Search Bar Container - Minimalist, focus-only underline */}
      <motion.div
        className={cn(
          "relative flex items-center",
          isCompact ? "gap-3 px-0 py-1 mt-4" : "gap-4 px-0 py-2 mt-6"
        )}
        style={{
          borderBottom: isFocused 
            ? '1px solid rgba(138, 161, 184, 0.35)' 
            : '1px solid transparent',
          boxShadow: isFocused
            ? '0 1px 0 0 rgba(138, 161, 184, 0.1)'
            : 'none',
          transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        layout
        transition={fluidSpring}
      >
        {/* Search Icon - soft blue-gray, brightens on focus */}
        <Search
          className="flex-shrink-0 transition-all duration-300"
          style={{
            width: isCompact ? '18px' : '22px',
            height: isCompact ? '18px' : '22px',
            color: isFocused ? 'rgba(138, 161, 184, 0.85)' : 'rgba(138, 161, 184, 0.5)',
          }}
          strokeWidth={1.5}
        />

        {/* Active Pills in Search Bar */}
        <motion.div
          className={cn("flex items-center", isCompact ? "gap-2" : "gap-3")}
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <AnimatePresence mode="popLayout">
            {activePills.map(pill => (
              <ActiveSearchPill
                key={pill.id}
                category={pill}
                onRemove={() => removePill(pill.id)}
                isCompact={isCompact}
              />
            ))}
          </AnimatePresence>

          {/* Active Tag Pills */}
          <AnimatePresence mode="popLayout">
            {activeTags.map(tag => (
              <motion.div
                key={`tag-${tag}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="flex items-center rounded-full font-medium bg-gruvbox-aqua/20 text-gruvbox-aqua"
                style={{
                  padding: isCompact ? '6px 12px' : '10px 18px',
                  gap: isCompact ? '6px' : '10px',
                  fontSize: isCompact ? '13px' : '16px',
                }}
              >
                <Hash style={{ width: isCompact ? '14px' : '18px', height: isCompact ? '14px' : '18px' }} />
                <span className="font-medium">{tag}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-black/20 transition-colors text-gruvbox-aqua"
                  aria-label={`Remove ${tag} tag filter`}
                >
                  <X style={{ width: isCompact ? '14px' : '18px', height: isCompact ? '14px' : '18px' }} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Input with Ghost Text Overlay */}
        <motion.div
          className={cn(
            "relative flex-1 transition-all duration-500",
            isCompact ? "min-w-[160px]" : "min-w-[240px]"
          )}
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder=""
            className={cn(
              "w-full bg-transparent text-gruvbox-fg focus:outline-none relative z-10 transition-all duration-300",
              isCompact
                ? "py-1 text-[15px] font-normal"
                : "py-1 text-[22px] font-light tracking-tight"
            )}
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            }}
            aria-label="Search filters"
            autoComplete="off"
          />
          {/* Italic serif placeholder overlay - shown when input is empty */}
          {!query && (
            <div
              className="absolute inset-0 flex items-center pointer-events-none select-none"
              style={{
                fontFamily: "'Georgia', 'Playfair Display', 'Times New Roman', serif",
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: isCompact ? '16px' : '24px',
                color: 'rgba(138, 161, 184, 0.7)',
                letterSpacing: '0.02em',
              }}
            >
              {getPlaceholder()}
            </div>
          )}

          <GhostTextOverlay query={query} ghostText={ghostText} />

          {/* Category Suggestion Dropdown */}
          <AnimatePresence>
            {categorySuggestions.length > 0 && !isTypingTag && (
              <CategorySuggestionDropdown
                categories={categorySuggestions}
                selectedIndex={categorySuggestionIndex}
                onSelect={(category) => {
                  addPill(category);
                  setCategorySuggestionIndex(0);
                }}
                mediaCounts={mediaCounts}
              />
            )}
          </AnimatePresence>

          {/* Tag Dropdown */}
          <AnimatePresence>
            {isTypingTag && filteredTags.length > 0 && (
              <motion.div
                ref={tagDropdownRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute left-0 top-full mt-2 w-64 bg-gruvbox-bg-dark rounded-xl border border-gruvbox-bg-lighter/30 shadow-2xl overflow-hidden z-50"
              >
                <div className="px-3 py-2 text-xs font-medium text-gruvbox-fg-muted border-b border-gruvbox-bg-lighter/20 flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  Tags
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredTags.map((tag, index) => (
                    <button
                      key={tag}
                      onClick={() => handleTagSelect(tag)}
                      className={cn(
                        "w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors",
                        index === selectedTagIndex
                          ? "bg-gruvbox-aqua/20 text-gruvbox-aqua"
                          : "text-gruvbox-fg hover:bg-gruvbox-bg-lighter/20"
                      )}
                    >
                      <Hash className="w-4 h-4 text-gruvbox-fg-muted" />
                      <span className="font-medium">{tag}</span>
                    </button>
                  ))}
                </div>
                <div className="px-3 py-2 text-[10px] text-gruvbox-fg-muted/50 border-t border-gruvbox-bg-lighter/20">
                  ↑↓ navigate • Enter to select • Esc to close
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state when typing # but no matching tags */}
          <AnimatePresence>
            {isTypingTag && filteredTags.length === 0 && allTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute left-0 top-full mt-2 w-64 bg-gruvbox-bg-dark rounded-xl border border-gruvbox-bg-lighter/30 shadow-2xl overflow-hidden z-50"
              >
                <div className="px-3 py-4 text-center text-sm text-gruvbox-fg-muted">
                  No tags match "{tagQuery}"
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Clear All Button */}
        <AnimatePresence>
          {hasActivePills && (
            <motion.button
              onClick={clearAll}
              className="rounded-full hover:bg-red-500/10 transition-all p-2"
              style={{
                color: 'rgba(138, 161, 184, 0.5)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(138, 161, 184, 0.5)'}
              title="Clear all filters"
              aria-label="Clear all filters"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <X className="w-4 h-4 transition-all" strokeWidth={1.75} />
            </motion.button>
          )}
        </AnimatePresence>

      </motion.div>

      {/* Bottom Filter Tabs */}
      {showInlineFilters && (
        <motion.div
          className="mt-4 flex items-center justify-center gap-3 overflow-hidden"
          layout
          transition={fluidSpring}
        >
          {MIND_CATEGORIES.map((category) => (
            <TabPill
              key={category.id}
              category={category}
              isActive={activeIds.has(category.id)}
              onClick={() => togglePill(category)}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

// Export the categories for use in other components
export { MIND_CATEGORIES };
export default MindSearch;
