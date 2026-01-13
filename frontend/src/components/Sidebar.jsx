import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Home, Layers, PanelLeftClose, PanelLeftOpen, Play, Image, FileText, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from './Logo';

// X (Twitter) Logo
const XLogo = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const NavItem = ({ icon: Icon, label, active, onClick, collapsed, count }) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl group relative cursor-pointer",
                "transition-all duration-100 ease-out",
                active
                    ? "bg-primary/20 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground active:scale-[0.98]",
                collapsed && "justify-center px-2"
            )}
            title={collapsed ? label : undefined}
        >
            <Icon className={cn(
                "w-5 h-5 flex-shrink-0",
                active && "fill-current"
            )} strokeWidth={active ? 2 : 1.5} />

            {!collapsed && (
                <span className="text-sm font-medium truncate flex-1 text-left">{label}</span>
            )}

            {/* Count Badge */}
            {!collapsed && count !== undefined && count > 0 && (
                <span className="text-[10px] font-bold text-white bg-primary/80 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                    {count}
                </span>
            )}

            {/* Active Indicator Strip */}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
            )}
        </button>
    );
};

const Sidebar = ({
    activeTab,
    onNavigate,
    className,
    isCollapsed,
    onToggleCollapse,
    mediaCounts = {}, // { video: 0, image: 0, note: 0, tweet: 0, article: 0 }
    activeFilter,
    onFilterChange
}) => {
    const navItems = [
        { id: 'home', icon: Home, label: 'Lounge' },
        { id: 'collections', icon: Layers, label: 'Sides' },
    ];

    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(221); // Default to max width
    const [dragWidth, setDragWidth] = useState(null); // Track width during drag
    const sidebarRef = useRef(null);

    const MIN_WIDTH = 180;
    const MAX_WIDTH = 221;
    const COLLAPSED_WIDTH = 80;
    const COLLAPSE_THRESHOLD = 120; // Below this, will collapse on release

    // Handle mouse move during resize - smooth continuous motion
    const handleMouseMove = useCallback((e) => {
        if (!isResizing) return;

        const newWidth = Math.max(COLLAPSED_WIDTH, Math.min(MAX_WIDTH, e.clientX));
        setDragWidth(newWidth);
    }, [isResizing]);

    // Handle mouse up - snap to final position
    const handleMouseUp = useCallback(() => {
        if (dragWidth !== null) {
            if (dragWidth <= COLLAPSE_THRESHOLD) {
                // Collapse
                if (!isCollapsed) {
                    onToggleCollapse?.();
                }
            } else {
                // Expand if was collapsed
                if (isCollapsed) {
                    onToggleCollapse?.();
                    setSidebarWidth(MAX_WIDTH);
                } else {
                    // Set final width (clamped to min/max)
                    setSidebarWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragWidth)));
                }
            }
        }
        setDragWidth(null);
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [dragWidth, isCollapsed, onToggleCollapse]);

    // Add/remove event listeners
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    // Start resizing
    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    // Define media types with their icons and labels
    const mediaTypes = [
        { id: 'video', icon: Play, label: 'Videos' },
        { id: 'image', icon: Image, label: 'Images' },
        { id: 'note', icon: FileText, label: 'Notes' },
        { id: 'tweet', icon: XLogo, label: 'Posts' },
        { id: 'article', icon: BookOpen, label: 'Articles' },
    ];

    // Filter to only show types with items
    const visibleMediaTypes = mediaTypes.filter(type => (mediaCounts[type.id] || 0) > 0);
    const hasAnyMedia = visibleMediaTypes.length > 0;

    // Determine width - during drag use dragWidth, otherwise use collapsed/expanded width
    const currentWidth = dragWidth !== null
        ? dragWidth
        : (isCollapsed ? COLLAPSED_WIDTH : sidebarWidth);

    // Determine if we should show collapsed view (during drag or when actually collapsed)
    const showCollapsed = dragWidth !== null
        ? dragWidth <= COLLAPSE_THRESHOLD
        : isCollapsed;

    // Content opacity based on width during drag
    const contentOpacity = dragWidth !== null
        ? Math.max(0, Math.min(1, (dragWidth - COLLAPSED_WIDTH) / (MIN_WIDTH - COLLAPSED_WIDTH)))
        : (isCollapsed ? 0 : 1);

    return (
        <aside
            ref={sidebarRef}
            className={cn(
                "flex flex-col bg-theme-bg-darkest relative z-30 group/sidebar overflow-hidden",
                !isResizing && "transition-[width] duration-200 ease-out",
                className
            )}
            style={{ width: currentWidth }}
        >
            {/* Resize Handle - positioned to straddle the border */}
            <div
                className={cn(
                    "absolute top-0 bottom-0 z-50 cursor-ew-resize group/handle",
                    "w-[12px] -right-[6px]" // 12px wide, centered on the border
                )}
                onMouseDown={startResizing}
            >
                {/* Hover highlight area */}
                <div
                    className={cn(
                        "absolute inset-0 rounded-full opacity-0 transition-opacity duration-150",
                        "group-hover/handle:opacity-100",
                        isResizing ? "opacity-100 bg-primary/20" : "group-hover/handle:bg-primary/10"
                    )}
                />
                {/* Visual border line - always visible */}
                <div
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] transition-all duration-150",
                        isResizing
                            ? "w-[3px] bg-primary shadow-[0_0_12px_rgba(var(--primary),0.6)]"
                            : "bg-border group-hover/handle:w-[3px] group-hover/handle:bg-primary"
                    )}
                />
            </div>
            {/* Header / Logo Area */}
            <div className={cn(
                "h-20 flex items-center px-4 border-b border-white/5",
                showCollapsed ? "justify-center" : "justify-between"
            )}>
                <div className="transition-opacity duration-200">
                    <Logo
                        size={48}
                        className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)] saturate-150 brightness-115"
                    />
                </div>

                <div
                    className="flex flex-col ml-5 mr-auto overflow-hidden"
                    style={{ opacity: contentOpacity, display: showCollapsed ? 'none' : 'flex' }}
                >
                    <span className="text-sm font-display font-bold tracking-wide text-foreground truncate">
                        Curated Lounge
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                        Library
                    </span>
                </div>

                <button
                    onClick={onToggleCollapse}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground active:scale-95 transition-all duration-100 cursor-pointer ml-auto"
                >
                    {showCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
            </div>

            {/* Main Navigation */}
            <div className="py-4 px-3 flex flex-col gap-1">
                {navItems.map((item) => (
                    <NavItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        active={activeTab === item.id || (activeTab === 'lounge' && item.id === 'home')}
                        onClick={() => onNavigate(item.id === 'home' ? 'lounge' : item.id)}
                        collapsed={showCollapsed}
                    />
                ))}
            </div>

            {/* Media Library Section - Dynamic */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
                {!showCollapsed && (
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-3 pt-4 pb-2">
                        Library
                    </div>
                )}

                <div className="flex flex-col gap-0.5">
                    {hasAnyMedia ? (
                        visibleMediaTypes.map((type) => (
                            <NavItem
                                key={type.id}
                                icon={type.icon}
                                label={type.label}
                                active={activeFilter === type.id}
                                onClick={() => onFilterChange?.(activeFilter === type.id ? null : type.id)}
                                collapsed={showCollapsed}
                                count={mediaCounts[type.id]}
                            />
                        ))
                    ) : (
                        !showCollapsed && (
                            <div className="px-3 py-4 text-center">
                                <Sparkles className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground/50">
                                    Save bookmarks to see your library grow
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Footer - Sync Status */}
            <div className="p-4 border-t border-white/5">
                <div className={cn(
                    "rounded-xl bg-secondary/30 p-3 flex items-center gap-3 transition-opacity",
                    showCollapsed && "justify-center p-2 bg-transparent"
                )}>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {!showCollapsed && (
                        <span className="text-xs text-foreground/80 font-medium">All synced</span>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
