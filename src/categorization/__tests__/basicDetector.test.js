const { detectCategory } = require('../basicDetector');

describe('Basic Category Detector', () => {
  test('detects YouTube videos', () => {
    const result = detectCategory('https://www.youtube.com/watch?v=abc123', 'Watch Title');
    expect(result.category).toBe('video');
    expect(result.subCategory).toBe('youtube-video');
  });

  test('detects Reddit posts', () => {
    const result = detectCategory('https://reddit.com/r/programming/comments/abc', 'Reddit Post Title');
    expect(result.category).toBe('text');
    expect(result.subCategory).toBe('reddit-post');
  });

  test('detects Twitter threads', () => {
    const result = detectCategory('https://twitter.com/user/status/123456789', 'Tweet');
    expect(result.category).toBe('text');
    expect(result.subCategory).toBe('twitter-thread');
  });

  test('detects Medium articles', () => {
    const result = detectCategory('https://medium.com/@author/article-slug', 'Article Title');
    expect(result.category).toBe('article');
    expect(result.subCategory).toBe('medium');
  });

  test('detects Substack newsletters', () => {
    const result = detectCategory('https://newsletter.substack.com/p/article-title', 'Newsletter');
    expect(result.category).toBe('article');
    expect(result.subCategory).toBe('substack');
  });

  test('detects Vimeo videos', () => {
    const result = detectCategory('https://vimeo.com/123456789', 'Vimeo Video');
    expect(result.category).toBe('video');
    expect(result.subCategory).toBe('vimeo-video');
  });

  test('detects direct image URLs', () => {
    const result = detectCategory('https://example.com/image.jpg', 'Image');
    expect(result.category).toBe('image');
    expect(result.subCategory).toBe('image');
  });

  test('detects generic articles by domain', () => {
    const result = detectCategory('https://blog.example.com/article', 'Article Title');
    expect(result.category).toBe('article');
    expect(result.subCategory).toBe('article');
  });

  test('defaults to text for unknown URLs', () => {
    const result = detectCategory('https://unknown.example.com/page', 'Unknown');
    expect(result.category).toBe('text');
    expect(result.subCategory).toBe('webpage');
  });
});
