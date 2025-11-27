// Bookmark Web App - Frontend Logic
const API_URL = 'http://localhost:3000/api';

let allBookmarks = [];
let filteredBookmarks = [];
let currentFilters = {
  category: null,
  search: '',
};
let selectedBookmarkId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadBookmarks();
  setupEventListeners();
  setupCategoryFilters();
});

// Load bookmarks from server
async function loadBookmarks() {
  try {
    const response = await fetch(`${API_URL}/bookmarks`);
    if (!response.ok) throw new Error('Failed to load bookmarks');

    allBookmarks = await response.json();
    updateStats();
    applyFilters();
    renderBookmarks();
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    showAlert('Failed to load bookmarks. Make sure the server is running!', 'error');
  }
}

// Update statistics
function updateStats() {
  const stats = {
    total: allBookmarks.length,
    video: 0,
    text: 0,
    audio: 0,
    image: 0,
  };

  allBookmarks.forEach(bookmark => {
    stats[bookmark.category] = (stats[bookmark.category] || 0) + 1;
  });

  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statVideos').textContent = stats.video;
  document.getElementById('statText').textContent = stats.text;
  document.getElementById('statAudio').textContent = stats.audio;
  document.getElementById('statImages').textContent = stats.image;
}

// Setup category filters
function setupCategoryFilters() {
  const categories = ['All', 'video', 'text', 'audio', 'image'];
  const categoryIcons = {
    All: '📑',
    video: '🎬',
    text: '📄',
    audio: '🎵',
    image: '🖼️',
  };

  const container = document.getElementById('categoryFilters');
  container.innerHTML = categories.map(cat => `
    <button class="filter-btn ${cat === 'All' ? 'active' : ''}" data-category="${cat === 'All' ? 'all' : cat}">
      ${categoryIcons[cat]} ${capitalizeFirst(cat)}
    </button>
  `).join('');

  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      e.target.classList.add('active');

      const category = e.target.dataset.category;
      currentFilters.category = category === 'all' ? null : category;
      applyFilters();
      renderBookmarks();
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    applyFilters();
    renderBookmarks();
  });

  document.getElementById('addBtn').addEventListener('click', () => {
    clearAddForm();
    document.getElementById('addModal').classList.add('active');
  });

  document.getElementById('addForm').addEventListener('submit', handleAddSubmit);
  document.getElementById('editForm').addEventListener('submit', handleEditSubmit);

  document.getElementById('addModalClose').addEventListener('click', () => {
    document.getElementById('addModal').classList.remove('active');
  });

  document.getElementById('addModalCloseBtn').addEventListener('click', () => {
    document.getElementById('addModal').classList.remove('active');
  });

  document.getElementById('editModalClose').addEventListener('click', () => {
    document.getElementById('editModal').classList.remove('active');
  });

  document.getElementById('editModalCloseBtn').addEventListener('click', () => {
    document.getElementById('editModal').classList.remove('active');
  });

  document.getElementById('deleteBtn').addEventListener('click', handleDelete);

  // Close modals on background click
  document.getElementById('addModal').addEventListener('click', (e) => {
    if (e.target.id === 'addModal') {
      document.getElementById('addModal').classList.remove('active');
    }
  });

  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target.id === 'editModal') {
      document.getElementById('editModal').classList.remove('active');
    }
  });
}

// Apply filters
function applyFilters() {
  filteredBookmarks = allBookmarks.filter(bookmark => {
    const categoryMatch = !currentFilters.category || bookmark.category === currentFilters.category;
    const searchMatch = !currentFilters.search ||
      bookmark.title.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
      (bookmark.metadata?.selectedText || '').toLowerCase().includes(currentFilters.search.toLowerCase());

    return categoryMatch && searchMatch;
  });
}

// Render bookmarks
function renderBookmarks() {
  const loadingState = document.getElementById('loadingState');
  const contentState = document.getElementById('contentState');
  const gallery = document.getElementById('gallery');
  const emptyState = document.getElementById('emptyState');

  loadingState.style.display = 'none';
  contentState.style.display = 'block';

  if (filteredBookmarks.length === 0) {
    gallery.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  gallery.style.display = 'grid';
  emptyState.style.display = 'none';

  gallery.innerHTML = filteredBookmarks.map(bookmark => createBookmarkCard(bookmark)).join('');

  // Add event listeners to cards
  gallery.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;

    const btn = e.target.closest('.card-action-btn');
    if (btn) {
      e.stopPropagation();
      const bookmarkId = card.dataset.id;
      if (btn.textContent.includes('Open')) {
        const bookmark = filteredBookmarks.find(b => b.id === bookmarkId);
        window.open(bookmark.url, '_blank');
      }
      return;
    }

    const bookmarkId = card.dataset.id;
    openEditModal(bookmarkId);
  });
}

