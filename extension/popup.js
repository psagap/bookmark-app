// ============================================
// Thinkback Extension - Popup Controller
// ============================================

// Elements
const badgeCard = document.getElementById('badgeCard');
const borderSvg = document.getElementById('borderSvg');
const detailsSection = document.getElementById('detailsSection');
const arrowIcon = document.getElementById('arrowIcon');
const iconWrapper = document.getElementById('iconWrapper');
const logo = document.getElementById('logo');
const label = document.getElementById('label');
const title = document.getElementById('title');
const source = document.getElementById('source');
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const timerProgress = document.getElementById('timerProgress');
const tagChips = document.getElementById('tagChips');
const tagInput = document.getElementById('tagInput');
const addTagBtn = document.getElementById('addTagBtn');
const selectedTagsSection = document.getElementById('selectedTagsSection');
const selectedTags = document.getElementById('selectedTags');

// State
let isOpen = false;
let selectedTagsList = [];
let currentBookmarkId = null;
let running = false;
let paused = false;
let start = 0;
let remaining = 6000; // 6 seconds

// ============================================
// Toggle Details Section
// ============================================

function toggleDetails() {
  isOpen = !isOpen;
  detailsSection.classList.toggle('open', isOpen);
  arrowIcon.classList.toggle('open', isOpen);

  // Pause timer when details are open
  if (isOpen && running) {
    paused = true;
    remaining -= performance.now() - start;
  }
}

badgeCard.addEventListener('click', (e) => {
  // Don't toggle if clicking on input or buttons inside
  if (e.target.closest('.tag-input') || e.target.closest('.tag-add-btn') || e.target.closest('.tag-chip')) {
    return;
  }
  toggleDetails();
});

// ============================================
// Timer
// ============================================

badgeCard.addEventListener('mouseenter', () => {
  if (running && !isOpen) {
    paused = true;
    remaining -= performance.now() - start;
  }
});

badgeCard.addEventListener('mouseleave', () => {
  if (running && paused && !isOpen) {
    paused = false;
    start = performance.now();
  }
});

function tick() {
  if (!running) return;
  if (paused) return requestAnimationFrame(tick);

  const left = remaining - (performance.now() - start);
  timerProgress.style.transform = `scaleX(${Math.max(0, left / 6000)})`;

  if (left <= 0) window.close();
  else requestAnimationFrame(tick);
}

function startTimer() {
  running = true;
  start = performance.now();
  remaining = 6000;
  tick();
}

// ============================================
// Tag Management
// ============================================

function addTag(tag) {
  const normalizedTag = tag.trim().toLowerCase();
  if (!normalizedTag || selectedTagsList.includes(normalizedTag)) return;

  selectedTagsList.push(normalizedTag);
  updateSelectedTagsUI();
  updateTagChipsUI();
  saveTagsToBookmark();
}

function removeTag(tag) {
  selectedTagsList = selectedTagsList.filter(t => t !== tag);
  updateSelectedTagsUI();
  updateTagChipsUI();
  saveTagsToBookmark();
}

function updateSelectedTagsUI() {
  if (selectedTagsList.length === 0) {
    selectedTagsSection.style.display = 'none';
    return;
  }

  selectedTagsSection.style.display = 'block';
  selectedTags.innerHTML = selectedTagsList.map(tag => `
    <span class="selected-tag">
      ${tag}
      <button onclick="removeTag('${tag}')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </span>
  `).join('');
}

function updateTagChipsUI() {
  document.querySelectorAll('.tag-chip').forEach(chip => {
    const tag = chip.dataset.tag;
    chip.classList.toggle('selected', selectedTagsList.includes(tag));
  });
}

// Tag chip clicks
tagChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.tag-chip');
  if (!chip) return;

  const tag = chip.dataset.tag;
  if (selectedTagsList.includes(tag)) {
    removeTag(tag);
  } else {
    addTag(tag);
  }
});

// Custom tag input
tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && tagInput.value.trim()) {
    e.preventDefault();
    addTag(tagInput.value);
    tagInput.value = '';
  }
});

addTagBtn.addEventListener('click', () => {
  if (tagInput.value.trim()) {
    addTag(tagInput.value);
    tagInput.value = '';
  }
});

