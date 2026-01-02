// Auto-detect source/category from URL
function detectSource(url) {
  const urlLower = url.toLowerCase();

  // X/Twitter
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    const isThread = urlLower.includes('/status/') && document.title?.includes('Thread');
    return {
      category: 'X',
      subCategory: isThread ? 'thread' : 'tweet',
      source: 'X'
    };
  }

  // Instagram
  if (urlLower.includes('instagram.com')) {
    let subCategory = 'post';
    if (urlLower.includes('/reel/')) subCategory = 'reel';
    else if (urlLower.includes('/stories/')) subCategory = 'story';
    return { category: 'Instagram', subCategory, source: 'Instagram' };
  }

  // Substack
  if (urlLower.includes('substack.com') || urlLower.includes('.substack.')) {
    return { category: 'Substack', subCategory: 'article', source: 'Substack' };
  }

  // YouTube
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    let subCategory = 'video';
    if (urlLower.includes('/shorts/')) subCategory = 'short';
    if (urlLower.includes('/playlist')) subCategory = 'playlist';
    return { category: 'YouTube', subCategory, source: 'YouTube' };
  }

  // Wikipedia
  if (urlLower.includes('wikipedia.org')) {
    return { category: 'Wikipedia', subCategory: 'article', source: 'Wikipedia' };
  }

  // GitHub
  if (urlLower.includes('github.com')) {
    let subCategory = 'repo';
    if (urlLower.includes('/issues/')) subCategory = 'issue';
    else if (urlLower.includes('/pull/')) subCategory = 'pr';
    else if (urlLower.includes('/discussions/')) subCategory = 'discussion';
    return { category: 'GitHub', subCategory, source: 'GitHub' };
  }

  // Reddit
  if (urlLower.includes('reddit.com')) {
    return { category: 'Reddit', subCategory: 'post', source: 'Reddit' };
  }

  // Medium
  if (urlLower.includes('medium.com')) {
    return { category: 'Medium', subCategory: 'article', source: 'Medium' };
  }

  // LinkedIn
  if (urlLower.includes('linkedin.com')) {
    let subCategory = 'post';
    if (urlLower.includes('/article/')) subCategory = 'article';
    return { category: 'LinkedIn', subCategory, source: 'LinkedIn' };
  }

  // TikTok
  if (urlLower.includes('tiktok.com')) {
    return { category: 'TikTok', subCategory: 'video', source: 'TikTok' };
  }

  // Default: extract domain as source
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const domain = hostname.split('.')[0];
    const sourceName = domain.charAt(0).toUpperCase() + domain.slice(1);
    return { category: 'Article', subCategory: 'webpage', source: sourceName };
  } catch {
    return { category: 'Article', subCategory: 'webpage', source: 'Web' };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const timerLine = document.getElementById('timer-line');
  const pageTitle = document.getElementById('page-title');
  const pageDomain = document.getElementById('page-domain');
  const tagsInput = document.getElementById('tags-input');
  const noteInput = document.getElementById('note-input');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const retryBtn = document.getElementById('retry-btn');
  const openAppBtn = document.getElementById('open-app-btn');

  const loginState = document.getElementById('login-state');
  const inputState = document.getElementById('main-content');
  const successState = document.getElementById('success-state');
  const errorState = document.getElementById('error-state');

  let currentMetadata = null;
  let timerInterval;
  const TOTAL_TIME = 7000; // 7 seconds
  let timeLeft = TOTAL_TIME;
  let isPaused = false;

  // Check authentication first
  const checkAuth = () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
        resolve(response?.authenticated || false);
      });
    });
  };

  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    // Show login required state
    loginState.classList.remove('hidden');
    timerLine.parentElement.classList.add('hidden');

    openAppBtn.addEventListener('click', () => {
      // Open the main app for login
      chrome.tabs.create({ url: 'http://localhost:5173' });
      window.close();
    });
    return; // Don't proceed further
  }

  // User is authenticated, show main content
  inputState.classList.remove('hidden');

  // Initialize
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Optimistically set title/domain
    pageTitle.textContent = tab.title;
    try {
      pageDomain.textContent = new URL(tab.url).hostname;
    } catch (e) {
      pageDomain.textContent = tab.url;
    }

    // Request full metadata
    chrome.tabs.sendMessage(tab.id, { action: 'getPageMetadata' }, (response) => {
      if (chrome.runtime.lastError) {
        // Fallback
        currentMetadata = {
          url: tab.url,
          title: tab.title,
          favicon: tab.favIconUrl
        };
      } else if (response && response.success) {
        currentMetadata = response.data;
        pageTitle.textContent = currentMetadata.title || tab.title;
      }

      // Auto-tagging after metadata is ready
      generateAutoTags(currentMetadata);
    });

    // Start Timer
    startTimer();

  } catch (err) {
    console.error(err);
    showError('Could not connect to page.');
  }

  function startTimer() {
    const startTime = Date.now();
    const endTime = startTime + timeLeft;

    timerInterval = setInterval(() => {
      if (isPaused) return;

      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerLine.style.width = '0%';
        saveBookmark(); // Auto-save when timer ends
      } else {
        const percentage = (remaining / TOTAL_TIME) * 100;
        timerLine.style.width = `${percentage}%`;
      }
    }, 16); // ~60fps
  }

  function pauseTimer() {
    isPaused = true;
    timerLine.style.opacity = '0.5';
  }

  function generateAutoTags(metadata) {
    if (!metadata) return;
    const tags = [];
    const url = metadata.url.toLowerCase();

    // Auto-tags based on detected source
    if (url.includes('youtube') || url.includes('youtu.be')) tags.push('video');
    if (url.includes('twitter') || url.includes('x.com')) tags.push('social');
    if (url.includes('instagram')) tags.push('social');
    if (url.includes('substack')) tags.push('newsletter', 'read');
    if (url.includes('github')) tags.push('code', 'dev');
    if (url.includes('medium') || url.includes('dev.to')) tags.push('article', 'read');
    if (url.includes('wikipedia')) tags.push('reference', 'learn');
    if (url.includes('reddit')) tags.push('discussion', 'social');
    if (url.includes('linkedin')) tags.push('professional', 'social');
    if (url.includes('tiktok')) tags.push('video', 'social');
    if (url.includes('design') || url.includes('dribbble') || url.includes('figma')) tags.push('design', 'inspiration');

    // Set tags if any found
    if (tags.length > 0) {
      tagsInput.value = tags.join(', ');
    }
  }

  // User Interaction pauses timer
  [tagsInput, noteInput].forEach(input => {
    input.addEventListener('focus', pauseTimer);
    input.addEventListener('input', pauseTimer);
  });

  // Save Handler
  async function saveBookmark() {
    clearInterval(timerInterval);

    if (!currentMetadata) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentMetadata = { url: tab.url, title: tab.title, favicon: tab.favIconUrl };
    }

    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
    const notes = noteInput.value.trim();

    // Auto-detect source from URL
    const { category, subCategory, source } = detectSource(currentMetadata.url);

    const bookmarkData = {
      url: currentMetadata.url,
      title: currentMetadata.title,
      category,
      subCategory,
      source,
      tags,
      notes,
      thumbnail: currentMetadata.ogImage || currentMetadata.wikipediaData?.thumbnail || '',
      metadata: {
        ogDescription: currentMetadata.ogDescription,
        tweetData: currentMetadata.tweetData,
        wikipediaData: currentMetadata.wikipediaData
      }
    };

    // Send to background
    chrome.runtime.sendMessage({ action: 'saveBookmark', data: bookmarkData }, (response) => {
      if (chrome.runtime.lastError) {
        showError('Background service error.');
      } else if (response && response.success) {
        showSuccess();
      } else {
        showError(response?.error || 'Failed to save.');
      }
    });
  }

  saveBtn.addEventListener('click', saveBookmark);

  cancelBtn.addEventListener('click', () => {
    window.close();
  });

  retryBtn.addEventListener('click', () => {
    errorState.classList.add('hidden');
    inputState.classList.remove('hidden');
    startTimer();
  });

  function showSuccess() {
    inputState.classList.add('hidden');
    timerLine.parentElement.classList.add('hidden'); // Hide timer
    successState.classList.remove('hidden');

    setTimeout(() => {
      window.close();
    }, 2000);
  }

  function showError(msg) {
    inputState.classList.add('hidden');
    errorState.classList.remove('hidden');
    document.getElementById('error-message').textContent = msg;
  }
});
