import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import {
  Search, X, Command, Link2, StickyNote, Twitter, Youtube,
  Globe, FolderOpen, Tag, ChevronDown, ChevronRight, Filter, Sparkles,
  Calendar, Clock, Image, FileText, Zap, ArrowUp, ArrowDown, CornerDownLeft,
  Loader2, AlertCircle, TrendingUp, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagColor } from '@/utils/tagColors';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Pixie Folders color palette
const PIXIE_FOLDER_COLORS = [
  { name: 'yellow', hex: '#F9B846' },
  { name: 'aqua', hex: '#2BC4C4' },
  { name: 'blue', hex: '#7B7EED' },
  { name: 'purple', hex: '#B687D6' },
  { name: 'pink', hex: '#F6639B' },
  { name: 'salmon', hex: '#F87171' },
  { name: 'black', hex: '#2D2D2D' },
];

// Type definitions with icons and colors
const BOOKMARK_TYPES = [
  { id: 'link', label: 'Links', icon: Globe, color: 'gruvbox-aqua' },
  { id: 'note', label: 'Notes', icon: StickyNote, color: 'gruvbox-yellow' },
  { id: 'tweet', label: 'Tweets', icon: Twitter, color: 'gruvbox-blue' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'gruvbox-red' },
];

// Date range presets
const DATE_PRESETS = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'yesterday', label: 'Yesterday', days: 1 },
  { id: 'week', label: 'Last 7 days', days: 7 },
  { id: 'month', label: 'Last 30 days', days: 30 },
  { id: 'quarter', label: 'Last 90 days', days: 90 },
  { id: 'year', label: 'Last year', days: 365 },
];

