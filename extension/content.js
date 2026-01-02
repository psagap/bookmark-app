/**
 * Content script that runs on every webpage
 * Extracts metadata about the current page with fallbacks for CSP-restricted sites
 * Special handling for X/Twitter to extract rich tweet data
 */

// Check if we're on X/Twitter
function isTwitterPage(url) {
  return url.includes('twitter.com') || url.includes('x.com');
}

// Check if we're on Wikipedia
function isWikipediaPage(url) {
  return url.includes('wikipedia.org/wiki/');
}

// Wait for tweet images to load using MutationObserver (for SPA dynamic content)
function waitForTweetImages(timeout = 3000) {
  return new Promise((resolve) => {
    const images = [];

    // Check immediately first
    const immediateImages = document.querySelectorAll('article img[src*="pbs.twimg.com/media"]');
    if (immediateImages.length > 0) {
      immediateImages.forEach(img => {
        if (!img.src.includes('profile_images')) {
          images.push(img.src);
        }
      });
      if (images.length > 0) {
        resolve(images);
        return;
      }
    }

    // Set up observer for dynamic content
    const observer = new MutationObserver((mutations) => {
      const newImages = document.querySelectorAll('article img[src*="pbs.twimg.com/media"]');
      newImages.forEach(img => {
        if (!img.src.includes('profile_images') && !images.includes(img.src)) {
          images.push(img.src);
        }
      });

      if (images.length > 0) {
        observer.disconnect();
        resolve(images);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      resolve(images);
    }, timeout);
  });
}

// Extract tweet metadata from X/Twitter
// IMPORTANT: X is an SPA, so meta tags don't reliably update. We extract what we CAN.
async function extractTweetMetadata() {
  try {
    const url = window.location.href;
    const title = document.title || '';

    const data = {
      isTwitter: true,
      authorHandle: '',
      authorName: '',
      authorAvatar: '',
      isVerified: false,
      isBlueVerified: false,
      tweetText: '',
      tweetDate: '',
      isThread: false,
      replyCount: '',
      retweetCount: '',
      likeCount: '',
      viewCount: '',
    };

    // Extract author handle from URL
    const urlMatch = url.match(/(?:twitter|x)\.com\/(\w+)\/status/);
    if (urlMatch) {
      data.authorHandle = '@' + urlMatch[1];
    }

    // Parse title for author name and tweet text
    // Format: "AuthorName on X: "tweet text" / X"
    const titleMatch = title.match(/^(.+?) on X: "(.+)"(?: \/ X)?$/);
    if (titleMatch) {
      data.authorName = titleMatch[1];
      data.tweetText = titleMatch[2];
    } else {
      // Alternative format without quotes
      const altMatch = title.match(/^(.+?) on X: (.+?)(?: \/ X)?$/);
      if (altMatch) {
        data.authorName = altMatch[1];
        data.tweetText = altMatch[2];
      }
    }

    // Try to extract from DOM (may work depending on page state)
    try {
      // Get avatar
      const avatarImg = document.querySelector('article img[src*="profile_images"]');
      if (avatarImg) {
        data.authorAvatar = avatarImg.src;
      }

      // Check for verification badge
      const verifiedBadge = document.querySelector('article svg[data-testid="icon-verified"]');
      if (verifiedBadge) {
        data.isVerified = true;
        // Check if it's blue (paid) or gold/gray (organization/government)
        const badgeColor = verifiedBadge.querySelector('path')?.getAttribute('fill');
        data.isBlueVerified = badgeColor?.includes('1D9BF0') || badgeColor?.includes('1da1f2');
      }

      // Get tweet text from DOM if not from title
      if (!data.tweetText) {
        const tweetTextEl = document.querySelector('article [data-testid="tweetText"]');
        if (tweetTextEl) {
          data.tweetText = tweetTextEl.innerText;
        }
      }

      // Get date
      const timeEl = document.querySelector('article time');
      if (timeEl) {
        data.tweetDate = timeEl.getAttribute('datetime') || timeEl.innerText;
      }

      // Check if it's a thread (multiple tweets from same author)
      const tweets = document.querySelectorAll('article');
      if (tweets.length > 1) {
        const firstHandle = data.authorHandle.toLowerCase();
        let threadCount = 0;
        tweets.forEach(tweet => {
          const handle = tweet.querySelector('a[href*="/status/"]')?.href;
          if (handle?.toLowerCase().includes(firstHandle.replace('@', ''))) {
            threadCount++;
          }
        });
        data.isThread = threadCount > 1;
      }

      // Try to get engagement metrics
      const metrics = document.querySelectorAll('article [data-testid$="count"]');
      metrics.forEach(metric => {
        const testId = metric.getAttribute('data-testid');
        const value = metric.innerText;
        if (testId?.includes('reply')) data.replyCount = value;
        if (testId?.includes('retweet')) data.retweetCount = value;
        if (testId?.includes('like')) data.likeCount = value;
      });

      // View count
      const viewsEl = document.querySelector('article a[href*="/analytics"]');
      if (viewsEl) {
        data.viewCount = viewsEl.innerText.replace(' Views', '').replace(' views', '');
      }

      // Extract media (images and videos) with multiple fallbacks
      data.tweetMedia = [];

      // Multiple image selectors to try
      const imageSelectors = [
        'article img[src*="pbs.twimg.com/media"]',  // Primary
        'article img[src*="pbs.twimg.com"][alt]',   // Images with alt text
        'div[data-testid="tweetPhoto"] img',        // Test ID selector
        'a[href*="/photo/"] img'                    // Photo link wrapper
      ];

      // Try each image selector
      for (const selector of imageSelectors) {
        const images = document.querySelectorAll(selector);
        images.forEach(img => {
          if (img.src && !img.src.includes('profile_images') && !data.tweetMedia.find(m => m.url === img.src)) {
            data.tweetMedia.push({ type: 'image', url: img.src });
          }
        });
        if (data.tweetMedia.length > 0) break; // Stop if we found images
      }

      // Try video selectors - attempt to get real video URLs, not blob URLs
      const videoSelectors = [
        'article video',
        'div[data-testid="videoPlayer"] video',
        'div[data-testid="videoComponent"] video'
      ];

      for (const selector of videoSelectors) {
        const video = document.querySelector(selector);
        if (video) {
          const source = video.querySelector('source');
          let videoUrl = source?.src || video.src || '';

          // Filter out blob URLs - they don't work outside this browser session
          // Try to extract actual video URL from various sources
          if (videoUrl.startsWith('blob:') || !videoUrl) {
            // Try to find mp4 URL in any video element attributes or nearby elements
            const mp4Source = document.querySelector('source[type="video/mp4"]');
            if (mp4Source?.src && !mp4Source.src.startsWith('blob:')) {
              videoUrl = mp4Source.src;
            }
          }

          // If we still have a blob URL, note it but also save the poster
          // The poster image can be used as a fallback display
          const posterUrl = video.poster || '';

          // Only add to media if we have something useful
          if (videoUrl || posterUrl) {
            data.tweetMedia.push({
              type: 'video',
              url: videoUrl, // May be blob or empty, frontend will handle
              poster: posterUrl // Poster can be used as fallback
            });
          }
          break;
        }
      }

      // If still no media, wait for dynamic content
      if (data.tweetMedia.length === 0) {
        const images = await waitForTweetImages(2000);
        images.forEach(url => data.tweetMedia.push({ type: 'image', url }));
      }

    } catch (domError) {
      console.warn('Could not extract DOM data:', domError);
    }

    return data;
  } catch (error) {
    console.warn('Error extracting tweet metadata:', error);
    return { isTwitter: true, authorHandle: '', tweetText: '' };
  }
}

// Extract Wikipedia metadata from the current page
async function extractWikipediaMetadata() {
  try {
    const url = window.location.href;

    const data = {
      isWikipedia: true,
      articleTitle: '',
      extract: '',
      thumbnail: '',
      originalImage: '',
      categories: [],
      infobox: {},
      lang: 'en'
    };

    // Extract article title from URL
    const urlMatch = url.match(/wikipedia\.org\/wiki\/([^#?]+)/);
    if (urlMatch) {
      data.articleTitle = decodeURIComponent(urlMatch[1].replace(/_/g, ' '));
    }

    // Extract language from subdomain
    const langMatch = url.match(/^https?:\/\/(\w+)\.wikipedia\.org/);
    if (langMatch) {
      data.lang = langMatch[1];
    }

    // Extract first meaningful paragraph
    try {
      const paragraphs = document.querySelectorAll('#mw-content-text .mw-parser-output > p');
      for (const p of paragraphs) {
        const text = p.innerText.trim();
        // Skip empty paragraphs, coordinates, and very short text
        if (text.length > 50 && !p.classList.contains('mw-empty-elt') && !text.startsWith('Coordinates:')) {
          data.extract = text;
          break;
        }
      }
    } catch (e) {
      console.warn('Could not extract Wikipedia paragraph:', e);
    }

    // Extract infobox image
    try {
      const infoboxImg = document.querySelector('.infobox img.mw-file-element, .infobox-image img, .infobox img');
      if (infoboxImg) {
        // Get the full-size image URL by removing size parameters
        let imgSrc = infoboxImg.src;
        // Wikipedia thumbnail URLs contain /thumb/ and end with /XXXpx-filename
        // Convert to original: remove /thumb/ and the /XXXpx- part
        if (imgSrc.includes('/thumb/')) {
          data.originalImage = imgSrc.replace('/thumb/', '/').replace(/\/\d+px-[^/]+$/, '');
        } else {
          data.originalImage = imgSrc;
        }
        data.thumbnail = infoboxImg.src; // Keep thumbnail version too
      } else {
        // Fallback to main content image
        const mainImg = document.querySelector('.thumb.tright img, .thumbinner img');
        if (mainImg) {
          data.thumbnail = mainImg.src;
          if (mainImg.src.includes('/thumb/')) {
            data.originalImage = mainImg.src.replace('/thumb/', '/').replace(/\/\d+px-[^/]+$/, '');
          }
        }
      }
    } catch (e) {
      console.warn('Could not extract infobox image:', e);
    }

    // Extract categories
    try {
      const categoryLinks = document.querySelectorAll('#mw-normal-catlinks ul li a');
      data.categories = Array.from(categoryLinks)
        .slice(0, 5) // Limit to first 5 categories
        .map(a => a.textContent.trim());
    } catch (e) {
      console.warn('Could not extract categories:', e);
    }

    // Extract infobox data (key-value pairs)
    try {
      const infobox = document.querySelector('.infobox');
      if (infobox) {
        const rows = infobox.querySelectorAll('tr');
        rows.forEach(row => {
          const header = row.querySelector('th');
          const cell = row.querySelector('td');
          if (header && cell) {
            const key = header.textContent.trim().toLowerCase().replace(/\s+/g, '_');
            const value = cell.textContent.trim();
            if (key && value && value.length < 200) { // Avoid huge values
              data.infobox[key] = value;
            }
          }
        });
      }
    } catch (e) {
      console.warn('Could not extract infobox data:', e);
    }

    return data;
  } catch (error) {
    console.warn('Error extracting Wikipedia metadata:', error);
    return { isWikipedia: true, articleTitle: '', extract: '' };
  }
}

// Detect content metadata from the current page with multiple fallback strategies
async function detectPageMetadata() {
  try {
    const url = window.location.href;
    const selectedText = window.getSelection().toString();

    // Primary method: Direct metadata extraction
    let metadata = {
      url: url,
      title: document.title || '',
      selectedText: selectedText,
      ogImage: '',
      ogDescription: '',
      favicon: '',
      tweetData: null,
      wikipediaData: null,
    };

    // Check if this is a Twitter page and extract rich tweet metadata
    if (isTwitterPage(url)) {
      metadata.tweetData = await extractTweetMetadata();
    }

    // Check if this is a Wikipedia page and extract rich metadata
    if (isWikipediaPage(url)) {
      metadata.wikipediaData = await extractWikipediaMetadata();

      // Use extracted data for fallback fields
      if (metadata.wikipediaData.extract && !metadata.ogDescription) {
        metadata.ogDescription = metadata.wikipediaData.extract;
      }
      if (metadata.wikipediaData.thumbnail && !metadata.ogImage) {
        metadata.ogImage = metadata.wikipediaData.thumbnail;
      }
    }

    // Try to get og:image
    try {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && ogImage.content) {
        metadata.ogImage = ogImage.content;
      }
    } catch (e) {
      console.warn('Could not extract og:image:', e);
    }

    // Try to get og:description
    try {
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription && ogDescription.content) {
        metadata.ogDescription = ogDescription.content;
      }
    } catch (e) {
      console.warn('Could not extract og:description:', e);
    }

    // Fallback to twitter:* and alternative meta tags (X/Twitter uses these)
    if (!metadata.ogImage) {
      const metaSelectors = [
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
        'meta[property="twitter:image"]',
        'meta[name="twitter:player:stream"]',  // Video tweets
        'meta[property="og:image:secure_url"]',
        'meta[property="og:image:url"]'
      ];

      for (const selector of metaSelectors) {
        try {
          const meta = document.querySelector(selector);
          if (meta && meta.content && meta.content.startsWith('http')) {
            metadata.ogImage = meta.content;
            break;
          }
        } catch (e) {
          console.warn(`Could not extract ${selector}:`, e);
        }
      }
    }

    if (!metadata.ogDescription) {
      try {
        const twitterDescription = document.querySelector('meta[name="twitter:description"]');
        if (twitterDescription && twitterDescription.content) {
          metadata.ogDescription = twitterDescription.content;
        }
      } catch (e) {
        console.warn('Could not extract twitter:description:', e);
      }
    }

    // Fallback to description meta tag
    if (!metadata.ogDescription) {
      try {
        const description = document.querySelector('meta[name="description"]');
        if (description && description.content) {
          metadata.ogDescription = description.content;
        }
      } catch (e) {
        console.warn('Could not extract description:', e);
      }
    }

    // Try to get favicon
    try {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon && favicon.href) {
        metadata.favicon = favicon.href;
      }
    } catch (e) {
      console.warn('Could not extract favicon:', e);
    }

    // If title is just the domain, try to get better title from meta tags
    if (!metadata.title || metadata.title.length < 5) {
      try {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && ogTitle.content) {
          metadata.title = ogTitle.content;
        }
      } catch (e) {
        console.warn('Could not extract og:title:', e);
      }
    }

    return metadata;
  } catch (error) {
    console.error('Error in detectPageMetadata:', error);
    // Return minimal metadata even if extraction fails
    return {
      url: window.location.href,
      title: document.title || 'Untitled',
      selectedText: window.getSelection().toString(),
      ogImage: '',
      ogDescription: '',
      favicon: '',
    };
  }
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getPageMetadata') {
      // Handle async function
      detectPageMetadata().then(metadata => {
        sendResponse({ success: true, data: metadata });
      }).catch(error => {
        console.error('Error in detectPageMetadata:', error);
        sendResponse({ success: false, error: error.message });
      });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  return true; // Keep channel open for async response
});

