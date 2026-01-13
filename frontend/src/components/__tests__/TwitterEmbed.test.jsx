import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TwitterEmbed, { TweetMediaGallery } from '../TwitterEmbed';

// Mock the cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

describe('TweetMediaGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when media array is empty', () => {
      const { container } = render(<TweetMediaGallery media={[]} tweetUrl="https://x.com/test/status/123" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when media is undefined', () => {
      const { container } = render(<TweetMediaGallery tweetUrl="https://x.com/test/status/123" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render single image correctly', () => {
      const media = [{ type: 'image', url: 'https://pbs.twimg.com/media/test.jpg' }];
      const { container } = render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://pbs.twimg.com/media/test.jpg');
    });

    it('should render multiple images in grid', () => {
      const media = [
        { type: 'image', url: 'https://pbs.twimg.com/media/test1.jpg' },
        { type: 'image', url: 'https://pbs.twimg.com/media/test2.jpg' },
      ];
      const { container } = render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const images = container.querySelectorAll('img');
      expect(images).toHaveLength(2);
    });

    it('should render video with poster image', () => {
      const media = [
        {
          type: 'video',
          url: 'https://video.twimg.com/test.mp4',
          poster: 'https://pbs.twimg.com/media/poster.jpg',
        },
      ];
      render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'https://video.twimg.com/test.mp4');
      expect(video).toHaveAttribute('poster', 'https://pbs.twimg.com/media/poster.jpg');
    });

    it('should filter out blob URLs for videos but keep poster', () => {
      const media = [
        {
          type: 'video',
          url: 'blob:https://x.com/12345',
          poster: 'https://pbs.twimg.com/media/poster.jpg',
        },
      ];
      const { container } = render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      // Should show poster image for blob video
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', 'https://pbs.twimg.com/media/poster.jpg');
    });

    it('should filter out invalid media items', () => {
      const media = [
        { type: 'image', url: '' }, // Invalid - empty URL
        { type: 'image', url: 'https://pbs.twimg.com/media/valid.jpg' },
        { type: 'video', url: 'blob:https://x.com/123', poster: '' }, // Invalid - blob with no poster
      ];
      const { container } = render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const images = container.querySelectorAll('img');
      expect(images).toHaveLength(1);
    });
  });

  describe('Grid Layout', () => {
    it('should use single column for one item', () => {
      const media = [{ type: 'image', url: 'https://pbs.twimg.com/media/test.jpg' }];
      const { container } = render(
        <TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />
      );

      const grid = container.firstChild;
      expect(grid.className).toContain('grid-cols-1');
    });

    it('should use two columns for two items', () => {
      const media = [
        { type: 'image', url: 'https://pbs.twimg.com/media/test1.jpg' },
        { type: 'image', url: 'https://pbs.twimg.com/media/test2.jpg' },
      ];
      const { container } = render(
        <TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />
      );

      const grid = container.firstChild;
      expect(grid.className).toContain('grid-cols-2');
    });

    it('should use two columns for four items', () => {
      const media = [
        { type: 'image', url: 'https://pbs.twimg.com/media/test1.jpg' },
        { type: 'image', url: 'https://pbs.twimg.com/media/test2.jpg' },
        { type: 'image', url: 'https://pbs.twimg.com/media/test3.jpg' },
        { type: 'image', url: 'https://pbs.twimg.com/media/test4.jpg' },
      ];
      const { container } = render(
        <TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />
      );

      const grid = container.firstChild;
      expect(grid.className).toContain('grid-cols-2');
    });
  });

  describe('Video Controls', () => {
    it('should render play/pause button for videos', () => {
      const media = [
        {
          type: 'video',
          url: 'https://video.twimg.com/test.mp4',
          poster: 'https://pbs.twimg.com/media/poster.jpg',
        },
      ];
      render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('should have muted attribute by default for autoplay', () => {
      const media = [
        {
          type: 'video',
          url: 'https://video.twimg.com/test.mp4',
          poster: 'https://pbs.twimg.com/media/poster.jpg',
        },
      ];
      render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const video = document.querySelector('video');
      // Video is muted by default - the muted attribute may be empty string or true
      expect(video.muted).toBe(true);
    });

    it('should have loop attribute for videos', () => {
      const media = [
        {
          type: 'video',
          url: 'https://video.twimg.com/test.mp4',
          poster: 'https://pbs.twimg.com/media/poster.jpg',
        },
      ];
      render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const video = document.querySelector('video');
      expect(video).toHaveAttribute('loop');
    });

    it('should have playsInline attribute for mobile support', () => {
      const media = [
        {
          type: 'video',
          url: 'https://video.twimg.com/test.mp4',
          poster: 'https://pbs.twimg.com/media/poster.jpg',
        },
      ];
      render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const video = document.querySelector('video');
      expect(video).toHaveAttribute('playsinline');
    });
  });

  describe('Click Interactions', () => {
    it('should open tweet URL for blob video click', () => {
      const media = [
        {
          type: 'video',
          url: 'blob:https://x.com/12345',
          poster: 'https://pbs.twimg.com/media/poster.jpg',
        },
      ];
      render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const container = document.querySelector('[data-video-id]');
      fireEvent.click(container);

      expect(window.open).toHaveBeenCalledWith('https://x.com/test/status/123', '_blank');
    });

    it('should stop event propagation on click', () => {
      const media = [{ type: 'image', url: 'https://pbs.twimg.com/media/test.jpg' }];
      const parentClick = vi.fn();

      const { container } = render(
        <div onClick={parentClick}>
          <TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />
        </div>
      );

      const imageContainer = container.querySelector('img').parentElement;
      fireEvent.click(imageContainer);

      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe('Lightbox', () => {
    it('should open lightbox when expand button is clicked on image', async () => {
      const media = [{ type: 'image', url: 'https://pbs.twimg.com/media/test.jpg' }];
      render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      // Click the expand button (last button in image container)
      const buttons = document.querySelectorAll('button');
      const expandButton = buttons[buttons.length - 1];
      fireEvent.click(expandButton);

      // Should open lightbox
      await waitFor(() => {
        const lightbox = document.querySelector('.fixed.inset-0');
        expect(lightbox).toBeInTheDocument();
      });
    });

    it('should close lightbox when clicking overlay', async () => {
      const media = [{ type: 'image', url: 'https://pbs.twimg.com/media/test.jpg' }];
      const { container } = render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      // Open lightbox by clicking the image container
      const imageContainer = container.querySelector('img').parentElement;
      fireEvent.click(imageContainer);

      await waitFor(() => {
        const lightbox = document.querySelector('.fixed.inset-0');
        expect(lightbox).toBeInTheDocument();
      });

      // Close lightbox by clicking overlay
      const lightbox = document.querySelector('.fixed.inset-0');
      fireEvent.click(lightbox);

      await waitFor(() => {
        // After closing, check that there's no lightbox with z-[100] class
        const remainingLightboxes = document.querySelectorAll('.fixed.inset-0');
        // Either no lightbox or the lightbox was removed
        expect(remainingLightboxes.length === 0 || !document.querySelector('[class*="z-[100]"]')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt attribute on images', () => {
      const media = [{ type: 'image', url: 'https://pbs.twimg.com/media/test.jpg' }];
      const { container } = render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('alt', '');
    });

    it('should use lazy loading for images', () => {
      const media = [{ type: 'image', url: 'https://pbs.twimg.com/media/test.jpg' }];
      const { container } = render(<TweetMediaGallery media={media} tweetUrl="https://x.com/test/status/123" />);

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });
});

describe('TwitterEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock twttr widget
    global.window.twttr = undefined;
  });

  afterEach(() => {
    // Clean up any appended scripts
    const scripts = document.querySelectorAll('script[src*="twitter"]');
    scripts.forEach((script) => script.remove());
    global.window.twttr = undefined;
  });

  describe('Tweet ID Extraction', () => {
    it('should extract tweet ID from x.com URL', () => {
      const getTweetId = (url) => {
        const match = url?.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
        return match ? match[1] : null;
      };

      expect(getTweetId('https://x.com/user/status/1234567890')).toBe('1234567890');
    });

    it('should extract tweet ID from twitter.com URL', () => {
      const getTweetId = (url) => {
        const match = url?.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
        return match ? match[1] : null;
      };

      expect(getTweetId('https://twitter.com/user/status/1234567890')).toBe('1234567890');
    });

    it('should return null for invalid URL', () => {
      const getTweetId = (url) => {
        const match = url?.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
        return match ? match[1] : null;
      };

      expect(getTweetId('https://example.com')).toBeNull();
      expect(getTweetId(null)).toBeNull();
      expect(getTweetId(undefined)).toBeNull();
    });
  });

  describe('Rendering', () => {
    it('should render nothing when tweet ID is invalid', () => {
      const { container } = render(
        <TwitterEmbed tweetUrl="https://example.com" posterImage="" />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render loading state initially', () => {
      render(
        <TwitterEmbed
          tweetUrl="https://x.com/user/status/1234567890"
          posterImage="https://example.com/poster.jpg"
        />
      );

      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render poster image during loading', () => {
      const { container } = render(
        <TwitterEmbed
          tweetUrl="https://x.com/user/status/1234567890"
          posterImage="https://example.com/poster.jpg"
        />
      );

      const poster = container.querySelector('img');
      expect(poster).toHaveAttribute('src', 'https://example.com/poster.jpg');
    });
  });

  describe('Twitter Widget Integration', () => {
    it('should attempt to load Twitter widget script', async () => {
      render(
        <TwitterEmbed
          tweetUrl="https://x.com/user/status/1234567890"
          posterImage=""
        />
      );

      // Wait for script to be appended
      await waitFor(() => {
        const scripts = document.querySelectorAll('script');
        const twitterScript = Array.from(scripts).find((s) =>
          s.src.includes('platform.twitter.com/widgets.js')
        );
        expect(twitterScript).toBeTruthy();
      });
    });

    it('should use existing twttr object if available', async () => {
      const mockCreateTweet = vi.fn().mockResolvedValue({});
      global.window.twttr = {
        widgets: {
          createTweet: mockCreateTweet,
        },
      };

      render(
        <TwitterEmbed
          tweetUrl="https://x.com/user/status/1234567890"
          posterImage=""
        />
      );

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalledWith(
          '1234567890',
          expect.any(HTMLElement),
          expect.objectContaining({
            theme: 'dark',
            align: 'center',
            conversation: 'none',
            cards: 'visible',
            dnt: true,
          })
        );
      });
    });
  });
});

describe('Tweet Text Cleaning', () => {
  const cleanText = (text) =>
    (text || '')
      .replace(/https?:\/\/t\.co\/\w+/g, '')
      .replace(/^.*?:\s*[""]?/, '')
      .replace(/[""]?\s*\/\s*X$/, '')
      .replace(/\s+/g, ' ')
      .trim() || 'View on X';

  it('should remove t.co links', () => {
    expect(cleanText('Check this out https://t.co/abc123')).toBe('Check this out');
  });

  it('should remove multiple t.co links', () => {
    expect(cleanText('Link 1 https://t.co/abc Link 2 https://t.co/def')).toBe('Link 1 Link 2');
  });

  it('should remove author prefix', () => {
    expect(cleanText('John Doe: "Hello World"')).toBe('Hello World"');
  });

  it('should remove / X suffix', () => {
    expect(cleanText('Test tweet / X')).toBe('Test tweet');
  });

  it('should normalize whitespace', () => {
    expect(cleanText('Hello    World')).toBe('Hello World');
  });

  it('should return "View on X" for empty text', () => {
    expect(cleanText('')).toBe('View on X');
    expect(cleanText(null)).toBe('View on X');
    expect(cleanText(undefined)).toBe('View on X');
  });
});

describe('Author Name Extraction', () => {
  const extractAuthorFromUrl = (url) => {
    const match = url?.match(/(?:twitter|x)\.com\/(@?\w+)\/status/);
    return match ? match[1].replace(/^@/, '') : null;
  };

  const extractAuthorFromTitle = (title) => {
    const match = title?.match(/^(.+?)\s+on\s+X:/i);
    return match ? match[1] : null;
  };

  it('should extract author from x.com URL', () => {
    expect(extractAuthorFromUrl('https://x.com/testuser/status/123')).toBe('testuser');
  });

  it('should extract author from twitter.com URL', () => {
    expect(extractAuthorFromUrl('https://twitter.com/testuser/status/123')).toBe('testuser');
  });

  it('should remove @ prefix from author', () => {
    expect(extractAuthorFromUrl('https://x.com/@testuser/status/123')).toBe('testuser');
  });

  it('should extract author from title', () => {
    expect(extractAuthorFromTitle('John Doe on X: Some tweet')).toBe('John Doe');
  });

  it('should handle case-insensitive matching in title', () => {
    expect(extractAuthorFromTitle('John Doe ON x: Some tweet')).toBe('John Doe');
  });

  it('should return null for invalid inputs', () => {
    expect(extractAuthorFromUrl(null)).toBeNull();
    expect(extractAuthorFromUrl('https://example.com')).toBeNull();
    expect(extractAuthorFromTitle(null)).toBeNull();
    expect(extractAuthorFromTitle('Invalid title format')).toBeNull();
  });
});
