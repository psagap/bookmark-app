import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================================================
// PREFERENCES CONTEXT
// Manages user preferences like UI size (separate from theme)
// ============================================================================

const PreferencesContext = createContext(null);

const STORAGE_KEY = 'bookmark-app-ui-size';
const DEFAULT_SIZE = 'large';

// Size presets
export const UI_SIZES = {
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Compact pills and search bar',
  },
  large: {
    id: 'large',
    label: 'Large',
    description: 'Spacious pills and search bar',
  },
};

export const PreferencesProvider = ({ children }) => {
  // Initialize from localStorage
  const [uiSize, setUiSizeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && UI_SIZES[saved]) {
        return saved;
      }
    }
    return DEFAULT_SIZE;
  });

  // Apply size class to document root
  const applySize = useCallback((size) => {
    const root = document.documentElement;

    // Remove all size classes
    Object.keys(UI_SIZES).forEach((sizeKey) => {
      root.classList.remove(`ui-size-${sizeKey}`);
    });

    // Add current size class
    root.classList.add(`ui-size-${size}`);
  }, []);

  // Update size and persist
  const setUiSize = useCallback((size) => {
    if (UI_SIZES[size]) {
      setUiSizeState(size);
      localStorage.setItem(STORAGE_KEY, size);
    }
  }, []);

  // Apply size on mount and when it changes
  useEffect(() => {
    applySize(uiSize);
  }, [uiSize, applySize]);

  const value = {
    uiSize,
    setUiSize,
    sizes: UI_SIZES,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

export default PreferencesContext;
