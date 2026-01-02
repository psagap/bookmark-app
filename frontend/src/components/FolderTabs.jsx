import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Image, Youtube, FileText, Zap, BookOpen } from 'lucide-react';

/**
 * FolderTabs Component
 * Tab navigation with filter pills - selected pills animate away to search bar
 */

// Custom SVG Icons
const XLogo = ({ className, style, ...props }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const RedditLogo = ({ className, style, ...props }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" {...props}>
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const WikipediaLogo = ({ className, style, ...props }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" {...props}>
    <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.22-.812-.24l-.201-.021c-.052 0-.098-.015-.145-.051-.045-.031-.067-.076-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178-.646.03-.782.095-1.023.439-.12.186-.375.589-.646 1.039l-2.301 4.273-.065.135 2.792 5.712.17.048 4.396-10.438c.154-.422.129-.722-.064-.895-.197-.172-.346-.273-.857-.295l-.42-.016c-.061 0-.105-.014-.152-.045-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18-.648.03-1.127.18-1.443.421-.314.255-.557.616-.736 1.067 0 0-4.043 9.258-5.426 12.339-.525 1.007-1.053.917-1.503-.031-.571-1.171-1.773-3.786-2.646-5.71l.053-.036z" />
  </svg>
);

// Filter categories with their icons and colors
const FILTER_CATEGORIES = [
  { id: 'image', label: 'Images', icon: Image, hexColor: '#d3869b' },
  { id: 'youtube', label: 'Videos', icon: Youtube, hexColor: '#fb4934' },
  { id: 'note', label: 'Notes', icon: FileText, hexColor: '#fabd2f' },
  { id: 'tweet', label: 'Posts', icon: XLogo, hexColor: '#a89984' },
  { id: 'reddit', label: 'Posts', icon: RedditLogo, hexColor: '#ff4500' },
  { id: 'wikipedia', label: 'Articles', icon: WikipediaLogo, hexColor: '#83a598' },
  { id: 'article', label: 'Articles', icon: BookOpen, hexColor: '#8ec07c' },
];

// Helper to determine bookmark type
const getBookmarkType = (bookmark) => {
  const url = bookmark?.url || '';
  if (bookmark?.type === 'note' || url.startsWith('note://') || (!url && (bookmark?.notes || bookmark?.title))) {
    return 'note';
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'tweet';
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('reddit.com') || url.includes('redd.it')) {
    return 'reddit';
  }
  if (url.includes('wikipedia.org')) {
    return 'wikipedia';
  }
  if (bookmark?.type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
    return 'image';
  }
  return 'article';
};

// Check if bookmark was added recently (within last 24 hours)
const isRecent = (bookmark) => {
  if (!bookmark?.createdAt) return false;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(bookmark.createdAt).getTime() > dayAgo;
};

// Filter Pill component
const FilterPill = ({ category, onClick, count = 0, hasRecent = false }) => {
  const Icon = category.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      layout
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex items-center rounded-full font-medium transition-colors duration-150",
        !isHovered && "bg-gruvbox-bg-lighter/30 text-gruvbox-fg-muted/70",
        count === 0 && "opacity-40"
      )}
      style={{
        padding: 'var(--ui-pill-py) var(--ui-pill-px)',
        gap: 'var(--ui-pill-gap)',
        fontSize: 'var(--ui-pill-text)',
        ...(isHovered ? {
          backgroundColor: `${category.hexColor}12`,
          color: category.hexColor,
        } : {})
      }}
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.5,
        y: -30,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
    >
      {/* Recent indicator */}
      {hasRecent && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: category.hexColor }}
        >
          <Zap className="w-2.5 h-2.5 text-white fill-white" />
        </motion.div>
      )}

      <Icon style={{ width: 'var(--ui-pill-icon)', height: 'var(--ui-pill-icon)' }} />
      <span style={{ fontSize: 'var(--ui-pill-text)' }}>{category.label}</span>

      {/* Count badge */}
      {count > 0 && (
        <span className={cn("text-xs tabular-nums", isHovered ? "opacity-80" : "opacity-50")}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </motion.button>
  );
};

const FolderTabs = ({
  tabs = [],
  activeTab = null,
  onTabChange,
  children,
  className,
  activeFilters = [],
  onFilterToggle,
  bookmarks = [],
}) => {
  // Calculate counts and recent status for each category
  const categoryStats = useMemo(() => {
    const stats = {};
    FILTER_CATEGORIES.forEach(cat => {
      const matching = bookmarks.filter(b => getBookmarkType(b) === cat.id);
      stats[cat.id] = {
        count: matching.length,
        hasRecent: matching.some(isRecent),
      };
    });
    return stats;
  }, [bookmarks]);

  // Only show inactive (unselected) pills - active ones are in the search bar
  const inactiveCategories = FILTER_CATEGORIES.filter(cat => !activeFilters.includes(cat.id));

  return (
    <div className={cn("folder-container w-full", className)}>
      {/* Header Row - Minimal Tabs + Filter Pills */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-1 mb-6 border-b border-white/5 pb-2">
        {/* Main Tabs - Modern Minimal Design */}
        <div className="flex items-center gap-8 relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "relative py-3 text-base font-medium transition-colors duration-200",
                  isActive ? "text-gruvbox-fg" : "text-gruvbox-fg-muted hover:text-gruvbox-fg/80"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'var(--theme-primary)' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Pills - Modern & Clean */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <AnimatePresence mode="popLayout">
            {inactiveCategories.map((category) => (
              <FilterPill
                key={category.id}
                category={category}
                onClick={() => onFilterToggle?.(category.id)}
                count={categoryStats[category.id]?.count || 0}
                hasRecent={categoryStats[category.id]?.hasRecent || false}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Content Area - Clean Surface */}
      <div className="folder-content relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-[70vh]"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FolderTabs;
