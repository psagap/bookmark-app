/**
 * Popup controller
 * Handles UI state, timer, note/tag input, and bookmark saving
 */

const TIMEOUT_SECONDS = 7;
let timeoutId = null;
let timerInterval = null;
let remainingSeconds = TIMEOUT_SECONDS;
let pageMetadata = null;
let tags = [];

// DOM Elements
const confirmationState = document.getElementById('confirmation-state');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');

const timerProgress = document.getElementById('timer-progress');
const timerSeconds = document.getElementById('timer-seconds');
const noteInput = document.getElementById('note-input');
const tagsInput = document.getElementById('tags-input');
const tagsList = document.getElementById('tags-list');
const charCount = document.getElementById('char-count');
const previewTitle = document.getElementById('preview-title');
const previewUrl = document.getElementById('preview-url');

const saveBtn = document.getElementById('save-btn');
const closeBtn = document.getElementById('close-btn');
const retryBtn = document.getElementById('retry-btn');
const errorCloseBtn = document.getElementById('error-close-btn');
const errorMessage = document.getElementById('error-message');

// Initialize popup
async function init() {
  try {
    // Get page metadata from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'getPageMetadata' }, (response) => {
      if (response && response.success) {
        pageMetadata = response.data;
        showConfirmationState();
        startTimer();
      } else {
        showError('Could not detect page content');
      }
    });
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  }
}

// Show confirmation state and update preview
function showConfirmationState() {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  confirmationState.classList.remove('hidden');

  previewTitle.textContent = pageMetadata.title || 'Untitled';
  previewUrl.textContent = new URL(pageMetadata.url).hostname;

  // Focus note input
  noteInput.focus();
}

// Timer countdown (7 seconds)
function startTimer() {
  remainingSeconds = TIMEOUT_SECONDS;
  timerProgress.style.width = '100%';

  timerInterval = setInterval(() => {
    remainingSeconds--;
    timerSeconds.textContent = remainingSeconds;
    timerProgress.style.width = `${(remainingSeconds / TIMEOUT_SECONDS) * 100}%`;

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      saveBookmark();
    }
  }, 1000);
}

// Reset timer (called when user types)
function resetTimer() {
  clearInterval(timerInterval);
  startTimer();
}

// Add tag
function addTag(tagText) {
  const tag = tagText.trim().toLowerCase();
  if (tag && !tags.includes(tag)) {
    tags.push(tag);
    renderTags();
    tagsInput.value = '';
  }
}

// Remove tag
function removeTag(tag) {
  tags = tags.filter(t => t !== tag);
  renderTags();
}

// Render tags
function renderTags() {
  tagsList.innerHTML = tags
    .map(tag => `
      <div class="tag">
        <span>${tag}</span>
        <span class="tag-remove" data-tag="${tag}">×</span>
      </div>
    `)
    .join('');

  // Add click handlers for remove buttons
  tagsList.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => removeTag(e.target.dataset.tag));
  });
}

// Save bookmark
async function saveBookmark() {
  clearInterval(timerInterval);

  confirmationState.classList.add('hidden');
  loadingState.classList.remove('hidden');

  try {
    const bookmark = {
      url: pageMetadata.url,
      title: pageMetadata.title || 'Untitled',
      notes: noteInput.value,
      tags: tags,
      selectedText: pageMetadata.selectedText,
      thumbnail: pageMetadata.ogImage,
    };

    // Send to background script to save
    chrome.runtime.sendMessage(
      { action: 'saveBookmark', data: bookmark },
      (response) => {
        if (response.success) {
          showSuccess(response.data);
        } else {
          showError(response.error || 'Failed to save bookmark');
        }
      }
    );
  } catch (error) {
    showError(error.message);
  }
}

// Show success and close
function showSuccess(result) {
  setTimeout(() => {
    if (result.source === 'offline') {
      showConfirmationState();
      setStatus('Saved offline - will sync when online');
    } else {
      window.close();
    }
  }, 1000);
}

// Show error state
function showError(message) {
  loadingState.classList.add('hidden');
  confirmationState.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorMessage.textContent = message;
}

// Set status message
function setStatus(message) {
  const status = document.createElement('div');
  status.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #51cf66;
    color: white;
    padding: 8px;
    text-align: center;
    font-size: 12px;
    z-index: 1000;
  `;
  status.textContent = message;
  document.body.appendChild(status);
  setTimeout(() => status.remove(), 3000);
}

// Event listeners
noteInput.addEventListener('input', () => {
  resetTimer();
  charCount.textContent = noteInput.value.length;
});

tagsInput.addEventListener('keydown', (e) => {
  resetTimer();
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTag(tagsInput.value);
  }
});

tagsInput.addEventListener('blur', () => {
  if (tagsInput.value.trim()) {
    addTag(tagsInput.value);
  }
});

saveBtn.addEventListener('click', saveBookmark);
closeBtn.addEventListener('click', () => window.close());
retryBtn.addEventListener('click', init);
errorCloseBtn.addEventListener('click', () => window.close());

// Start the extension
init();
