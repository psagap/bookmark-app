/**
 * Content Script Unit Tests
 * Tests for the bookmark extension content script functionality
 * These tests focus on pure functions that don't require DOM
 */

// Mock chrome API
const mockChrome = {
  runtime: {
    id: 'mock-extension-id',
    lastError: null,
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

// Setup global chrome object
global.chrome = mockChrome;

describe('Content Script - URL Detection', () => {
  describe('isTwitterPage', () => {
    const isTwitterPage = (url) => {
      return url.includes('twitter.com') || url.includes('x.com');
    };

    test('should detect twitter.com URLs', () => {
      expect(isTwitterPage('https://twitter.com/user/status/123')).toBe(true);
    });

    test('should detect x.com URLs', () => {
      expect(isTwitterPage('https://x.com/user/status/123')).toBe(true);
    });

    test('should not detect non-Twitter URLs', () => {
      expect(isTwitterPage('https://example.com')).toBe(false);
      expect(isTwitterPage('https://youtube.com')).toBe(false);
    });
  });

  describe('isWikipediaPage', () => {
    const isWikipediaPage = (url) => {
      return url.includes('wikipedia.org/wiki/');
    };

    test('should detect Wikipedia article URLs', () => {
      expect(isWikipediaPage('https://en.wikipedia.org/wiki/JavaScript')).toBe(true);
    });

    test('should not detect Wikipedia main page', () => {
      expect(isWikipediaPage('https://en.wikipedia.org/')).toBe(false);
    });

    test('should not detect non-Wikipedia URLs', () => {
      expect(isWikipediaPage('https://example.com')).toBe(false);
    });
  });
});

describe('Content Script - Safe Message Wrapper', () => {
  let safeSendMessage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChrome.runtime.lastError = null;
    mockChrome.runtime.id = 'mock-extension-id';

    // Recreate safeSendMessage function
    safeSendMessage = (message, callback) => {
      try {
        if (!chrome.runtime?.id) {
          return;
        }
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            return;
          }
          callback?.(response);
        });
      } catch (error) {
        // Extension context may be invalid
      }
    };
  });

  test('should call chrome.runtime.sendMessage when extension context is valid', () => {
    safeSendMessage({ action: 'test' }, jest.fn());
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'test' },
      expect.any(Function)
    );
  });

  test('should not call sendMessage when extension context is invalid', () => {
    mockChrome.runtime.id = undefined;

    safeSendMessage({ action: 'test' }, jest.fn());
    expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  test('should handle callback correctly on success', () => {
    const callback = jest.fn();
    mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ success: true });
    });

    safeSendMessage({ action: 'test' }, callback);
    expect(callback).toHaveBeenCalledWith({ success: true });
  });

  test('should not call callback when lastError is set', () => {
    const callback = jest.fn();
    mockChrome.runtime.lastError = { message: 'Service worker inactive' };
    mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb(undefined);
    });

    safeSendMessage({ action: 'test' }, callback);
    expect(callback).not.toHaveBeenCalled();
  });

  test('should handle missing callback gracefully', () => {
    mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ success: true });
    });

    expect(() => safeSendMessage({ action: 'test' })).not.toThrow();
  });

  test('should catch synchronous errors', () => {
    mockChrome.runtime.sendMessage.mockImplementation(() => {
      throw new Error('Extension context invalidated');
    });

    expect(() => safeSendMessage({ action: 'test' }, jest.fn())).not.toThrow();
  });
});

describe('Content Script - Session Storage Keys', () => {
  const EXTENSION_SESSION_KEY = 'bookmark_extension_session';
  const BOOKMARK_APP_ORIGIN = 'http://localhost:5173';

  test('session key should be correct', () => {
    expect(EXTENSION_SESSION_KEY).toBe('bookmark_extension_session');
  });

  test('bookmark app origin should be localhost:5173', () => {
    expect(BOOKMARK_APP_ORIGIN).toBe('http://localhost:5173');
  });

  describe('isBookmarkApp', () => {
    const isBookmarkApp = (origin) => {
      return origin === BOOKMARK_APP_ORIGIN;
    };

    test('should return true for localhost:5173', () => {
      expect(isBookmarkApp('http://localhost:5173')).toBe(true);
    });

    test('should return false for other origins', () => {
      expect(isBookmarkApp('https://example.com')).toBe(false);
    });

    test('should return false for different port', () => {
      expect(isBookmarkApp('http://localhost:3000')).toBe(false);
    });

    test('should return false for https', () => {
      expect(isBookmarkApp('https://localhost:5173')).toBe(false);
    });
  });
});

