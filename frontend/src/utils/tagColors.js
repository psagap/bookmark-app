/**
 * Shared tag color utility - ensures consistent colors across the entire app
 *
 * This is the SINGLE SOURCE OF TRUTH for tag colors.
 * Use this utility everywhere tags are displayed:
 * - Navigation bar tag panel
 * - Filter indicator pills
 * - Bookmark card metadata
 * - Bookmark detail view
 */

// Modern minimal color palette for tags
// Muted, low-contrast colors inspired by Linear/Notion
const TAG_COLORS = [
    {
        id: 'yellow',
        bg: 'rgba(250, 189, 47, 0.08)',
        hover: 'rgba(250, 189, 47, 0.85)',
        text: 'rgba(250, 189, 47, 0.85)',
        hoverText: '#1d2021',
        border: 'rgba(250, 189, 47, 0.15)',
        name: 'Yellow'
    },
    {
        id: 'purple',
        bg: 'rgba(177, 98, 134, 0.08)',
        hover: 'rgba(177, 98, 134, 0.85)',
        text: 'rgba(211, 134, 155, 0.9)',
        hoverText: '#1d2021',
        border: 'rgba(177, 98, 134, 0.15)',
        name: 'Purple'
    },
    {
        id: 'aqua',
        bg: 'rgba(131, 165, 152, 0.08)',
        hover: 'rgba(131, 165, 152, 0.85)',
        text: 'rgba(131, 165, 152, 0.9)',
        hoverText: '#1d2021',
        border: 'rgba(131, 165, 152, 0.15)',
        name: 'Aqua'
    },
    {
        id: 'orange',
        bg: 'rgba(254, 128, 25, 0.08)',
        hover: 'rgba(254, 128, 25, 0.85)',
        text: 'rgba(254, 128, 25, 0.85)',
        hoverText: '#1d2021',
        border: 'rgba(254, 128, 25, 0.15)',
        name: 'Orange'
    },
    {
        id: 'pink',
        bg: 'rgba(211, 134, 155, 0.08)',
        hover: 'rgba(211, 134, 155, 0.85)',
        text: 'rgba(211, 134, 155, 0.85)',
        hoverText: '#1d2021',
        border: 'rgba(211, 134, 155, 0.15)',
        name: 'Pink'
    },
    {
        id: 'green',
        bg: 'rgba(184, 187, 38, 0.08)',
        hover: 'rgba(184, 187, 38, 0.85)',
        text: 'rgba(184, 187, 38, 0.85)',
        hoverText: '#1d2021',
        border: 'rgba(184, 187, 38, 0.15)',
        name: 'Green'
    },
    {
        id: 'red',
        bg: 'rgba(251, 73, 52, 0.08)',
        hover: 'rgba(251, 73, 52, 0.8)',
        text: 'rgba(251, 73, 52, 0.8)',
        hoverText: '#1d2021',
        border: 'rgba(251, 73, 52, 0.15)',
        name: 'Red'
    },
    {
        id: 'gold',
        bg: 'rgba(213, 153, 0, 0.08)',
        hover: 'rgba(213, 153, 0, 0.85)',
        text: 'rgba(215, 153, 33, 0.85)',
        hoverText: '#1d2021',
        border: 'rgba(213, 153, 0, 0.15)',
        name: 'Gold'
    },
];

// Storage key for custom tag colors
const CUSTOM_COLORS_KEY = 'bookmark-app-tag-colors';

/**
 * Load custom tag colors from localStorage
 */
function loadCustomColors() {
    try {
        const stored = localStorage.getItem(CUSTOM_COLORS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Save custom tag color to localStorage
 */
export function setTagColor(tagName, colorId) {
    const customColors = loadCustomColors();
    const normalizedName = tagName.toLowerCase().trim();

    if (colorId === null) {
        // Remove custom color (revert to default)
        delete customColors[normalizedName];
    } else {
        customColors[normalizedName] = colorId;
    }

    try {
        localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(customColors));
    } catch {
        // localStorage might be full or disabled
    }
}

/**
 * Get consistent color for a tag based on its name
 * First checks for custom color, then uses hash-based default
 * The color is deterministic - same tag name always gets same color
 *
 * @param {string} tagName - The tag name
 * @param {string} prevColorId - Optional: the color ID of the previous tag (to avoid duplicates)
 * @returns {object} Color object with bg, text, border, hover, hoverText, id properties
 */
export function getTagColor(tagName, prevColorId = null) {
    if (!tagName) {
        return TAG_COLORS[0];
    }

    const normalizedName = tagName.toLowerCase().trim();

    // Check for custom color first
    const customColors = loadCustomColors();
    if (customColors[normalizedName]) {
        const customColor = TAG_COLORS.find(c => c.id === customColors[normalizedName]);
        if (customColor) {
            return customColor;
        }
    }

    // Create a hash from the tag name
    let hash = 0;
    for (let i = 0; i < normalizedName.length; i++) {
        hash = normalizedName.charCodeAt(i) + ((hash << 5) - hash);
    }

    let colorIndex = Math.abs(hash) % TAG_COLORS.length;

    // If this would be the same as the previous color, pick the next one
    if (prevColorId && TAG_COLORS[colorIndex].id === prevColorId) {
        colorIndex = (colorIndex + 1) % TAG_COLORS.length;
    }

    return TAG_COLORS[colorIndex];
}

/**
 * Get colors for a list of tags, avoiding adjacent duplicates
 * @param {string[]} tags - Array of tag names
 * @returns {object[]} Array of color objects
 */
export function getTagColors(tags) {
    const colors = [];
    let prevColorId = null;

    for (const tag of tags) {
        const color = getTagColor(tag, prevColorId);
        colors.push(color);
        prevColorId = color.id;
    }

    return colors;
}

/**
 * Get all available tag colors (for color picker)
 */
export function getAllTagColors() {
    return TAG_COLORS;
}

/**
 * Get a color by its ID
 */
export function getColorById(colorId) {
    return TAG_COLORS.find(c => c.id === colorId) || TAG_COLORS[0];
}

export default getTagColor;
