import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Home, FolderTree, Tag, FolderOpen, Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagColors, getTagColor, getAllTagColors, setTagColor } from '@/utils/tagColors';

// Color picker dropdown for tags - appears on right-click
const NavColorPicker = ({ tagName, currentColor, position, onSelect, onClose }) => {
    const dropdownRef = useRef(null);
    const colors = getAllTagColors();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to stay in viewport
    const adjustedPosition = { ...position };
    if (typeof window !== 'undefined') {
        const dropdownWidth = 200;
        const dropdownHeight = 140;
        if (position.left + dropdownWidth > window.innerWidth - 16) {
            adjustedPosition.left = window.innerWidth - dropdownWidth - 16;
        }
        if (position.top + dropdownHeight > window.innerHeight - 16) {
            adjustedPosition.top = position.top - dropdownHeight - 8;
        }
    }

    return createPortal(
        <div
            ref={dropdownRef}
            className="fixed z-[10000] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: adjustedPosition.top, left: adjustedPosition.left }}
        >
            <div className="rounded-xl shadow-2xl overflow-hidden bg-gruvbox-bg-light/95 backdrop-blur-xl border border-gruvbox-yellow/20">
                {/* Header */}
                <div className="px-3 py-2 border-b border-gruvbox-bg-lighter/30">
                    <div className="flex items-center gap-2 text-xs text-gruvbox-fg-muted">
                        <Palette className="w-3 h-3" />
                        <span>Color for</span>
                        <span className="font-medium text-gruvbox-fg">#{tagName}</span>
                    </div>
                </div>

                {/* Color Grid */}
                <div className="p-3">
                    <div className="grid grid-cols-4 gap-2">
                        {colors.map((color) => (
                            <button
                                key={color.id}
                                onClick={() => {
                                    setTagColor(tagName, color.id);
                                    onSelect(color.id);
                                    onClose();
                                }}
                                className={cn(
                                    "relative w-7 h-7 rounded-lg transition-all duration-150 flex items-center justify-center",
                                    "hover:scale-110 hover:ring-2 ring-offset-1 ring-offset-gruvbox-bg-dark",
                                    currentColor.id === color.id && "ring-2"
                                )}
                                style={{
                                    backgroundColor: color.hover,
                                    ringColor: color.text,
                                }}
                                title={color.name}
                            >
                                {currentColor.id === color.id && (
                                    <Check className="w-4 h-4 text-gruvbox-bg-darkest" strokeWidth={3} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reset option */}
                <div className="px-3 pb-3">
                    <button
                        onClick={() => {
                            setTagColor(tagName, null);
                            onSelect(null);
                            onClose();
                        }}
                        className="w-full text-xs text-gruvbox-fg-muted hover:text-gruvbox-fg py-1.5 rounded-md hover:bg-gruvbox-bg-lighter/30 transition-colors"
                    >
                        Reset to default
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Tag columns panel with vertical columns, blur effect, and swipe support
const TagColumnsPanel = ({
    tags,
    activeTags = [],
    hoveredItem,
    showTagPanel,
    onTagClick,
    onTagHover,
    onTagLeave,
    onPanelHover,
}) => {
    const scrollContainerRef = useRef(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [colorPickerTag, setColorPickerTag] = useState(null);
    const [colorPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 });
    const [, forceUpdate] = useState(0); // For re-rendering after color change

    // Get colors for all tags (avoiding adjacent duplicates)
    const tagColorMap = useMemo(() => {
        const colors = getTagColors(tags);
        const map = {};
        tags.forEach((tag, idx) => {
            map[tag] = colors[idx];
        });
        return map;
    }, [tags]);

    // Handle right-click on tag to open color picker
    const handleTagContextMenu = (e, tag) => {
        e.preventDefault();
        e.stopPropagation();
        setColorPickerPosition({ top: e.clientY + 8, left: e.clientX });
        setColorPickerTag(tag);
    };

    // Split tags into columns of max 3 each
    const TAGS_PER_COLUMN = 3;
    const columns = [];
    for (let i = 0; i < tags.length; i += TAGS_PER_COLUMN) {
        columns.push(tags.slice(i, i + TAGS_PER_COLUMN));
    }

    // Number of visible columns
    const VISIBLE_COLUMNS = 2;
    const COLUMN_WIDTH = 145; // Width including gap (135px + 10px gap)
    const CONTAINER_WIDTH = VISIBLE_COLUMNS * COLUMN_WIDTH;

    // Handle scroll events
    const handleScroll = (e) => {
        setScrollPosition(e.target.scrollLeft);
    };

    // Keyboard navigation - scroll by full page (2 columns)
    const handleKeyDown = (e) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollAmount = CONTAINER_WIDTH; // Scroll by 2 columns at a time
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // Calculate which "page" we're on (each page = 2 columns)
    const currentPage = Math.round(scrollPosition / CONTAINER_WIDTH);
    const totalPages = Math.ceil(columns.length / VISIBLE_COLUMNS);

    // Check if there are more columns to the right
    const hasMoreColumns = (currentPage + 1) * VISIBLE_COLUMNS < columns.length;

    const [isIndicatorHovered, setIsIndicatorHovered] = useState(false);

    return (
        <div
            className={cn(
                "absolute left-full top-1/2 -translate-y-1/2 ml-3 transition-all duration-300 ease-out",
                showTagPanel
                    ? "opacity-100 translate-x-0 pointer-events-auto"
                    : "opacity-0 -translate-x-4 pointer-events-none"
            )}
            onMouseEnter={() => onPanelHover(true)}
            onMouseLeave={() => onPanelHover(false)}
        >
            {/* Glass panel container - theme-aware */}
            <div className="relative rounded-2xl bg-gruvbox-bg-light/70 backdrop-blur-xl border border-gruvbox-yellow/10 shadow-2xl p-3.5">
                {/* Scrollable container with extra padding for hover effects */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    tabIndex={showTagPanel ? 0 : -1}
                    className="flex gap-2.5 overflow-x-auto scrollbar-hide focus:outline-none scroll-smooth"
                    style={{
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch',
                        width: `${CONTAINER_WIDTH}px`,
                        paddingTop: '4px',
                        paddingBottom: '4px',
                        marginTop: '-4px',
                        marginBottom: '-4px',
                    }}
                >
                    {columns.map((columnTags, colIdx) => (
                        <div
                            key={colIdx}
                            className="flex flex-col gap-2.5 flex-shrink-0 transition-all duration-300"
                            style={{
                                scrollSnapAlign: colIdx % VISIBLE_COLUMNS === 0 ? 'start' : 'none',
                                width: '132px',
                                paddingLeft: '2px',
                                paddingRight: '2px',
                            }}
                        >
                            {columnTags.map((tag, tagIdx) => {
                                const globalIdx = colIdx * TAGS_PER_COLUMN + tagIdx;
                                const isTagSelected = activeTags.includes(tag);
                                const isTagHovered = hoveredItem === `tag-${tag}`;
                                const showTagHighlight = isTagSelected || isTagHovered;
                                const tagColor = tagColorMap[tag];

                                return (
                                    <button
                                        key={tag}
                                        onClick={() => onTagClick(tag)}
                                        onContextMenu={(e) => handleTagContextMenu(e, tag)}
                                        onMouseEnter={() => onTagHover(tag)}
                                        onMouseLeave={onTagLeave}
                                        title="Right-click to change color"
                                        className={cn(
                                            "relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap",
                                            "border backdrop-blur-sm"
                                        )}
                                        style={{
                                            backgroundColor: showTagHighlight
                                                ? tagColor.hover
                                                : 'var(--theme-bg-dark)',
                                            color: showTagHighlight ? tagColor.hoverText : tagColor.text,
                                            borderColor: showTagHighlight
                                                ? tagColor.text
                                                : 'var(--theme-bg-lighter)',
                                            transitionDelay: showTagPanel ? `${globalIdx * 25}ms` : '0ms',
                                            opacity: showTagPanel ? 1 : 0,
                                            transform: showTagPanel
                                                ? `translateX(0)`
                                                : 'translateX(-15px) scale(0.9)',
                                            boxShadow: showTagHighlight
                                                ? `0 4px 16px ${tagColor.text}30, 0 0 0 1px ${tagColor.text}15 inset`
                                                : '0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.02) inset'
                                        }}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <Tag className="w-3 h-3 opacity-70" />
                                            {tag}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Subtle overlay on right edge */}
                {hasMoreColumns && (
                    <div className="absolute right-3 top-3 bottom-3 w-10 pointer-events-none rounded-r-xl bg-gradient-to-r from-transparent to-gruvbox-bg-light/40" />
                )}

                {/* Scroll indicator dots with hover area */}
                {totalPages > 1 && (
                    <div
                        className="flex justify-center mt-3 py-1.5"
                        onMouseEnter={() => setIsIndicatorHovered(true)}
                        onMouseLeave={() => setIsIndicatorHovered(false)}
                    >
                        <div className="flex gap-2 items-center">
                            {Array.from({ length: totalPages }).map((_, idx) => {
                                const isActive = currentPage === idx;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            scrollContainerRef.current?.scrollTo({
                                                left: idx * CONTAINER_WIDTH,
                                                behavior: 'smooth'
                                            });
                                        }}
                                        className={cn(
                                            "rounded-full transition-all duration-200",
                                            isActive
                                                ? "bg-gradient-to-r from-gruvbox-yellow to-gruvbox-orange"
                                                : "bg-gruvbox-fg-muted/20 hover:bg-gruvbox-yellow/50"
                                        )}
                                        style={{
                                            width: isActive
                                                ? (isIndicatorHovered ? '28px' : '20px')
                                                : (isIndicatorHovered ? '10px' : '6px'),
                                            height: isIndicatorHovered ? '8px' : '6px',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Color picker dropdown - shown on right-click */}
            {colorPickerTag && (
                <NavColorPicker
                    tagName={colorPickerTag}
                    currentColor={getTagColor(colorPickerTag)}
                    position={colorPickerPosition}
                    onSelect={() => forceUpdate(n => n + 1)}
                    onClose={() => setColorPickerTag(null)}
                />
            )}
        </div>
    );
};

const ExpandableNav = ({
    activePage = 'home',
    onNavigate,
    tags = ['Technology', 'Design', 'Articles', 'Videos', 'Social', 'Research'],
    collections = [],
    activeCollection = null,
    activeTags = []
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [showTagPanel, setShowTagPanel] = useState(false);
    const [showCollectionsPanel, setShowCollectionsPanel] = useState(false);
    const navRef = useRef(null);
    const tagTimeoutRef = useRef(null);
    const collectionsTimeoutRef = useRef(null);

    // Order: Collections, Home (middle/default), Tags
    const navItems = [
        { id: 'collections', icon: FolderOpen, label: 'Collections' },
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'tags', icon: Tag, label: 'Tags' },
    ];

    // Find the index of the active page to show when collapsed
    const activeIndex = navItems.findIndex(item => item.id === activePage);
    const collapsedIndex = activeIndex >= 0 ? activeIndex : 1; // Default to middle (Home)

    // Handle tag panel visibility with delay
    const handleTagHover = (entering) => {
        if (tagTimeoutRef.current) {
            clearTimeout(tagTimeoutRef.current);
        }

        if (entering) {
            setShowTagPanel(true);
            setShowCollectionsPanel(false);
        } else {
            tagTimeoutRef.current = setTimeout(() => {
                setShowTagPanel(false);
            }, 150);
        }
    };

    // Handle collections panel visibility with delay
    const handleCollectionsHover = (entering) => {
        if (collectionsTimeoutRef.current) {
            clearTimeout(collectionsTimeoutRef.current);
        }

        if (entering) {
            setShowCollectionsPanel(true);
            setShowTagPanel(false);
        } else {
            collectionsTimeoutRef.current = setTimeout(() => {
                setShowCollectionsPanel(false);
            }, 150);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (tagTimeoutRef.current) {
                clearTimeout(tagTimeoutRef.current);
            }
            if (collectionsTimeoutRef.current) {
                clearTimeout(collectionsTimeoutRef.current);
            }
        };
    }, []);

    const handleNavClick = (itemId) => {
        onNavigate?.(itemId);
    };

    const handleTagClick = (tag) => {
        // Toggle tag in selection - App.jsx handles the array logic
        onNavigate?.('tags', tag);
    };

    const handleCollectionClick = (collectionId) => {
        onNavigate?.('collections', null, collectionId);
    };

    return (
        <div className="flex justify-center">
            <div
                ref={navRef}
                className="relative flex items-center"
                onMouseLeave={() => {
                    setIsExpanded(false);
                    setHoveredItem(null);
                    handleTagHover(false);
                    handleCollectionsHover(false);
                }}
            >
                {/* Main Nav Container */}
                <div
                    className={cn(
                        "relative flex items-center gap-1 p-1.5 rounded-2xl transition-all duration-300 ease-out",
                        isExpanded
                            ? "bg-gruvbox-bg-light/60 backdrop-blur-xl shadow-lg shadow-black/20 border border-gruvbox-bg-lighter"
                            : "bg-transparent"
                    )}
                >
                    {navItems.map((item, index) => {
                        const Icon = item.icon;
                        const isHovered = hoveredItem === item.id;
                        // Only show highlight on hover - not based on active page
                        const showHighlight = isHovered;

                        // When collapsed, only show the active page's icon (or Home by default)
                        const isVisible = isExpanded || index === collapsedIndex;

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "transition-all duration-300 ease-out",
                                    isVisible
                                        ? "opacity-100 scale-100 w-12"
                                        : "opacity-0 scale-75 w-0 overflow-hidden pointer-events-none"
                                )}
                                style={{
                                    transitionDelay: isExpanded ? `${index * 50}ms` : '0ms'
                                }}
                                onMouseEnter={() => {
                                    // Only expand when hovering over a visible icon
                                    if (isVisible) {
                                        setIsExpanded(true);
                                    }
                                    setHoveredItem(item.id);
                                    if (item.id === 'tags') {
                                        handleTagHover(true);
                                    } else if (item.id === 'collections') {
                                        handleCollectionsHover(true);
                                    }
                                }}
                                onMouseLeave={() => {
                                    setHoveredItem(null);
                                    if (item.id === 'tags') {
                                        handleTagHover(false);
                                    } else if (item.id === 'collections') {
                                        handleCollectionsHover(false);
                                    }
                                }}
                            >
                                <button
                                    onClick={() => handleNavClick(item.id)}
                                    className={cn(
                                        "relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ease-out group",
                                        !showHighlight && "hover:bg-gruvbox-yellow/10"
                                    )}
                                >
                                    {/* Gradient Background */}
                                    <div
                                        className={cn(
                                            "absolute inset-0 rounded-xl bg-gradient-to-br from-gruvbox-yellow to-gruvbox-orange transition-all duration-200 ease-out",
                                            showHighlight
                                                ? "opacity-100 scale-100"
                                                : "opacity-0 scale-90"
                                        )}
                                    />

                                    {/* Glow Effect */}
                                    <div
                                        className={cn(
                                            "absolute inset-0 rounded-xl bg-gradient-to-br from-gruvbox-yellow to-gruvbox-orange blur-lg transition-all duration-200",
                                            showHighlight
                                                ? "opacity-40 scale-110"
                                                : "opacity-0 scale-90"
                                        )}
                                    />

                                    {/* Icon */}
                                    <Icon
                                        className={cn(
                                            "relative z-10 w-[22px] h-[22px] transition-all duration-200",
                                            showHighlight
                                                ? "text-gruvbox-bg-darkest"
                                                : "text-gruvbox-fg-muted group-hover:text-gruvbox-yellow-light"
                                        )}
                                        strokeWidth={1.75}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Collections Panel - horizontal pill bubbles on left */}
                <div
                    className={cn(
                        "absolute right-full top-1/2 -translate-y-1/2 mr-3 transition-all duration-300 ease-out",
                        showCollectionsPanel
                            ? "opacity-100 translate-x-0 pointer-events-auto"
                            : "opacity-0 translate-x-4 pointer-events-none"
                    )}
                    onMouseEnter={() => handleCollectionsHover(true)}
                    onMouseLeave={() => handleCollectionsHover(false)}
                >
                    <div className="flex flex-wrap gap-2 max-w-[320px] justify-end">
                        {collections.length === 0 ? (
                            <div className="px-4 py-2 rounded-full bg-gruvbox-bg-light/80 backdrop-blur-xl border border-gruvbox-bg-lighter text-sm text-gruvbox-fg-muted">
                                No collections yet
                            </div>
                        ) : (
                            collections.map((collection, index) => {
                                const isCollectionSelected = activeCollection === collection.id;
                                const isCollectionHovered = hoveredItem === `collection-${collection.id}`;
                                const showCollectionHighlight = isCollectionSelected || isCollectionHovered;

                                return (
                                    <button
                                        key={collection.id}
                                        onClick={() => handleCollectionClick(collection.id)}
                                        onMouseEnter={() => setHoveredItem(`collection-${collection.id}`)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        className={cn(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-out backdrop-blur-xl border shadow-lg",
                                            showCollectionHighlight
                                                ? "scale-105 shadow-xl"
                                                : "hover:scale-105"
                                        )}
                                        style={{
                                            backgroundColor: showCollectionHighlight
                                                ? collection.color
                                                : `${collection.color}20`,
                                            borderColor: `${collection.color}60`,
                                            color: showCollectionHighlight
                                                ? 'var(--theme-bg-darkest)'
                                                : collection.color,
                                            transitionDelay: showCollectionsPanel ? `${index * 40}ms` : '0ms',
                                            opacity: showCollectionsPanel ? 1 : 0,
                                            transform: showCollectionsPanel
                                                ? `translateX(0) scale(${showCollectionHighlight ? 1.05 : 1})`
                                                : 'translateX(20px) scale(0.8)'
                                        }}
                                    >
                                        {/* Color dot */}
                                        <div
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{
                                                backgroundColor: showCollectionHighlight
                                                    ? 'var(--theme-bg-darkest)'
                                                    : collection.color
                                            }}
                                        />
                                        <span>{collection.name}</span>
                                        <span
                                            className="text-xs opacity-70"
                                            style={{
                                                color: showCollectionHighlight ? 'var(--theme-bg-darkest)' : collection.color
                                            }}
                                        >
                                            {collection.bookmarkCount || 0}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Tags Panel - vertical columns with horizontal scroll */}
                <TagColumnsPanel
                    tags={tags}
                    activeTags={activeTags}
                    hoveredItem={hoveredItem}
                    showTagPanel={showTagPanel}
                    onTagClick={handleTagClick}
                    onTagHover={(tag) => setHoveredItem(`tag-${tag}`)}
                    onTagLeave={() => setHoveredItem(null)}
                    onPanelHover={handleTagHover}
                />
            </div>

        </div>
    );
};

export default ExpandableNav;
