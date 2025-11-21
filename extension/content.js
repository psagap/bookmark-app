/**
 * Content script that runs on every webpage
 * Extracts metadata about the current page
 */

// Detect content metadata from the current page
function detectPageMetadata() {
  const metadata = {
    url: window.location.href,
    title: document.title,
    selectedText: window.getSelection().toString(),
    ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
    ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
    favicon: document.querySelector('link[rel="icon"]')?.href || '',
  };

  return metadata;
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageMetadata') {
    const metadata = detectPageMetadata();
    sendResponse({ success: true, data: metadata });
  }
});

// Optionally add a context menu item
chrome.runtime.sendMessage({
  action: 'registerContextMenu',
  data: { url: window.location.href, title: document.title }
});
