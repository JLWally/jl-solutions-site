// JL Solutions Academy - User-Specific Progress Tracking
// Tracks progress per user with save functionality

/**
 * Get current user ID
 */
function getUserId() {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }
  return user.id || user.email || 'anonymous';
}

/**
 * Get user-specific localStorage key
 */
function getUserKey(key) {
  const userId = getUserId();
  if (!userId) {
    return key; // Fallback to non-user-specific key
  }
  return `academy_${userId}_${key}`;
}

/**
 * Save progress for current user
 */
function saveUserProgress(progressData) {
  const userId = getUserId();
  if (!userId) {
    console.warn('No user ID available, progress not saved');
    return false;
  }

  const key = getUserKey('progress');
  const existingProgress = loadUserProgress();
  
  // Merge with existing progress
  const updatedProgress = {
    ...existingProgress,
    ...progressData,
    userId: userId,
    lastUpdated: new Date().toISOString()
  };

  try {
    localStorage.setItem(key, JSON.stringify(updatedProgress));
    
    // Also save to API if available
    saveProgressToAPI(updatedProgress);
    
    return true;
  } catch (error) {
    console.error('Error saving progress:', error);
    return false;
  }
}

/**
 * Load progress for current user
 */
function loadUserProgress() {
  const userId = getUserId();
  if (!userId) {
    return {};
  }

  const key = getUserKey('progress');
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const progress = JSON.parse(stored);
      // Verify it belongs to this user
      if (progress.userId === userId) {
        return progress;
      }
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
  
  // Return default progress for new user
  return {
    userId: userId,
    modulesCompleted: 0,
    projectsCompleted: 0,
    totalStudyTime: 0, // in seconds
    currentStep: 1,
    goals: [],
    studyHistory: [],
    createdAt: new Date().toISOString()
  };
}

/**
 * Save study stats for current user
 */
function saveUserStats(statsData) {
  const userId = getUserId();
  if (!userId) return false;

  const key = getUserKey('stats');
  const today = new Date().toDateString();
  const existing = loadUserStats();
  
  let stats = existing || {};
  
  if (stats.date !== today) {
    stats = {
      date: today,
      totalSeconds: 0,
      sessions: 0
    };
  }
  
  Object.assign(stats, statsData);
  stats.userId = userId;
  stats.lastUpdated = new Date().toISOString();

  try {
    localStorage.setItem(key, JSON.stringify(stats));
    return true;
  } catch (error) {
    console.error('Error saving stats:', error);
    return false;
  }
}

/**
 * Load study stats for current user
 */
function loadUserStats() {
  const userId = getUserId();
  if (!userId) return {};

  const key = getUserKey('stats');
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const stats = JSON.parse(stored);
      if (stats.userId === userId) {
        return stats;
      }
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
  
  return {
    userId: userId,
    date: new Date().toDateString(),
    totalSeconds: 0,
    sessions: 0
  };
}

/**
 * Save goals for current user
 */
function saveUserGoals(goals) {
  const userId = getUserId();
  if (!userId) return false;

  const key = getUserKey('goals');
  const goalsWithUser = goals.map(goal => ({
    ...goal,
    userId: userId,
    createdAt: goal.createdAt || new Date().toISOString()
  }));

  try {
    localStorage.setItem(key, JSON.stringify(goalsWithUser));
    return true;
  } catch (error) {
    console.error('Error saving goals:', error);
    return false;
  }
}

/**
 * Load goals for current user
 */
function loadUserGoals() {
  const userId = getUserId();
  if (!userId) return [];

  const key = getUserKey('goals');
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const goals = JSON.parse(stored);
      // Filter to only this user's goals
      return goals.filter(g => g.userId === userId);
    }
  } catch (error) {
    console.error('Error loading goals:', error);
  }
  
  return [];
}

/**
 * Save study history for current user
 */
