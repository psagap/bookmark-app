import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Home, Layers, PanelLeftClose, Play, Image, FileText, BookOpen, Sparkles, Music, UtensilsCrossed, BookMarked, ShoppingBag, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import SpiderVerseLogo from './SpiderVerseLogo';

// X (Twitter) Logo
const XLogo = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const NavItem = ({ icon: Icon, label, active, onClick, collapsed, count }) => {
    // NO width animation on NavItem - let sidebar container control width
    // Button is always w-full, content uses opacity to hide/show
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 py-2.5 px-3 rounded-xl group relative cursor-pointer overflow-hidden",
                "transition-colors duration-200 ease-out",
                active
                    ? "bg-primary/20 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground active:scale-[0.98]"
            )}
            title={collapsed ? label : undefined}
        >
            {/* Icon - fixed size, flex-shrink-0 to prevent compression */}
            <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={active ? 2.5 : 1.5} />

            {/* Text and count - always in DOM, fade with opacity */}
            <span
                className="font-medium truncate flex-1 text-left whitespace-nowrap"
                style={{
                    fontSize: '15px',
                    opacity: collapsed ? 0 : 1,
                    transition: 'opacity 200ms ease-out'
                }}
            >
                {label}
            </span>
            {count !== undefined && count > 0 && (
                <span
                    className="text-[11px] font-bold text-white bg-primary/80 px-1.5 py-0.5 rounded-full min-w-[22px] text-center flex-shrink-0"
                    style={{
                        opacity: collapsed ? 0 : 1,
                        transition: 'opacity 200ms ease-out'
                    }}
                >
                    {count}
                </span>
            )}

            {/* Active Indicator Strip */}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />
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
    mediaCounts = {},
    activeFilter,
    onFilterChange,
    draftsCount = 0
}) => {
    const navItems = [
        { id: 'home', icon: Home, label: 'Lounge' },
        { id: 'collections', icon: Layers, label: 'Sides' },
        { id: 'drafts', icon: Mic, label: 'Drafts', count: draftsCount },
    ];

    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(221);
    const [dragWidth, setDragWidth] = useState(null);
    const sidebarRef = useRef(null);

    const MIN_WIDTH = 180;
    const MAX_WIDTH = 221;
    const COLLAPSED_WIDTH = 60;
    const COLLAPSE_THRESHOLD = 100;

    const handleMouseMove = useCallback((e) => {
        if (!isResizing) return;
        const newWidth = Math.max(COLLAPSED_WIDTH, Math.min(MAX_WIDTH, e.clientX));
        setDragWidth(newWidth);
    }, [isResizing]);

    const handleMouseUp = useCallback(() => {
        if (dragWidth !== null) {
            if (dragWidth <= COLLAPSE_THRESHOLD) {
                if (!isCollapsed) onToggleCollapse?.();
            } else {
                if (isCollapsed) {
                    onToggleCollapse?.();
                    setSidebarWidth(MAX_WIDTH);
                } else {
                    setSidebarWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragWidth)));
                }
            }
        }
        setDragWidth(null);
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [dragWidth, isCollapsed, onToggleCollapse]);

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

    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    // Dynamic media types - only shown when bookmarks of that type exist
    const mediaTypes = [
        { id: 'video', icon: Play, label: 'Videos' },
        { id: 'image', icon: Image, label: 'Images' },
        { id: 'note', icon: FileText, label: 'Notes' },
        { id: 'audio-note', icon: Mic, label: 'Voice Notes' },
        { id: 'tweet', icon: XLogo, label: 'Posts' },
        { id: 'article', icon: BookOpen, label: 'Articles' },
        { id: 'music', icon: Music, label: 'Music' },
        { id: 'recipe', icon: UtensilsCrossed, label: 'Recipes' },
        { id: 'book', icon: BookMarked, label: 'Books' },
        { id: 'product', icon: ShoppingBag, label: 'Products' },
    ];

    const visibleMediaTypes = mediaTypes.filter(type => (mediaCounts[type.id] || 0) > 0);
    const hasAnyMedia = visibleMediaTypes.length > 0;

    const currentWidth = dragWidth !== null
        ? dragWidth
        : (isCollapsed ? COLLAPSED_WIDTH : sidebarWidth);

    const showCollapsed = dragWidth !== null
        ? dragWidth <= COLLAPSE_THRESHOLD
        : isCollapsed;

    return (
        <aside
            ref={sidebarRef}
            className={cn(
                "flex flex-col bg-theme-bg-darkest relative z-30 group/sidebar overflow-hidden",
                className
            )}
            style={{
                width: currentWidth,
                transform: 'translateZ(0)',
                willChange: isResizing ? 'width' : 'auto',
                transition: isResizing ? 'none' : 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Resize Handle */}
            <div
                className={cn(
                    "absolute top-0 bottom-0 z-50 cursor-ew-resize group/handle",
                    "w-[12px] -right-[6px]"
                )}
                onMouseDown={startResizing}
            >
                <div
                    className={cn(
                        "absolute inset-0 rounded-full opacity-0 transition-opacity duration-150",
                        "group-hover/handle:opacity-100",
                        isResizing ? "opacity-100 bg-primary/20" : "group-hover/handle:bg-primary/10"
                    )}
                />
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
            <div
                className="h-20 flex items-center border-b border-white/5"
                style={{
                    paddingLeft: showCollapsed ? 6 : 14,
                    paddingRight: showCollapsed ? 14 : 12,
                    transition: 'padding 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <SpiderVerseLogo
                    size={40}
                    showText={!showCollapsed}
                    textSize="text-[20px]"
                    className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] flex-shrink-0"
                    interactive={showCollapsed}
                    onClick={showCollapsed ? onToggleCollapse : undefined}
                    isCollapsed={showCollapsed}
                    playIntro={true}
                />

                {/* Spacer and collapse button - collapse to 0 width when sidebar collapsed */}
                <div
                    className="flex items-center overflow-hidden"
                    style={{
                        flex: showCollapsed ? '0 0 0px' : '1 0 auto',
                        opacity: showCollapsed ? 0 : 1,
                        transition: 'flex 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out'
                    }}
                >
                    <div className="flex-1" />
                    <button
                        onClick={onToggleCollapse}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground active:scale-95 cursor-pointer flex-shrink-0"
                    >
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="px-3 py-4 flex flex-col gap-1 relative z-10">
                {navItems.map((item) => (
                    <NavItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        active={activeTab === item.id || (activeTab === 'lounge' && item.id === 'home')}
                        onClick={() => onNavigate(item.id === 'home' ? 'lounge' : item.id)}
                        collapsed={showCollapsed}
                        count={item.count}
                    />
                ))}
            </div>

            {/* Decorative divider between nav sections */}
            <div className="flex items-center justify-center px-3 py-2">
                <div
                    className="h-px bg-white/20 rounded-full w-full"
                    style={{ maxWidth: showCollapsed ? 20 : '100%', transition: 'max-width 200ms ease-out' }}
                />
            </div>

            {/* Media Library Section */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 relative z-10">
                {/* Library header - hidden when collapsed */}
                {!showCollapsed && (
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-3 pt-2 pb-2">
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
                                onClick={() => {
                                    // Toggle filter: if same filter clicked, clear it; otherwise set new filter
                                    const newFilter = activeFilter === type.id ? null : type.id;
                                    onFilterChange?.(newFilter);
                                    // Navigate to lounge when setting a filter to show filtered results (MAL-21)
                                    // Pass false to prevent clearing the filter we just set
                                    if (newFilter) {
                                        onNavigate('lounge', false);
                                    }
                                }}
                                collapsed={showCollapsed}
                                count={mediaCounts[type.id]}
                            />
                        ))
                    ) : (
                        !showCollapsed && (
                            <div className="px-3 py-4 text-center">
                                <Sparkles className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-[11px] text-muted-foreground/50">
                                    Save bookmarks to see your library grow
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 relative z-10">
                <div
                    className={cn(
                        "rounded-xl bg-secondary/30 p-3 flex items-center gap-3",
                        showCollapsed && "justify-center p-2 bg-transparent"
                    )}
                    style={{ transition: 'padding 150ms ease-out, background-color 150ms ease-out' }}
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {!showCollapsed && (
                        <span className="text-[13px] text-foreground/80 font-medium">All synced</span>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
