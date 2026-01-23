import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { themes, getThemeById, DEFAULT_THEME_ID } from '../config/themes';

const ThemeContext = createContext(null);

// Helper to convert HSL string to CSS-compatible format
const formatHSL = (hsl) => {
  if (!hsl) return '';
  // If already in correct format (e.g., "20 6% 12%"), return as-is
  if (!hsl.includes(',')) return hsl;
  // Convert "h, s%, l%" to "h s% l%"
  return hsl.replace(/,\s*/g, ' ');
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bookmark-app-theme');
      if (saved && getThemeById(saved)) {
        return saved;
      }
    }
    return DEFAULT_THEME_ID;
  });

  const currentTheme = getThemeById(currentThemeId) || getThemeById(DEFAULT_THEME_ID);

  // Apply theme CSS variables to document root
  const applyTheme = useCallback((theme) => {
    const root = document.documentElement;
    const { colors, fonts, glow, effects } = theme;

    // Core semantic colors (HSL format for Tailwind)
    root.style.setProperty('--background', formatHSL(colors.background));
    root.style.setProperty('--foreground', formatHSL(colors.foreground));
    root.style.setProperty('--card', formatHSL(colors.card));
    root.style.setProperty('--card-foreground', formatHSL(colors.cardForeground));
    root.style.setProperty('--popover', formatHSL(colors.popover));
    root.style.setProperty('--popover-foreground', formatHSL(colors.popoverForeground));
    root.style.setProperty('--primary', formatHSL(colors.primary));
    root.style.setProperty('--primary-foreground', formatHSL(colors.primaryForeground));
    root.style.setProperty('--secondary', formatHSL(colors.secondary));
    root.style.setProperty('--secondary-foreground', formatHSL(colors.secondaryForeground));
    root.style.setProperty('--muted', formatHSL(colors.muted));
    root.style.setProperty('--muted-foreground', formatHSL(colors.mutedForeground));
    root.style.setProperty('--accent', formatHSL(colors.accent));
    root.style.setProperty('--accent-foreground', formatHSL(colors.accentForeground));
    root.style.setProperty('--destructive', formatHSL(colors.destructive));
    root.style.setProperty('--destructive-foreground', formatHSL(colors.destructiveForeground));
    root.style.setProperty('--border', formatHSL(colors.border));
    root.style.setProperty('--input', formatHSL(colors.input));
    root.style.setProperty('--ring', formatHSL(colors.ring));

    // Extended theme colors (HEX format for direct use)
    root.style.setProperty('--theme-bg-darkest', colors.bgDarkest);
    root.style.setProperty('--theme-bg-dark', colors.bgDark);
    root.style.setProperty('--theme-bg', colors.bg);
    root.style.setProperty('--theme-bg-light', colors.bgLight);
    root.style.setProperty('--theme-bg-lighter', colors.bgLighter);
    root.style.setProperty('--theme-fg', colors.fg);
    root.style.setProperty('--theme-fg-light', colors.fgLight);
    root.style.setProperty('--theme-fg-muted', colors.fgMuted);

    // Accent colors
    root.style.setProperty('--theme-primary', colors.primaryHex);
    root.style.setProperty('--theme-primary-light', colors.primaryLightHex);
    root.style.setProperty('--theme-secondary', colors.secondaryHex);
    root.style.setProperty('--theme-secondary-light', colors.secondaryLightHex);
    root.style.setProperty('--theme-accent-1', colors.accent1);
    root.style.setProperty('--theme-accent-2', colors.accent2);
    root.style.setProperty('--theme-accent-3', colors.accent3);
    root.style.setProperty('--theme-accent-4', colors.accent4);

    // Glow effect colors
    root.style.setProperty('--glow-color', glow.color);
    root.style.setProperty('--glow-color-rgb', glow.colorRgb);
    root.style.setProperty('--glow-secondary', glow.secondary);
    root.style.setProperty('--glow-secondary-rgb', glow.secondaryRgb);
    root.style.setProperty('--glow-intensity', glow.intensity);

    // Mesh gradient colors
    root.style.setProperty('--mesh-color-1', effects.meshColor1);
    root.style.setProperty('--mesh-color-2', effects.meshColor2);
    root.style.setProperty('--mesh-color-3', effects.meshColor3);
    root.style.setProperty('--mesh-color-4', effects.meshColor4);
    root.style.setProperty('--mesh-color-5', effects.meshColor5);

    // Typography
    root.style.setProperty('--font-display', fonts.display);
    root.style.setProperty('--font-body', fonts.body);
    root.style.setProperty('--font-mono', fonts.mono);

    // Selection colors
    root.style.setProperty('--selection-bg', colors.selectionBg);
    root.style.setProperty('--selection-text', colors.selectionText);

    // Note card colors - use theme-specific noteCard colors if available, otherwise fall back
    const noteCard = theme.noteCard || {};
    root.style.setProperty('--note-bg', noteCard.bg || colors.bgLight);
    root.style.setProperty('--note-heading', noteCard.heading || colors.fg);
    root.style.setProperty('--note-text', noteCard.text || colors.fgMuted);
    root.style.setProperty('--note-accent', noteCard.accent || colors.primaryHex);
    root.style.setProperty('--note-divider', `${noteCard.accent || colors.primaryHex}25`);

    // Add theme class to body for CSS targeting
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .trim();
    document.body.classList.add(`theme-${theme.id}`);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.bgDarkest);
    }
  }, []);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(currentTheme);
    localStorage.setItem('bookmark-app-theme', currentThemeId);
  }, [currentThemeId, currentTheme, applyTheme]);

  // Set theme handler
  const setTheme = useCallback((themeId) => {
    if (getThemeById(themeId)) {
      setCurrentThemeId(themeId);
    }
  }, []);

  const value = {
    currentTheme,
    currentThemeId,
    setTheme,
    themes,
    availableThemes: Object.values(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
