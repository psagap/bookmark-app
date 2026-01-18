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
    const [isProfileOpen, setIsProfileOpen] = useState(false);

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
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        >
                            {/* Display name above avatar */}
                            <span className="hidden sm:block text-sm font-medium text-foreground">
                                {user?.user_metadata?.full_name ||
                                 user?.user_metadata?.name ||
                                 user?.email?.split('@')[0] ||
                                 'User'}
                            </span>
                            {/* Avatar circle with orange gradient */}
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 border border-white/20 flex items-center justify-center shadow-lg">
                                <span className="text-sm font-semibold text-white">
                                    {user?.email?.[0].toUpperCase() || <User className="w-4 h-4" />}
                                </span>
                            </div>
                        </button>

                        {/* Dropdown - click to toggle */}
                        {isProfileOpen && (
                            <>
                                {/* Backdrop to close on outside click */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsProfileOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-48 py-1 rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-xl z-50 transform origin-top-right">
                                    <div className="px-4 py-2 border-b border-border/50">
                                        <p className="text-xs font-medium text-muted-foreground truncate">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            onOpenSettings();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/80 flex items-center gap-2"
                                    >
                                        <Settings className="w-4 h-4" /> Settings
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            onSignOut();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            </>
                        )}
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
