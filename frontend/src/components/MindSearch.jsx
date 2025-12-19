import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command, Globe, StickyNote, Video, Image } from 'lucide-react';

// X (Twitter) Logo SVG Component
const XLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
    id: 'article',
    keywords: ['articles', 'article', 'links', 'link', 'websites', 'web', 'pages', 'reads', 'reading'],
    label: 'Articles',
    icon: Globe,
    color: 'gruvbox-aqua',
    bgClass: 'bg-gruvbox-aqua/20',
    textClass: 'text-gruvbox-aqua',
    borderClass: 'border-gruvbox-aqua/30',
    hexColor: '#8ec07c',
  },
  {
    id: 'tweet',
    keywords: ['tweets', 'tweet', 'twitter', 'x', 'posts', 'post', 'threads', 'thread', 'x posts', 'x post', 'xposts', 'xpost'],
    label: 'Posts',
    icon: XLogo,
    color: 'gruvbox-blue',
    bgClass: 'bg-gruvbox-blue/20',
    textClass: 'text-gruvbox-blue',
    borderClass: 'border-gruvbox-blue/30',
    hexColor: '#83a598',
  },
];

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
const ActiveSearchPill = ({ category, onRemove }) => {
  const Icon = category.icon;

  return (
    <motion.div
      layoutId={`filter-pill-${category.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1.02 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shadow-lg"
      style={{
        backgroundColor: `${category.hexColor}33`, // 20% opacity - matches FolderTabs
        color: category.hexColor,
        borderColor: `${category.hexColor}4D`, // 30% opacity - matches FolderTabs
        boxShadow: `0 4px 20px ${category.hexColor}66`, // 40% opacity, 20px spread - matches FolderTabs active
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="font-medium">{category.label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 p-0.5 rounded-full hover:bg-black/20 transition-colors"
        style={{ color: category.hexColor }}
        aria-label={`Remove ${category.label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
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
        className="text-lg text-transparent whitespace-pre font-light tracking-wide"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {query}
      </span>
      <span
        className="text-lg text-gruvbox-fg-muted/30 font-light tracking-wide italic"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {ghostText}
      </span>
    </div>
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
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors duration-200 bg-transparent border-gruvbox-bg-lighter/40 text-gruvbox-fg-muted/50",
            isHovered && "shadow-lg"
          )}
          style={getHoverStyles()}
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
          <Icon className={cn(
            "w-4 h-4 transition-opacity duration-200",
            isHovered ? "opacity-80" : "opacity-50"
          )} />
          <span className={cn(
            "transition-opacity duration-200",
            isHovered ? "opacity-90" : "opacity-60"
          )}>{category.label}</span>
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
}) => {
  // ========== STATE ==========
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [placeholder] = useState(() => getRandomPlaceholder());

  // ========== REFS ==========
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // ========== DERIVED STATE ==========
  // Convert activeFilters IDs to full category objects
  const activePills = useMemo(() => {
    return activeFilters
      .map(id => MIND_CATEGORIES.find(c => c.id === id))
      .filter(Boolean);
  }, [activeFilters]);

  const { ghostText, matchedCategory } = useGhostText(query, MIND_CATEGORIES);
  const hasActivePills = activePills.length > 0;
  const isInteracting = isFocused || isHovered || query.length > 0;
  const activeIds = useMemo(() => new Set(activePills.map(p => p.id)), [activePills]);

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
    setQuery('');
  }, [onFilterChange]);

  // ========== KEYBOARD HANDLING ==========
  const handleKeyDown = useCallback((e) => {
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
      if (query || activeFilters.length > 0) {
        clearAll();
      } else {
        inputRef.current?.blur();
      }
      return;
    }
  }, [query, ghostText, matchedCategory, activeFilters, addPill, clearAll, onFilterChange]);

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
  return (
    <div ref={containerRef} className="relative flex-1 max-w-4xl mx-4">
      {/* Search Bar Container */}
      <motion.div
        className={cn(
          "relative flex items-center gap-3 rounded-2xl px-6 transition-colors duration-300 ease-out",
          isFocused
            ? "bg-gruvbox-bg-dark/40"
            : "bg-transparent"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Search Icon */}
        <Search
          className={cn(
            "w-6 h-6 flex-shrink-0 transition-all duration-200",
            isFocused ? "text-gruvbox-yellow" : "text-gruvbox-fg-muted/50"
          )}
        />

        {/* Active Pills in Search Bar */}
        <motion.div
          className="flex items-center gap-2"
          layout
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <AnimatePresence mode="popLayout">
            {activePills.map(pill => (
              <ActiveSearchPill
                key={pill.id}
                category={pill}
                onRemove={() => removePill(pill.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Input with Ghost Text Overlay */}
        <motion.div
          className="relative flex-1 min-w-[200px]"
          layout
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder={getPlaceholder()}
            className={cn(
              "w-full py-5 bg-transparent text-lg text-gruvbox-fg focus:outline-none relative z-10",
              "font-light tracking-wide",
              "placeholder:text-gruvbox-fg-muted/30 placeholder:font-light placeholder:italic placeholder:tracking-wide"
            )}
            style={{
              fontFamily: 'Georgia, serif'
            }}
            aria-label="Search filters"
            autoComplete="off"
          />

          <GhostTextOverlay query={query} ghostText={ghostText} />
        </motion.div>

        {/* Clear All Button */}
        <AnimatePresence>
          {hasActivePills && (
            <motion.button
              onClick={clearAll}
              className="p-2 rounded-lg text-gruvbox-fg-muted/60 hover:text-gruvbox-red hover:bg-gruvbox-red/10 transition-colors"
              title="Clear all filters"
              aria-label="Clear all filters"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Keyboard Hint */}
        {!isFocused && !hasActivePills && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gruvbox-bg-lighter/20">
            <Command className="w-3 h-3 text-gruvbox-fg-muted/30" />
            <span className="text-[10px] text-gruvbox-fg-muted/30 font-medium">K</span>
          </div>
        )}
      </motion.div>

      {/* Bottom Filter Tabs */}
      {showInlineFilters && (
        <motion.div
          className="mt-4 flex items-center justify-center gap-3 overflow-hidden"
          layout
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
    </div>
  );
};

// Export the categories for use in other components
export { MIND_CATEGORIES };
export default MindSearch;
