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
// Only gets images from the FIRST/MAIN article (the tweet being viewed)
// Excludes quoted tweets, card previews, and nested content
function waitForTweetImages(timeout = 3000) {
  return new Promise((resolve) => {
    const images = [];

    // Helper to check if an element is inside quoted/nested content
    const isInsideQuotedOrNested = (element, mainArticle) => {
      let parent = element.parentElement;
      while (parent && parent !== mainArticle) {
        if (parent.getAttribute('data-testid') === 'quotedTweet') return true;
        if (parent.getAttribute('data-testid')?.includes('card')) return true;
        if (parent.tagName === 'ARTICLE') return true;
        parent = parent.parentElement;
      }
      return false;
    };

    // Helper to get images from main tweet only (excluding quoted/nested)
    const getMainTweetImages = () => {
      const mainArticle = document.querySelector('article');
      if (!mainArticle) return [];

      const imgs = [];
      // Use tweetPhoto data-testid for most reliable selection
      const photoContainers = mainArticle.querySelectorAll('[data-testid="tweetPhoto"] img');

      photoContainers.forEach(img => {
        if (isInsideQuotedOrNested(img, mainArticle)) return;
        if (!img.src) return;
        if (img.src.includes('profile_images')) return;
        if (img.src.includes('emoji')) return;
        if (imgs.includes(img.src)) return;
        imgs.push(img.src);
      });

      // Fallback to direct media URLs if no tweetPhoto found
      if (imgs.length === 0) {
        const mediaImages = mainArticle.querySelectorAll('img[src*="pbs.twimg.com/media"]');
        mediaImages.forEach(img => {
          if (isInsideQuotedOrNested(img, mainArticle)) return;
          if (!img.src) return;
          if (img.src.includes('profile_images')) return;
          if (imgs.includes(img.src)) return;
          imgs.push(img.src);
        });
      }

      return imgs;
    };

    // Check immediately first
    const immediateImages = getMainTweetImages();
    if (immediateImages.length > 0) {
      resolve(immediateImages);
      return;
    }

    // Set up observer for dynamic content
    const observer = new MutationObserver((mutations) => {
      const newImages = getMainTweetImages();
      if (newImages.length > 0) {
        observer.disconnect();
        resolve(newImages);
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
      cardImage: '', // Preview image from embedded links/cards
      cardUrl: '',   // URL of the embedded link
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

      // Try to get author name from DOM if not from title
      // X displays the author name in multiple places
      if (!data.authorName) {
        // Try the user name display in the tweet header
        const userNameSelectors = [
          'article [data-testid="User-Name"] span span', // Primary selector
          'article div[dir="ltr"] span span', // Fallback
          'article a[role="link"][href*="/status"] span', // Link-based
        ];

        for (const selector of userNameSelectors) {
          const nameEl = document.querySelector(selector);
          if (nameEl && nameEl.textContent && !nameEl.textContent.startsWith('@')) {
            const name = nameEl.textContent.trim();
            // Filter out engagement numbers and common UI text
            if (name && name.length > 1 && !name.match(/^\d+[KMB]?$/) && name !== 'X') {
              data.authorName = name;
              break;
            }
          }
        }
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

      // Extract media (images and videos) from MAIN TWEET ONLY
      // IMPORTANT: Exclude quoted tweets, embedded content, replies, and ads
      data.tweetMedia = [];

      // Get the first/main article - this is the tweet being viewed
      // CRITICAL: Only get the FIRST article element, which should be the focal tweet
      const mainTweetArticle = document.querySelector('article[data-testid="tweet"]') || document.querySelector('article');

      if (mainTweetArticle) {
        // Helper function to check if an element is inside a quoted tweet, nested content, or reply
        const isInsideQuotedOrNested = (element) => {
          let parent = element.parentElement;
          let articleCount = 0;

          while (parent) {
            // Stop when we reach the main article
            if (parent === mainTweetArticle) break;

            // Check for quoted tweet containers
            if (parent.getAttribute('data-testid') === 'quotedTweet') return true;
            // Check for card wrappers (embedded links/previews)
            if (parent.getAttribute('data-testid')?.includes('card')) return true;
            // Check for nested articles (replies in thread view)
            if (parent.tagName === 'ARTICLE') {
              articleCount++;
              // If we've passed through another article before reaching mainTweetArticle,
              // this element is NOT in the main tweet
              if (articleCount > 0) return true;
            }
            // Check for promoted/sponsored content
            if (parent.getAttribute('data-testid')?.includes('promoted')) return true;

            parent = parent.parentElement;
          }
          return false;
        };

        // Helper to verify element is actually a child of the main article
        const isDirectChildOfMainTweet = (element) => {
          let parent = element.parentElement;
          while (parent) {
            if (parent === mainTweetArticle) return true;
            // If we hit another article first, it's not a direct child
            if (parent.tagName === 'ARTICLE' && parent !== mainTweetArticle) return false;
            parent = parent.parentElement;
          }
          return false;
        };

        // Get the main tweet's text element to help identify the tweet's content area
        const tweetTextEl = mainTweetArticle.querySelector('[data-testid="tweetText"]');

        // Find the tweet content container - media should be a sibling/near the tweet text
        // X structures tweets as: [user info] -> [tweet text] -> [media] -> [engagement]
        const tweetContentContainer = tweetTextEl?.parentElement?.parentElement;

        // Multiple image selectors to try - scoped to main tweet only
        const imageSelectors = [
          '[data-testid="tweetPhoto"] img',   // Most reliable - X's photo container
          'img[src*="pbs.twimg.com/media"]',  // Direct media URLs
        ];

        // Try each image selector within the main tweet article
        for (const selector of imageSelectors) {
          const images = mainTweetArticle.querySelectorAll(selector);
          images.forEach(img => {
            // Skip if not a direct child of main tweet
            if (!isDirectChildOfMainTweet(img)) return;
            // Skip if inside quoted tweet or nested content
            if (isInsideQuotedOrNested(img)) return;
            // Skip profile images
            if (img.src?.includes('profile_images')) return;
            // Skip emoji images
            if (img.src?.includes('emoji')) return;
            // Skip ad/sponsored images
            if (img.src?.includes('ad_') || img.src?.includes('sponsored')) return;
            // Skip external card preview images (not the main tweet media)
            if (img.closest('[data-testid="card.wrapper"]') && !img.closest('[data-testid="tweetPhoto"]')) return;
            // Skip already added
            if (data.tweetMedia.find(m => m.url === img.src)) return;

            if (img.src) {
              data.tweetMedia.push({ type: 'image', url: img.src });
            }
          });
          if (data.tweetMedia.length > 0) break; // Stop if we found images
        }

        // Try video selectors within the main tweet article (excluding quoted/nested)
        const videoSelectors = [
          '[data-testid="videoPlayer"] video',
          '[data-testid="videoComponent"] video',
          'video'
        ];

        for (const selector of videoSelectors) {
          const videos = mainTweetArticle.querySelectorAll(selector);
          for (const video of videos) {
            // Skip if not a direct child of main tweet
            if (!isDirectChildOfMainTweet(video)) continue;
            // Skip if inside quoted tweet or nested content
            if (isInsideQuotedOrNested(video)) continue;

            const source = video.querySelector('source');
            let videoUrl = source?.src || video.src || '';

            // Filter out blob URLs - they don't work outside this browser session
            if (videoUrl.startsWith('blob:') || !videoUrl) {
              const mp4Source = video.parentElement?.querySelector('source[type="video/mp4"]');
              if (mp4Source?.src && !mp4Source.src.startsWith('blob:')) {
                videoUrl = mp4Source.src;
              }
            }

            const posterUrl = video.poster || '';

            if (videoUrl || posterUrl) {
              data.tweetMedia.push({
                type: 'video',
                url: videoUrl,
                poster: posterUrl
              });
              break; // Only get first video from main tweet
            }
          }
          if (data.tweetMedia.some(m => m.type === 'video')) break;
        }
      }

      // If still no media, wait for dynamic content (but also filter quoted tweets)
      if (data.tweetMedia.length === 0) {
        const images = await waitForTweetImages(2000);
        // waitForTweetImages already filters to main article only
        images.forEach(url => data.tweetMedia.push({ type: 'image', url }));
      }

      // Extract card/link preview image (for tweets with embedded links)
      // X shows preview cards for URLs in tweets - this captures that image
      // IMPORTANT: Only extract from main tweet article, not replies
      try {
        if (mainTweetArticle) {
          // Card wrapper selectors (X uses various test IDs) - scoped to main tweet
          const cardSelectors = [
            '[data-testid="card.wrapper"]',
            '[data-testid="card.layoutLarge.media"]',
            '[data-testid="card.layoutSmall.media"]',
            '[data-testid="card.layoutSmall.detail"]',
            'div[data-testid="tweetPhoto"]'
          ];

          for (const selector of cardSelectors) {
            const cardEl = mainTweetArticle.querySelector(selector);
            if (cardEl) {
              // Try to get image from card
              const cardImages = cardEl.querySelectorAll('img');
              for (const cardImg of cardImages) {
                if (cardImg.src && !cardImg.src.includes('profile_images') && !cardImg.src.includes('emoji')) {
                  data.cardImage = cardImg.src;
                  break;
                }
              }
              if (data.cardImage) break;

              // Check for background-image style on card or children
              const bgElements = [cardEl, ...cardEl.querySelectorAll('*')];
              for (const el of bgElements) {
                const bgStyle = window.getComputedStyle(el).backgroundImage;
                if (bgStyle && bgStyle !== 'none' && bgStyle.includes('url')) {
                  const urlMatch = bgStyle.match(/url\(["']?([^"')]+)["']?\)/);
                  if (urlMatch && urlMatch[1] && urlMatch[1].includes('twimg.com')) {
                    data.cardImage = urlMatch[1];
                    break;
                  }
                }
              }
              if (data.cardImage) break;
            }
          }

          // Try to get the linked URL from the card - scoped to main tweet
          const cardLink = mainTweetArticle.querySelector('[data-testid="card.wrapper"] a[href]');
          if (cardLink) {
            data.cardUrl = cardLink.href;
          }

          // If card is a quoted tweet, try to get its content - scoped to main tweet
          const quotedTweet = mainTweetArticle.querySelector('[data-testid="quotedTweet"]');
          if (quotedTweet) {
            // Get images from quoted tweet
            const quotedImages = quotedTweet.querySelectorAll('img');
            for (const img of quotedImages) {
              if (img.src && !img.src.includes('profile_images') && !img.src.includes('emoji')) {
                data.cardImage = img.src;
                break;
              }
            }

            // Get the quoted tweet link
            const quotedLink = quotedTweet.querySelector('a[href*="/status/"]');
            if (quotedLink) {
              data.cardUrl = quotedLink.href;
            }
          }
        }
      } catch (cardError) {
        console.warn('Could not extract card data:', cardError);
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
        console.log('[Content Script] Found og:image:', metadata.ogImage);
      }
    } catch (e) {
      console.warn('Could not extract og:image:', e);
    }

    // For Twitter, also check twitter:image meta tag specifically
    if (isTwitterPage(url)) {
      try {
        const twitterImage = document.querySelector('meta[name="twitter:image"], meta[property="twitter:image"]');
        if (twitterImage && twitterImage.content) {
          console.log('[Content Script] Found twitter:image:', twitterImage.content);
          if (!metadata.ogImage) {
            metadata.ogImage = twitterImage.content;
          }
        }
      } catch (e) {
        console.warn('Could not extract twitter:image:', e);
      }
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
  }, () => {
    // Check for errors silently - this is expected to fail on non-extension pages
    if (chrome.runtime.lastError) {
      // Silently ignore - this is normal when the extension isn't active
    }
  });
} catch (error) {
  // Extension context may be invalid - this is normal on some pages
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

// Safe sendMessage wrapper that handles errors gracefully
function safeSendMessage(message, callback) {
  try {
    if (!chrome.runtime?.id) {
      // Extension context is invalid
      return;
    }
    chrome.runtime.sendMessage(message, (response) => {
      // Always check for lastError first to prevent uncaught errors
      if (chrome.runtime.lastError) {
        // Silently ignore - service worker may be inactive
        return;
      }
      callback?.(response);
    });
  } catch (error) {
    // Extension context may be invalid - this is normal
  }
}

// Sync stored session to the extension background script
async function syncSessionFromStorage() {
  if (!isBookmarkApp()) return;

  try {
    const sessionData = localStorage.getItem(EXTENSION_SESSION_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      safeSendMessage({ action: 'setSession', session }, (response) => {
        if (response?.success) {
          console.log('[Bookmark Extension] Session synced successfully');
        }
      });
    } else {
      // No session, clear extension session
      safeSendMessage({ action: 'clearSession' }, () => {
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
      safeSendMessage({ action: 'setSession', session }, (response) => {
        if (response?.success) {
          console.log('[Bookmark Extension] Session updated from auth change');
        }
      });
    } else {
      safeSendMessage({ action: 'clearSession' }, () => {
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