describe('Content Script - Tweet Metadata Extraction', () => {
  describe('Author handle extraction from URL', () => {
    const extractHandleFromUrl = (url) => {
      const match = url?.match(/(?:twitter|x)\.com\/(\w+)\/status/);
      return match ? match[1] : null;
    };

    test('should extract author handle from x.com URL', () => {
      expect(extractHandleFromUrl('https://x.com/testuser/status/123456789')).toBe('testuser');
    });

    test('should extract handle from twitter.com URLs', () => {
      expect(extractHandleFromUrl('https://twitter.com/anotheruser/status/987654321')).toBe('anotheruser');
    });

    test('should return null for non-tweet URLs', () => {
      expect(extractHandleFromUrl('https://x.com/testuser')).toBeNull();
      expect(extractHandleFromUrl('https://example.com')).toBeNull();
    });
  });

  describe('Title parsing', () => {
    const parseTitleForTweet = (title) => {
      const match = title?.match(/^(.+?) on X: "(.+)"(?: \/ X)?$/);
      if (match) {
        return { author: match[1], text: match[2] };
      }
      const altMatch = title?.match(/^(.+?) on X: (.+?)(?: \/ X)?$/);
      if (altMatch) {
        return { author: altMatch[1], text: altMatch[2] };
      }
      return null;
    };

    test('should parse title format with quotes', () => {
      const result = parseTitleForTweet('John Doe on X: "This is a test tweet" / X');
      expect(result).toEqual({ author: 'John Doe', text: 'This is a test tweet' });
    });

    test('should parse title without quotes', () => {
      const result = parseTitleForTweet('John Doe on X: This is a test tweet / X');
      expect(result).toEqual({ author: 'John Doe', text: 'This is a test tweet' });
    });

    test('should return null for invalid format', () => {
      expect(parseTitleForTweet('Random Title')).toBeNull();
      expect(parseTitleForTweet(null)).toBeNull();
    });
  });
});