// Save tags to bookmark
async function saveTagsToBookmark() {
  if (!currentBookmarkId) return;

  try {
    await chrome.runtime.sendMessage({
      action: 'updateBookmarkTags',
      data: {
        id: currentBookmarkId,
        tags: selectedTagsList
      }
    });
  } catch (error) {
    console.error('Failed to save tags:', error);
  }
}

// ============================================
// UI State Updates
// ============================================

function setSaving() {
  badgeCard.classList.add('saving');
  logo.classList.add('saving');
  label.textContent = 'Saving bookmark...';
  label.classList.remove('success', 'error');
  statusText.textContent = 'Saving';
  statusPill.classList.remove('success', 'error');
}

function setSuccess(pageTitle, sourceType) {
  badgeCard.classList.remove('saving');
  badgeCard.classList.add('success');
  borderSvg.classList.add('active', 'success');
  iconWrapper.classList.add('success');
  logo.classList.remove('saving');
  logo.classList.add('success');

  label.textContent = 'Bookmark saved';
  label.classList.add('success');
  title.textContent = pageTitle || 'Untitled';
  source.textContent = sourceType || 'Web';

  statusText.textContent = 'Saved';
  statusPill.classList.add('success');
  timerProgress.classList.add('success');

  startTimer();
}

function setError(message) {
  badgeCard.classList.remove('saving');
  badgeCard.classList.add('error');
  iconWrapper.classList.add('error');
  logo.classList.remove('saving');

  label.textContent = 'Failed to save';
  label.classList.add('error');
  title.textContent = message || 'Unknown error';
  source.textContent = 'Please try again';

  statusText.textContent = 'Error';
  statusPill.classList.add('error');
  timerProgress.classList.add('error');

  setTimeout(() => window.close(), 4000);
}

function setLogin() {
  logo.classList.remove('saving');
  label.textContent = 'Sign in required';
  label.classList.remove('success', 'error');
  title.textContent = 'Click to open app';
  source.textContent = 'Authentication needed';
  statusText.textContent = 'Login';
  arrowIcon.style.display = 'none';

  badgeCard.onclick = () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
    window.close();
  };
}

// ============================================
// Main Execution
// ============================================

(async () => {
  try {
    setSaving();

    // Check auth
    const auth = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    if (!auth?.authenticated) return setLogin();

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageTitle = tab.title?.slice(0, 40) || 'Untitled';
    title.textContent = pageTitle;

    // Try to get page metadata
    let meta = { url: tab.url, title: tab.title };
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { action: 'getPageMetadata' });
      if (res?.success) meta = res.data;
    } catch {}

    // Detect source type
    const url = (meta.url || '').toLowerCase();
    let category = 'Article';
    let sourceType = 'Web';

    if (url.includes('twitter.com') || url.includes('x.com')) {
      category = 'X';
      sourceType = 'X (Twitter)';
    } else if (url.includes('youtube.com')) {
      category = 'YouTube';
      sourceType = 'YouTube';
    } else if (url.includes('github.com')) {
      category = 'GitHub';
      sourceType = 'GitHub';
    } else if (url.includes('reddit.com')) {
      category = 'Reddit';
      sourceType = 'Reddit';
    } else if (url.includes('medium.com')) {
      category = 'Article';
      sourceType = 'Medium';
    } else if (url.includes('linkedin.com')) {
      category = 'LinkedIn';
      sourceType = 'LinkedIn';
    }

    // Save bookmark
    const result = await chrome.runtime.sendMessage({
      action: 'saveBookmark',
      data: {
        url: meta.url,
        title: meta.title,
        category: category,
        source: sourceType,
        tags: [],
        notes: '',
        thumbnail: meta.ogImage || '',
        metadata: {
          ogDescription: meta.ogDescription,
          tweetData: meta.tweetData
        }
      }
    });

    if (result?.success) {
      currentBookmarkId = result.data?.bookmark?.id;
      setSuccess(pageTitle, sourceType);
    } else {
      setError(result?.error || 'Failed to save');
    }
  } catch (error) {
    setError(error.message);
  }
})();