// Fuse.js configuration for fuzzy search
const FUSE_OPTIONS = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'content', weight: 0.2 },
    { name: 'notes', weight: 0.2 },
    { name: 'tags', weight: 0.15 },
    { name: 'metadata.ocrText', weight: 0.05 }, // OCR extracted text
  ],
  threshold: 0.4, // 0 = exact, 1 = match anything
  distance: 100,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  useExtendedSearch: true, // Enable special search patterns
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get consistent folder color based on collection ID
const getFolderColorForCollection = (collectionId) => {
  const str = String(collectionId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return PIXIE_FOLDER_COLORS[Math.abs(hash) % PIXIE_FOLDER_COLORS.length];
};

// Parse advanced query syntax (e.g., "type:note date:>2024-01-01 #tag keyword")
const parseQuery = (query) => {
  const result = {
    keywords: [],
    types: [],
    tags: [],
    dateFilter: null,
    sources: [],
  };

  // Extract #tags
  const tagMatches = query.match(/#[\w-]+/g) || [];
  result.tags = tagMatches.map(t => t.slice(1));

  // Extract type: filters
  const typeMatches = query.match(/type:(\w+)/gi) || [];
  result.types = typeMatches.map(t => t.split(':')[1].toLowerCase());

  // Extract source: filters
  const sourceMatches = query.match(/source:(\w+)/gi) || [];
  result.sources = sourceMatches.map(s => s.split(':')[1].toLowerCase());

  // Extract date: filters (e.g., date:>2024-01-01, date:week, date:today)
  const dateMatch = query.match(/date:([<>]?\d{4}-\d{2}-\d{2}|\w+)/i);
  if (dateMatch) {
    const dateValue = dateMatch[1];
    const preset = DATE_PRESETS.find(p => p.id === dateValue.toLowerCase());
    if (preset) {
      result.dateFilter = { type: 'preset', preset: preset.id };
    } else if (dateValue.startsWith('>')) {
      result.dateFilter = { type: 'after', date: dateValue.slice(1) };
    } else if (dateValue.startsWith('<')) {
      result.dateFilter = { type: 'before', date: dateValue.slice(1) };
    } else {
      result.dateFilter = { type: 'exact', date: dateValue };
    }
  }

  // Remove special syntax and get plain keywords
  const cleanedQuery = query
    .replace(/#[\w-]+/g, '')
    .replace(/type:\w+/gi, '')
    .replace(/source:\w+/gi, '')
    .replace(/date:[<>]?\S+/gi, '')
    .trim();

  if (cleanedQuery) {
    result.keywords = cleanedQuery.split(/\s+/).filter(k => k.length > 1);
  }

  return result;
};

// Highlight matched text in results
const highlightMatches = (text, matches, key) => {
  if (!text || !matches) return text;

  const relevantMatches = matches.filter(m => m.key === key);
  if (relevantMatches.length === 0) return text;

  let result = text;
  const indices = relevantMatches.flatMap(m => m.indices || []);

  // Sort indices in reverse order to not mess up positions
  indices.sort((a, b) => b[0] - a[0]);

  indices.forEach(([start, end]) => {
    const before = result.slice(0, start);
    const match = result.slice(start, end + 1);
    const after = result.slice(end + 1);
    result = `${before}<mark class="bg-gruvbox-yellow/30 text-gruvbox-yellow-light px-0.5 rounded">${match}</mark>${after}`;
  });

  return result;
};

// Calculate date from preset
const getDateFromPreset = (presetId) => {
  const preset = DATE_PRESETS.find(p => p.id === presetId);
  if (!preset) return null;

  const date = new Date();
  if (preset.days === 0) {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setDate(date.getDate() - preset.days);
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

// Debounce function
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Filter Pill Component
const FilterPill = ({
  label,
  icon: Icon,
  color,
  isActive,
  onClick,
  onRemove,
  showRemove = false,
  size = 'default',
  style,
}) => {
  const colorClasses = {
    'gruvbox-yellow': {
      active: 'bg-gruvbox-yellow/20 text-gruvbox-yellow border-gruvbox-yellow/40',
      inactive: 'bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted border-gruvbox-bg-lighter hover:border-gruvbox-yellow/30 hover:text-gruvbox-yellow',
    },
    'gruvbox-aqua': {
      active: 'bg-gruvbox-aqua/20 text-gruvbox-aqua border-gruvbox-aqua/40',
      inactive: 'bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted border-gruvbox-bg-lighter hover:border-gruvbox-aqua/30 hover:text-gruvbox-aqua',
    },
    'gruvbox-blue': {
      active: 'bg-gruvbox-blue/20 text-gruvbox-blue border-gruvbox-blue/40',
      inactive: 'bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted border-gruvbox-bg-lighter hover:border-gruvbox-blue/30 hover:text-gruvbox-blue',
    },
    'gruvbox-red': {
      active: 'bg-gruvbox-red/20 text-gruvbox-red border-gruvbox-red/40',
      inactive: 'bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted border-gruvbox-bg-lighter hover:border-gruvbox-red/30 hover:text-gruvbox-red',
    },
    'gruvbox-purple': {
      active: 'bg-gruvbox-purple/20 text-gruvbox-purple border-gruvbox-purple/40',
      inactive: 'bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted border-gruvbox-bg-lighter hover:border-gruvbox-purple/30 hover:text-gruvbox-purple',
    },
    'gruvbox-orange': {
      active: 'bg-gruvbox-orange/20 text-gruvbox-orange border-gruvbox-orange/40',
      inactive: 'bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted border-gruvbox-bg-lighter hover:border-gruvbox-orange/30 hover:text-gruvbox-orange',
    },
  };

  const classes = colorClasses[color] || colorClasses['gruvbox-yellow'];
  const sizeClasses = size === 'small' ? 'text-xs px-2 py-1 gap-1' : 'text-sm px-3 py-1.5 gap-1.5';

  return (
    <button
      onClick={onClick}
      style={style}
      className={cn(
        "flex items-center rounded-full border font-medium transition-all duration-200",
        sizeClasses,
        !style && (isActive ? classes.active : classes.inactive)
      )}
    >
      {Icon && <Icon className={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} />}
      <span>{label}</span>
      {showRemove && isActive && (
        <X
          className={cn("cursor-pointer hover:scale-110 transition-transform", size === 'small' ? 'w-3 h-3 ml-0.5' : 'w-3.5 h-3.5 ml-1')}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        />
      )}
    </button>
  );
};

// Tag Pill with custom color
const TagPill = ({ tag, isActive, onClick, size = 'default' }) => {
  const tagColor = getTagColor(tag);
  const sizeClasses = size === 'small' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full font-medium transition-all duration-200 border",
        sizeClasses,
        isActive
          ? 'border-current'
          : 'border-transparent opacity-60 hover:opacity-100'
      )}
      style={{
        backgroundColor: isActive ? tagColor.bg : 'rgba(60, 56, 54, 0.5)',
        color: isActive ? tagColor.text : '#a89984',
      }}
    >
      <Tag className={size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{tag}</span>
    </button>
  );
};

// Collection Pill with Pixie Folder colors
const CollectionPill = ({ collection, isActive, onClick, size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'text-xs px-2 py-1 gap-1' : 'text-sm px-3 py-1.5 gap-1.5';
  const folderColor = getFolderColorForCollection(collection.id);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center rounded-full font-medium transition-all duration-200 border",
        sizeClasses
      )}
      style={isActive ? {
        backgroundColor: `${folderColor.hex}20`,
        color: folderColor.hex,
        borderColor: `${folderColor.hex}66`,
      } : {
        backgroundColor: 'rgba(60, 56, 54, 0.5)',
        color: '#a89984',
        borderColor: 'rgba(60, 56, 54, 1)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = `${folderColor.hex}50`;
          e.currentTarget.style.color = folderColor.hex;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'rgba(60, 56, 54, 1)';
          e.currentTarget.style.color = '#a89984';
        }
      }}
    >
      <FolderOpen className={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{collection.name}</span>
      {collection.bookmarkCount !== undefined && (
        <span className="text-[10px] opacity-60">({collection.bookmarkCount})</span>
      )}
    </button>
  );
};

// Search Result Item with rich preview
const SearchResultItem = ({
  item,
  index,
  isSelected,
  matches,
  onClick,
  onMouseEnter,
}) => {
  const typeInfo = BOOKMARK_TYPES.find(t => t.id === item.type) || BOOKMARK_TYPES[0];
  const TypeIcon = typeInfo.icon;

  // Get highlighted title
  const highlightedTitle = highlightMatches(item.title, matches, 'title');

  // Get snippet from content or notes
  const snippetText = item.content || item.notes || '';
  const snippet = snippetText.length > 120 ? snippetText.slice(0, 120) + '...' : snippetText;
  const highlightedSnippet = highlightMatches(snippet, matches, 'content') || highlightMatches(snippet, matches, 'notes');

  // Format date
  const dateCreated = item.dateCreated || item.createdAt;
  const dateStr = dateCreated
    ? new Date(dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div
      onClick={() => onClick(item)}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex items-start gap-3 px-3 py-3 cursor-pointer transition-all duration-150",
        isSelected
          ? "bg-gruvbox-bg-lighter/80"
          : "hover:bg-gruvbox-bg-light/50"
      )}
      role="option"
      aria-selected={isSelected}
    >
      {/* Thumbnail or Type Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gruvbox-bg-lighter flex items-center justify-center">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={cn(
            "w-full h-full items-center justify-center",
            item.thumbnail ? "hidden" : "flex"
          )}
        >
          <TypeIcon className={cn("w-5 h-5", `text-${typeInfo.color}`)} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div
          className="font-medium text-gruvbox-fg-light text-sm truncate"
          dangerouslySetInnerHTML={{ __html: highlightedTitle }}
        />

        {/* Snippet */}
        {snippet && (
          <div
            className="text-xs text-gruvbox-fg-muted mt-0.5 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
          />
        )}

        {/* Metadata Row */}
        <div className="flex items-center gap-2 mt-1.5">
          {/* Type Badge */}
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
            `bg-${typeInfo.color}/20 text-${typeInfo.color}`
          )}>
            {typeInfo.label}
          </span>

          {/* Date */}
          {dateStr && (
            <span className="text-[10px] text-gruvbox-fg-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dateStr}
            </span>
          )}

          {/* Tags */}
          {item.tags?.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="text-[10px] text-gruvbox-aqua flex items-center gap-0.5"
            >
              <Hash className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="flex-shrink-0 self-center">
          <CornerDownLeft className="w-4 h-4 text-gruvbox-fg-muted" />
        </div>
      )}
    </div>
  );
};

