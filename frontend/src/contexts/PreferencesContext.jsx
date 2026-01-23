import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================================================
// PREFERENCES CONTEXT
// Manages user preferences like UI size (separate from theme)
// ============================================================================

const PreferencesContext = createContext(null);

const STORAGE_KEY = 'bookmark-app-ui-size';
const FONT_SIZE_STORAGE_KEY = 'bookmark-app-font-size';
const NOTE_FONT_STORAGE_KEY = 'bookmark-app-note-font';
const DEFAULT_SIZE = 'large';
const DEFAULT_FONT_SIZE = 'default';
const DEFAULT_NOTE_FONT = 'excalifont';

// Note font presets
export const NOTE_FONTS = {
  excalifont: {
    id: 'excalifont',
    label: 'Excalifont',
    description: 'Handwritten style',
    fontFamily: "'Excalifont', 'Nunito', -apple-system, sans-serif",
    previewText: 'Handwritten notes',
  },
  nunito: {
    id: 'nunito',
    label: 'Nunito',
    description: 'Clean sans-serif',
    fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
    previewText: 'Clean modern text',
  },
  libreFranklin: {
    id: 'libreFranklin',
    label: 'Libre Franklin',
    description: 'Modern geometric',
    fontFamily: "'Libre Franklin', -apple-system, BlinkMacSystemFont, sans-serif",
    previewText: 'Modern geometric',
  },
  dmSans: {
    id: 'dmSans',
    label: 'DM Sans',
    description: 'Friendly geometric',
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    previewText: 'Friendly geometric',
  },
};

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

// Font size presets
export const FONT_SIZES = {
  small: {
    id: 'small',
    label: 'Small',
    description: 'Compact text for more content',
    scale: 0.875, // 14px base
  },
  default: {
    id: 'default',
    label: 'Default',
    description: 'Standard text size',
    scale: 1, // 16px base
  },
  large: {
    id: 'large',
    label: 'Large',
    description: 'Easier to read text',
    scale: 1.125, // 18px base
  },
};

export const PreferencesProvider = ({ children }) => {
  // Initialize UI size from localStorage
  const [uiSize, setUiSizeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && UI_SIZES[saved]) {
        return saved;
      }
    }
    return DEFAULT_SIZE;
  });

  // Initialize font size from localStorage
  const [fontSize, setFontSizeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (saved && FONT_SIZES[saved]) {
        return saved;
      }
    }
    return DEFAULT_FONT_SIZE;
  });

  // Initialize note font from localStorage
  const [noteFont, setNoteFontState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(NOTE_FONT_STORAGE_KEY);
      if (saved && NOTE_FONTS[saved]) {
        return saved;
      }
    }
    return DEFAULT_NOTE_FONT;
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

  // Apply font size to document root
  const applyFontSize = useCallback((size) => {
    const root = document.documentElement;
    const fontConfig = FONT_SIZES[size];

    // Remove all font size classes
    Object.keys(FONT_SIZES).forEach((sizeKey) => {
      root.classList.remove(`font-size-${sizeKey}`);
    });

    // Add current font size class
    root.classList.add(`font-size-${size}`);

    // Set CSS variable for font scale
    root.style.setProperty('--font-scale', fontConfig.scale);
  }, []);

  // Apply note font to document root
  const applyNoteFont = useCallback((fontId) => {
    const root = document.documentElement;
    const fontConfig = NOTE_FONTS[fontId];

    if (fontConfig) {
      root.style.setProperty('--note-font-family', fontConfig.fontFamily);
    }
  }, []);

  // Update size and persist
  const setUiSize = useCallback((size) => {
    if (UI_SIZES[size]) {
      setUiSizeState(size);
      localStorage.setItem(STORAGE_KEY, size);
    }
  }, []);

  // Update font size and persist
  const setFontSize = useCallback((size) => {
    if (FONT_SIZES[size]) {
      setFontSizeState(size);
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    }
  }, []);

  // Update note font and persist
  const setNoteFont = useCallback((fontId) => {
    if (NOTE_FONTS[fontId]) {
      setNoteFontState(fontId);
      localStorage.setItem(NOTE_FONT_STORAGE_KEY, fontId);
    }
  }, []);

  // Apply size on mount and when it changes
  useEffect(() => {
    applySize(uiSize);
  }, [uiSize, applySize]);

  // Apply font size on mount and when it changes
  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize, applyFontSize]);

  // Apply note font on mount and when it changes
  useEffect(() => {
    applyNoteFont(noteFont);
  }, [noteFont, applyNoteFont]);

  const value = {
    uiSize,
    setUiSize,
    sizes: UI_SIZES,
    fontSize,
    setFontSize,
    fontSizes: FONT_SIZES,
    noteFont,
    setNoteFont,
    noteFonts: NOTE_FONTS,
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
