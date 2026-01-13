import React, { useState } from 'react';
import { Plus, Settings, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import MindSearch from './MindSearch';

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
}) => {

    return (
        <header className="h-20 px-8 flex items-center justify-between border-b border-border/50 bg-theme-bg-dark/80 backdrop-blur-xl sticky top-0 z-40">
            {/* Left: MindSearch with category suggestions */}
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