// Create bookmark card HTML
function createBookmarkCard(bookmark) {
  // Check if this is a tweet
  if (bookmark.metadata?.tweet) {
    return createTweetCard(bookmark);
  }

  const categoryIcons = {
    video: '🎬',
    text: '📄',
    audio: '🎵',
    image: '🖼️',
  };

  const icon = categoryIcons[bookmark.category] || '📑';
  const image = bookmark.thumbnail ? `<img src="${bookmark.thumbnail}" alt="${bookmark.title}">` : icon;
  const tagsHtml = bookmark.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('');
  const date = new Date(bookmark.createdAt).toLocaleDateString();

  let contentHtml = `<span class="card-meta">${date}</span>`;
  if (bookmark.metadata?.selectedText) {
    contentHtml = `<div class="card-quote">${escapeHtml(bookmark.metadata.selectedText)}</div>`;
  }

  return `
    <div class="card" data-id="${bookmark.id}">
      <div class="card-image">${image}</div>
      <div class="card-content">
        <span class="card-category">${bookmark.subCategory || bookmark.category}</span>
        <div class="card-title">${escapeHtml(bookmark.title)}</div>
        ${contentHtml}
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="card-action-btn">✏️ Edit</button>
        <button class="card-action-btn">🔗 Open</button>
      </div>
    </div>
  `;
}

// Create tweet card HTML with author handle and tweet title
function createTweetCard(bookmark) {
  const tweet = bookmark.metadata.tweet;
  const handle = tweet.authorHandle || '@user';
  const title = tweet.tweetTitle || bookmark.title;
  const date = new Date(bookmark.createdAt).toLocaleDateString();
  const tagsHtml = bookmark.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('');

  return `
    <div class="card tweet-card" data-id="${bookmark.id}">
      <div class="tweet-header">
        <div class="tweet-author-info">
          <div class="tweet-avatar-placeholder">𝕏</div>
          <div class="tweet-author-details">
            <div class="tweet-author-name">Tweet</div>
            <div class="tweet-author-handle">${escapeHtml(handle)}</div>
          </div>
        </div>
        <div class="tweet-date">${date}</div>
      </div>

      <div class="tweet-content">
        <div class="tweet-text">${escapeHtml(title)}</div>
      </div>

      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}

      <div class="tweet-footer">
        <div class="card-actions">
          <button class="card-action-btn">✏️ Edit</button>
          <button class="card-action-btn">🔗 Open</button>
        </div>
      </div>
    </div>
  `;
}

// Open edit modal
function openEditModal(bookmarkId) {
  selectedBookmarkId = bookmarkId;
  const bookmark = allBookmarks.find(b => b.id === bookmarkId);

  if (!bookmark) return;

  document.getElementById('editTitle').value = bookmark.title;
  document.getElementById('editUrl').value = bookmark.url;
  document.getElementById('editCategory').value = bookmark.category;
  document.getElementById('editSubCategory').value = bookmark.subCategory || '';
  document.getElementById('editTags').value = (bookmark.tags || []).join(', ');
  document.getElementById('editNotes').value = bookmark.notes || '';

  document.getElementById('editModal').classList.add('active');
}

// Clear add form
function clearAddForm() {
  document.getElementById('addForm').reset();
}

// Handle add form submit
async function handleAddSubmit(e) {
  e.preventDefault();

  const bookmark = {
    title: document.getElementById('addTitle').value,
    url: document.getElementById('addUrl').value,
    category: document.getElementById('addCategory').value,
    subCategory: document.getElementById('addSubCategory').value,
    tags: document.getElementById('addTags').value.split(',').map(t => t.trim()).filter(t => t),
    notes: document.getElementById('addNotes').value,
  };

  try {
    const response = await fetch(`${API_URL}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookmark),
    });

    if (!response.ok) throw new Error('Failed to add bookmark');

    showAlert('Bookmark added successfully!', 'success');
    document.getElementById('addModal').classList.remove('active');
    loadBookmarks();
  } catch (error) {
    console.error('Error adding bookmark:', error);
    showAlert('Failed to add bookmark', 'error');
  }
}

// Handle edit form submit
async function handleEditSubmit(e) {
  e.preventDefault();

  const bookmark = {
    title: document.getElementById('editTitle').value,
    url: document.getElementById('editUrl').value,
    category: document.getElementById('editCategory').value,
    subCategory: document.getElementById('editSubCategory').value,
    tags: document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(t => t),
    notes: document.getElementById('editNotes').value,
  };

  try {
    const response = await fetch(`${API_URL}/bookmarks/${selectedBookmarkId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookmark),
    });

    if (!response.ok) throw new Error('Failed to update bookmark');

    showAlert('Bookmark updated successfully!', 'success');
    document.getElementById('editModal').classList.remove('active');
    loadBookmarks();
  } catch (error) {
    console.error('Error updating bookmark:', error);
    showAlert('Failed to update bookmark', 'error');
  }
}

// Handle delete
async function handleDelete() {
  if (!confirm('Are you sure you want to delete this bookmark?')) return;

  try {
    const response = await fetch(`${API_URL}/bookmarks/${selectedBookmarkId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete bookmark');

    showAlert('Bookmark deleted successfully!', 'success');
    document.getElementById('editModal').classList.remove('active');
    loadBookmarks();
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    showAlert('Failed to delete bookmark', 'error');
  }
}

// Show alert
function showAlert(message, type) {
  const container = document.getElementById('alertContainer');
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  container.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 4000);
}

// Utility functions
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
