import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * FolderTabs Component
 * A folder tab navigation system with skewed tabs
 * Gruvbox themed with subtle shade variations - no colored borders
 */

// Gruvbox shade palette - subtle variations for inactive tabs
const TAB_SHADES = [
  { bg: '#504945', hover: '#665c54' },  // Shade 1
  { bg: '#5a524c', hover: '#6b6258' },  // Shade 2
  { bg: '#665c54', hover: '#7c6f64' },  // Shade 3
  { bg: '#6b6258', hover: '#7a7066' },  // Shade 4
];

// Active tab uses the same color as the content area for seamless look
const ACTIVE_TAB_BG = '#3c3836';
const CONTENT_BG = '#3c3836';

const FolderTabs = ({
  tabs = [],
  activeTab = null,
  onTabChange,
  children,
  className,
}) => {
  const tabsContainerRef = useRef(null);

  // Horizontal scroll on mousewheel for tabs
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (container.scrollWidth > container.clientWidth) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className={cn("folder-container w-full", className)}>
      {/* Tabs Row */}
      <div
        ref={tabsContainerRef}
        className="folder-tabs flex overflow-x-auto scrollbar-hide pt-4 pb-0 px-2"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const shade = TAB_SHADES[index % TAB_SHADES.length];

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "folder-tab relative inline-block cursor-pointer transition-all duration-200",
                isActive ? "z-50" : "z-10 hover:z-20"
              )}
              style={{
                marginLeft: index === 0 ? '20px' : '-30px',
                marginRight: '3rem',
              }}
            >
              {/* Tab background with skewed edges */}
              <div
                className={cn(
                  "folder-tab-bg relative z-10 px-0 py-2 rounded-t-lg transition-all duration-200",
                  !isActive && "hover:brightness-110"
                )}
                style={{
                  backgroundColor: isActive ? ACTIVE_TAB_BG : shade.bg,
                }}
              >
                {/* Tab label */}
                <span
                  className={cn(
                    "inline-block px-5 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-200 min-w-[6rem] text-center",
                    isActive
                      ? "text-gruvbox-yellow"
                      : "text-gruvbox-fg-muted hover:text-gruvbox-fg"
                  )}
                >
                  {tab.label}
                </span>

                {/* Active indicator - subtle yellow underline */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gruvbox-yellow rounded-full" />
                )}
              </div>

              {/* Left skewed edge */}
              <div
                className="absolute top-0 left-0 w-[25px] h-full -translate-x-3 skew-x-[-20deg] rounded-tl-lg transition-all duration-200"
                style={{
                  backgroundColor: isActive ? ACTIVE_TAB_BG : shade.bg,
                }}
              />

              {/* Right skewed edge */}
              <div
                className="absolute top-0 right-0 w-[25px] h-full translate-x-3 skew-x-[20deg] rounded-tr-lg transition-all duration-200"
                style={{
                  backgroundColor: isActive ? ACTIVE_TAB_BG : shade.bg,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Content Area - seamless with active tab */}
      <div className="folder-content relative -mt-0.5">
        <div
          className="folder-content-inner rounded-xl overflow-hidden"
          style={{
            backgroundColor: CONTENT_BG,
          }}
        >
          {/* Inner page */}
          <div className="folder-page min-h-[70vh] p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderTabs;
