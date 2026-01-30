// JL Solutions Academy - Community Forum
// Handles forum posts, discussions, and community features

let currentUserId = null;
let forumPosts = [];

/**
 * Initialize forum
 */
function initializeForum() {
  // Check authentication
  if (typeof requireAuth === 'function' && !requireAuth()) {
    return;
  }

  const user = getCurrentUser();
  if (user) {
    currentUserId = user.id || user.email;
  }

  // Load forum posts
  loadForumPosts();
}

/**
 * Load forum posts from localStorage or API
 */
async function loadForumPosts() {
  try {
    if (currentUserId && typeof authenticatedFetch === 'function') {
      const response = await authenticatedFetch(`/api/academy/forum/posts?category=all`);
      if (response.ok) {
        forumPosts = await response.json();
        displayPosts();
        return;
      }
    }

    // Fallback to localStorage
    loadPostsFromLocalStorage();
  } catch (error) {
    console.error('Error loading posts:', error);
    loadPostsFromLocalStorage();
  }
}

/**
 * Load posts from localStorage
 */
function loadPostsFromLocalStorage() {
  const stored = localStorage.getItem('forumPosts');
  if (stored) {
    forumPosts = JSON.parse(stored);
  } else {
    // Initialize with welcome post
    forumPosts = [{
      id: 'welcome',
      title: 'Welcome to the Community!',
      content: 'This is your space to ask questions, share what you\'ve learned, and help fellow students. Don\'t be shy - we\'re all learning together!',
      author: 'Admin',
      category: 'general',
      tags: ['General', 'Welcome'],
      replies: 5,
      views: 120,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }];
    savePostsToLocalStorage();
  }
  displayPosts();
}

/**
 * Display forum posts
 */
function displayPosts(category = 'all') {
  const container = document.getElementById('forumPosts');
  if (!container) return;

  const filteredPosts = category === 'all' 
    ? forumPosts 
    : forumPosts.filter(post => post.category === category);

  if (filteredPosts.length === 0) {
    container.innerHTML = '<p class="text-muted">No posts yet. Be the first to post!</p>';
    return;
  }

  container.innerHTML = filteredPosts.map(post => `
    <div class="forum-card">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5><a href="/academy/community/post.html?id=${post.id}" style="color: var(--academy-text); text-decoration: none;">${escapeHtml(post.title)}</a></h5>
          <div class="post-meta">
            <span>Posted by ${escapeHtml(post.author)}</span> • 
            <span>${formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>
        <span class="reply-count">${post.replies || 0} replies</span>
      </div>
      <p>${escapeHtml(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}</p>
      <div class="mt-2">
        ${(post.tags || []).map(tag => `<span class="badge-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="mt-3">
        <a href="/academy/community/post.html?id=${post.id}" class="btn btn-sm" style="background: var(--academy-primary); color: white;">View Discussion</a>
      </div>
    </div>
  `).join('');
}

/**
 * Show new post modal
 */
function showNewPostModal() {
  const title = prompt('Post Title:');
  if (!title) return;

  const content = prompt('Post Content:');
  if (!content) return;

  const category = prompt('Category (html/javascript/react/projects/general):', 'general');
  
  const newPost = {
    id: 'post-' + Date.now(),
    title: title,
    content: content,
    author: getCurrentUser()?.name || getCurrentUser()?.email || 'Student',
    category: category || 'general',
    tags: [],
    replies: 0,
    views: 0,
    createdAt: new Date().toISOString()
  };

  forumPosts.unshift(newPost);
  savePostsToLocalStorage();
  savePostToAPI(newPost);
  loadForumPosts();
  alert('Post created successfully!');
}

/**
 * Save posts to localStorage
 */
function savePostsToLocalStorage() {
  localStorage.setItem('forumPosts', JSON.stringify(forumPosts));
}

/**
 * Save post to API
 */
async function savePostToAPI(post) {
  if (!currentUserId || typeof authenticatedFetch !== 'function') {
    return;
  }

  try {
    await authenticatedFetch('/api/academy/forum/posts', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUserId,
        post: post
      })
    });
  } catch (error) {
    console.error('Error saving post:', error);
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize forum when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeForum);
} else {
  initializeForum();
}

