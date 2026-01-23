/**
 * Complete Theme Configuration for Bookmark App
 * Each theme includes: colors, typography, glow effects, mesh gradients
 *
 * Color format notes:
 * - HSL values without 'hsl()' wrapper for Tailwind CSS variables (e.g., "20 6% 12%")
 * - HEX values for direct CSS usage
 * - RGB values for rgba() opacity variations
 */

const poppinsFonts = {
  display: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const themes = {
  // ============================================
  // GRUVBOX - Warm, retro, earthy (Current Default)
  // ============================================
  gruvbox: {
    id: 'gruvbox',
    name: 'Gruvbox',
    description: 'Warm retro vibes with earthy tones',
    category: 'classic',
    preview: {
      primary: '#d79921',
      secondary: '#fe8019',
      background: '#1d2021',
      accent: '#cc241d',
    },
    colors: {
      // Core semantic (HSL format)
      background: '20 6% 12%',
      foreground: '43 59% 81%',
      card: '20 8% 16%',
      cardForeground: '43 59% 81%',
      popover: '20 10% 20%',
      popoverForeground: '43 59% 81%',
      primary: '42 75% 49%',
      primaryForeground: '20 6% 12%',
      secondary: '20 10% 22%',
      secondaryForeground: '43 59% 81%',
      muted: '20 8% 18%',
      mutedForeground: '30 15% 60%',
      accent: '27 95% 53%',
      accentForeground: '20 6% 12%',
      destructive: '0 75% 45%',
      destructiveForeground: '43 59% 90%',
      border: '20 10% 25%',
      input: '20 8% 18%',
      ring: '42 75% 49%',
      // Extended colors (HEX)
      bgDarkest: '#1d2021',
      bgDark: '#282828',
      bg: '#32302f',
      bgLight: '#3c3836',
      bgLighter: '#504945',
      fg: '#ebdbb2',
      fgLight: '#fbf1c7',
      fgMuted: '#a89984',
      primaryHex: '#d79921',
      primaryLightHex: '#fabd2f',
      secondaryHex: '#d65d0e',
      secondaryLightHex: '#fe8019',
      accent1: '#cc241d',
      accent2: '#689d6a',
      accent3: '#b16286',
      accent4: '#458588',
      selectionBg: 'rgba(215, 153, 33, 0.3)',
      selectionText: '#fbf1c7',
    },
    fonts: poppinsFonts,
    glow: {
      color: '42 75% 49%',
      colorRgb: '215, 153, 33',
      secondary: '27 95% 53%',
      secondaryRgb: '254, 128, 25',
      intensity: '1',
    },
    effects: {
      meshColor1: 'rgba(204, 36, 29, 0.15)',
      meshColor2: 'rgba(177, 98, 134, 0.12)',
      meshColor3: 'rgba(104, 157, 106, 0.1)',
      meshColor4: 'rgba(254, 128, 25, 0.08)',
      meshColor5: 'rgba(40, 40, 40, 0.9)',
    },
    noteCard: {
      bg: '#3c3836',           // Warm sepia-brown
      text: '#a89984',         // Muted cream text
      heading: '#ebdbb2',      // Cream heading
      accent: '#d79921',       // Golden accent
    },
  },

  // ============================================
  // SYNTHWAVE - Neon cyberpunk 80s aesthetic
  // ============================================
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave',
    description: 'Neon-soaked 80s cyberpunk vibes',
    category: 'neon',
    preview: {
      primary: '#ff2975',
      secondary: '#00ffff',
      background: '#1a1a2e',
      accent: '#f222ff',
    },
    colors: {
      background: '240 33% 14%',
      foreground: '300 100% 95%',
      card: '240 30% 18%',
      cardForeground: '300 100% 95%',
      popover: '240 28% 22%',
      popoverForeground: '300 100% 95%',
      primary: '338 100% 58%',
      primaryForeground: '240 33% 10%',
      secondary: '180 100% 50%',
      secondaryForeground: '240 33% 10%',
      muted: '240 25% 20%',
      mutedForeground: '260 30% 65%',
      accent: '293 100% 57%',
      accentForeground: '240 33% 10%',
      destructive: '0 90% 60%',
      destructiveForeground: '0 0% 100%',
      border: '260 40% 30%',
      input: '240 25% 20%',
      ring: '338 100% 58%',
      bgDarkest: '#0f0f1a',
      bgDark: '#1a1a2e',
      bg: '#16213e',
      bgLight: '#1f2b4a',
      bgLighter: '#2a3a5c',
      fg: '#eee5ff',
      fgLight: '#ffffff',
      fgMuted: '#9d8cc2',
      primaryHex: '#ff2975',
      primaryLightHex: '#ff6b9d',
      secondaryHex: '#00ffff',
      secondaryLightHex: '#7fffff',
      accent1: '#f222ff',
      accent2: '#00ff88',
      accent3: '#ffff00',
      accent4: '#ff7f00',
      selectionBg: 'rgba(255, 41, 117, 0.4)',
      selectionText: '#ffffff',
    },
    fonts: poppinsFonts,
    glow: {
      color: '338 100% 58%',
      colorRgb: '255, 41, 117',
      secondary: '180 100% 50%',
      secondaryRgb: '0, 255, 255',
      intensity: '1.5',
    },
    effects: {
      meshColor1: 'rgba(255, 41, 117, 0.2)',
      meshColor2: 'rgba(0, 255, 255, 0.15)',
      meshColor3: 'rgba(242, 34, 255, 0.12)',
      meshColor4: 'rgba(0, 255, 136, 0.08)',
      meshColor5: 'rgba(26, 26, 46, 0.9)',
    },
    noteCard: {
      bg: '#2a3a5c',           // Deep purple-blue
      text: '#9d8cc2',         // Muted lavender
      heading: '#eee5ff',      // Soft white-pink
      accent: '#ff2975',       // Hot pink
    },
  },

  // ============================================
  // NORD - Cool, arctic-inspired blues
  // ============================================
  nord: {
    id: 'nord',
    name: 'Nord',
    description: 'Cool arctic blues inspired by polar nights',
    category: 'cool',
    preview: {
      primary: '#88c0d0',
      secondary: '#81a1c1',
      background: '#2e3440',
      accent: '#5e81ac',
    },
    colors: {
      background: '220 16% 22%',
      foreground: '218 27% 92%',
      card: '220 16% 26%',
      cardForeground: '218 27% 92%',
      popover: '220 16% 30%',
      popoverForeground: '218 27% 92%',
      primary: '193 43% 67%',
      primaryForeground: '220 16% 18%',
      secondary: '210 34% 63%',
      secondaryForeground: '220 16% 18%',
      muted: '220 16% 28%',
      mutedForeground: '219 28% 65%',
      accent: '213 32% 52%',
      accentForeground: '218 27% 94%',
      destructive: '354 42% 56%',
      destructiveForeground: '218 27% 94%',
      border: '220 16% 32%',
      input: '220 16% 28%',
      ring: '193 43% 67%',
      bgDarkest: '#242933',
      bgDark: '#2e3440',
      bg: '#3b4252',
      bgLight: '#434c5e',
      bgLighter: '#4c566a',
      fg: '#eceff4',
      fgLight: '#ffffff',
      fgMuted: '#8fbcbb',
      primaryHex: '#88c0d0',
      primaryLightHex: '#8fbcbb',
      secondaryHex: '#81a1c1',
      secondaryLightHex: '#88c0d0',
      accent1: '#bf616a',
      accent2: '#a3be8c',
      accent3: '#b48ead',
      accent4: '#ebcb8b',
      selectionBg: 'rgba(136, 192, 208, 0.3)',
      selectionText: '#eceff4',
    },
    fonts: poppinsFonts,
    glow: {
      color: '193 43% 67%',
      colorRgb: '136, 192, 208',
      secondary: '210 34% 63%',
      secondaryRgb: '129, 161, 193',
      intensity: '0.8',
    },
    effects: {
      meshColor1: 'rgba(136, 192, 208, 0.12)',
      meshColor2: 'rgba(129, 161, 193, 0.1)',
      meshColor3: 'rgba(94, 129, 172, 0.08)',
      meshColor4: 'rgba(143, 188, 187, 0.1)',
      meshColor5: 'rgba(46, 52, 64, 0.9)',
    },
    noteCard: {
      bg: '#434c5e',           // Slate blue
      text: '#8fbcbb',         // Soft teal
      heading: '#eceff4',      // Snow white
      accent: '#88c0d0',       // Ice blue
    },
  },

  // ============================================
  // DRACULA - Dark with vibrant purples and pinks
  // ============================================
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    description: 'Dark theme with vibrant purples and pinks',
    category: 'dark',
    preview: {
      primary: '#bd93f9',
      secondary: '#ff79c6',
      background: '#282a36',
      accent: '#50fa7b',
    },
    colors: {
      background: '231 15% 18%',
      foreground: '60 30% 96%',
      card: '232 14% 22%',
      cardForeground: '60 30% 96%',
      popover: '232 14% 26%',
      popoverForeground: '60 30% 96%',
      primary: '265 89% 78%',
      primaryForeground: '231 15% 15%',
      secondary: '326 100% 74%',
      secondaryForeground: '231 15% 15%',
      muted: '232 14% 24%',
      mutedForeground: '225 14% 60%',
      accent: '135 94% 65%',
      accentForeground: '231 15% 15%',
      destructive: '0 100% 67%',
      destructiveForeground: '60 30% 96%',
      border: '232 14% 28%',
      input: '232 14% 24%',
      ring: '265 89% 78%',
      bgDarkest: '#1e1f29',
      bgDark: '#282a36',
      bg: '#343746',
      bgLight: '#44475a',
      bgLighter: '#5a5e73',
      fg: '#f8f8f2',
      fgLight: '#ffffff',
      fgMuted: '#6272a4',
      primaryHex: '#bd93f9',
      primaryLightHex: '#d4b8ff',
      secondaryHex: '#ff79c6',
      secondaryLightHex: '#ff9ed8',
      accent1: '#50fa7b',
      accent2: '#ffb86c',
      accent3: '#8be9fd',
      accent4: '#f1fa8c',
      selectionBg: 'rgba(189, 147, 249, 0.4)',
      selectionText: '#f8f8f2',
    },
    fonts: poppinsFonts,
    glow: {
      color: '265 89% 78%',
      colorRgb: '189, 147, 249',
      secondary: '326 100% 74%',
      secondaryRgb: '255, 121, 198',
      intensity: '1.2',
    },
    effects: {
      meshColor1: 'rgba(189, 147, 249, 0.15)',
      meshColor2: 'rgba(255, 121, 198, 0.12)',
      meshColor3: 'rgba(80, 250, 123, 0.08)',
      meshColor4: 'rgba(139, 233, 253, 0.1)',
      meshColor5: 'rgba(40, 42, 54, 0.9)',
    },
    noteCard: {
      bg: '#44475a',           // Soft purple-gray
      text: '#6272a4',         // Muted blue
      heading: '#f8f8f2',      // Pure white
      accent: '#bd93f9',       // Lavender
    },
  },

  // ============================================
  // OCEAN - Deep sea blues and teals
  // ============================================
  ocean: {
    id: 'ocean',
    name: 'Ocean Depths',
    description: 'Deep sea blues with bioluminescent accents',
    category: 'nature',
    preview: {
      primary: '#00d9ff',
      secondary: '#0099cc',
      background: '#0a1628',
      accent: '#00ff9f',
    },
    colors: {
      background: '215 55% 10%',
      foreground: '195 100% 95%',
      card: '215 50% 14%',
      cardForeground: '195 100% 95%',
      popover: '215 45% 18%',
      popoverForeground: '195 100% 95%',
      primary: '190 100% 50%',
      primaryForeground: '215 55% 8%',
      secondary: '200 100% 40%',
      secondaryForeground: '195 100% 95%',
      muted: '215 40% 18%',
      mutedForeground: '195 50% 60%',
      accent: '157 100% 50%',
      accentForeground: '215 55% 8%',
      destructive: '0 85% 55%',
      destructiveForeground: '195 100% 95%',
      border: '215 40% 22%',
      input: '215 40% 18%',
      ring: '190 100% 50%',
      bgDarkest: '#050d18',
      bgDark: '#0a1628',
      bg: '#0f2038',
      bgLight: '#162a48',
      bgLighter: '#1e3558',
      fg: '#e0f7ff',
      fgLight: '#ffffff',
      fgMuted: '#5ea3b8',
      primaryHex: '#00d9ff',
      primaryLightHex: '#66e5ff',
      secondaryHex: '#0099cc',
      secondaryLightHex: '#33aadd',
      accent1: '#00ff9f',
      accent2: '#ff6b6b',
      accent3: '#ffd93d',
      accent4: '#c77dff',
      selectionBg: 'rgba(0, 217, 255, 0.35)',
      selectionText: '#ffffff',
    },
    fonts: poppinsFonts,
    glow: {
      color: '190 100% 50%',
      colorRgb: '0, 217, 255',
      secondary: '157 100% 50%',
      secondaryRgb: '0, 255, 159',
      intensity: '1.3',
    },
    effects: {
      meshColor1: 'rgba(0, 217, 255, 0.15)',
      meshColor2: 'rgba(0, 255, 159, 0.1)',
      meshColor3: 'rgba(0, 153, 204, 0.12)',
      meshColor4: 'rgba(199, 125, 255, 0.08)',
      meshColor5: 'rgba(10, 22, 40, 0.9)',
    },
    noteCard: {
      bg: '#162a48',           // Deep ocean
      text: '#5ea3b8',         // Teal muted
      heading: '#e0f7ff',      // Light cyan
      accent: '#00d9ff',       // Bright cyan
    },
  },

  // ============================================
  // FOREST - Deep greens and earthy browns
  // ============================================
  forest: {
    id: 'forest',
    name: 'Enchanted Forest',
    description: 'Deep woodland greens with golden firefly accents',
    category: 'nature',
    preview: {
      primary: '#7cb342',
      secondary: '#558b2f',
      background: '#1a2314',
      accent: '#ffc107',
    },
    colors: {
      background: '100 30% 11%',
      foreground: '75 40% 90%',
      card: '100 28% 15%',
      cardForeground: '75 40% 90%',
      popover: '100 25% 19%',
      popoverForeground: '75 40% 90%',
      primary: '88 48% 48%',
      primaryForeground: '100 30% 8%',
      secondary: '88 52% 36%',
      secondaryForeground: '75 40% 92%',
      muted: '100 22% 18%',
      mutedForeground: '80 25% 55%',
      accent: '45 100% 51%',
      accentForeground: '100 30% 8%',
      destructive: '0 70% 50%',
      destructiveForeground: '75 40% 92%',
      border: '100 20% 24%',
      input: '100 22% 18%',
      ring: '88 48% 48%',
      bgDarkest: '#0f1a0c',
      bgDark: '#1a2314',
      bg: '#243020',
      bgLight: '#2e3d28',
      bgLighter: '#3a4a32',
      fg: '#e8f5e0',
      fgLight: '#f5fff0',
      fgMuted: '#8ba67c',
      primaryHex: '#7cb342',
      primaryLightHex: '#9ccc65',
      secondaryHex: '#558b2f',
      secondaryLightHex: '#7cb342',
      accent1: '#ffc107',
      accent2: '#ff7043',
      accent3: '#ce93d8',
      accent4: '#4dd0e1',
      selectionBg: 'rgba(124, 179, 66, 0.35)',
      selectionText: '#f5fff0',
    },
    fonts: poppinsFonts,
    glow: {
      color: '88 48% 48%',
      colorRgb: '124, 179, 66',
      secondary: '45 100% 51%',
      secondaryRgb: '255, 193, 7',
      intensity: '0.9',
    },
    effects: {
      meshColor1: 'rgba(124, 179, 66, 0.12)',
      meshColor2: 'rgba(255, 193, 7, 0.1)',
      meshColor3: 'rgba(85, 139, 47, 0.15)',
      meshColor4: 'rgba(206, 147, 216, 0.06)',
      meshColor5: 'rgba(26, 35, 20, 0.9)',
    },
    noteCard: {
      bg: '#2e3d28',           // Deep forest green
      text: '#8ba67c',         // Muted sage
      heading: '#e8f5e0',      // Soft mint
      accent: '#7cb342',       // Leaf green
    },
  },

  // ============================================
  // SUNSET - Warm oranges, pinks, and purples
  // ============================================
  sunset: {
    id: 'sunset',
    name: 'Golden Sunset',
    description: 'Warm sunset gradients from gold to purple',
    category: 'warm',
    preview: {
      primary: '#ff9f43',
      secondary: '#ee5a6f',
      background: '#1f1420',
      accent: '#ffd32a',
    },
    colors: {
      background: '320 25% 11%',
      foreground: '30 100% 95%',
      card: '320 22% 15%',
      cardForeground: '30 100% 95%',
      popover: '320 20% 19%',
      popoverForeground: '30 100% 95%',
      primary: '28 100% 63%',
      primaryForeground: '320 25% 8%',
      secondary: '351 82% 64%',
      secondaryForeground: '320 25% 8%',
      muted: '320 18% 18%',
      mutedForeground: '20 40% 60%',
      accent: '48 100% 58%',
      accentForeground: '320 25% 8%',
      destructive: '0 85% 55%',
      destructiveForeground: '30 100% 95%',
      border: '320 18% 24%',
      input: '320 18% 18%',
      ring: '28 100% 63%',
      bgDarkest: '#140d14',
      bgDark: '#1f1420',
      bg: '#2a1c2a',
      bgLight: '#3a2838',
      bgLighter: '#4a3548',
      fg: '#fff5e6',
      fgLight: '#ffffff',
      fgMuted: '#b88a9c',
      primaryHex: '#ff9f43',
      primaryLightHex: '#ffbe76',
      secondaryHex: '#ee5a6f',
      secondaryLightHex: '#ff7f8f',
      accent1: '#ffd32a',
      accent2: '#a55eea',
      accent3: '#ff6b81',
      accent4: '#1dd1a1',
      selectionBg: 'rgba(255, 159, 67, 0.4)',
      selectionText: '#ffffff',
    },
    fonts: poppinsFonts,
    glow: {
      color: '28 100% 63%',
      colorRgb: '255, 159, 67',
      secondary: '351 82% 64%',
      secondaryRgb: '238, 90, 111',
      intensity: '1.1',
    },
    effects: {
      meshColor1: 'rgba(255, 159, 67, 0.18)',
      meshColor2: 'rgba(238, 90, 111, 0.15)',
      meshColor3: 'rgba(255, 211, 42, 0.1)',
      meshColor4: 'rgba(165, 94, 234, 0.08)',
      meshColor5: 'rgba(31, 20, 32, 0.9)',
    },
    noteCard: {
      bg: '#3a2838',           // Warm plum
      text: '#b88a9c',         // Dusty rose
      heading: '#fff5e6',      // Warm white
      accent: '#ff9f43',       // Sunset orange
    },
  },

  // ============================================
  // MINIMAL DARK - Clean, minimal monochrome
  // ============================================
  minimalDark: {
    id: 'minimalDark',
    name: 'Minimal Dark',
    description: 'Clean monochrome with subtle blue accents',
    category: 'minimal',
    preview: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      background: '#111111',
      accent: '#22d3ee',
    },
    colors: {
      background: '0 0% 7%',
      foreground: '0 0% 95%',
      card: '0 0% 10%',
      cardForeground: '0 0% 95%',
      popover: '0 0% 13%',
      popoverForeground: '0 0% 95%',
      primary: '239 84% 67%',
      primaryForeground: '0 0% 100%',
      secondary: '263 70% 66%',
      secondaryForeground: '0 0% 100%',
      muted: '0 0% 15%',
      mutedForeground: '0 0% 55%',
      accent: '186 94% 50%',
      accentForeground: '0 0% 5%',
      destructive: '0 72% 51%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 18%',
      input: '0 0% 15%',
      ring: '239 84% 67%',
      bgDarkest: '#0a0a0a',
      bgDark: '#111111',
      bg: '#171717',
      bgLight: '#1f1f1f',
      bgLighter: '#2a2a2a',
      fg: '#f5f5f5',
      fgLight: '#ffffff',
      fgMuted: '#888888',
      primaryHex: '#6366f1',
      primaryLightHex: '#818cf8',
      secondaryHex: '#8b5cf6',
      secondaryLightHex: '#a78bfa',
      accent1: '#22d3ee',
      accent2: '#f472b6',
      accent3: '#4ade80',
      accent4: '#fb923c',
      selectionBg: 'rgba(99, 102, 241, 0.35)',
      selectionText: '#ffffff',
    },
    fonts: poppinsFonts,
    glow: {
      color: '239 84% 67%',
      colorRgb: '99, 102, 241',
      secondary: '186 94% 50%',
      secondaryRgb: '34, 211, 238',
      intensity: '0.7',
    },
    effects: {
      meshColor1: 'rgba(99, 102, 241, 0.08)',
      meshColor2: 'rgba(139, 92, 246, 0.06)',
      meshColor3: 'rgba(34, 211, 238, 0.05)',
      meshColor4: 'rgba(244, 114, 182, 0.04)',
      meshColor5: 'rgba(17, 17, 17, 0.95)',
    },
    noteCard: {
      bg: '#1f1f1f',           // Clean dark gray
      text: '#888888',         // Neutral gray
      heading: '#f5f5f5',      // Off-white
      accent: '#6366f1',       // Indigo
    },
  },

  // ============================================
  // ROSE GOLD - Elegant pinks and golds
  // ============================================
  roseGold: {
    id: 'roseGold',
    name: 'Rose Gold',
    description: 'Elegant blush pinks with golden highlights',
    category: 'elegant',
    preview: {
      primary: '#e8b4b8',
      secondary: '#d4a574',
      background: '#1c1618',
      accent: '#ffd700',
    },
    colors: {
      background: '350 15% 10%',
      foreground: '350 40% 95%',
      card: '350 12% 14%',
      cardForeground: '350 40% 95%',
      popover: '350 10% 18%',
      popoverForeground: '350 40% 95%',
      primary: '355 52% 81%',
      primaryForeground: '350 15% 8%',
      secondary: '30 45% 64%',
      secondaryForeground: '350 15% 8%',
      muted: '350 10% 17%',
      mutedForeground: '350 20% 55%',
      accent: '51 100% 50%',
      accentForeground: '350 15% 8%',
      destructive: '0 72% 51%',
      destructiveForeground: '350 40% 95%',
      border: '350 10% 22%',
      input: '350 10% 17%',
      ring: '355 52% 81%',
      bgDarkest: '#140f11',
      bgDark: '#1c1618',
      bg: '#261e20',
      bgLight: '#322828',
      bgLighter: '#3e3232',
      fg: '#faf0f2',
      fgLight: '#ffffff',
      fgMuted: '#b8989c',
      primaryHex: '#e8b4b8',
      primaryLightHex: '#f5d0d3',
      secondaryHex: '#d4a574',
      secondaryLightHex: '#e5c4a5',
      accent1: '#ffd700',
      accent2: '#ff6b9d',
      accent3: '#7c9eb8',
      accent4: '#a8e6cf',
      selectionBg: 'rgba(232, 180, 184, 0.35)',
      selectionText: '#ffffff',
    },
    fonts: poppinsFonts,
    glow: {
      color: '355 52% 81%',
      colorRgb: '232, 180, 184',
      secondary: '51 100% 50%',
      secondaryRgb: '255, 215, 0',
      intensity: '0.85',
    },
    effects: {
      meshColor1: 'rgba(232, 180, 184, 0.12)',
      meshColor2: 'rgba(255, 215, 0, 0.08)',
      meshColor3: 'rgba(212, 165, 116, 0.1)',
      meshColor4: 'rgba(255, 107, 157, 0.06)',
      meshColor5: 'rgba(28, 22, 24, 0.9)',
    },
    noteCard: {
      bg: '#322828',           // Warm mauve
      text: '#b8989c',         // Dusty pink
      heading: '#faf0f2',      // Blush white
      accent: '#e8b4b8',       // Rose
    },
  },

  // ============================================
  // COFFEE - Warm browns and creams
  // ============================================
  coffee: {
    id: 'coffee',
    name: 'Coffee House',
    description: 'Rich espresso browns with creamy highlights',
    category: 'warm',
    preview: {
      primary: '#c4a77d',
      secondary: '#8b6914',
      background: '#1a1512',
      accent: '#e6d5b8',
    },
    colors: {
      background: '25 20% 8%',
      foreground: '35 50% 90%',
      card: '25 18% 12%',
      cardForeground: '35 50% 90%',
      popover: '25 15% 16%',
      popoverForeground: '35 50% 90%',
      primary: '36 35% 63%',
      primaryForeground: '25 20% 6%',
      secondary: '42 75% 31%',
      secondaryForeground: '35 50% 92%',
      muted: '25 15% 15%',
      mutedForeground: '30 25% 50%',
      accent: '38 50% 81%',
      accentForeground: '25 20% 6%',
      destructive: '0 65% 45%',
      destructiveForeground: '35 50% 92%',
      border: '25 15% 20%',
      input: '25 15% 15%',
      ring: '36 35% 63%',
      bgDarkest: '#120e0b',
      bgDark: '#1a1512',
      bg: '#241e1a',
      bgLight: '#2e2620',
      bgLighter: '#3a302a',
      fg: '#f5ebe0',
      fgLight: '#fffaf5',
      fgMuted: '#9a8778',
      primaryHex: '#c4a77d',
      primaryLightHex: '#d4bc98',
      secondaryHex: '#8b6914',
      secondaryLightHex: '#a88520',
      accent1: '#e6d5b8',
      accent2: '#d4a574',
      accent3: '#8fbc8f',
      accent4: '#cd853f',
      selectionBg: 'rgba(196, 167, 125, 0.35)',
      selectionText: '#fffaf5',
    },
    fonts: poppinsFonts,
    glow: {
      color: '36 35% 63%',
      colorRgb: '196, 167, 125',
      secondary: '38 50% 81%',
      secondaryRgb: '230, 213, 184',
      intensity: '0.75',
    },
    effects: {
      meshColor1: 'rgba(196, 167, 125, 0.1)',
      meshColor2: 'rgba(230, 213, 184, 0.08)',
      meshColor3: 'rgba(139, 105, 20, 0.12)',
      meshColor4: 'rgba(212, 165, 116, 0.06)',
      meshColor5: 'rgba(26, 21, 18, 0.92)',
    },
    noteCard: {
      bg: '#2e2620',           // Espresso brown
      text: '#9a8778',         // Mocha
      heading: '#f5ebe0',      // Cream
      accent: '#c4a77d',       // Caramel
    },
  },

  // ============================================
  // MIDNIGHT - Deep purples and blues
  // ============================================
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep starlit purples with cosmic accents',
    category: 'dark',
    preview: {
      primary: '#9d4edd',
      secondary: '#7b2cbf',
      background: '#10002b',
      accent: '#e0aaff',
    },
    colors: {
      background: '270 100% 8%',
      foreground: '270 80% 95%',
      card: '270 60% 12%',
      cardForeground: '270 80% 95%',
      popover: '270 50% 16%',
      popoverForeground: '270 80% 95%',
      primary: '276 72% 59%',
      primaryForeground: '270 100% 5%',
      secondary: '276 65% 46%',
      secondaryForeground: '270 80% 95%',
      muted: '270 40% 15%',
      mutedForeground: '270 30% 55%',
      accent: '276 100% 83%',
      accentForeground: '270 100% 5%',
      destructive: '350 85% 55%',
      destructiveForeground: '270 80% 95%',
      border: '270 40% 20%',
      input: '270 40% 15%',
      ring: '276 72% 59%',
      bgDarkest: '#0a001a',
      bgDark: '#10002b',
      bg: '#1a0038',
      bgLight: '#240046',
      bgLighter: '#3c096c',
      fg: '#f5e6ff',
      fgLight: '#ffffff',
      fgMuted: '#9d8ec2',
      primaryHex: '#9d4edd',
      primaryLightHex: '#c77dff',
      secondaryHex: '#7b2cbf',
      secondaryLightHex: '#9d4edd',
      accent1: '#e0aaff',
      accent2: '#ff6b9d',
      accent3: '#5eead4',
      accent4: '#fbbf24',
      selectionBg: 'rgba(157, 78, 221, 0.4)',
      selectionText: '#ffffff',
    },
    fonts: poppinsFonts,
    glow: {
      color: '276 72% 59%',
      colorRgb: '157, 78, 221',
      secondary: '276 100% 83%',
      secondaryRgb: '224, 170, 255',
      intensity: '1.3',
    },
    effects: {
      meshColor1: 'rgba(157, 78, 221, 0.18)',
      meshColor2: 'rgba(224, 170, 255, 0.12)',
      meshColor3: 'rgba(123, 44, 191, 0.15)',
      meshColor4: 'rgba(94, 234, 212, 0.06)',
      meshColor5: 'rgba(16, 0, 43, 0.9)',
    },
    noteCard: {
      bg: '#240046',           // Deep violet
      text: '#9d8ec2',         // Lavender mist
      heading: '#f5e6ff',      // Soft white
      accent: '#9d4edd',       // Bright purple
    },
  },

  // ============================================
  // NOVA RED DARK - Exact shadcn Nova preset (Dark Mode)
  // Colors from: oklch values converted to HSL
  // ============================================
  novaRedDark: {
    id: 'novaRedDark',
    name: 'Nova Red Dark',
    description: 'Shadcn Nova dark with red accent - pure neutrals',
    category: 'nova',
    preview: {
      primary: '#e04d30',
      secondary: '#454045',
      background: '#252525',
      accent: '#5f5f5f',
    },
    colors: {
      // Core semantic (HSL format) - Exact shadcn Nova Red dark theme OKLCH→HSL
      // background: oklch(0.145 0 0) → pure neutral
      background: '0 0% 15%',
      // foreground: oklch(0.985 0 0)
      foreground: '0 0% 98%',
      // card: oklch(0.205 0 0)
      card: '0 0% 21%',
      cardForeground: '0 0% 98%',
      // popover: oklch(0.205 0 0)
      popover: '0 0% 21%',
      popoverForeground: '0 0% 98%',
      // primary: oklch(0.637 0.237 25.331) → red-orange ~hue 12
      primary: '12 70% 53%',
      primaryForeground: '12 10% 97%',
      // secondary: oklch(0.274 0.006 286.033) → dark neutral with very slight purple
      secondary: '286 5% 27%',
      secondaryForeground: '0 0% 98%',
      // muted: oklch(0.269 0 0)
      muted: '0 0% 27%',
      // muted-foreground: oklch(0.708 0 0)
      mutedForeground: '0 0% 71%',
      // accent: oklch(0.371 0 0)
      accent: '0 0% 37%',
      accentForeground: '0 0% 98%',
      // destructive: oklch(0.704 0.191 22.216)
      destructive: '12 65% 58%',
      destructiveForeground: '12 10% 97%',
      // border: oklch(1 0 0 / 10%) → white at 10%
      border: '0 0% 25%',
      // input: oklch(1 0 0 / 15%)
      input: '0 0% 28%',
      // ring: oklch(0.556 0 0)
      ring: '0 0% 56%',
      // Extended colors (HEX) - Pure neutrals only
      bgDarkest: '#1a1a1a',
      bgDark: '#252525',
      bg: '#343434',
      bgLight: '#454545',
      bgLighter: '#5f5f5f',
      fg: '#fafafa',
      fgLight: '#ffffff',
      fgMuted: '#b5b5b5',
      // Primary red from oklch(0.637 0.237 25.331)
      primaryHex: '#e04d30',
      primaryLightHex: '#e8634a',
      // Secondary is neutral gray
      secondaryHex: '#454045',
      secondaryLightHex: '#5a555a',
      // All accents use the same red or neutral - no yellow
      accent1: '#e04d30',
      accent2: '#e8634a',
      accent3: '#b5b5b5',
      accent4: '#8a8a8a',
      selectionBg: 'rgba(224, 77, 48, 0.35)',
      selectionText: '#ffffff',
    },
    fonts: poppinsFonts,
    glow: {
      // Primary red glow only
      color: '12 70% 53%',
      colorRgb: '224, 77, 48',
      secondary: '12 65% 58%',
      secondaryRgb: '232, 99, 74',
      intensity: '0.6',
    },
    effects: {
      // Minimal mesh - just subtle red tint, no gradients
      meshColor1: 'rgba(224, 77, 48, 0.04)',
      meshColor2: 'rgba(224, 77, 48, 0.02)',
      meshColor3: 'rgba(90, 90, 90, 0.03)',
      meshColor4: 'rgba(90, 90, 90, 0.02)',
      meshColor5: 'rgba(37, 37, 37, 0.98)',
    },
    noteCard: {
      bg: '#343434',           // Neutral dark
      text: '#b5b5b5',         // Light gray
      heading: '#fafafa',      // Pure white
      accent: '#e04d30',       // Red accent
    },
  },

  // ============================================
  // NOVA RED LIGHT - Exact shadcn Nova preset (Light Mode)
  // Colors from: oklch values converted to HSL
  // ============================================
  novaRedLight: {
    id: 'novaRedLight',
    name: 'Nova Red Light',
    description: 'Shadcn Nova light with red accent - pure neutrals',
    category: 'nova',
    preview: {
      primary: '#c84528',
      secondary: '#f7f7f7',
      background: '#ffffff',
      accent: '#f7f7f7',
    },
    colors: {
      // Core semantic (HSL format) - Exact shadcn Nova Red light theme OKLCH→HSL
      // background: oklch(1 0 0)
      background: '0 0% 100%',
      // foreground: oklch(0.145 0 0)
      foreground: '0 0% 15%',
      // card: oklch(1 0 0)
      card: '0 0% 100%',
      cardForeground: '0 0% 15%',
      // popover: oklch(1 0 0)
      popover: '0 0% 100%',
      popoverForeground: '0 0% 15%',
      // primary: oklch(0.577 0.245 27.325) → red-orange ~hue 12
      primary: '12 76% 47%',
      primaryForeground: '12 8% 97%',
      // secondary: oklch(0.967 0.001 286.375) → near white
      secondary: '286 2% 97%',
      secondaryForeground: '286 5% 21%',
      // muted: oklch(0.97 0 0)
      muted: '0 0% 97%',
      // muted-foreground: oklch(0.556 0 0)
      mutedForeground: '0 0% 56%',
      // accent: oklch(0.97 0 0)
      accent: '0 0% 97%',
      accentForeground: '0 0% 21%',
      // destructive: oklch(0.58 0.22 27)
      destructive: '12 76% 47%',
      destructiveForeground: '12 8% 97%',
      // border: oklch(0.922 0 0)
      border: '0 0% 92%',
      // input: oklch(0.922 0 0)
      input: '0 0% 92%',
      // ring: oklch(0.708 0 0)
      ring: '0 0% 71%',
      // Extended colors (HEX) - Pure neutrals, light mode inverted
      bgDarkest: '#ebebeb',
      bgDark: '#f5f5f5',
      bg: '#fafafa',
      bgLight: '#ffffff',
      bgLighter: '#ffffff',
      fg: '#252525',
      fgLight: '#1a1a1a',
      fgMuted: '#8f8f8f',
      // Primary red from oklch(0.577 0.245 27.325)
      primaryHex: '#c84528',
      primaryLightHex: '#d95c3f',
      // Secondary is neutral
      secondaryHex: '#f7f7f7',
      secondaryLightHex: '#fafafa',
      // All accents use the same red or neutral - no yellow
      accent1: '#c84528',
      accent2: '#d95c3f',
      accent3: '#8f8f8f',
      accent4: '#c5c5c5',
      selectionBg: 'rgba(200, 69, 40, 0.2)',
      selectionText: '#1a1a1a',
    },
    fonts: poppinsFonts,
    glow: {
      // Minimal glow for light theme
      color: '12 76% 47%',
      colorRgb: '200, 69, 40',
      secondary: '12 70% 55%',
      secondaryRgb: '217, 92, 63',
      intensity: '0.3',
    },
    effects: {
      // Very minimal mesh for light theme - almost no effect
      meshColor1: 'rgba(200, 69, 40, 0.02)',
      meshColor2: 'rgba(200, 69, 40, 0.01)',
      meshColor3: 'rgba(143, 143, 143, 0.02)',
      meshColor4: 'rgba(143, 143, 143, 0.01)',
      meshColor5: 'rgba(255, 255, 255, 0.99)',
    },
    noteCard: {
      bg: '#f7f7f7',           // Soft white
      text: '#8f8f8f',         // Gray
      heading: '#252525',      // Dark text
      accent: '#c84528',       // Red accent
    },
  },

  // ============================================
  // ZEN - Calm midnight blues with soft lavender accents
  // Designed for focus, tranquility, and comfortable extended use
  // ============================================
  zen: {
    id: 'zen',
    name: 'Zen',
    description: 'Calm midnight depths with soft lavender accents',
    category: 'zen',
    preview: {
      primary: '#a5b4fc',
      secondary: '#67e8f9',
      background: '#0a0f1a',
      accent: '#c4b5fd',
    },
    colors: {
      // Core semantic (HSL format)
      // Deep midnight blue background - not pure black, adds depth and warmth
      background: '222 47% 5%',
      foreground: '214 32% 91%',
      card: '222 39% 8%',
      cardForeground: '214 32% 91%',
      popover: '222 35% 10%',
      popoverForeground: '214 32% 91%',
      // Primary: Soft indigo/lavender - Digital Lavender for calm tech
      primary: '229 84% 81%',
      primaryForeground: '222 47% 8%',
      // Secondary: Calm slate blue-gray
      secondary: '222 30% 14%',
      secondaryForeground: '214 32% 91%',
      muted: '222 28% 12%',
      mutedForeground: '215 20% 55%',
      // Accent: Soft cyan-teal for interactive elements
      accent: '183 74% 69%',
      accentForeground: '222 47% 8%',
      destructive: '0 62% 55%',
      destructiveForeground: '214 32% 95%',
      border: '222 25% 16%',
      input: '222 28% 12%',
      ring: '229 84% 81%',
      // Extended colors (HEX) - Carefully calibrated midnight palette
      bgDarkest: '#020617',    // Almost black with subtle blue
      bgDark: '#0a0f1a',       // Deep midnight
      bg: '#0f172a',           // Slate 950 - main surface
      bgLight: '#1e293b',      // Slate 800 - elevated surfaces
      bgLighter: '#334155',    // Slate 700 - highest elevation
      fg: '#e2e8f0',           // Slate 200 - primary text (soft, not harsh)
      fgLight: '#f1f5f9',      // Slate 100 - emphasized text
      fgMuted: '#94a3b8',      // Slate 400 - secondary text
      // Primary: Digital Lavender - calming, modern
      primaryHex: '#a5b4fc',   // Indigo 300
      primaryLightHex: '#c7d2fe', // Indigo 200
      // Secondary: Soft teal - water-inspired calm
      secondaryHex: '#67e8f9', // Cyan 300
      secondaryLightHex: '#a5f3fc', // Cyan 200
      // Accents: All muted, harmonious pastels
      accent1: '#c4b5fd',      // Violet 300 - soft purple
      accent2: '#86efac',      // Green 300 - soft mint
      accent3: '#fcd34d',      // Amber 300 - soft gold (sparingly)
      accent4: '#f0abfc',      // Fuchsia 300 - soft pink
      selectionBg: 'rgba(165, 180, 252, 0.25)',
      selectionText: '#f1f5f9',
    },
    fonts: poppinsFonts,
    glow: {
      // Very subtle, diffused glow - not attention-grabbing
      color: '229 84% 81%',
      colorRgb: '165, 180, 252',
      secondary: '183 74% 69%',
      secondaryRgb: '103, 232, 249',
      intensity: '0.4',
    },
    effects: {
      // Extremely subtle mesh - adds depth without distraction
      meshColor1: 'rgba(165, 180, 252, 0.04)',  // Soft lavender
      meshColor2: 'rgba(103, 232, 249, 0.03)',  // Soft cyan
      meshColor3: 'rgba(196, 181, 253, 0.025)', // Soft violet
      meshColor4: 'rgba(134, 239, 172, 0.02)',  // Soft mint
      meshColor5: 'rgba(10, 15, 26, 0.97)',     // Deep midnight overlay
    },
    noteCard: {
      bg: '#1e293b',           // Slate blue
      text: '#94a3b8',         // Soft slate
      heading: '#e2e8f0',      // Light slate
      accent: '#a5b4fc',       // Lavender
    },
  },

  // ============================================
  // STRATA - Soft neutral layers
  // ============================================
  strata: {
    id: 'strata',
    name: 'Strata',
    description: 'Layered limestone neutrals with soft contrast',
    category: 'elegant',
    preview: {
      primary: '#b0a89c',
      secondary: '#c3baac',
      background: '#edece8',
      accent: '#b0a89c',
    },
    colors: {
      background: '0 0% 100%',
      foreground: '34 11% 25%',
      card: '48 12% 92%',
      cardForeground: '34 11% 25%',
      popover: '48 12% 92%',
      popoverForeground: '34 11% 25%',
      primary: '36 11% 65%',
      primaryForeground: '34 11% 25%',
      secondary: '37 16% 72%',
      secondaryForeground: '34 11% 25%',
      muted: '48 12% 92%',
      mutedForeground: '35 11% 50%',
      accent: '37 16% 72%',
      accentForeground: '34 11% 25%',
      destructive: '12 35% 53%',
      destructiveForeground: '0 0% 98%',
      border: '37 16% 72%',
      input: '48 12% 92%',
      ring: '36 11% 65%',
      bgDarkest: '#b0a89c',
      bgDark: '#c3baac',
      bg: '#edece8',
      bgLight: '#ffffff',
      bgLighter: '#ffffff',
      fg: '#474139',
      fgLight: '#39342d',
      fgMuted: '#8e8271',
      primaryHex: '#b0a89c',
      primaryLightHex: '#c3baac',
      secondaryHex: '#c3baac',
      secondaryLightHex: '#edece8',
      accent1: '#b0a89c',
      accent2: '#c3baac',
      accent3: '#edece8',
      accent4: '#8e8271',
      selectionBg: 'rgba(176, 168, 156, 0.35)',
      selectionText: '#39342d',
    },
    fonts: poppinsFonts,
    glow: {
      color: '36 11% 65%',
      colorRgb: '176, 168, 156',
      secondary: '37 16% 72%',
      secondaryRgb: '195, 186, 172',
      intensity: '0.35',
    },
    effects: {
      meshColor1: 'rgba(176, 168, 156, 0.08)',
      meshColor2: 'rgba(195, 186, 172, 0.06)',
      meshColor3: 'rgba(237, 236, 232, 0.5)',
      meshColor4: 'rgba(255, 255, 255, 0.6)',
      meshColor5: 'rgba(255, 255, 255, 0.95)',
    },
    noteCard: {
      bg: '#edece8',           // Warm off-white
      text: '#8e8271',         // Taupe
      heading: '#474139',      // Dark brown
      accent: '#b0a89c',       // Stone
    },
  },

  // ============================================
  // DRACULA SOFT - Modern, calm Dracula with softer backgrounds
  // Lighter blacks, muted accents, minimalist feel
  // ============================================
  draculaSoft: {
    id: 'draculaSoft',
    name: 'Dracula Soft',
    description: 'Modern calm dark with soft purple undertones',
    category: 'zen',
    preview: {
      primary: '#bd93f9',
      secondary: '#ff79c6',
      background: '#0f0f10',
      accent: '#50fa7b',
    },
    colors: {
      // Core semantic (HSL format)
      // Neutral dark - dark background, subtle card blend
      background: '240 2% 6%',
      foreground: '60 30% 96%',
      card: '240 2% 8%',
      cardForeground: '60 30% 96%',
      popover: '240 2% 9%',
      popoverForeground: '60 30% 96%',
      // Primary: Vibrant lavender-purple
      primary: '265 70% 72%',
      primaryForeground: '240 2% 5%',
      // Secondary: Neutral dark
      secondary: '240 2% 9%',
      secondaryForeground: '60 30% 96%',
      muted: '240 2% 8%',
      mutedForeground: '240 3% 45%',
      // Accent: Bright Dracula green
      accent: '135 70% 60%',
      accentForeground: '240 2% 5%',
      destructive: '0 65% 58%',
      destructiveForeground: '60 30% 96%',
      border: '240 3% 14%',
      input: '240 2% 8%',
      ring: '265 70% 72%',
      // Extended colors (HEX) - Dark with subtle elevation
      bgDarkest: '#0a0a0b',      // Near black
      bgDark: '#0f0f10',         // Main background - dark
      bg: '#131314',             // Elevated surface
      bgLight: '#171718',        // Cards - subtle step up
      bgLighter: '#1c1c1d',      // Highest elevation
      fg: '#f8f8f2',             // Dracula foreground
      fgLight: '#ffffff',
      fgMuted: '#6a7290',        // Muted text
      // Primary: Bright Dracula purple
      primaryHex: '#bd93f9',
      primaryLightHex: '#d4b8ff',
      // Secondary: Bright Dracula pink
      secondaryHex: '#ff79c6',
      secondaryLightHex: '#ff9ed8',
      // Accents: Vibrant Dracula colors for pills
      accent1: '#50fa7b',        // Bright green
      accent2: '#ffb86c',        // Bright orange
      accent3: '#8be9fd',        // Bright cyan
      accent4: '#f1fa8c',        // Bright yellow
      selectionBg: 'rgba(180, 167, 214, 0.25)',
      selectionText: '#f8f8f2',
    },
    fonts: poppinsFonts,
    glow: {
      // Subtle glow with Dracula purple
      color: '265 89% 78%',
      colorRgb: '189, 147, 249',
      secondary: '326 100% 74%',
      secondaryRgb: '255, 121, 198',
      intensity: '0.5',
    },
    effects: {
      // Very subtle mesh - dark with hint of Dracula colors
      meshColor1: 'rgba(189, 147, 249, 0.02)',  // Purple
      meshColor2: 'rgba(255, 121, 198, 0.015)', // Pink
      meshColor3: 'rgba(80, 250, 123, 0.01)',   // Green
      meshColor4: 'rgba(139, 233, 253, 0.01)',  // Cyan
      meshColor5: 'rgba(10, 10, 11, 0.99)',     // Near black
    },
    noteCard: {
      bg: '#171718',           // Near black
      text: '#6a7290',         // Muted slate
      heading: '#f8f8f2',      // Soft white
      accent: '#bd93f9',       // Lavender
    },
  },

  // ============================================
  // MYMIND - Deep blue-gray with coral accents
  // Inspired by mymind.com's elegant dark design
  // ============================================
  mymind: {
    id: 'mymind',
    name: 'MyMind',
    description: 'Deep blue-gray with warm coral accents',
    category: 'zen',
    preview: {
      primary: '#e8594f',
      secondary: '#ff7a6b',
      background: '#1a1f2e',
      accent: '#4ade80',
    },
    colors: {
      // Core semantic (HSL format)
      // Deep blue-gray background - the signature MyMind look
      background: '222 20% 13%',
      foreground: '210 20% 90%',
      card: '222 18% 15%',
      cardForeground: '210 20% 90%',
      popover: '222 18% 17%',
      popoverForeground: '210 20% 90%',
      // Primary: Warm coral - distinctive accent
      primary: '14 80% 55%',
      primaryForeground: '0 0% 100%',
      // Secondary: Muted blue-gray for surfaces
      secondary: '222 15% 22%',
      secondaryForeground: '210 20% 90%',
      muted: '222 15% 20%',
      mutedForeground: '220 15% 55%',
      // Accent: Coral variants
      accent: '14 80% 55%',
      accentForeground: '0 0% 100%',
      destructive: '0 75% 50%',
      destructiveForeground: '0 0% 100%',
      border: '222 15% 20%',
      input: '222 15% 20%',
      ring: '14 80% 55%',
      // Extended colors (HEX) - MyMind palette
      bgDarkest: '#141820',      // Deepest blue-gray
      bgDark: '#1a1f2e',         // Main background
      bg: '#1e2433',             // Elevated surface
      bgLight: '#2a3142',        // Higher elevation
      bgLighter: '#3a4255',      // Highest elevation
      fg: '#e8eaf0',             // Primary text
      fgLight: '#f5f6f8',        // Bright text
      fgMuted: '#8a9aad',        // Secondary text
      // Primary: Coral accent
      primaryHex: '#e8594f',
      primaryLightHex: '#ff6f61',
      // Secondary: Light coral
      secondaryHex: '#ff7a6b',
      secondaryLightHex: '#ff8f82',
      // Accents: Soft complementary colors
      accent1: '#ef4444',        // Red
      accent2: '#4ade80',        // Soft green
      accent3: '#a78bfa',        // Soft purple
      accent4: '#38bdf8',        // Soft cyan
      selectionBg: 'rgba(232, 89, 79, 0.3)',
      selectionText: '#f5f6f8',
    },
    fonts: poppinsFonts,
    glow: {
      // Subtle coral glow
      color: '14 80% 55%',
      colorRgb: '232, 89, 79',
      secondary: '14 100% 70%',
      secondaryRgb: '255, 111, 97',
      intensity: '0.5',
    },
    effects: {
      // Very subtle mesh - adds depth without distraction
      meshColor1: 'rgba(232, 89, 79, 0.03)',   // Coral
      meshColor2: 'rgba(167, 139, 250, 0.02)', // Violet
      meshColor3: 'rgba(56, 189, 248, 0.02)',  // Cyan
      meshColor4: 'rgba(74, 222, 128, 0.015)', // Green
      meshColor5: 'rgba(20, 24, 32, 0.97)',    // Deep blue overlay
    },
    noteCard: {
      bg: '#2a3142',           // Deep blue-gray
      text: '#8a9aad',         // Muted blue
      heading: '#e8eaf0',      // Soft white
      accent: '#e8594f',       // Coral
    },
  },
};

// Theme categories for filtering in settings
export const themeCategories = [
  { id: 'all', label: 'All Themes' },
  { id: 'zen', label: 'Zen & Calm' },
  { id: 'classic', label: 'Classic' },
  { id: 'neon', label: 'Neon & Cyberpunk' },
  { id: 'nature', label: 'Nature' },
  { id: 'warm', label: 'Warm Tones' },
  { id: 'cool', label: 'Cool Tones' },
  { id: 'dark', label: 'Dark' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'nova', label: 'Nova' },
];

// Default theme ID
export const DEFAULT_THEME_ID = 'mymind';

// Helper to get theme by ID
export const getThemeById = (id) => themes[id] || null;

// Helper to get all themes as array
export const getAllThemes = () => Object.values(themes);

// Helper to get themes by category
export const getThemesByCategory = (category) => {
  if (category === 'all') return getAllThemes();
  return getAllThemes().filter(theme => theme.category === category);
};

export default themes;