// Optionally add a context menu item
try {
  chrome.runtime.sendMessage({
    action: 'registerContextMenu',
    data: { url: window.location.href, title: document.title }
  });
} catch (error) {
  console.warn('Could not register context menu:', error);
}

// ============================================================
// Session Sync: Read session from main app and sync to extension
// This runs on localhost:5173 (the main bookmark app)
// ============================================================

const EXTENSION_SESSION_KEY = 'bookmark_extension_session';
const BOOKMARK_APP_ORIGIN = 'http://localhost:5173';

// Check if we're on the bookmark app
function isBookmarkApp() {
  return window.location.origin === BOOKMARK_APP_ORIGIN;
}

// Sync stored session to the extension background script
async function syncSessionFromStorage() {
  if (!isBookmarkApp()) return;

  try {
    const sessionData = localStorage.getItem(EXTENSION_SESSION_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      chrome.runtime.sendMessage({ action: 'setSession', session }, (response) => {
        if (response?.success) {
          console.log('[Bookmark Extension] Session synced successfully');
        }
      });
    } else {
      // No session, clear extension session
      chrome.runtime.sendMessage({ action: 'clearSession' }, () => {
        console.log('[Bookmark Extension] Session cleared');
      });
    }
  } catch (error) {
    console.warn('[Bookmark Extension] Could not sync session:', error);
  }
}

// Listen for session updates from the AuthContext
if (isBookmarkApp()) {
  // Sync on page load
  syncSessionFromStorage();

  // Listen for session updates via custom event
  window.addEventListener('supabase-session-update', (event) => {
    const { session } = event.detail;
    if (session) {
      chrome.runtime.sendMessage({ action: 'setSession', session }, (response) => {
        if (response?.success) {
          console.log('[Bookmark Extension] Session updated from auth change');
        }
      });
    } else {
      chrome.runtime.sendMessage({ action: 'clearSession' }, () => {
        console.log('[Bookmark Extension] Session cleared from sign out');
      });
    }
  });

  // Also listen for localStorage changes (for cross-tab sync)
  window.addEventListener('storage', (event) => {
    if (event.key === EXTENSION_SESSION_KEY) {
      syncSessionFromStorage();
    }
  });
}
