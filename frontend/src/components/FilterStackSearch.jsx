import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import {
  Search, X, Command, Globe, StickyNote, Youtube, Twitter, Image,
  FolderOpen, Tag, Calendar, Clock, ChevronDown, Loader2,
  ArrowUp, ArrowDown, CornerDownLeft, Sparkles, FileText,
  Link2, Video, Hash, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagColor } from '@/utils/tagColors';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Type definitions with icons, colors, and keyboard shortcuts
const BOOKMARK_TYPES = [
  { id: 'all', label: 'All', icon: Sparkles, color: 'gruvbox-yellow', shortcut: 'A' },
  { id: 'link', label: 'Links', icon: Globe, color: 'gruvbox-aqua', shortcut: 'L' },
  { id: 'note', label: 'Notes', icon: StickyNote, color: 'gruvbox-yellow', shortcut: 'N' },
  { id: 'youtube', label: 'Videos', icon: Video, color: 'gruvbox-red', shortcut: 'V' },
  { id: 'tweet', label: 'Tweets', icon: Twitter, color: 'gruvbox-blue', shortcut: 'T' },
  { id: 'image', label: 'Images', icon: Image, color: 'gruvbox-purple', shortcut: 'I' },
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

// Fuse.js configuration
const FUSE_OPTIONS = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'notes', weight: 0.25 },
    { name: 'description', weight: 0.15 },
    { name: 'tags', weight: 0.15 },
    { name: 'url', weight: 0.05 },
  ],
  threshold: 0.4,
  distance: 100,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
};

// Filter bar colors (left border accent)
const FILTER_COLORS = {
  type: {
    link: '#83a598',      // aqua
    note: '#fabd2f',      // yellow
    youtube: '#fb4934',   // red
    tweet: '#83a598',     // blue
    image: '#d3869b',     // purple
  },
  date: '#fe8019',        // orange
  collection: '#d3869b',  // purple
  tag: '#8ec07c',         // green
};

// Pixie folder colors for collections
const PIXIE_FOLDER_COLORS = [
  '#F9B846', '#2BC4C4', '#7B7EED', '#B687D6', '#F6639B', '#F87171', '#2D2D2D'
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getFolderColor = (collectionId) => {
  const str = String(collectionId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return PIXIE_FOLDER_COLORS[Math.abs(hash) % PIXIE_FOLDER_COLORS.length];
};

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

const getBookmarkType = (bookmark) => {
  const url = bookmark.url || '';
  if (url.startsWith('note://') || bookmark.category === 'Note') return 'note';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'tweet';
  if (bookmark.category === 'Image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return 'image';
  return 'link';
};

const highlightText = (text, matches, key) => {
  if (!text || !matches) return text;
  const relevantMatches = matches.filter(m => m.key === key);
  if (relevantMatches.length === 0) return text;

  let result = text;
  const indices = relevantMatches.flatMap(m => m.indices || []);
  indices.sort((a, b) => b[0] - a[0]);

  indices.forEach(([start, end]) => {
    const before = result.slice(0, start);
    const match = result.slice(start, end + 1);
    const after = result.slice(end + 1);
    result = `${before}<mark class="bg-gruvbox-yellow/30 text-gruvbox-yellow-light rounded px-0.5">${match}</mark>${after}`;
  });

  return result;
};

// Custom debounce hook
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

// Quick Scope Button
const ScopeButton = ({ type, isActive, onClick, compact = false }) => {
  const Icon = type.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-150",
        compact ? "text-xs" : "text-sm",
        isActive
          ? "bg-gruvbox-yellow/20 text-gruvbox-yellow"
          : "text-gruvbox-fg-muted hover:text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50"
      )}
    >
      <Icon className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
      <span>{type.label}</span>
      {isActive && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gruvbox-yellow" />
      )}
    </button>
  );
};

