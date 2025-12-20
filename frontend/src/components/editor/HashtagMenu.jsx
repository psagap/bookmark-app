import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { getTagColor } from '@/utils/tagColors';

// Hashtag suggestion menu component
const HashtagMenu = forwardRef(({ items = [], command, query = '' }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter items based on query
  const filteredItems = query
    ? items.filter(item => item.toLowerCase().includes(query.toLowerCase()))
    : items;

  // Show "Create new" option if query doesn't match any existing tag exactly
  const showCreateNew = query && query.length > 0 && !filteredItems.some(
    item => item.toLowerCase() === query.toLowerCase()
  );

  const allItems = showCreateNew
    ? [...filteredItems.slice(0, 8), { isCreate: true, name: query }]
    : filteredItems.slice(0, 10);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + allItems.length - 1) % Math.max(allItems.length, 1));
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(allItems.length, 1));
        return true;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const item = allItems[selectedIndex];
        if (item) {
          const tagName = typeof item === 'string' ? item : item.name;
          command({ tag: tagName.toLowerCase() });
        } else if (query) {
          command({ tag: query.toLowerCase() });
        }
        return true;
      }

      if (event.key === ' ') {
        // Space confirms the current query as a tag
        if (query && query.length > 0) {
          event.preventDefault();
          command({ tag: query.toLowerCase() });
          return true;
        }
      }

      return false;
    },
  }));

  if (allItems.length === 0 && !query) {
    return (
      <div className="hashtag-menu">
        <div className="hashtag-menu-empty">Type to search or create tags</div>
        <style>{menuStyles}</style>
      </div>
    );
  }

  return (
    <div className="hashtag-menu">
      <div className="hashtag-menu-label">
        {query ? `Tags matching "${query}"` : 'Available tags'}
      </div>
      {allItems.length === 0 && query && (
        <button
          className="hashtag-menu-item is-selected"
          onClick={() => command({ tag: query.toLowerCase() })}
        >
          <span className="hashtag-menu-create">
            <span className="hashtag-menu-create-icon">+</span>
            Create "{query}"
          </span>
        </button>
      )}
      {allItems.map((item, index) => {
        const isCreateItem = typeof item === 'object' && item.isCreate;
        const tagName = isCreateItem ? item.name : item;
        const tagColor = getTagColor(tagName.toLowerCase());

        return (
          <button
            key={isCreateItem ? `create-${tagName}` : tagName}
            className={`hashtag-menu-item ${index === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => command({ tag: tagName.toLowerCase() })}
          >
            {isCreateItem ? (
              <span className="hashtag-menu-create">
                <span className="hashtag-menu-create-icon">+</span>
                Create "<span style={{ color: tagColor.text }}>{tagName}</span>"
              </span>
            ) : (
              <span
                className="hashtag-menu-tag"
                style={{
                  backgroundColor: tagColor.bg,
                  color: tagColor.text,
                  border: `1px solid ${tagColor.border}`,
                }}
              >
                #{tagName}
              </span>
            )}
          </button>
        );
      })}
      <div className="hashtag-menu-hint">
        <kbd>↑↓</kbd> navigate <kbd>Enter</kbd> select <kbd>Space</kbd> create
      </div>
      <style>{menuStyles}</style>
    </div>
  );
});

HashtagMenu.displayName = 'HashtagMenu';

const menuStyles = `
  .hashtag-menu {
    background: rgba(40, 40, 40, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    padding: 8px;
    min-width: 220px;
    max-width: 300px;
    max-height: 320px;
    overflow-y: auto;
  }

  .hashtag-menu-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(168, 153, 132, 0.6);
    padding: 4px 8px 8px;
  }

  .hashtag-menu-empty {
    padding: 12px;
    text-align: center;
    color: rgba(168, 153, 132, 0.5);
    font-size: 12px;
  }

  .hashtag-menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
  }

  .hashtag-menu-item:hover,
  .hashtag-menu-item.is-selected {
    background: rgba(254, 128, 25, 0.15);
  }

  .hashtag-menu-tag {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
  }

  .hashtag-menu-create {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(251, 241, 199, 0.8);
  }

  .hashtag-menu-create-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(254, 128, 25, 0.2);
    color: #fe8019;
    font-size: 14px;
    font-weight: 600;
  }

  .hashtag-menu-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 10px;
    color: rgba(168, 153, 132, 0.4);
  }

  .hashtag-menu-hint kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 600;
    color: rgba(251, 241, 199, 0.6);
  }
`;

export default HashtagMenu;
