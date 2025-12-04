import React from 'react';
import { FolderOpen, Layers, BookOpen, Video, Music, Image, Code, Globe, Star, Heart, Bookmark, Archive, FileText, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Map of icon names to components
const COLLECTION_ICONS = {
  folder: FolderOpen,
  layers: Layers,
  book: BookOpen,
  video: Video,
  music: Music,
  image: Image,
  code: Code,
  globe: Globe,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  archive: Archive,
  file: FileText,
  zap: Zap,
};

// Get icon component by name, default to folder
const getIconComponent = (iconName) => {
  return COLLECTION_ICONS[iconName?.toLowerCase()] || FolderOpen;
};

const CollectionBar = ({
  collections = [],
  activeCollection = null,
  onSelectCollection,
  onClearCollection,
}) => {
  if (collections.length === 0) return null;

  // Check if "All" is selected (no active collection)
  const isAllSelected = !activeCollection;

  return (
    <div className="px-6 mb-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* All bookmarks button */}
        <button
          onClick={onClearCollection}
          className={cn(
            "nav-pill group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border",
            isAllSelected
              ? "bg-gruvbox-fg/10 border-gruvbox-fg/30 text-gruvbox-fg"
              : "bg-transparent border-gruvbox-bg-lighter/50 text-gruvbox-fg-muted hover:border-gruvbox-fg/30 hover:text-gruvbox-fg"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>All</span>

          {/* Active indicator - modern underline marker */}
          {isAllSelected && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-8 h-0.5 rounded-full bg-gruvbox-fg" />
              <div className="w-1.5 h-1.5 rounded-full bg-gruvbox-fg -mt-0.5" />
            </div>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gruvbox-bg-lighter/50" />

        {/* Collection pills */}
        {collections.map((collection) => {
          const IconComponent = getIconComponent(collection.icon);
          const isActive = activeCollection === collection.id;

          return (
            <button
              key={collection.id}
              onClick={() => onSelectCollection(collection.id)}
              className={cn(
                "nav-pill group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border",
                isActive
                  ? "border-transparent"
                  : "bg-transparent border-gruvbox-bg-lighter/50 hover:scale-[1.02]"
              )}
              style={isActive ? {
                backgroundColor: `${collection.color}15`,
                borderColor: `${collection.color}40`,
                color: collection.color,
              } : {
                color: '#a89984',
              }}
            >
              {/* Hover glow effect - only when not active */}
              {!isActive && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{
                    boxShadow: `0 0 15px ${collection.color}25`,
                    border: `1px solid ${collection.color}30`,
                  }}
                />
              )}

              {/* Icon with color */}
              <div
                className="relative flex items-center justify-center w-5 h-5 rounded-md transition-colors"
                style={{
                  backgroundColor: isActive ? `${collection.color}25` : 'transparent',
                }}
              >
                <IconComponent
                  className="w-4 h-4 transition-colors"
                  style={{ color: isActive ? collection.color : undefined }}
                />
              </div>

              {/* Collection name */}
              <span className="relative">{collection.name}</span>

              {/* Bookmark count */}
              {collection.bookmarkCount > 0 && (
                <span
                  className="relative text-xs px-1.5 py-0.5 rounded-full transition-colors"
                  style={{
                    backgroundColor: isActive ? `${collection.color}25` : 'rgba(168, 153, 132, 0.2)',
                    color: isActive ? collection.color : '#a89984',
                  }}
                >
                  {collection.bookmarkCount}
                </span>
              )}

              {/* Active indicator - modern underline marker with collection color */}
              {isActive && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div
                    className="w-8 h-0.5 rounded-full"
                    style={{ backgroundColor: collection.color }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full -mt-0.5"
                    style={{ backgroundColor: collection.color }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CollectionBar;
