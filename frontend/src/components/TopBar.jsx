import React, { useState, useEffect, useRef } from 'react';
import { Plus, Settings, User, LogOut, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import MindSearch from './MindSearch';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

/**
 * TopBar: Global Command Center
 * - Search: MindSearch with category suggestions
 * - Actions: Add New, Profile
 */
const TopBar = ({
    onSearch,
    searchQuery,
    onAddNew,
    user,
    onOpenSettings,
    onSignOut,
    onSignIn,
    // MindSearch props
    onFilterChange,
    activeFilters = [],
    activeTags = [],
    onTagFilterChange,
    tagRefreshTrigger = 0,
    mediaCounts = {},
    sidebarCollapsed = false,
    scrollContainerRef = null,
}) => {
    // Scroll state for compact header transformation
    const [isScrolled, setIsScrolled] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef(null);
    const SCROLL_THRESHOLD = 100; // pixels before compact mode kicks in

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setShowProfileMenu(false);
            }
        };
        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showProfileMenu]);

    useEffect(() => {
        const scrollContainer = scrollContainerRef?.current || window;
        
        const handleScroll = () => {
            const scrollTop = scrollContainerRef?.current 
                ? scrollContainerRef.current.scrollTop 
                : window.scrollY;
            setIsScrolled(scrollTop > SCROLL_THRESHOLD);
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [scrollContainerRef]);

    return (
        <header 
            className={cn(
                "px-6 flex items-center justify-between sticky top-0 z-40 transition-all duration-500 ease-out",
                isScrolled
                    ? "h-[64px] bg-theme-bg-darkest/80 backdrop-blur-2xl border-b border-white/[0.04] shadow-[0_1px_0_0_rgba(255,255,255,0.02),0_8px_32px_-8px_rgba(0,0,0,0.4)]"
                    : "h-[90px] bg-theme-bg-dark/40 backdrop-blur-xl border-b border-white/[0.03]"
            )}
        >
            {/* MindSearch with category suggestions */}
            <MindSearch
                onFilterChange={onFilterChange}
                activeFilters={activeFilters}
                showInlineFilters={false}
                activeTags={activeTags}
                onTagFilterChange={onTagFilterChange}
                tagRefreshTrigger={tagRefreshTrigger}
                mediaCounts={mediaCounts}
                isCompact={isScrolled}
                sidebarCollapsed={sidebarCollapsed}
            />

            {/* Right: Actions */}
            <div className={cn(
                "flex items-center ml-6 transition-all duration-500 ease-out",
                isScrolled ? "gap-3" : "gap-5"
            )}>
                {/* Add New Button - Primary solid pill */}
                <button
                    onClick={onAddNew}
                    className={cn(
                        "hidden sm:flex items-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all active:scale-[0.97]",
                        "shadow-[0_2px_8px_-2px_rgba(215,153,33,0.4),inset_0_1px_0_0_rgba(255,255,255,0.1)]",
                        "hover:shadow-[0_4px_16px_-2px_rgba(215,153,33,0.5),inset_0_1px_0_0_rgba(255,255,255,0.15)]",
                        isScrolled
                            ? "gap-2 px-4 py-2 text-sm"
                            : "gap-2.5 px-5 py-2.5 text-sm"
                    )}
                >
                    <Plus className={cn("transition-all", isScrolled ? "w-4 h-4" : "w-[18px] h-[18px]")} strokeWidth={2.5} />
                    <span>Add New</span>
                </button>

                {/* Mobile Add Button */}
                <button
                    onClick={onAddNew}
                    className={cn(
                        "sm:hidden rounded-full bg-primary text-primary-foreground transition-all shadow-lg shadow-primary/30",
                        isScrolled ? "p-2" : "p-2.5"
                    )}
                >
                    <Plus className={cn(isScrolled ? "w-4 h-4" : "w-5 h-5")} strokeWidth={2.5} />
                </button>

                {/* Subtle divider */}
                <div className={cn(
                    "w-px bg-white/[0.08] transition-all duration-500",
                    isScrolled ? "h-8" : "h-12"
                )} />

                {/* User Profile or Sign In */}
                {user ? (
                    <div className="relative" ref={profileMenuRef}>
                        {/* Avatar - click to toggle dropdown */}
                        <div onClick={() => setShowProfileMenu(!showProfileMenu)} className="cursor-pointer">
                            <Avatar className={cn(
                                "ring-2 ring-background shadow-lg hover:scale-105 transition-all duration-500",
                                isScrolled ? "h-11 w-11" : "h-14 w-14"
                            )}>
                                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email?.split('@')[0] || 'User'} />
                                <AvatarFallback className={cn(
                                    "font-semibold bg-gradient-to-br from-amber-500/80 via-amber-600/70 to-amber-700/80 text-white transition-all duration-500",
                                    isScrolled ? "text-base" : "text-lg"
                                )}>
                                    {user?.email?.[0].toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Dropdown - solid themed panel (click to toggle) */}
                        <div className={cn(
                            "absolute right-0 top-full mt-3 w-56 py-2 rounded-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)] transition-all duration-200 z-50 transform origin-top-right",
                            showProfileMenu ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
                        )}
                            style={{
                                backgroundColor: 'var(--theme-bg-light)',
                                border: '1px solid var(--theme-bg-lighter)',
                            }}
                        >
                            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--theme-bg-lighter)' }}>
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-fg-muted)' }}>{user?.email}</p>
                            </div>
                            <button
                                onClick={() => { onOpenSettings?.(); setShowProfileMenu(false); }}
                                className="w-full text-left px-5 py-3 text-[15px] flex items-center gap-3 transition-colors"
                                style={{ color: 'var(--theme-fg)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-bg-lighter)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <Settings className="w-[18px] h-[18px]" style={{ color: 'var(--theme-fg-muted)' }} /> Settings
                            </button>
                            <button
                                onClick={() => { onSignOut?.(); setShowProfileMenu(false); }}
                                className="w-full text-left px-5 py-3 text-[15px] flex items-center gap-3 transition-colors"
                                style={{ color: '#ef4444' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <LogOut className="w-[18px] h-[18px]" /> Sign Out
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Sign In Button - Glass pill variant */
                    <button
                        onClick={onSignIn}
                        className={cn(
                            "flex items-center rounded-full font-medium transition-all",
                            "bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl",
                            "hover:bg-white/[0.08] hover:border-white/[0.15]",
                            "text-foreground/90 hover:text-foreground",
                            isScrolled 
                                ? "gap-2.5 px-5 py-3 text-sm" 
                                : "gap-3 px-7 py-4 text-[15px]"
                        )}
                    >
                        <User className={cn(isScrolled ? "w-[18px] h-[18px]" : "w-5 h-5")} strokeWidth={1.75} />
                        <span>Sign In</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default TopBar;