// AI Suggestion Component
const AISuggestion = ({ suggestion, onClick }) => (
  <button
    onClick={() => onClick(suggestion)}
    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gruvbox-purple/10 text-gruvbox-purple text-xs font-medium border border-gruvbox-purple/20 hover:bg-gruvbox-purple/20 hover:border-gruvbox-purple/40 transition-all"
  >
    <Sparkles className="w-3 h-3" />
    {suggestion}
  </button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PowerSearch = ({
  // Data sources
  bookmarks = [],
  collections = [],
  tags = [],
  // Current filters (external state)
  searchQuery = '',
  activeTypes = [],
  activeCollections = [],
  activeTags = [],
  filterChain = [],
  dateFilter = null,
  // Callbacks
  onSearchChange,
  onTypesChange,
  onCollectionsChange,
  onTagsChange,
  onFilterChainChange,
  onDateFilterChange,
  onClearAll,
  onResultSelect,
  // Options
  placeholder = "What did past-you think was worth saving?",
  showResults = true,
  maxResults = 10,
  debounceMs = 300,
}) => {
  // ========== STATE ==========
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ========== MORPHING PLACEHOLDER STATE ==========
  const hasContent = localQuery.trim().length > 0 || filterChain.length > 0;

  // ========== REFS ==========
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const resultsRef = useRef(null);

  // ========== DEBOUNCED QUERY ==========
  const debouncedQuery = useDebounce(localQuery, debounceMs);

  // ========== FUSE INSTANCE ==========
  const fuse = useMemo(() => {
    if (bookmarks.length === 0) return null;
    return new Fuse(bookmarks, FUSE_OPTIONS);
  }, [bookmarks]);

  // ========== BUILD SEARCHABLE ITEMS FOR QUICK FILTERS ==========
  const searchableItems = useMemo(() => {
    const items = [];
    // Add types
    BOOKMARK_TYPES.forEach(type => {
      items.push({ type: 'type', id: type.id, label: type.label, icon: type.icon, color: type.color });
    });
    // Add collections
    collections.forEach(col => {
      const folderColor = getFolderColorForCollection(col.id);
      items.push({ type: 'collection', id: col.id, label: col.name, icon: FolderOpen, hexColor: folderColor.hex });
    });
    // Add tags
    tags.forEach(tag => {
      items.push({ type: 'tag', id: tag, label: tag, icon: Tag, color: 'gruvbox-aqua' });
    });
    // Add date presets
    DATE_PRESETS.forEach(preset => {
      items.push({ type: 'date', id: preset.id, label: preset.label, icon: Calendar, color: 'gruvbox-orange' });
    });
    return items;
  }, [collections, tags]);

  // ========== PERFORM SEARCH ==========
  useEffect(() => {
    if (!debouncedQuery.trim() || !fuse) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Parse query for special syntax
    const parsed = parseQuery(debouncedQuery);

    // Build search query for Fuse
    let fuseQuery = parsed.keywords.join(' ');

    // Perform fuzzy search
    let results = fuseQuery ? fuse.search(fuseQuery) : bookmarks.map(item => ({ item, score: 0 }));

    // Apply type filters from query
    if (parsed.types.length > 0) {
      results = results.filter(r => parsed.types.includes(r.item.type));
    }

    // Apply tag filters from query
    if (parsed.tags.length > 0) {
      results = results.filter(r =>
        parsed.tags.some(tag => r.item.tags?.includes(tag))
      );
    }

    // Apply date filter from query
    if (parsed.dateFilter) {
      let filterDate;
      if (parsed.dateFilter.type === 'preset') {
        filterDate = getDateFromPreset(parsed.dateFilter.preset);
      } else {
        filterDate = new Date(parsed.dateFilter.date);
      }

      if (filterDate) {
        results = results.filter(r => {
          const itemDate = new Date(r.item.dateCreated || r.item.createdAt);
          if (parsed.dateFilter.type === 'after' || parsed.dateFilter.type === 'preset') {
            return itemDate >= filterDate;
          } else if (parsed.dateFilter.type === 'before') {
            return itemDate <= filterDate;
          }
          return itemDate.toDateString() === filterDate.toDateString();
        });
      }
    }

    // Apply external filters
    if (activeTypes.length > 0) {
      results = results.filter(r => activeTypes.includes(r.item.type));
    }

    if (activeCollections.length > 0) {
      results = results.filter(r => activeCollections.includes(r.item.collectionId));
    }

    if (activeTags.length > 0) {
      results = results.filter(r =>
        activeTags.some(tag => r.item.tags?.includes(tag))
      );
    }

    if (dateFilter) {
      const filterDate = getDateFromPreset(dateFilter);
      if (filterDate) {
        results = results.filter(r => {
          const itemDate = new Date(r.item.dateCreated || r.item.createdAt);
          return itemDate >= filterDate;
        });
      }
    }

    // Limit results
    setSearchResults(results.slice(0, maxResults));
    setSelectedResultIndex(-1);
    setIsSearching(false);
  }, [debouncedQuery, fuse, bookmarks, activeTypes, activeCollections, activeTags, dateFilter, maxResults]);

  // ========== FIND QUICK FILTER SUGGESTIONS ==========
  useEffect(() => {
    if (!localQuery.trim()) {
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
      return;
    }

    const query = localQuery.toLowerCase().trim();
    const matches = searchableItems.filter(item => {
      const label = item.label.toLowerCase();
      // Check if not already active
      if (item.type === 'type' && activeTypes.includes(item.id)) return false;
      if (item.type === 'collection' && activeCollections.includes(item.id)) return false;
      if (item.type === 'tag' && activeTags.includes(item.id)) return false;
      if (item.type === 'date' && dateFilter === item.id) return false;
      // Match if starts with or contains the query
      return label.startsWith(query) || label.includes(query);
    }).slice(0, 5);

    setSuggestions(matches);
    setSelectedSuggestionIndex(-1);
  }, [localQuery, searchableItems, activeTypes, activeCollections, activeTags, dateFilter]);

  // ========== GENERATE AI SUGGESTIONS ==========
  const aiSuggestions = useMemo(() => {
    if (!debouncedQuery.trim() || searchResults.length === 0) return [];

    // Extract common tags from results
    const tagCounts = {};
    searchResults.forEach(r => {
      r.item.tags?.forEach(tag => {
        if (!activeTags.includes(tag)) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      });
    });

    // Get top tags as suggestions
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => `#${tag}`);
  }, [debouncedQuery, searchResults, activeTags]);

  // ========== CONVERT TEXT TO PILL ==========
  const convertToPill = useCallback((item) => {
    const newChainItem = {
      type: item.type,
      id: item.id,
      label: item.label,
      icon: item.icon,
      color: item.color,
      hexColor: item.hexColor,
    };

    onFilterChainChange?.([...filterChain, newChainItem]);

    if (item.type === 'type') {
      onTypesChange?.([...activeTypes, item.id]);
    } else if (item.type === 'collection') {
      onCollectionsChange?.([...activeCollections, item.id]);
    } else if (item.type === 'tag') {
      onTagsChange?.([...activeTags, item.id]);
    } else if (item.type === 'date') {
      onDateFilterChange?.(item.id);
    }

    setLocalQuery('');
    onSearchChange?.('');
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  }, [filterChain, activeTypes, activeCollections, activeTags, onFilterChainChange, onTypesChange, onCollectionsChange, onTagsChange, onDateFilterChange, onSearchChange]);

  // ========== REMOVE PILL FROM CHAIN ==========
  const removePillFromChain = useCallback((index) => {
    const removedItems = filterChain.slice(index);
    const newChain = filterChain.slice(0, index);

    onFilterChainChange?.(newChain);

    const newTypes = activeTypes.filter(t => !removedItems.some(r => r.type === 'type' && r.id === t));
    const newCollections = activeCollections.filter(c => !removedItems.some(r => r.type === 'collection' && r.id === c));
    const newTags = activeTags.filter(t => !removedItems.some(r => r.type === 'tag' && r.id === t));

    onTypesChange?.(newTypes);
    onCollectionsChange?.(newCollections);
    onTagsChange?.(newTags);

    // Check if date was removed
    if (removedItems.some(r => r.type === 'date')) {
      onDateFilterChange?.(null);
    }
  }, [filterChain, activeTypes, activeCollections, activeTags, onFilterChainChange, onTypesChange, onCollectionsChange, onTagsChange, onDateFilterChange]);

  // ========== KEYBOARD NAVIGATION ==========
  const handleKeyDown = useCallback((e) => {
    // Handle suggestions navigation
    if (suggestions.length > 0 && !searchResults.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        return;
      }
      if (e.key === 'Tab' && suggestions.length > 0) {
        e.preventDefault();
        const item = selectedSuggestionIndex >= 0
          ? suggestions[selectedSuggestionIndex]
          : suggestions[0];
        if (item) convertToPill(item);
        return;
      }
    }

    // Handle search results navigation
    if (searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResultIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResultIndex(prev => prev > 0 ? prev - 1 : -1);
        return;
      }
      if (e.key === 'Enter' && selectedResultIndex >= 0) {
        e.preventDefault();
        onResultSelect?.(searchResults[selectedResultIndex].item);
        setIsExpanded(false);
        return;
      }
    }

    // Handle filter selection
    if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        e.preventDefault();
        convertToPill(suggestions[selectedSuggestionIndex]);
        return;
      }

      // Check for exact match
      const exactMatch = searchableItems.find(item => {
        const label = item.label.toLowerCase();
        return label === localQuery.toLowerCase().trim();
      });

      if (exactMatch) {
        e.preventDefault();
        convertToPill(exactMatch);
        return;
      }

      // Select first suggestion if available
      if (suggestions.length > 0) {
        e.preventDefault();
        convertToPill(suggestions[0]);
        return;
      }
    }

    // Space only converts on exact match
    if (e.key === ' ') {
      const exactMatch = searchableItems.find(item => {
        const label = item.label.toLowerCase();
        return label === localQuery.toLowerCase().trim() &&
          !(item.type === 'type' && activeTypes.includes(item.id)) &&
          !(item.type === 'collection' && activeCollections.includes(item.id)) &&
          !(item.type === 'tag' && activeTags.includes(item.id));
      });

      if (exactMatch) {
        e.preventDefault();
        convertToPill(exactMatch);
        return;
      }
    }

    // Escape to close
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
      setSelectedResultIndex(-1);
      inputRef.current?.blur();
    }

    // Backspace to remove last filter when input is empty
    if (e.key === 'Backspace' && !localQuery && filterChain.length > 0) {
      e.preventDefault();
      removePillFromChain(filterChain.length - 1);
    }
  }, [suggestions, searchResults, selectedSuggestionIndex, selectedResultIndex, localQuery, filterChain, convertToPill, removePillFromChain, onResultSelect, searchableItems, activeTypes, activeCollections, activeTags]);

  // ========== SYNC EXTERNAL QUERY ==========
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // ========== CLICK OUTSIDE TO CLOSE ==========
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // ========== KEYBOARD SHORTCUT (Cmd+K) ==========
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ========== SCROLL SELECTED RESULT INTO VIEW ==========
  useEffect(() => {
    if (selectedResultIndex >= 0 && resultsRef.current) {
      const selected = resultsRef.current.children[selectedResultIndex];
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedResultIndex]);

  // ========== TOGGLE HANDLERS ==========
  const toggleType = (typeId) => {
    const isActive = activeTypes.includes(typeId);
    if (isActive) {
      const chainIndex = filterChain.findIndex(f => f.type === 'type' && f.id === typeId);
      if (chainIndex !== -1) {
        removePillFromChain(chainIndex);
      } else {
        onTypesChange?.(activeTypes.filter(t => t !== typeId));
      }
    } else {
      const typeInfo = BOOKMARK_TYPES.find(t => t.id === typeId);
      if (typeInfo) {
        convertToPill({ type: 'type', id: typeId, label: typeInfo.label, icon: typeInfo.icon, color: typeInfo.color });
      }
    }
  };

  const toggleCollection = (collectionId) => {
    const isActive = activeCollections.includes(collectionId);
    if (isActive) {
      const chainIndex = filterChain.findIndex(f => f.type === 'collection' && f.id === collectionId);
      if (chainIndex !== -1) {
        removePillFromChain(chainIndex);
      } else {
        onCollectionsChange?.(activeCollections.filter(c => c !== collectionId));
      }
    } else {
      const collection = collections.find(c => c.id === collectionId);
      if (collection) {
        const folderColor = getFolderColorForCollection(collectionId);
        convertToPill({ type: 'collection', id: collectionId, label: collection.name, icon: FolderOpen, hexColor: folderColor.hex });
      }
    }
  };

  const toggleTag = (tag) => {
    const isActive = activeTags.includes(tag);
    if (isActive) {
      const chainIndex = filterChain.findIndex(f => f.type === 'tag' && f.id === tag);
      if (chainIndex !== -1) {
        removePillFromChain(chainIndex);
      } else {
        onTagsChange?.(activeTags.filter(t => t !== tag));
      }
    } else {
      convertToPill({ type: 'tag', id: tag, label: tag, icon: Tag, color: 'gruvbox-aqua' });
    }
  };

  const toggleDatePreset = (presetId) => {
    if (dateFilter === presetId) {
      const chainIndex = filterChain.findIndex(f => f.type === 'date' && f.id === presetId);
      if (chainIndex !== -1) {
        removePillFromChain(chainIndex);
      } else {
        onDateFilterChange?.(null);
      }
    } else {
      const preset = DATE_PRESETS.find(p => p.id === presetId);
      if (preset) {
        // Remove existing date from chain if any
        const existingDateIndex = filterChain.findIndex(f => f.type === 'date');
        if (existingDateIndex !== -1) {
          removePillFromChain(existingDateIndex);
        }
        convertToPill({ type: 'date', id: presetId, label: preset.label, icon: Calendar, color: 'gruvbox-orange' });
      }
    }
  };

  // ========== COMPUTED VALUES ==========
  const hasActiveFilters = filterChain.length > 0 || localQuery.trim();
  const showResultsDropdown = showResults && isExpanded && (searchResults.length > 0 || isSearching);

  // ========== RENDER ==========
  return (
    <div ref={containerRef} className="relative flex-1 max-w-2xl mx-6">
      {/* Main Search Bar with Morphing Placeholder */}
      <div
        className={cn(
          "relative rounded-2xl border transition-all duration-500 ease-out overflow-hidden",
          isExpanded
            ? "bg-gruvbox-bg-dark border-gruvbox-yellow/40 shadow-lg shadow-gruvbox-yellow/10"
            : "bg-gruvbox-bg-light/60 border-gruvbox-bg-lighter/80 hover:border-gruvbox-bg-lighter",
          isFocused && "border-gruvbox-yellow/40",
          // Dynamic height based on content
          !hasContent && !isFocused ? "py-6 cursor-text" : "py-0"
        )}
        onClick={() => {
          if (!hasContent && !isFocused) {
            inputRef.current?.focus();
          }
        }}
      >
        {/* Morphing Placeholder Overlay */}
        <div
          className={cn(
            "absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out",
            // Transform states
            hasContent || isFocused
              ? "top-0 opacity-0 scale-75 translate-y-[-20px]"
              : "top-1/2 -translate-y-1/2 opacity-100 scale-100"
          )}
          style={{
            transformOrigin: 'center center',
          }}
        >
          <span className={cn(
            "text-gruvbox-fg-muted/40 font-light tracking-wide transition-all duration-500",
            hasContent || isFocused ? "text-xs" : "text-lg"
          )}>
            {placeholder}
          </span>
        </div>

        {/* Floating Label (visible when has content) */}
        <div
          className={cn(
            "absolute left-12 transition-all duration-300 ease-out pointer-events-none",
            hasContent
              ? "top-1 opacity-100 scale-100"
              : "top-3 opacity-0 scale-90"
          )}
        >
          <span className="text-[10px] text-gruvbox-yellow/70 font-medium uppercase tracking-wider">
            Searching
          </span>
        </div>

        {/* Underline indicator */}
        <div
          className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-transparent via-gruvbox-yellow/60 to-transparent transition-all duration-500 ease-out",
            isFocused && !hasContent ? "w-1/2 opacity-100" : "w-0 opacity-0"
          )}
        />

        {/* Actual Search Controls Container */}
        <div
          className={cn(
            "flex items-center transition-all duration-500 ease-out",
            hasContent || isFocused
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-2 pointer-events-none"
          )}
        >
          {/* Search Icon */}
          <div className="pl-4">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-gruvbox-yellow animate-spin" />
            ) : (
              <Search className={cn(
                "w-4 h-4 transition-colors duration-200",
                (isFocused || isExpanded) ? 'text-gruvbox-yellow' : 'text-gruvbox-fg-muted/60'
              )} />
            )}
          </div>

          {/* Hierarchical Filter Chain */}
          {filterChain.length > 0 && (
            <div className="flex items-center gap-1 pl-2 overflow-hidden flex-shrink-0">
              {filterChain.slice(0, isExpanded ? 5 : 3).map((pill, idx) => {
                const Icon = pill.icon;
                const isFirst = idx === 0;
                const useHexColor = pill.hexColor;
                const colorClasses = {
                  'gruvbox-yellow': 'bg-gruvbox-yellow/20 text-gruvbox-yellow border-gruvbox-yellow/40',
                  'gruvbox-aqua': 'bg-gruvbox-aqua/20 text-gruvbox-aqua border-gruvbox-aqua/40',
                  'gruvbox-blue': 'bg-gruvbox-blue/20 text-gruvbox-blue border-gruvbox-blue/40',
                  'gruvbox-red': 'bg-gruvbox-red/20 text-gruvbox-red border-gruvbox-red/40',
                  'gruvbox-purple': 'bg-gruvbox-purple/20 text-gruvbox-purple border-gruvbox-purple/40',
                  'gruvbox-orange': 'bg-gruvbox-orange/20 text-gruvbox-orange border-gruvbox-orange/40',
                };
                const pillClass = !useHexColor ? (colorClasses[pill.color] || colorClasses['gruvbox-yellow']) : '';

                return (
                  <React.Fragment key={`${pill.type}-${pill.id}-${idx}`}>
                    {!isFirst && (
                      <ChevronRight className="w-3 h-3 text-gruvbox-fg-muted/40 flex-shrink-0" />
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all",
                        !useHexColor && pillClass,
                        isFirst && !useHexColor && "ring-1 ring-offset-1 ring-offset-gruvbox-bg-dark ring-current/20"
                      )}
                      style={useHexColor ? {
                        backgroundColor: `${pill.hexColor}20`,
                        color: pill.hexColor,
                        borderColor: `${pill.hexColor}66`,
                        ...(isFirst && { boxShadow: `0 0 0 1px ${pill.hexColor}33, 0 0 0 3px rgba(40,40,40,1)` })
                      } : undefined}
                      title={isFirst ? "Parent filter (removes all children when removed)" : `Child of ${filterChain[idx - 1]?.label}`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span className="max-w-[70px] truncate">{pill.label}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:scale-110 transition-transform opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePillFromChain(idx);
                        }}
                      />
                    </div>
                  </React.Fragment>
                );
              })}
              {filterChain.length > (isExpanded ? 5 : 3) && (
                <span className="text-xs text-gruvbox-fg-muted ml-1">+{filterChain.length - (isExpanded ? 5 : 3)}</span>
              )}
            </div>
          )}

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              setIsExpanded(true);
            }}
            onBlur={() => setIsFocused(false)}
            placeholder=""
            className={cn(
              "flex-1 py-3 bg-transparent text-sm text-gruvbox-fg placeholder:text-gruvbox-fg-muted/50 focus:outline-none min-w-[100px]",
              filterChain.length > 0 && !isExpanded ? "pl-2" : "pl-3",
              hasContent && "pt-4"
            )}
            role="combobox"
            aria-expanded={isExpanded}
            aria-haspopup="listbox"
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-label={placeholder}
          />

          {/* Filter Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 mr-2 rounded-lg text-xs font-medium transition-all duration-200",
              isExpanded
                ? "bg-gruvbox-yellow/20 text-gruvbox-yellow"
                : "hover:bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted hover:text-gruvbox-fg"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && !isExpanded && (
              <span className="ml-1 w-2 h-2 rounded-full bg-gruvbox-yellow animate-pulse" />
            )}
          </button>

          {/* Keyboard Shortcut Hint */}
          {!isExpanded && (
            <div className="flex items-center gap-1 px-2 py-1 mr-3 rounded-md bg-gruvbox-bg-lighter/50 border border-gruvbox-bg-lighter">
              <Command className="w-3 h-3 text-gruvbox-fg-muted/60" />
              <span className="text-[10px] text-gruvbox-fg-muted/60 font-medium">K</span>
            </div>
          )}

          {/* Clear All Button */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setLocalQuery('');
                onClearAll?.();
              }}
              className="p-2 mr-2 rounded-lg text-gruvbox-fg-muted hover:text-gruvbox-red hover:bg-gruvbox-red/10 transition-colors"
              title="Clear all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Suggestions Dropdown */}
      {suggestions.length > 0 && isFocused && !searchResults.length && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gruvbox-bg-dark border border-gruvbox-bg-lighter rounded-xl shadow-xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="py-1">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gruvbox-fg-muted/60 font-semibold">
              Quick add filter
            </div>
            {suggestions.map((item, index) => {
              const Icon = item.icon;
              const useHexColor = item.hexColor;
              const colorClasses = {
                'gruvbox-yellow': 'bg-gruvbox-yellow/15 text-gruvbox-yellow border-gruvbox-yellow/30',
                'gruvbox-aqua': 'bg-gruvbox-aqua/15 text-gruvbox-aqua border-gruvbox-aqua/30',
                'gruvbox-blue': 'bg-gruvbox-blue/15 text-gruvbox-blue border-gruvbox-blue/30',
                'gruvbox-red': 'bg-gruvbox-red/15 text-gruvbox-red border-gruvbox-red/30',
                'gruvbox-purple': 'bg-gruvbox-purple/15 text-gruvbox-purple border-gruvbox-purple/30',
                'gruvbox-orange': 'bg-gruvbox-orange/15 text-gruvbox-orange border-gruvbox-orange/30',
              };
              const pillClass = !useHexColor ? (colorClasses[item.color] || colorClasses['gruvbox-yellow']) : '';

              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    convertToPill(item);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    index === selectedSuggestionIndex
                      ? "bg-gruvbox-bg-lighter"
                      : "hover:bg-gruvbox-bg-light/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
                      !useHexColor && pillClass
                    )}
                    style={useHexColor ? {
                      backgroundColor: `${item.hexColor}20`,
                      color: item.hexColor,
                      borderColor: `${item.hexColor}50`,
                    } : undefined}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    <span>{item.label}</span>
                  </div>
                  <span className="text-xs text-gruvbox-fg-muted capitalize">{item.type}</span>
                  {index === selectedSuggestionIndex && (
                    <span className="ml-auto text-[10px] text-gruvbox-fg-muted/60">
                      Press Enter
                    </span>
                  )}
                </button>
              );
            })}
            <div className="px-3 py-1.5 text-[10px] text-gruvbox-fg-muted/50 border-t border-gruvbox-bg-lighter/50 mt-1">
              <kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter text-gruvbox-fg-muted/60">↑↓</kbd> navigate
              <span className="mx-2">·</span>
              <kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter text-gruvbox-fg-muted/60">Enter</kbd> or <kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter text-gruvbox-fg-muted/60">Tab</kbd> select
            </div>
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResultsDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gruvbox-bg-dark border border-gruvbox-bg-lighter rounded-xl shadow-xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="px-3 py-2 border-b border-gruvbox-bg-lighter/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-gruvbox-purple" />
                <span className="text-[10px] uppercase tracking-wider text-gruvbox-fg-muted/60 font-semibold">
                  Refine with
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map(suggestion => (
                  <AISuggestion
                    key={suggestion}
                    suggestion={suggestion}
                    onClick={(s) => {
                      setLocalQuery(prev => prev + ' ' + s);
                      onSearchChange?.(localQuery + ' ' + s);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          <div
            ref={resultsRef}
            className="max-h-[400px] overflow-y-auto"
            role="listbox"
            id="search-results"
          >
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gruvbox-yellow animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gruvbox-fg-muted">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No matches found</p>
                <p className="text-xs mt-1 opacity-60">Try broadening your search</p>
              </div>
            ) : (
              searchResults.map((result, index) => (
                <SearchResultItem
                  key={result.item.id}
                  item={result.item}
                  index={index}
                  isSelected={index === selectedResultIndex}
                  matches={result.matches}
                  onClick={(item) => {
                    onResultSelect?.(item);
                    setIsExpanded(false);
                  }}
                  onMouseEnter={() => setSelectedResultIndex(index)}
                />
              ))
            )}
          </div>

          {/* Keyboard Hints */}
          {searchResults.length > 0 && (
            <div className="px-3 py-2 bg-gruvbox-bg-lighter/30 border-t border-gruvbox-bg-lighter/50 flex items-center gap-4 text-[10px] text-gruvbox-fg-muted/60">
              <span className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                <ArrowDown className="w-3 h-3" />
                navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" />
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter">esc</kbd>
                close
              </span>
              <span className="ml-auto text-gruvbox-fg-muted/40">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expanded Filter Panel */}
      {isExpanded && !showResultsDropdown && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gruvbox-bg-dark border border-gruvbox-bg-lighter rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Types Section */}
          <div className="p-4 border-b border-gruvbox-bg-lighter/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-gruvbox-yellow" />
              <span className="text-xs font-semibold text-gruvbox-fg-muted uppercase tracking-wider">Type</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {BOOKMARK_TYPES.map(type => (
                <FilterPill
                  key={type.id}
                  label={type.label}
                  icon={type.icon}
                  color={type.color}
                  isActive={activeTypes.includes(type.id)}
                  onClick={() => toggleType(type.id)}
                />
              ))}
            </div>
          </div>

          {/* Date Range Section */}
          <div className="p-4 border-b border-gruvbox-bg-lighter/50">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gruvbox-orange" />
              <span className="text-xs font-semibold text-gruvbox-fg-muted uppercase tracking-wider">Date Range</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(preset => (
                <FilterPill
                  key={preset.id}
                  label={preset.label}
                  icon={Clock}
                  color="gruvbox-orange"
                  isActive={dateFilter === preset.id}
                  onClick={() => toggleDatePreset(preset.id)}
                />
              ))}
            </div>
          </div>

          {/* Collections Section */}
          {collections.length > 0 && (
            <div className="p-4 border-b border-gruvbox-bg-lighter/50">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-4 h-4 text-gruvbox-purple" />
                <span className="text-xs font-semibold text-gruvbox-fg-muted uppercase tracking-wider">Collections</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {collections.map(collection => (
                  <CollectionPill
                    key={collection.id}
                    collection={collection}
                    isActive={activeCollections.includes(collection.id)}
                    onClick={() => toggleCollection(collection.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tags Section */}
          {tags.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-gruvbox-aqua" />
                <span className="text-xs font-semibold text-gruvbox-fg-muted uppercase tracking-wider">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {tags.slice(0, 20).map(tag => (
                  <TagPill
                    key={tag}
                    tag={tag}
                    isActive={activeTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  />
                ))}
                {tags.length > 20 && (
                  <span className="text-xs text-gruvbox-fg-muted self-center">+{tags.length - 20} more</span>
                )}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="px-4 py-3 bg-gruvbox-bg-lighter/30 border-t border-gruvbox-bg-lighter/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gruvbox-fg-muted">
                  <Filter className="w-3.5 h-3.5" />
                  <span>
                    {[
                      activeTypes.length > 0 && `${activeTypes.length} type${activeTypes.length > 1 ? 's' : ''}`,
                      activeCollections.length > 0 && `${activeCollections.length} collection${activeCollections.length > 1 ? 's' : ''}`,
                      activeTags.length > 0 && `${activeTags.length} tag${activeTags.length > 1 ? 's' : ''}`,
                      dateFilter && DATE_PRESETS.find(p => p.id === dateFilter)?.label,
                      localQuery.trim() && `"${localQuery}"`,
                    ].filter(Boolean).join(' + ')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setLocalQuery('');
                    onClearAll?.();
                  }}
                  className="text-xs text-gruvbox-red hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Search Tips */}
          {!hasActiveFilters && (
            <div className="px-4 py-3 bg-gruvbox-bg-lighter/20">
              <p className="text-xs text-gruvbox-fg-muted">
                <span className="text-gruvbox-yellow">Pro tips:</span> Use <code className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter text-gruvbox-aqua">#tag</code> for tags,{' '}
                <code className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter text-gruvbox-aqua">type:note</code> for types,{' '}
                <code className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter text-gruvbox-aqua">date:week</code> for dates.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PowerSearch;
