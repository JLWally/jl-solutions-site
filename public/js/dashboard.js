// JL Solutions User Dashboard
// Manages user dashboard functionality and Academy subscription

/**
 * Check authentication and load user data
 */
function initializeDashboard() {
  // Check if user is authenticated
  if (typeof requireAuth === 'function' && !requireAuth()) {
    return; // Will redirect to sign in
  }

  // Get current user
  const user = getCurrentUser();
  if (user) {
    document.getElementById('userName').textContent = user.name || user.email || 'User';
  }

  // Load user stats
  loadUserStats();
  
  // Load subscription status
  loadSubscriptionStatus();
  
  // Load recent activity
  loadRecentActivity();
}

/**
 * Load user statistics
 */
async function loadUserStats() {
  try {
    const userId = getCurrentUser()?.id;
    if (!userId) return;

    // Try to load from API
    const response = await authenticatedFetch(`/api/academy/progress/stats?userId=${userId}`);
    
    if (response.ok) {
      const data = await response.json();
      updateStatsDisplay(data);
    } else {
      // Fallback to localStorage
      loadStatsFromLocalStorage();
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    // Fallback to localStorage
    loadStatsFromLocalStorage();
  }
}

/**
 * Load stats from localStorage (fallback)
 */
function loadStatsFromLocalStorage() {
  const progress = JSON.parse(localStorage.getItem('academyProgress') || '{}');
  
  const totalHours = Math.floor((progress.totalStudyTime || 0) / 60);
  const modulesCompleted = progress.modulesCompleted || 0;
  const projectsCompleted = progress.projectsCompleted || 0;

  document.getElementById('totalHours').textContent = totalHours;
  document.getElementById('modulesCompleted').textContent = modulesCompleted;
  document.getElementById('projectsCompleted').textContent = projectsCompleted;
}

/**
 * Update stats display
 */
function updateStatsDisplay(data) {
  if (data.totalHours !== undefined) {
    document.getElementById('totalHours').textContent = Math.floor(data.totalHours);
  }
  if (data.modulesCompleted !== undefined) {
    document.getElementById('modulesCompleted').textContent = data.modulesCompleted;
  }
  if (data.projectsCompleted !== undefined) {
    document.getElementById('projectsCompleted').textContent = data.projectsCompleted;
  }
}

/**
 * Load subscription status
 */
async function loadSubscriptionStatus() {
  try {
    const userId = getCurrentUser()?.id;
    if (!userId) {
      showSubscriptionInactive();
      return;
    }

    // Check subscription from API
    const response = await authenticatedFetch(`/api/academy/subscription?userId=${userId}`);
    
    if (response.ok) {
      const subscription = await response.json();
      updateSubscriptionDisplay(subscription);
    } else {
      // Default: Show active if user is logged in
      showSubscriptionActive();
    }
  } catch (error) {
    console.error('Error loading subscription:', error);
    // Default: Show active if user is logged in
    showSubscriptionActive();
  }
}

/**
 * Update subscription display
 */
function updateSubscriptionDisplay(subscription) {
  const card = document.getElementById('academySubscriptionCard');
  const badge = document.getElementById('subscriptionBadge');
  const details = document.getElementById('subscriptionDetails');
  const portalButton = document.getElementById('portalButton');

  if (subscription.active) {
    card.classList.remove('inactive');
    card.classList.add('subscription-card');
    badge.textContent = 'Active';
    badge.className = 'badge-active';
    
    if (subscription.expiresAt) {
      const expiryDate = new Date(subscription.expiresAt);
      details.textContent = `Access expires: ${expiryDate.toLocaleDateString()}`;
    } else {
      details.textContent = 'Lifetime access';
    }
    
    portalButton.style.display = 'inline-block';
  } else {
    showSubscriptionInactive();
  }
}

/**
 * Show active subscription
 */
function showSubscriptionActive() {
  const card = document.getElementById('academySubscriptionCard');
  card.classList.remove('inactive');
  card.classList.add('subscription-card');
  document.getElementById('subscriptionBadge').textContent = 'Active';
  document.getElementById('subscriptionBadge').className = 'badge-active';
  document.getElementById('subscriptionDetails').textContent = 'Lifetime access';
  document.getElementById('portalButton').style.display = 'inline-block';
}

/**
 * Show inactive subscription
 */
function showSubscriptionInactive() {
  const card = document.getElementById('academySubscriptionCard');
  card.classList.remove('subscription-card');
  card.classList.add('inactive');
  document.getElementById('subscriptionBadge').textContent = 'Inactive';
  document.getElementById('subscriptionBadge').className = 'badge-inactive';
  document.getElementById('subscriptionDetails').textContent = 'Subscribe to access the Academy';
  document.getElementById('portalButton').textContent = 'Subscribe to Academy';
  document.getElementById('portalButton').href = '/academy/subscribe.html';
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
  try {
    const userId = getCurrentUser()?.id;
    if (!userId) return;

    const response = await authenticatedFetch(`/api/academy/activity/recent?userId=${userId}&limit=5`);
    
    if (response.ok) {
      const activities = await response.json();
      displayRecentActivity(activities);
    } else {
      // Fallback to localStorage
      loadActivityFromLocalStorage();
    }
  } catch (error) {
    console.error('Error loading activity:', error);
    loadActivityFromLocalStorage();
  }
}

/**
 * Display recent activity
 */
function displayRecentActivity(activities) {
  const container = document.getElementById('recentActivity');
  
  if (!activities || activities.length === 0) {
    container.innerHTML = '<p style="color: #bbbbbb;">No recent activity. Start learning to see your progress here!</p>';
    return;
  }

  container.innerHTML = activities.map(activity => `
    <div class="d-flex align-items-center mb-3 p-3" style="background: rgba(255,255,255,0.05); border-radius: 8px;">
      <span style="font-size: 1.5rem; margin-right: 1rem;">${getActivityIcon(activity.type)}</span>
      <div style="flex: 1;">
        <strong>${activity.title}</strong>
        <p class="mb-0 small" style="color: #bbbbbb;">${formatActivityDate(activity.timestamp)}</p>
      </div>
    </div>
  `).join('');
}

/**
 * Get activity icon
 */
function getActivityIcon(type) {
  const icons = {
    'module_complete': '✅',
    'project_complete': '🎉',
    'lesson_complete': '📚',
    'quiz_passed': '🏆',
    'certificate_earned': '🎓'
  };
  return icons[type] || '📝';
}

/**
 * Format activity date
 */
function formatActivityDate(timestamp) {
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
 * Load activity from localStorage (fallback)
 */
function loadActivityFromLocalStorage() {
  const activities = JSON.parse(localStorage.getItem('recentActivity') || '[]');
  displayRecentActivity(activities);
}

/**
 * Handle logout
 */
function handleLogout() {
  if (confirm('Are you sure you want to sign out?')) {
    if (typeof signOut === 'function') {
      signOut();
    } else {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/academy/signin.html';
    }
  }
}

// Initialize dashboard when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