// Filter Bar (single active filter in the stack)
const FilterBar = ({ filter, onRemove, onEdit }) => {
  const getIcon = () => {
    switch (filter.type) {
      case 'type':
        const typeInfo = BOOKMARK_TYPES.find(t => t.id === filter.value);
        return typeInfo?.icon || FileText;
      case 'date':
        return Calendar;
      case 'collection':
        return FolderOpen;
      case 'tag':
        return Tag;
      default:
        return FileText;
    }
  };

  const getLabel = () => {
    switch (filter.type) {
      case 'type':
        const typeInfo = BOOKMARK_TYPES.find(t => t.id === filter.value);
        return `Type: ${typeInfo?.label || filter.value}`;
      case 'date':
        const datePreset = DATE_PRESETS.find(d => d.id === filter.value);
        return `Date: ${datePreset?.label || filter.value}`;
      case 'collection':
        return `Collection: ${filter.label}`;
      case 'tag':
        return `Tag: #${filter.value}`;
      default:
        return filter.label;
    }
  };

  const getBorderColor = () => {
    if (filter.type === 'type') {
      return FILTER_COLORS.type[filter.value] || FILTER_COLORS.type.link;
    }
    if (filter.type === 'collection') {
      return filter.color || FILTER_COLORS.collection;
    }
    return FILTER_COLORS[filter.type] || '#fabd2f';
  };

  const Icon = getIcon();

  return (
    <div
      className="group flex items-center justify-between px-3 py-2 bg-gruvbox-bg-lighter/40 rounded-lg border border-gruvbox-bg-lighter/60 hover:border-gruvbox-bg-lighter transition-all duration-150 cursor-pointer"
      style={{ borderLeftWidth: '3px', borderLeftColor: getBorderColor() }}
      onClick={onEdit}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gruvbox-fg-muted" />
        <span className="text-sm text-gruvbox-fg">{getLabel()}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1 rounded-md text-gruvbox-fg-muted/60 hover:text-gruvbox-red hover:bg-gruvbox-red/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Search Result Item
const SearchResultItem = ({ item, isSelected, matches, onClick, onMouseEnter }) => {
  const type = getBookmarkType(item);
  const typeInfo = BOOKMARK_TYPES.find(t => t.id === type) || BOOKMARK_TYPES[1];
  const Icon = typeInfo.icon;

  const highlightedTitle = highlightText(item.title || 'Untitled', matches, 'title');
  const snippet = (item.notes || item.description || '').slice(0, 100);
  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-100",
        isSelected
          ? "bg-gruvbox-bg-lighter/80"
          : "hover:bg-gruvbox-bg-light/40"
      )}
    >
      {/* Thumbnail or Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gruvbox-bg-lighter flex items-center justify-center">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => e.target.style.display = 'none'}
          />
        ) : (
          <Icon className={cn("w-5 h-5", `text-${typeInfo.color}`)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className="font-medium text-gruvbox-fg text-sm truncate"
          dangerouslySetInnerHTML={{ __html: highlightedTitle }}
        />
        {snippet && (
          <p className="text-xs text-gruvbox-fg-muted mt-0.5 line-clamp-1">{snippet}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium",
            `bg-${typeInfo.color}/15 text-${typeInfo.color}`
          )}>
            {typeInfo.label}
          </span>
          {dateStr && (
            <span className="text-[10px] text-gruvbox-fg-muted flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {dateStr}
            </span>
          )}
          {item.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] text-gruvbox-aqua flex items-center">
              <Hash className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <CornerDownLeft className="w-4 h-4 text-gruvbox-fg-muted flex-shrink-0 self-center" />
      )}
    </div>
  );
};

// Date Picker Popover
const DatePickerPopover = ({ isOpen, onSelect, onClose, currentValue }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full right-0 mt-2 bg-gruvbox-bg-dark border border-gruvbox-bg-lighter rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 min-w-[180px]">
        <div className="p-1">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => {
                onSelect(preset.id);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                currentValue === preset.id
                  ? "bg-gruvbox-orange/20 text-gruvbox-orange"
                  : "text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50"
              )}
            >
              <Clock className="w-4 h-4" />
              {preset.label}
              {currentValue === preset.id && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// Suggestion Item (for tags/collections autocomplete)
const SuggestionItem = ({ item, isSelected, onClick, onMouseEnter }) => {
  const Icon = item.type === 'tag' ? Tag : FolderOpen;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
        isSelected ? "bg-gruvbox-bg-lighter" : "hover:bg-gruvbox-bg-light/50"
      )}
    >
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: item.type === 'tag'
            ? getTagColor(item.value).bg
            : `${item.color}20`,
          color: item.type === 'tag'
            ? getTagColor(item.value).text
            : item.color,
        }}
      >
        <Icon className="w-3 h-3" />
        <span>{item.type === 'tag' ? `#${item.value}` : item.label}</span>
      </div>
      <span className="text-xs text-gruvbox-fg-muted capitalize">{item.type}</span>
      {isSelected && (
        <span className="ml-auto text-[10px] text-gruvbox-fg-muted/60">Enter to add</span>
      )}
    </button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const FilterStackSearch = ({
  // Data
  bookmarks = [],
  collections = [],
  tags = [],
  // External state
  onResultSelect,
  // Options
  placeholder = "What did past-you think was worth saving?",
  maxResults = 8,
  debounceMs = 250,
}) => {
  // ========== STATE ==========
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [filters, setFilters] = useState([]); // Array of { type, value, label, color }
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  // ========== REFS ==========
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const resultsRef = useRef(null);

  // ========== DERIVED STATE ==========
  const debouncedQuery = useDebounce(query, debounceMs);
  const hasActiveFilters = filters.length > 0 || activeType !== 'all';
  const hasQuery = query.trim().length > 0;

  // Morphing placeholder state - true when search bar should be in compact mode
  const hasContent = hasQuery || filters.length > 0 || activeType !== 'all';

  // Get active date filter
  const activeDateFilter = filters.find(f => f.type === 'date')?.value || null;
  const activeCollectionFilter = filters.find(f => f.type === 'collection')?.value || null;
  const activeTagFilters = filters.filter(f => f.type === 'tag').map(f => f.value);

  // ========== FUSE INSTANCE ==========
  const fuse = useMemo(() => {
    if (bookmarks.length === 0) return null;
    // Add type to each bookmark
    const enrichedBookmarks = bookmarks.map(b => ({
      ...b,
      _type: getBookmarkType(b),
    }));
    return new Fuse(enrichedBookmarks, FUSE_OPTIONS);
  }, [bookmarks]);

  // ========== SEARCH LOGIC ==========
  useEffect(() => {
    if (!fuse) {
      setSearchResults([]);
      return;
    }

    // Only search when focused and has query or filters
    if (!isFocused && !hasQuery) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Perform search
    let results;
    if (debouncedQuery.trim()) {
      results = fuse.search(debouncedQuery);
    } else {
      // No query - show all bookmarks (for filter-only mode)
      results = bookmarks.map(item => ({ item: { ...item, _type: getBookmarkType(item) }, score: 0 }));
    }

    // Apply type filter
    if (activeType !== 'all') {
      results = results.filter(r => r.item._type === activeType);
    }

    // Apply date filter
    if (activeDateFilter) {
      const filterDate = getDateFromPreset(activeDateFilter);
      if (filterDate) {
        results = results.filter(r => {
          const itemDate = new Date(r.item.createdAt);
          return itemDate >= filterDate;
        });
      }
    }

    // Apply collection filter
    if (activeCollectionFilter) {
      results = results.filter(r => r.item.collectionId === activeCollectionFilter);
    }

    // Apply tag filters
    if (activeTagFilters.length > 0) {
      results = results.filter(r =>
        activeTagFilters.some(tag => r.item.tags?.includes(tag))
      );
    }

    // Sort by date if no query (browsing mode)
    if (!debouncedQuery.trim()) {
      results.sort((a, b) => new Date(b.item.createdAt) - new Date(a.item.createdAt));
    }

    setSearchResults(results.slice(0, maxResults));
    setSelectedResultIndex(-1);
    setIsSearching(false);
  }, [debouncedQuery, fuse, bookmarks, activeType, activeDateFilter, activeCollectionFilter, activeTagFilters, isFocused, hasQuery, maxResults]);

  // ========== SUGGESTIONS (for # and in:) ==========
  useEffect(() => {
    // Check for tag syntax (#)
    const tagMatch = query.match(/#(\w*)$/);
    if (tagMatch) {
      const tagQuery = tagMatch[1].toLowerCase();
      const matchingTags = tags
        .filter(tag => tag.toLowerCase().includes(tagQuery))
        .filter(tag => !activeTagFilters.includes(tag))
        .slice(0, 5)
        .map(tag => ({ type: 'tag', value: tag, label: tag }));
      setSuggestions(matchingTags);
      setSelectedSuggestionIndex(-1);
      return;
    }

    // Check for collection syntax (in:)
    const collectionMatch = query.match(/in:(\w*)$/i);
    if (collectionMatch) {
      const collQuery = collectionMatch[1].toLowerCase();
      const matchingCollections = collections
        .filter(c => c.name.toLowerCase().includes(collQuery))
        .filter(c => c.id !== activeCollectionFilter)
        .slice(0, 5)
        .map(c => ({
          type: 'collection',
          value: c.id,
          label: c.name,
          color: getFolderColor(c.id),
        }));
      setSuggestions(matchingCollections);
      setSelectedSuggestionIndex(-1);
      return;
    }

    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  }, [query, tags, collections, activeTagFilters, activeCollectionFilter]);

  // ========== SUGGESTED FILTERS (when focused, no query) ==========
  const suggestedFilters = useMemo(() => {
    if (hasQuery || !isFocused) return [];

    const suggested = [];

    // Top 3 most used tags
    const tagCounts = {};
    bookmarks.forEach(b => {
      b.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => ({ type: 'tag', value: tag, label: `#${tag}` }));
    suggested.push(...topTags);

    // Add "This week" date suggestion
    if (!activeDateFilter) {
      suggested.push({ type: 'date', value: 'week', label: 'This week' });
    }

    // Add most recent collection
    if (!activeCollectionFilter && collections.length > 0) {
      const recentCollection = collections[0];
      suggested.push({
        type: 'collection',
        value: recentCollection.id,
        label: recentCollection.name,
        color: getFolderColor(recentCollection.id),
      });
    }

    return suggested.slice(0, 5);
  }, [hasQuery, isFocused, bookmarks, collections, activeDateFilter, activeCollectionFilter]);

  // ========== FILTER MANAGEMENT ==========
  const addFilter = useCallback((filter) => {
    // Remove existing filter of same type if it's date or collection (only one allowed)
    if (filter.type === 'date' || filter.type === 'collection') {
      setFilters(prev => [...prev.filter(f => f.type !== filter.type), filter]);
    } else {
      // For tags, check if already exists
      if (filter.type === 'tag' && filters.some(f => f.type === 'tag' && f.value === filter.value)) {
        return;
      }
      setFilters(prev => [...prev, filter]);
    }

    // Clear the syntax from query
    setQuery(prev => prev.replace(/#\w*$/, '').replace(/in:\w*$/i, '').trim());
  }, [filters]);

  const removeFilter = useCallback((index) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters([]);
    setActiveType('all');
    setQuery('');
  }, []);

  // ========== KEYBOARD HANDLING ==========
  const handleKeyDown = useCallback((e) => {
    // Global shortcuts
    if (e.key === 'Escape') {
      if (suggestions.length > 0) {
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
      } else if (searchResults.length > 0) {
        setSearchResults([]);
        setSelectedResultIndex(-1);
      } else if (filters.length > 0) {
        removeFilter(filters.length - 1);
      } else if (query) {
        setQuery('');
      } else {
        setIsFocused(false);
        inputRef.current?.blur();
      }
      return;
    }

    // Backspace to remove last filter when input is empty
    if (e.key === 'Backspace' && !query && filters.length > 0) {
      e.preventDefault();
      removeFilter(filters.length - 1);
      return;
    }

    // Handle suggestions navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = selectedSuggestionIndex >= 0
          ? suggestions[selectedSuggestionIndex]
          : suggestions[0];
        if (item) {
          addFilter(item);
        }
        return;
      }
    }

    // Handle results navigation
    if (searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResultIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResultIndex(prev =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        return;
      }
      if (e.key === 'Enter' && selectedResultIndex >= 0) {
        e.preventDefault();
        onResultSelect?.(searchResults[selectedResultIndex].item);
        setIsFocused(false);
        return;
      }
    }

    // Type shortcuts only with Alt/Option modifier (Alt+L for links, etc.)
    if (e.altKey && isFocused) {
      const typeShortcut = BOOKMARK_TYPES.find(
        t => t.shortcut?.toLowerCase() === e.key.toLowerCase()
      );
      if (typeShortcut) {
        e.preventDefault();
        setActiveType(typeShortcut.id);
        return;
      }

      // Alt+D for date picker
      if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDatePicker(true);
        return;
      }
    }
  }, [query, filters, suggestions, searchResults, selectedSuggestionIndex, selectedResultIndex, isFocused, addFilter, removeFilter, onResultSelect]);

  // ========== GLOBAL KEYBOARD SHORTCUT (Cmd+K) ==========
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsFocused(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === '/' && !isFocused && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsFocused(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFocused]);

  // ========== CLICK OUTSIDE ==========
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
        setShowDatePicker(false);
      }
    };
    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFocused]);

  // ========== SCROLL SELECTED INTO VIEW ==========
  useEffect(() => {
    if (selectedResultIndex >= 0 && resultsRef.current) {
      const selected = resultsRef.current.children[selectedResultIndex];
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedResultIndex]);

  // ========== DYNAMIC PLACEHOLDER ==========
  const getPlaceholder = () => {
    if (activeType !== 'all') {
      const typeInfo = BOOKMARK_TYPES.find(t => t.id === activeType);
      return `Search in ${typeInfo?.label.toLowerCase()}...`;
    }
    if (activeCollectionFilter) {
      const coll = collections.find(c => c.id === activeCollectionFilter);
      return `Search in "${coll?.name}"...`;
    }
    if (filters.length > 0) {
      return `Search with ${filters.length} filter${filters.length > 1 ? 's' : ''}...`;
    }
    return placeholder;
  };

  // ========== RESULT COUNT ==========
  const resultCount = searchResults.length;
  const showResults = isFocused && (hasQuery || hasActiveFilters) && resultCount > 0;
  const showEmptyState = isFocused && (hasQuery || hasActiveFilters) && resultCount === 0 && !isSearching;
  const showSuggestions = suggestions.length > 0;
  const showQuickScope = isFocused && !showSuggestions;
  const showSuggestedFilters = isFocused && !hasQuery && suggestedFilters.length > 0 && !showSuggestions;

  // ========== RENDER ==========
  return (
    <div ref={containerRef} className="relative flex-1 max-w-2xl mx-4">
      {/* Search Bar with Morphing Placeholder */}
      <div
        className={cn(
          "relative rounded-2xl border transition-all duration-500 ease-out overflow-hidden",
          isFocused
            ? "bg-gruvbox-bg-dark border-gruvbox-yellow/30 shadow-lg shadow-gruvbox-yellow/5"
            : "bg-gruvbox-bg-light/50 border-gruvbox-bg-lighter/70 hover:border-gruvbox-bg-lighter",
          // Dynamic height based on content state
          !hasContent && !isFocused ? "py-6 cursor-text" : "py-0"
        )}
        onClick={() => {
          // Click to focus when in idle state
          if (!hasContent && !isFocused) {
            inputRef.current?.focus();
          }
        }}
      >
        {/* Morphing Placeholder Overlay */}
        <div
          className={cn(
            "absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out",
            hasContent || isFocused
              ? "top-0 opacity-0 scale-75 -translate-y-5"
              : "top-1/2 -translate-y-1/2 opacity-100 scale-100"
          )}
        >
          <span className="text-gruvbox-fg-muted/40 font-light tracking-wide text-lg">
            {placeholder}
          </span>
        </div>

        {/* Floating Label (visible when has content) */}
        <div
          className={cn(
            "absolute left-12 transition-all duration-300 ease-out pointer-events-none z-10",
            hasContent
              ? "top-1 opacity-100 scale-100"
              : "top-3 opacity-0 scale-90"
          )}
        >
          <span className="text-[10px] text-gruvbox-yellow/70 font-medium uppercase tracking-wider">
            Searching
          </span>
        </div>

        {/* Underline indicator (visible on focus without content) */}
        <div
          className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-transparent via-gruvbox-yellow/60 to-transparent transition-all duration-500 ease-out",
            isFocused && !hasContent ? "w-1/2 opacity-100" : "w-0 opacity-0"
          )}
        />

        {/* Search Controls Container */}
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
                "w-4 h-4 transition-colors",
                isFocused ? "text-gruvbox-yellow" : "text-gruvbox-fg-muted/50"
              )} />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder=""
            className={cn(
              "flex-1 py-3 px-3 bg-transparent text-sm text-gruvbox-fg placeholder:text-gruvbox-fg-muted/40 focus:outline-none",
              hasContent && "pt-4"
            )}
            aria-label={placeholder}
          />

          {/* Clear button */}
          {(hasQuery || hasActiveFilters) && (
            <button
              onClick={clearAllFilters}
              className="p-2 mr-1 rounded-lg text-gruvbox-fg-muted/60 hover:text-gruvbox-red hover:bg-gruvbox-red/10 transition-colors"
              title="Clear all"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Keyboard hint */}
          {!isFocused && !hasContent && (
            <div className="flex items-center gap-1 px-2 py-1 mr-3 rounded-md bg-gruvbox-bg-lighter/40">
              <Command className="w-3 h-3 text-gruvbox-fg-muted/40" />
              <span className="text-[10px] text-gruvbox-fg-muted/40 font-medium">K</span>
            </div>
          )}

          {/* Date picker button */}
          {isFocused && (
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={cn(
                "p-2 mr-1 rounded-lg transition-colors",
                activeDateFilter
                  ? "text-gruvbox-orange bg-gruvbox-orange/10"
                  : "text-gruvbox-fg-muted/60 hover:text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50"
              )}
              title="Date filter"
            >
              <Calendar className="w-4 h-4" />
            </button>
          )}

          {/* Filter menu button */}
          {isFocused && (
            <button
              className="p-2 mr-2 rounded-lg text-gruvbox-fg-muted/60 hover:text-gruvbox-fg hover:bg-gruvbox-bg-lighter/50 transition-colors"
              title="More filters"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Date Picker Popover */}
      <DatePickerPopover
        isOpen={showDatePicker}
        currentValue={activeDateFilter}
        onSelect={(presetId) => {
          addFilter({
            type: 'date',
            value: presetId,
            label: DATE_PRESETS.find(p => p.id === presetId)?.label,
          });
        }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Dropdown Panel */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gruvbox-bg-dark border border-gruvbox-bg-lighter rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

          {/* Quick Scope Row */}
          {showQuickScope && (
            <div className="px-4 py-3 border-b border-gruvbox-bg-lighter/50">
              <div className="flex items-center gap-1 overflow-x-auto">
                {BOOKMARK_TYPES.map(type => (
                  <ScopeButton
                    key={type.id}
                    type={type}
                    isActive={activeType === type.id}
                    onClick={() => setActiveType(type.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Filter Stack */}
          {filters.length > 0 && (
            <div className="px-4 py-3 space-y-2 border-b border-gruvbox-bg-lighter/50">
              {filters.map((filter, index) => (
                <FilterBar
                  key={`${filter.type}-${filter.value}-${index}`}
                  filter={filter}
                  onRemove={() => removeFilter(index)}
                  onEdit={() => {
                    if (filter.type === 'date') setShowDatePicker(true);
                  }}
                />
              ))}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gruvbox-fg-muted">
                  {resultCount} result{resultCount !== 1 ? 's' : ''} matching
                </span>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gruvbox-red hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Suggestions (for # and in:) */}
          {showSuggestions && (
            <div className="py-1 border-b border-gruvbox-bg-lighter/50">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gruvbox-fg-muted/50 font-semibold">
                {query.includes('#') ? 'Tags' : 'Collections'}
              </div>
              {suggestions.map((item, index) => (
                <SuggestionItem
                  key={`${item.type}-${item.value}`}
                  item={item}
                  isSelected={index === selectedSuggestionIndex}
                  onClick={() => addFilter(item)}
                  onMouseEnter={() => setSelectedSuggestionIndex(index)}
                />
              ))}
            </div>
          )}

          {/* Suggested Filters (when no query) */}
          {showSuggestedFilters && (
            <div className="px-4 py-3 border-b border-gruvbox-bg-lighter/50">
              <div className="text-[10px] uppercase tracking-wider text-gruvbox-fg-muted/50 font-semibold mb-2">
                Suggested
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedFilters.map((filter, index) => (
                  <button
                    key={`${filter.type}-${filter.value}`}
                    onClick={() => addFilter(filter)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted hover:bg-gruvbox-bg-lighter hover:text-gruvbox-fg transition-colors"
                    style={filter.type === 'collection' ? { borderLeft: `2px solid ${filter.color}` } : {}}
                  >
                    {filter.type === 'tag' && <Tag className="w-3 h-3" />}
                    {filter.type === 'date' && <Calendar className="w-3 h-3" />}
                    {filter.type === 'collection' && <FolderOpen className="w-3 h-3" />}
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches (when no query, no filters) */}
          {!hasQuery && !hasActiveFilters && recentSearches.length > 0 && (
            <div className="px-4 py-3 border-b border-gruvbox-bg-lighter/50">
              <div className="text-[10px] uppercase tracking-wider text-gruvbox-fg-muted/50 font-semibold mb-2">
                Recent
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-gruvbox-fg-muted">
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(search)}
                    className="hover:text-gruvbox-fg transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {showResults && (
            <div ref={resultsRef} className="max-h-[320px] overflow-y-auto">
              {searchResults.map((result, index) => (
                <SearchResultItem
                  key={result.item.id}
                  item={result.item}
                  isSelected={index === selectedResultIndex}
                  matches={result.matches}
                  onClick={() => {
                    onResultSelect?.(result.item);
                    setIsFocused(false);
                  }}
                  onMouseEnter={() => setSelectedResultIndex(index)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-10 text-gruvbox-fg-muted">
              <Search className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No bookmarks found</p>
              <p className="text-xs mt-1 opacity-60">Try different keywords or remove some filters</p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-3 text-xs text-gruvbox-yellow hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Keyboard Hints Footer */}
          <div className="px-4 py-2 bg-gruvbox-bg-lighter/20 border-t border-gruvbox-bg-lighter/30 flex items-center gap-4 text-[10px] text-gruvbox-fg-muted/50">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
              navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted/60 font-mono">#</kbd>
              tag
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted/60 font-mono">in:</kbd>
              folder
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-gruvbox-bg-lighter/50 text-gruvbox-fg-muted/60 font-mono">esc</kbd>
              back
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterStackSearch;
