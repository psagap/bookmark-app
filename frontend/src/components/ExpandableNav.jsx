import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Home, FolderTree, Tag, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagColors } from '@/utils/tagColors';

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

    // Get colors for all tags (avoiding adjacent duplicates)
    const tagColorMap = useMemo(() => {
        const colors = getTagColors(tags);
        const map = {};
        tags.forEach((tag, idx) => {
            map[tag] = colors[idx];
        });
        return map;
    }, [tags]);

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
            {/* Glass panel container - matches site design */}
            <div
                className="relative rounded-2xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(60, 56, 54, 0.7) 0%, rgba(29, 32, 33, 0.8) 100%)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(215, 153, 33, 0.12)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03) inset',
                    padding: '14px',
                }}
            >
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
                                        onMouseEnter={() => onTagHover(tag)}
                                        onMouseLeave={onTagLeave}
                                        className={cn(
                                            "relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap",
                                            "border backdrop-blur-sm"
                                        )}
                                        style={{
                                            backgroundColor: showTagHighlight
                                                ? tagColor.hover
                                                : 'rgba(40, 40, 40, 0.6)',
                                            color: showTagHighlight ? tagColor.hoverText : tagColor.text,
                                            borderColor: showTagHighlight
                                                ? tagColor.text
                                                : 'rgba(255, 255, 255, 0.06)',
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

                {/* Subtle overlay on right edge - much lighter */}
                {hasMoreColumns && (
                    <div
                        className="absolute right-3 top-3 bottom-3 w-10 pointer-events-none rounded-r-xl"
                        style={{
                            background: `linear-gradient(to right,
                                transparent 0%,
                                rgba(45, 42, 40, 0.15) 50%,
                                rgba(45, 42, 40, 0.4) 100%
                            )`,
                        }}
                    />
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
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => {
                    setIsExpanded(false);
                    setHoveredItem(null);
                    handleTagHover(false);
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
                                        : "opacity-0 scale-75 w-0 overflow-hidden"
                                )}
                                style={{
                                    transitionDelay: isExpanded ? `${index * 50}ms` : '0ms'
                                }}
                                onMouseEnter={() => {
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
                                                ? '#1d2021'
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
                                                    ? '#1d2021'
                                                    : collection.color
                                            }}
                                        />
                                        <span>{collection.name}</span>
                                        <span
                                            className="text-xs opacity-70"
                                            style={{
                                                color: showCollectionHighlight ? '#1d2021' : collection.color
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