function saveStudyHistory(date) {
  const userId = getUserId();
  if (!userId) return false;

  const key = getUserKey('studyHistory');
  let history = loadStudyHistory();
  
  const dateString = date instanceof Date ? date.toISOString() : date;
  if (!history.includes(dateString)) {
    history.push(dateString);
    // Keep only last 90 days
    history = history.slice(-90);
  }

  try {
    localStorage.setItem(key, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving study history:', error);
    return false;
  }
}

/**
 * Load study history for current user
 */
function loadStudyHistory() {
  const userId = getUserId();
  if (!userId) return [];

  const key = getUserKey('studyHistory');
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading study history:', error);
  }
  
  return [];
}

/**
 * Update module completion
 */
function completeModule(moduleId, moduleName) {
  const progress = loadUserProgress();
  const modulesCompleted = progress.modulesCompleted || 0;
  
  // Check if already completed
  const completedModules = progress.completedModules || [];
  if (completedModules.includes(moduleId)) {
    return false; // Already completed
  }

  completedModules.push(moduleId);
  
  saveUserProgress({
    modulesCompleted: modulesCompleted + 1,
    completedModules: completedModules,
    currentStep: progress.currentStep + 1
  });

  // Add to activity
  addActivity('module_complete', moduleName);
  
  return true;
}

/**
 * Update project completion
 */
function completeProject(projectId, projectName) {
  const progress = loadUserProgress();
  const projectsCompleted = progress.projectsCompleted || 0;
  
  const completedProjects = progress.completedProjects || [];
  if (completedProjects.includes(projectId)) {
    return false;
  }

  completedProjects.push(projectId);
  
  saveUserProgress({
    projectsCompleted: projectsCompleted + 1,
    completedProjects: completedProjects
  });

  addActivity('project_complete', projectName);
  
  return true;
}

/**
 * Add study time
 */
function addStudyTime(seconds) {
  const progress = loadUserProgress();
  const totalStudyTime = (progress.totalStudyTime || 0) + seconds;
  
  saveUserProgress({
    totalStudyTime: totalStudyTime
  });

  // Add to study history
  saveStudyHistory(new Date());
  
  return totalStudyTime;
}

/**
 * Add activity entry
 */
function addActivity(type, title) {
  const userId = getUserId();
  if (!userId) return;

  const key = getUserKey('activity');
  let activities = [];
  
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      activities = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading activities:', error);
  }

  activities.unshift({
    type: type,
    title: title,
    userId: userId,
    timestamp: new Date().toISOString()
  });

  // Keep only last 50 activities
  activities = activities.slice(0, 50);

  try {
    localStorage.setItem(key, JSON.stringify(activities));
    
    // Save to API
    saveActivityToAPI({
      type: type,
      title: title,
      userId: userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving activity:', error);
  }
}

/**
 * Get recent activities
 */
function getRecentActivities(limit = 10) {
  const userId = getUserId();
  if (!userId) return [];

  const key = getUserKey('activity');
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const activities = JSON.parse(stored);
      // Filter to only this user's activities
      return activities.filter(a => a.userId === userId).slice(0, limit);
    }
  } catch (error) {
    console.error('Error loading activities:', error);
  }
  
  return [];
}

/**
 * Save progress to API (if available)
 */
async function saveProgressToAPI(progress) {
  if (typeof authenticatedFetch !== 'function') {
    return; // API not available
  }

  try {
    await authenticatedFetch('/api/academy/progress', {
      method: 'POST',
      body: JSON.stringify(progress)
    });
  } catch (error) {
    console.error('Error saving progress to API:', error);
    // Silently fail - localStorage is the primary storage
  }
}

/**
 * Save activity to API (if available)
 */
async function saveActivityToAPI(activity) {
  if (typeof authenticatedFetch !== 'function') {
    return;
  }

  try {
    await authenticatedFetch('/api/academy/activity', {
      method: 'POST',
      body: JSON.stringify(activity)
    });
  } catch (error) {
    console.error('Error saving activity to API:', error);
  }
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  window.AcademyProgress = {
    saveUserProgress,
    loadUserProgress,
    saveUserStats,
    loadUserStats,
    saveUserGoals,
    loadUserGoals,
    saveStudyHistory,
    loadStudyHistory,
    completeModule,
    completeProject,
    addStudyTime,
    addActivity,
    getRecentActivities,
    getUserId
  };
}
