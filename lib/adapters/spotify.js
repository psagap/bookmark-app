/**
 * Spotify oEmbed Adapter
 * Extracts metadata from Spotify URLs using their oEmbed API
 */

const SPOTIFY_OEMBED_URL = 'https://open.spotify.com/oembed';

/**
 * Detect Spotify content type from URL
 * @param {string} url - Spotify URL
 * @returns {string} - Type: track, album, playlist, artist, episode, show
 */
function detectSpotifyType(url) {
  if (url.includes('/track/')) return 'track';
  if (url.includes('/album/')) return 'album';
  if (url.includes('/playlist/')) return 'playlist';
  if (url.includes('/artist/')) return 'artist';
  if (url.includes('/episode/')) return 'episode';
  if (url.includes('/show/')) return 'show';
  return 'unknown';
}

/**
 * Parse Spotify oEmbed title to extract artist and track/album name
 * Spotify titles are often formatted as "Track Name by Artist Name"
 * @param {string} title - The oEmbed title
 * @param {string} type - Content type (track, album, etc.)
 * @returns {object} - { name, artist }
 */
function parseSpotifyTitle(title, type) {
  if (!title) return { name: null, artist: null };

  // Pattern: "Song Name - Artist Name" or "Song Name by Artist Name"
  const byPattern = /^(.+?)\s+(?:by|–|-)\s+(.+)$/i;
  const match = title.match(byPattern);

  if (match) {
    return {
      name: match[1].trim(),
      artist: match[2].trim(),
    };
  }

  // For playlists, the title is usually just the playlist name
  if (type === 'playlist') {
    return { name: title, artist: null };
  }

  // For artists, the title is the artist name
  if (type === 'artist') {
    return { name: null, artist: title };
  }

  return { name: title, artist: null };
}

/**
 * Extract metadata from Spotify URL using oEmbed API
 * @param {string} url - Spotify URL
 * @returns {object|null} - Extracted metadata or null if failed
 */
async function extractSpotifyMetadata(url) {
  try {
    const type = detectSpotifyType(url);

    console.log('[spotify] Fetching oEmbed for:', url, 'type:', type);

    const oEmbedUrl = `${SPOTIFY_OEMBED_URL}?url=${encodeURIComponent(url)}`;
    const response = await fetch(oEmbedUrl, {
      headers: {
        'User-Agent': 'BookmarkApp/1.0',
      },
    });

    if (!response.ok) {
      console.warn('[spotify] oEmbed request failed:', response.status);
      return null;
    }

    const data = await response.json();

    /*
     * Spotify oEmbed response example:
     * {
     *   "html": "<iframe ...></iframe>",
     *   "width": 456,
     *   "height": 152,
     *   "version": "1.0",
     *   "provider_name": "Spotify",
     *   "provider_url": "https://spotify.com",
     *   "type": "rich",
     *   "title": "Track Name by Artist Name",
     *   "thumbnail_url": "https://...",
     *   "thumbnail_width": 300,
     *   "thumbnail_height": 300
     * }
     */

    const { name, artist } = parseSpotifyTitle(data.title, type);

    return {
      contentType: 'music',
      platform: 'spotify',
      spotifyType: type,
      name: name || data.title,
      title: data.title,
      artist: artist,
      image: data.thumbnail_url,
      embedHtml: data.html,
      embedWidth: data.width,
      embedHeight: data.height,
      providerName: data.provider_name,
    };

  } catch (error) {
    console.error('[spotify] Error extracting metadata:', error.message);
    return null;
  }
}

/**
 * Generate Spotify embed iframe
 * @param {string} url - Spotify URL
 * @param {object} options - Embed options
 * @returns {string} - Iframe HTML
 */
function generateEmbed(url, options = {}) {
  const { width = 300, height = 380, theme = 'dark' } = options;

  // Extract Spotify URI from URL
  // https://open.spotify.com/track/123 -> spotify:track:123
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (!match) return null;

  const [, type, id] = match;

  return `<iframe
    src="https://open.spotify.com/embed/${type}/${id}?theme=${theme}"
    width="${width}"
    height="${height}"
    frameBorder="0"
    allowtransparency="true"
    allow="encrypted-media"
  ></iframe>`;
}

module.exports = {
  extractSpotifyMetadata,
  detectSpotifyType,
  parseSpotifyTitle,
  generateEmbed,
};