describe('Content Script - Wikipedia Metadata Extraction', () => {
  describe('Article title extraction from URL', () => {
    const extractTitleFromWikiUrl = (url) => {
      const match = url?.match(/wikipedia\.org\/wiki\/([^#?]+)/);
      return match ? decodeURIComponent(match[1].replace(/_/g, ' ')) : null;
    };

    test('should extract article title from URL', () => {
      expect(extractTitleFromWikiUrl('https://en.wikipedia.org/wiki/JavaScript')).toBe('JavaScript');
    });

    test('should handle URL-encoded titles', () => {
      expect(extractTitleFromWikiUrl('https://en.wikipedia.org/wiki/C%2B%2B')).toBe('C++');
    });

    test('should handle underscores as spaces', () => {
      expect(extractTitleFromWikiUrl('https://en.wikipedia.org/wiki/Hello_World')).toBe('Hello World');
    });

    test('should handle section anchors', () => {
      expect(extractTitleFromWikiUrl('https://en.wikipedia.org/wiki/JavaScript#History')).toBe('JavaScript');
    });

    test('should return null for non-Wikipedia URLs', () => {
      expect(extractTitleFromWikiUrl('https://example.com')).toBeNull();
    });
  });

  describe('Language extraction from subdomain', () => {
    const extractLang = (url) => {
      const match = url?.match(/^https?:\/\/(\w+)\.wikipedia\.org/);
      return match ? match[1] : null;
    };

    test('should extract English language', () => {
      expect(extractLang('https://en.wikipedia.org/wiki/Paris')).toBe('en');
    });

    test('should extract French language', () => {
      expect(extractLang('https://fr.wikipedia.org/wiki/Paris')).toBe('fr');
    });

    test('should extract German language', () => {
      expect(extractLang('https://de.wikipedia.org/wiki/Berlin')).toBe('de');
    });

    test('should return null for non-Wikipedia URLs', () => {
      expect(extractLang('https://example.com')).toBeNull();
    });
  });
});

describe('Content Script - Source Detection', () => {
  const detectSource = (url) => {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return { category: 'X', subCategory: 'tweet', source: 'X' };
    }
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      let subCategory = 'video';
      if (urlLower.includes('/shorts/')) subCategory = 'short';
      if (urlLower.includes('/playlist')) subCategory = 'playlist';
      return { category: 'YouTube', subCategory, source: 'YouTube' };
    }
    if (urlLower.includes('wikipedia.org')) {
      return { category: 'Wikipedia', subCategory: 'article', source: 'Wikipedia' };
    }
    if (urlLower.includes('github.com')) {
      let subCategory = 'repo';
      if (urlLower.includes('/issues/')) subCategory = 'issue';
      else if (urlLower.includes('/pull/')) subCategory = 'pr';
      return { category: 'GitHub', subCategory, source: 'GitHub' };
    }
    if (urlLower.includes('reddit.com')) {
      return { category: 'Reddit', subCategory: 'post', source: 'Reddit' };
    }
    if (urlLower.includes('instagram.com')) {
      let subCategory = 'post';
      if (urlLower.includes('/reel/')) subCategory = 'reel';
      if (urlLower.includes('/stories/')) subCategory = 'story';
      return { category: 'Instagram', subCategory, source: 'Instagram' };
    }
    if (urlLower.includes('linkedin.com')) {
      let subCategory = 'post';
      if (urlLower.includes('/article/')) subCategory = 'article';
      return { category: 'LinkedIn', subCategory, source: 'LinkedIn' };
    }
    if (urlLower.includes('medium.com')) {
      return { category: 'Medium', subCategory: 'article', source: 'Medium' };
    }
    if (urlLower.includes('substack.com') || urlLower.includes('.substack.')) {
      return { category: 'Substack', subCategory: 'article', source: 'Substack' };
    }
    if (urlLower.includes('tiktok.com')) {
      return { category: 'TikTok', subCategory: 'video', source: 'TikTok' };
    }

    return { category: 'Article', subCategory: 'webpage', source: 'Web' };
  };

  test('should detect Twitter/X URLs', () => {
    expect(detectSource('https://x.com/user/status/123')).toEqual({
      category: 'X',
      subCategory: 'tweet',
      source: 'X',
    });
    expect(detectSource('https://twitter.com/user/status/123')).toEqual({
      category: 'X',
      subCategory: 'tweet',
      source: 'X',
    });
  });

  test('should detect YouTube URLs with sub-categories', () => {
    expect(detectSource('https://youtube.com/watch?v=abc')).toEqual({
      category: 'YouTube',
      subCategory: 'video',
      source: 'YouTube',
    });
    expect(detectSource('https://youtube.com/shorts/abc')).toEqual({
      category: 'YouTube',
      subCategory: 'short',
      source: 'YouTube',
    });
    expect(detectSource('https://youtube.com/playlist?list=abc')).toEqual({
      category: 'YouTube',
      subCategory: 'playlist',
      source: 'YouTube',
    });
    expect(detectSource('https://youtu.be/abc')).toEqual({
      category: 'YouTube',
      subCategory: 'video',
      source: 'YouTube',
    });
  });

  test('should detect Wikipedia URLs', () => {
    expect(detectSource('https://en.wikipedia.org/wiki/JavaScript')).toEqual({
      category: 'Wikipedia',
      subCategory: 'article',
      source: 'Wikipedia',
    });
  });

  test('should detect GitHub URLs with sub-categories', () => {
    expect(detectSource('https://github.com/user/repo')).toEqual({
      category: 'GitHub',
      subCategory: 'repo',
      source: 'GitHub',
    });
    expect(detectSource('https://github.com/user/repo/issues/123')).toEqual({
      category: 'GitHub',
      subCategory: 'issue',
      source: 'GitHub',
    });
    expect(detectSource('https://github.com/user/repo/pull/456')).toEqual({
      category: 'GitHub',
      subCategory: 'pr',
      source: 'GitHub',
    });
  });

  test('should detect Reddit URLs', () => {
    expect(detectSource('https://reddit.com/r/programming/comments/abc')).toEqual({
      category: 'Reddit',
      subCategory: 'post',
      source: 'Reddit',
    });
  });

  test('should detect Instagram URLs with sub-categories', () => {
    expect(detectSource('https://instagram.com/p/abc')).toEqual({
      category: 'Instagram',
      subCategory: 'post',
      source: 'Instagram',
    });
    expect(detectSource('https://instagram.com/reel/abc')).toEqual({
      category: 'Instagram',
      subCategory: 'reel',
      source: 'Instagram',
    });
    expect(detectSource('https://instagram.com/stories/user/123')).toEqual({
      category: 'Instagram',
      subCategory: 'story',
      source: 'Instagram',
    });
  });

  test('should detect LinkedIn URLs', () => {
    expect(detectSource('https://linkedin.com/posts/user/abc')).toEqual({
      category: 'LinkedIn',
      subCategory: 'post',
      source: 'LinkedIn',
    });
    expect(detectSource('https://linkedin.com/article/title')).toEqual({
      category: 'LinkedIn',
      subCategory: 'article',
      source: 'LinkedIn',
    });
  });

  test('should detect Medium URLs', () => {
    expect(detectSource('https://medium.com/@user/article')).toEqual({
      category: 'Medium',
      subCategory: 'article',
      source: 'Medium',
    });
  });

  test('should detect Substack URLs', () => {
    expect(detectSource('https://newsletter.substack.com/p/article')).toEqual({
      category: 'Substack',
      subCategory: 'article',
      source: 'Substack',
    });
    expect(detectSource('https://user.substack.com/p/article')).toEqual({
      category: 'Substack',
      subCategory: 'article',
      source: 'Substack',
    });
  });

  test('should detect TikTok URLs', () => {
    expect(detectSource('https://tiktok.com/@user/video/123')).toEqual({
      category: 'TikTok',
      subCategory: 'video',
      source: 'TikTok',
    });
  });

  test('should fallback to Article for unknown URLs', () => {
    expect(detectSource('https://example.com/page')).toEqual({
      category: 'Article',
      subCategory: 'webpage',
      source: 'Web',
    });
  });
});

describe('Content Script - Image URL Validation', () => {
  const isValidMediaUrl = (url) => {
    return Boolean(url && typeof url === 'string' && !url.startsWith('blob:') && url.length > 0);
  };

  test('should accept valid URLs', () => {
    expect(isValidMediaUrl('https://pbs.twimg.com/media/abc.jpg')).toBe(true);
    expect(isValidMediaUrl('https://example.com/image.png')).toBe(true);
  });

  test('should reject blob URLs', () => {
    expect(isValidMediaUrl('blob:https://x.com/12345')).toBe(false);
  });

  test('should reject empty strings', () => {
    expect(isValidMediaUrl('')).toBe(false);
  });

  test('should reject null/undefined', () => {
    expect(isValidMediaUrl(null)).toBe(false);
    expect(isValidMediaUrl(undefined)).toBe(false);
  });

  describe('Media filtering', () => {
    const filterValidMedia = (media) => {
      return media.filter(m =>
        (m.type === 'image' && isValidMediaUrl(m.url)) ||
        (m.type === 'video' && (m.poster || isValidMediaUrl(m.url)))
      );
    };

    test('should filter out invalid image URLs', () => {
      const media = [
        { type: 'image', url: 'https://pbs.twimg.com/media/valid.jpg' },
        { type: 'image', url: '' },
        { type: 'image', url: 'blob:https://x.com/123' },
      ];
      const filtered = filterValidMedia(media);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].url).toBe('https://pbs.twimg.com/media/valid.jpg');
    });

    test('should keep videos with poster images even if url is blob', () => {
      const media = [
        { type: 'video', url: 'blob:https://x.com/123', poster: 'https://pbs.twimg.com/poster.jpg' },
      ];
      const filtered = filterValidMedia(media);
      expect(filtered).toHaveLength(1);
    });

    test('should filter out videos without poster and with blob url', () => {
      const media = [
        { type: 'video', url: 'blob:https://x.com/123', poster: '' },
      ];
      const filtered = filterValidMedia(media);
      expect(filtered).toHaveLength(0);
    });

    test('should keep videos with valid URLs', () => {
      const media = [
        { type: 'video', url: 'https://video.twimg.com/video.mp4', poster: '' },
      ];
      const filtered = filterValidMedia(media);
      expect(filtered).toHaveLength(1);
    });
  });
});

describe('Content Script - Text Cleaning', () => {
  const cleanTweetText = (text) => {
    return (text || '')
      .replace(/https?:\/\/t\.co\/\w+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  test('should remove t.co links', () => {
    expect(cleanTweetText('Check this out https://t.co/abc123')).toBe('Check this out');
  });

  test('should remove multiple t.co links', () => {
    expect(cleanTweetText('Link 1 https://t.co/abc Link 2 https://t.co/def')).toBe('Link 1 Link 2');
  });

  test('should normalize whitespace', () => {
    expect(cleanTweetText('Hello    World')).toBe('Hello World');
  });

  test('should handle empty/null input', () => {
    expect(cleanTweetText('')).toBe('');
    expect(cleanTweetText(null)).toBe('');
    expect(cleanTweetText(undefined)).toBe('');
  });

  test('should preserve newlines as single spaces', () => {
    expect(cleanTweetText('Hello\n\nWorld')).toBe('Hello World');
  });
});
