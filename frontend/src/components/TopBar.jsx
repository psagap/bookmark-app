import React, { useState } from 'react';
import { Plus, Settings, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import MindSearch from './MindSearch';
import { motion, AnimatePresence } from 'framer-motion';

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
}) => {

    return (
        <header className="h-20 px-8 flex items-center justify-between border-b border-border/50 bg-theme-bg-dark/80 backdrop-blur-xl sticky top-0 z-40">
            {/* Left: Connected brand element - flight trail + getahead. when sidebar collapsed */}
            <AnimatePresence mode="wait">
                {sidebarCollapsed && (
                    <motion.div
                        key="getahead-connected"
                        className="flex items-center mr-6 relative"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ marginLeft: '-24px' }} // Extend back toward sidebar
                    >
                        {/* Flight trail - organic wiggly path from bird */}
                        <svg
                            width="80"
                            height="32"
                            viewBox="0 0 80 32"
                            fill="none"
                            className="mr-2"
                            style={{ overflow: 'visible' }}
                        >
                            {/* Gradient definition for trail fade */}
                            <defs>
                                <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                                    <stop offset="30%" stopColor="currentColor" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
                                </linearGradient>
                            </defs>

                            {/* Main flight trail - swooping curve */}
                            <motion.path
                                d="M0 20 Q12 20, 18 14 T36 10 T54 14 T72 8"
                                stroke="url(#trailGradient)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                className="text-white"
                                fill="none"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                exit={{ pathLength: 0 }}
                                transition={{
                                    pathLength: { duration: 0.45, delay: 0.15, ease: [0.4, 0, 0.2, 1] }
                                }}
                            />

                            {/* Small trailing dots for sparkle effect */}
                            {[
                                { cx: 24, cy: 12, delay: 0.25 },
                                { cx: 42, cy: 11, delay: 0.35 },
                                { cx: 60, cy: 12, delay: 0.45 },
                            ].map((dot, i) => (
                                <motion.circle
                                    key={i}
                                    cx={dot.cx}
                                    cy={dot.cy}
                                    r="1.5"
                                    className="fill-white/50"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: [0, 1.5, 1], opacity: [0, 0.8, 0.4] }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, delay: dot.delay }}
                                />
                            ))}

                            {/* End accent dot */}
                            <motion.circle
                                cx="76"
                                cy="8"
                                r="3"
                                className="fill-primary"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.25, delay: 0.5, ease: "backOut" }}
                            />
                        </svg>

                        {/* getahead. text - reveals after trail completes */}
                        <motion.span
                            className="text-xl font-medium text-white whitespace-nowrap"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                letterSpacing: '-0.02em',
                            }}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.35, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                        >
                            getahead.
                        </motion.span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MindSearch with category suggestions */}
            <MindSearch
                onFilterChange={onFilterChange}
                activeFilters={activeFilters}
                showInlineFilters={false}
                activeTags={activeTags}
                onTagFilterChange={onTagFilterChange}
                tagRefreshTrigger={tagRefreshTrigger}
                mediaCounts={mediaCounts}
            />

            {/* Right: Actions */}
            <div className="flex items-center gap-3 ml-4">
                {/* Add New Button */}
                <button
                    onClick={onAddNew}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-primary-foreground text-sm font-medium transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add New</span>
                </button>

                {/* Mobile Add Button */}
                <button
                    onClick={onAddNew}
                    className="sm:hidden p-2 rounded-xl bg-primary text-primary-foreground"
                >
                    <Plus className="w-5 h-5" />
                </button>

                <div className="h-6 w-px bg-border mx-1" />

                {/* User Profile or Sign In */}
                {user ? (
                    <div className="relative group/profile">
                        <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary transition-colors">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center shadow-inner">
                                <span className="text-xs font-medium text-white">
                                    {user?.email?.[0].toUpperCase() || <User className="w-4 h-4" />}
                                </span>
                            </div>
                        </button>

                        {/* Simple Dropdown */}
                        <div className="absolute right-0 top-full mt-2 w-48 py-1 rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-xl opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-200 z-50 transform origin-top-right">
                            <div className="px-4 py-2 border-b border-border/50">
                                <p className="text-xs font-medium text-muted-foreground truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={onOpenSettings}
                                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/80 flex items-center gap-2"
                            >
                                <Settings className="w-4 h-4" /> Settings
                            </button>
                            <button
                                onClick={onSignOut}
                                className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={onSignIn}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors"
                    >
                        <User className="w-4 h-4" />
                        <span>Sign In</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default TopBar;
