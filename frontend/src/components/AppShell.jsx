import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * AppShell: The main structural layout
 * - Manages Sidebar collapse state
 * - TopBar integration
 * - Responsive behavior
 */
const AppShell = ({
    children,
    activePage,
    onNavigate,
    searchQuery,
    onSearch,
    onAddNew,
    onOpenSettings,
    onSignOut,
    onSignIn,
    mediaCounts = {},
    activeFilter,
    onFilterChange,
    // MindSearch props
    activeFilters = [],
    onTypeFilterChange,
    activeTags = [],
    onTagFilterChange,
    tagRefreshTrigger = 0,
}) => {
    const { user } = useAuth();
    // Sidebar collapsed state - default to open on large screens
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Auto-collapse on small screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarCollapsed(true);
            } else {
                setSidebarCollapsed(false);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="app-shell flex h-screen w-screen bg-background overflow-hidden text-foreground selection:bg-primary/20 selection:text-primary-foreground font-body">
            {/* Sidebar - Fixed Left */}
            <Sidebar
                activeTab={activePage}
                onNavigate={onNavigate}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex-shrink-0 h-full"
                mediaCounts={mediaCounts}
                activeFilter={activeFilter}
                onFilterChange={onFilterChange}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative h-full">
                {/* TopBar - Fixed Top */}
                <TopBar
                    onSearch={onSearch}
                    searchQuery={searchQuery}
                    onAddNew={onAddNew}
                    user={user}
                    onOpenSettings={onOpenSettings}
                    onSignOut={onSignOut}
                    onSignIn={onSignIn}
                    // MindSearch props
                    onFilterChange={onTypeFilterChange}
                    activeFilters={activeFilters}
                    activeTags={activeTags}
                    onTagFilterChange={onTagFilterChange}
                    tagRefreshTrigger={tagRefreshTrigger}
                    mediaCounts={mediaCounts}
                />

                {/* Scrollable Page Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-thin">
                    <div className="min-h-full w-full max-w-[1920px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppShell;
