# X/Twitter Bookmark Media Handling

## Overview

This document describes how X (Twitter) bookmarks with media should be handled in this application.

## Key Principle: Use oEmbed, Not MP4 Extraction

**DO NOT attempt to extract MP4 video files from X/Twitter.** This approach is:
- Unreliable (URLs change, blob URLs don't persist)
- Against X's Terms of Service
- Requires authentication/scraping that breaks frequently
- Unnecessary when official embeds are available

**Instead, use X's official oEmbed API** which is:
- Free (no API keys required)
- Reliable (official endpoint)
- Compliant with X's ToS
- Self-maintaining (X handles all rendering)

## Implementation

### 1. Storing X Bookmark Data

When saving an X bookmark, store:

```javascript
{
  url: "https://x.com/user/status/123456789",
  metadata: {
    tweetData: {
      isTwitter: true,
      authorHandle: "@username",
      authorName: "Display Name",
      tweetText: "Tweet content...",
      // NO videoSrc - don't store MP4 URLs
      // Store embed HTML from oEmbed instead:
      embedHtml: "<blockquote class=\"twitter-tweet\">...</blockquote>",
      oembedCacheAge: 86400
    }
  }
}
```

### 2. Fetching oEmbed Data

Use the endpoint: `https://publish.twitter.com/oembed`

```javascript
const oembedUrl = new URL('https://publish.twitter.com/oembed');
oembedUrl.searchParams.set('url', tweetUrl.replace('x.com', 'twitter.com'));
oembedUrl.searchParams.set('omit_script', '1');
oembedUrl.searchParams.set('maxwidth', '550');
oembedUrl.searchParams.set('hide_thread', '1');
oembedUrl.searchParams.set('dnt', 'true');
oembedUrl.searchParams.set('lang', 'en');

const response = await fetch(oembedUrl);
const data = await response.json();

// data contains:
// - html: The embed blockquote HTML
// - author_name: Tweet author's display name
// - author_url: Link to author's profile
// - cache_age: Recommended cache duration in seconds
```

### 3. Displaying X Bookmarks

#### Card View (Grid)
- Show author name/handle
- Show tweet text (truncated)
- Show thumbnail if available (from og:image or profile)
- Display "Click to view" indicator

#### Detail View (Modal)
- Render oEmbed HTML in an **isolated iframe**
- Load `platform.twitter.com/widgets.js` for interactivity
- Provide "Open on X" link

### 4. Safe Embed Rendering

**Never inject oEmbed HTML directly into the DOM.** Always use an iframe:

```jsx
function XEmbed({ embedHtml }) {
  const iframeRef = useRef();

  useEffect(() => {
    const doc = iframeRef.current.contentDocument;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { background: #15202b; display: flex; justify-content: center; padding: 16px; }
            .twitter-tweet { margin: 0 !important; }
          </style>
        </head>
        <body>
          ${embedHtml}
          <script async src="https://platform.twitter.com/widgets.js"></script>
        </body>
      </html>
    `);
    doc.close();
  }, [embedHtml]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts allow-same-origin allow-popups"
      className="w-full min-h-[400px]"
    />
  );
}
```

### 5. Cache Strategy

- Cache oEmbed responses for the duration specified in `cache_age`
- Clamp cache duration: minimum 5 minutes, maximum 7 days
- Re-fetch if cache expires or user explicitly refreshes

### 6. Fallback Handling

If oEmbed fails:
- Display a card with the URL
- Show "Post on X" or "View on X" link
- Allow click to open in new tab
- Log error for debugging

## Migration from MP4 Extraction

If you have existing bookmarks with `tweetMedia` containing video URLs:

1. Those URLs may be blob URLs (start with `blob:`) - these never work
2. Those URLs may be CDN URLs that have expired
3. **Best solution**: Re-fetch oEmbed data on bookmark view if embedHtml is missing

```javascript
async function ensureEmbedHtml(bookmark) {
  if (bookmark.metadata?.tweetData?.embedHtml) {
    return bookmark; // Already has embed
  }

  if (isTwitterUrl(bookmark.url)) {
    const oembedData = await fetchOEmbed(bookmark.url);
    if (oembedData?.html) {
      // Update bookmark with embed HTML
      await updateBookmark(bookmark.id, {
        metadata: {
          ...bookmark.metadata,
          tweetData: {
            ...bookmark.metadata?.tweetData,
            embedHtml: oembedData.html,
            oembedCacheAge: parseInt(oembedData.cache_age) || 86400
          }
        }
      });
    }
  }

  return bookmark;
}
```

## API Endpoints

### Server-side oEmbed Proxy

To avoid CORS issues, proxy oEmbed requests through your server:

```
GET /api/twitter/oembed?url=https://x.com/user/status/123
```

Response:
```json
{
  "html": "<blockquote class=\"twitter-tweet\">...</blockquote>",
  "authorName": "User Name",
  "authorUrl": "https://twitter.com/user",
  "cacheAge": 86400
}
```

## Why Not Cobalt/yt-dlp?

While tools like Cobalt and yt-dlp can download X videos:
- They require running additional services or CLI tools
- The public Cobalt API requires authentication
- X frequently changes their site, breaking extractors
- Downloaded videos need storage (disk space, CDN costs)
- Legal/ToS concerns with downloading X content

**oEmbed is the official, supported way to embed X content.**

## Summary

| Approach | Recommended | Why |
|----------|-------------|-----|
| oEmbed | ✅ Yes | Official, free, reliable, compliant |
| MP4 extraction | ❌ No | Unreliable, breaks ToS, complex |
| Twitter API v2 | ⚠️ Maybe | Requires auth, has rate limits, costs money at scale |
| Cobalt/yt-dlp | ❌ No | Extra infrastructure, legal concerns |

## Files to Update

- `frontend/src/components/TwitterEmbed.jsx` - Already has good oEmbed support
- `frontend/src/components/BookmarkCard.jsx` - Update to prioritize oEmbed over extracted media
- `server.js` - `/api/twitter/oembed` endpoint already exists

## Testing

1. Save a new X bookmark with video
2. Verify oEmbed HTML is stored in metadata
3. Open bookmark detail - should show official X embed
4. Click embed to verify interactivity works
5. Check "View on X" link opens correctly
