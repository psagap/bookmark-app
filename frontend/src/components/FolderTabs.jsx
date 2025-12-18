import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Image, Youtube, FileText, Globe, MessageCircle } from 'lucide-react';

/**
 * FolderTabs Component
 * Tab navigation with filter pills on the same row
 */

// Filter categories with their colors
const FILTER_CATEGORIES = [
  { id: 'image', label: 'Images', icon: Image, hexColor: '#d3869b' },
  { id: 'youtube', label: 'Videos', icon: Youtube, hexColor: '#fb4934' },
  { id: 'note', label: 'Notes', icon: FileText, hexColor: '#fabd2f' },
  { id: 'article', label: 'Articles', icon: Globe, hexColor: '#8ec07c' },
  { id: 'tweet', label: 'Posts', icon: MessageCircle, hexColor: '#83a598' },
];

// Filter Pill with hover color effect
const FilterPill = ({ category, isActive, onClick }) => {
  const Icon = category.icon;
  const [isHovered, setIsHovered] = useState(false);

  const getStyles = () => {
    if (isActive) {
      return {
        backgroundColor: `${category.hexColor}25`,
        color: category.hexColor,
        borderColor: `${category.hexColor}50`,
        boxShadow: `0 2px 12px ${category.hexColor}30`,
      };
    }
    if (isHovered) {
      return {
        backgroundColor: `${category.hexColor}15`,
        color: category.hexColor,
        borderColor: `${category.hexColor}30`,
        boxShadow: `0 2px 8px ${category.hexColor}20`,
      };
    }
    return {};
  };

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
        !isActive && !isHovered && "bg-transparent text-gruvbox-fg-muted/60 border-gruvbox-bg-lighter/40"
      )}
      style={getStyles()}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className="w-4 h-4" />
      <span>{category.label}</span>
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
}) => {
  return (
    <div className={cn("folder-container w-full", className)}>
      {/* Header Row - Tabs on left, Filters on right */}
      <div className="flex items-center justify-between px-4 py-3 mb-2">
        {/* Left: Main Tabs - Unified Toggle Switch */}
        <div className="relative inline-flex items-center bg-gruvbox-bg-dark/80 rounded-full p-1 border border-gruvbox-bg-lighter/20">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "relative z-10 px-5 py-2 text-sm font-semibold uppercase tracking-wider transition-colors duration-200 rounded-full",
                  isActive ? "text-gruvbox-bg-darkest" : "text-gruvbox-fg-muted/70 hover:text-gruvbox-fg"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="main-tab-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-gruvbox-yellow to-gruvbox-orange rounded-full shadow-lg"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Filter Pills */}
        <div className="flex items-center gap-2">
          {FILTER_CATEGORIES.map((category) => (
            <FilterPill
              key={category.id}
              category={category}
              isActive={activeFilters.includes(category.id)}
              onClick={() => onFilterToggle?.(category.id)}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="folder-content relative">
        <div
          className="folder-content-inner rounded-2xl overflow-visible border border-gruvbox-bg-lighter/30"
          style={{ backgroundColor: 'var(--theme-bg-light)' }}
        >
          <div className="folder-page min-h-[70vh] p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderTabs;
