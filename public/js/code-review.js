// JL Solutions Academy - Code Review Tool
// Handles code submissions and review feedback

let currentUserId = null;
let codeReviews = [];

/**
 * Initialize code review
 */
function initializeCodeReview() {
  // Check authentication
  if (typeof requireAuth === 'function' && !requireAuth()) {
    return;
  }

  const user = getCurrentUser();
  if (user) {
    currentUserId = user.id || user.email;
  }

  // Load user's code reviews
  loadCodeReviews();
}

/**
 * Submit code for review
 */
async function submitCodeReview(event) {
  event.preventDefault();

  const projectName = document.getElementById('projectName').value;
  const description = document.getElementById('projectDescription').value;
  const code = document.getElementById('codeSnippet').value;
  const githubUrl = document.getElementById('githubUrl').value;

  if (!code || !projectName || !description) {
    alert('Please fill in all required fields.');
    return;
  }

  const review = {
    id: 'review-' + Date.now(),
    userId: currentUserId,
    projectName: projectName,
    description: description,
    code: code,
    githubUrl: githubUrl || null,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    feedback: null,
    automatedChecks: {
      syntaxErrors: 0,
      suggestions: []
    }
  };

  // Run automated checks
  review.automatedChecks = runAutomatedChecks(code);

  // Save to localStorage
  codeReviews.unshift(review);
  saveReviewsToLocalStorage();

  // Save to API
  await saveReviewToAPI(review);

  // Display success message
  alert('Code submitted for review! You\'ll receive feedback within 24-48 hours.');
  
  // Reset form
  document.getElementById('codeReviewForm').reset();
  
  // Reload reviews
  loadCodeReviews();
}

/**
 * Run automated code checks
 */
function runAutomatedChecks(code) {
  const checks = {
    syntaxErrors: 0,
    suggestions: []
  };

  // Basic checks
  if (code.length < 50) {
    checks.suggestions.push('Code snippet is very short. Consider including more context.');
  }

  // Check for common issues (basic patterns)
  if (!code.includes('function') && !code.includes('const') && !code.includes('let')) {
    checks.suggestions.push('No functions or variables detected. Is this complete code?');
  }

  // Check for comments
  if (!code.includes('//') && !code.includes('/*')) {
    checks.suggestions.push('Consider adding comments to explain your code logic.');
  }

  return checks;
}

/**
 * Load code reviews
 */
async function loadCodeReviews() {
  try {
    if (currentUserId && typeof authenticatedFetch === 'function') {
      const response = await authenticatedFetch(`/api/academy/code-review?userId=${currentUserId}`);
      if (response.ok) {
        codeReviews = await response.json();
        displayReviews();
        return;
      }
    }

    // Fallback to localStorage
    loadReviewsFromLocalStorage();
  } catch (error) {
    console.error('Error loading reviews:', error);
    loadReviewsFromLocalStorage();
  }
}

/**
 * Load reviews from localStorage
 */
function loadReviewsFromLocalStorage() {
  const stored = localStorage.getItem(`codeReviews_${currentUserId}`);
  if (stored) {
    codeReviews = JSON.parse(stored);
  } else {
    codeReviews = [];
  }
  displayReviews();
}

/**
 * Display code reviews
 */
function displayReviews() {
  const container = document.getElementById('myReviews');
  if (!container) return;

  if (codeReviews.length === 0) {
    container.innerHTML = '<p class="text-muted">No submissions yet. Submit your first code review above!</p>';
    return;
  }

  container.innerHTML = codeReviews.map(review => {
    const statusClass = review.status === 'pending' ? 'status-pending' : 'status-reviewed';
    const statusText = review.status === 'pending' ? 'Pending Review' : 'Reviewed';

    return `
      <div class="review-card mb-3">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5>${escapeHtml(review.projectName)}</h5>
            <p class="text-muted small mb-0">Submitted ${formatRelativeTime(review.submittedAt)}</p>
          </div>
          <span class="review-status ${statusClass}">${statusText}</span>
        </div>
        <p>${escapeHtml(review.description)}</p>
        <details class="mt-3">
          <summary style="cursor: pointer; color: var(--academy-primary);">View Code</summary>
          <div class="code-editor mt-2">${escapeHtml(review.code)}</div>
        </details>
        ${review.automatedChecks.suggestions.length > 0 ? `
          <div class="mt-3">
            <strong>Automated Suggestions:</strong>
            <ul>
              ${review.automatedChecks.suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${review.feedback ? `
          <div class="mt-3">
            <strong>Mentor Feedback:</strong>
            <div class="feedback-item">
              <p>${escapeHtml(review.feedback)}</p>
            </div>
          </div>
        ` : '<p class="text-muted small mt-3">Waiting for mentor feedback...</p>'}
        ${review.githubUrl ? `
          <div class="mt-2">
            <a href="${review.githubUrl}" target="_blank" class="btn btn-sm" style="background: var(--academy-primary); color: white;">View on GitHub</a>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Save reviews to localStorage
 */
function saveReviewsToLocalStorage() {
  localStorage.setItem(`codeReviews_${currentUserId}`, JSON.stringify(codeReviews));
}

/**
 * Save review to API
 */
async function saveReviewToAPI(review) {
  if (!currentUserId || typeof authenticatedFetch !== 'function') {
    return;
  }

  try {
    await authenticatedFetch('/api/academy/code-review', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUserId,
        review: review
      })
    });
  } catch (error) {
    console.error('Error saving review:', error);
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

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCodeReview);
} else {
  initializeCodeReview();
}

