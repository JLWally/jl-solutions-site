// JL Solutions Academy Portal
// Manages the Academy portal functionality and user-specific progress tracking

let currentUserId = null;
let userProgress = null;

/**
 * Initialize the Academy portal
 */
async function initializePortal() {
  // Check authentication
  if (typeof requireAuth === 'function' && !requireAuth()) {
    return;
  }

  // Get current user
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/academy/signin.html';
    return;
  }

  currentUserId = user.id || user.email;
  document.getElementById('portalUserName').textContent = user.name || user.email || 'Student';

  // Load user progress
  await loadUserProgress();
  
  // Initialize sections
  initializeSections();
  
  // Load section content based on hash
  const hash = window.location.hash.substring(1);
  if (hash) {
    showSection(hash);
  }
}

/**
 * Load user progress from API or localStorage
 */
async function loadUserProgress() {
  try {
    // Try to load from API
    if (currentUserId && typeof authenticatedFetch === 'function') {
      const response = await authenticatedFetch(`/api/academy/progress?userId=${currentUserId}`);
      
      if (response.ok) {
        userProgress = await response.json();
        saveProgressToLocalStorage(userProgress);
        updatePortalDisplay();
        return;
      }
    }

    // Fallback to localStorage
    loadProgressFromLocalStorage();
  } catch (error) {
    console.error('Error loading progress:', error);
    loadProgressFromLocalStorage();
  }
}

/**
 * Load progress from localStorage
 */
function loadProgressFromLocalStorage() {
  const stored = localStorage.getItem(`academyProgress_${currentUserId}`);
  if (stored) {
    userProgress = JSON.parse(stored);
  } else {
    // Initialize empty progress
    userProgress = initializeEmptyProgress();
  }
  updatePortalDisplay();
}

/**
 * Initialize empty progress structure
 */
function initializeEmptyProgress() {
  return {
    userId: currentUserId,
    overallProgress: 0,
    modulesCompleted: 0,
    projectsCompleted: 0,
    totalStudyTime: 0, // in minutes
    currentModule: null,
    currentProject: null,
    completedModules: [],
    completedProjects: [],
    skillsProgress: {
      html: { completed: 0, total: 5 },
      css: { completed: 0, total: 6 },
      javascript: { completed: 0, total: 8 },
      apis: { completed: 0, total: 6 },
      react: { completed: 0, total: 8 }
    },
    projectsProgress: {
      beginner: { completed: 0, total: 6 },
      intermediate: { completed: 0, total: 6 },
      advanced: { completed: 0, total: 4 }
    },
    milestones: [],
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Save progress to localStorage
 */
function saveProgressToLocalStorage(progress) {
  localStorage.setItem(`academyProgress_${currentUserId}`, JSON.stringify(progress));
  
  // Also save to general key for backward compatibility
  localStorage.setItem('academyProgress', JSON.stringify(progress));
}

/**
 * Save progress to API
 */
async function saveProgressToAPI(progress) {
  if (!currentUserId || typeof authenticatedFetch !== 'function') {
    return;
  }

  try {
    const response = await authenticatedFetch('/api/academy/progress', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUserId,
        progress: progress
      })
    });

    if (response.ok) {
      console.log('Progress saved successfully');
    }
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

/**
 * Update progress and save
 */
async function updateProgress(updates) {
  userProgress = {
    ...userProgress,
    ...updates,
    lastUpdated: new Date().toISOString()
  };

  // Calculate overall progress
  userProgress.overallProgress = calculateOverallProgress();

  // Save to localStorage immediately
  saveProgressToLocalStorage(userProgress);

  // Save to API in background
  saveProgressToAPI(userProgress);

  // Update display
  updatePortalDisplay();
}

/**
 * Calculate overall progress percentage
 */
function calculateOverallProgress() {
  const modulesProgress = userProgress.modulesCompleted / 12;
  const projectsProgress = userProgress.projectsCompleted / 16;
  const skillsProgress = calculateSkillsProgress();
  
  return Math.round(((modulesProgress + projectsProgress + skillsProgress) / 3) * 100);
}

/**
 * Calculate skills progress
 */
function calculateSkillsProgress() {
  const skills = userProgress.skillsProgress;
  const totals = Object.values(skills).reduce((sum, skill) => sum + skill.total, 0);
  const completed = Object.values(skills).reduce((sum, skill) => sum + skill.completed, 0);
  return totals > 0 ? completed / totals : 0;
}

/**
 * Update portal display with current progress
 */
function updatePortalDisplay() {
  if (!userProgress) return;

  // Update overview stats
  document.getElementById('overallProgressPercentage').textContent = userProgress.overallProgress + '%';
  document.getElementById('overviewModules').textContent = userProgress.modulesCompleted;
  document.getElementById('overviewProjects').textContent = userProgress.projectsCompleted;
  document.getElementById('overviewHours').textContent = Math.floor(userProgress.totalStudyTime / 60);

  // Update progress circle
  const circle = document.getElementById('overallProgressCircle');
  if (circle) {
    const circumference = 2 * Math.PI * 65;
    const offset = circumference - (userProgress.overallProgress / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }
}

/**
 * Show specific section
 */
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.portal-section').forEach(section => {
    section.classList.remove('active');
  });

  // Show selected section
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add('active');
  }

  // Update navigation
  document.querySelectorAll('.portal-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelector(`.portal-nav .nav-link[href="#${sectionId}"]`)?.classList.add('active');

  // Update URL hash
  window.location.hash = sectionId;

  // Load section content if needed
  loadSectionContent(sectionId);
}

/**
 * Load section content
 */
async function loadSectionContent(sectionId) {
  switch (sectionId) {
    case 'progress':
      await loadProgressContent();
      break;
    case 'modules':
      await loadModulesContent();
      break;
    case 'projects':
      await loadProjectsContent();
      break;
    case 'certifications':
      await loadCertificationsContent();
      break;
    case 'resources':
      await loadResourcesContent();
      break;
  }
}

/**
 * Load progress content
 */
async function loadProgressContent() {
  const container = document.getElementById('progressTrackerContent');
  
  // Redirect to progress page with user context
  window.location.href = '/academy/progress.html';
}

/**
 * Load modules content
 */
async function loadModulesContent() {
  const container = document.getElementById('modulesContent');
  container.innerHTML = '<p>Loading modules...</p>';
  
  // Redirect to modules page
  window.location.href = '/academy/modules.html';
}

/**
 * Load projects content
 */
async function loadProjectsContent() {
  const container = document.getElementById('projectsContent');
  container.innerHTML = '<p>Loading projects...</p>';
  
  // Redirect to projects page
  window.location.href = '/academy/projects.html';
}

/**
 * Load certifications content
 */
async function loadCertificationsContent() {
  const container = document.getElementById('certificationsContent');
  container.innerHTML = '<p>Loading certifications...</p>';
  
  // Redirect to certifications page
  window.location.href = '/academy/certifications.html';
}

/**
 * Load resources content
 */
async function loadResourcesContent() {
  const container = document.getElementById('resourcesContent');
  container.innerHTML = '<p>Loading resources...</p>';
  
  // Redirect to resources page
  window.location.href = '/academy/resources.html';
}

/**
 * Initialize sections
 */
function initializeSections() {
  // Load overview content
  updateContinueLearning();
  updateNextSteps();
}

/**
 * Update continue learning section
 */
function updateContinueLearning() {
  const container = document.getElementById('continueLearning');
  
  if (userProgress?.currentModule) {
    container.innerHTML = `
      <p>Continue where you left off:</p>
      <a href="/academy/modules.html#${userProgress.currentModule}" class="btn btn-academy">
        Continue: ${userProgress.currentModule}
      </a>
    `;
  } else {
    container.innerHTML = `
      <p style="color: #bbbbbb;">Start your learning journey!</p>
      <a href="/academy/beginner-course.html" class="btn btn-academy">🎮 Start Beginner Course</a>
    `;
  }
}

/**
 * Update next steps section
 */
function updateNextSteps() {
  const container = document.getElementById('nextSteps');
  
  if (!userProgress || userProgress.modulesCompleted === 0) {
    container.innerHTML = `
      <p style="color: #bbbbbb;">No active steps. Start a course to begin!</p>
      <a href="/academy/beginner-course.html" class="btn btn-academy btn-sm">Get Started</a>
    `;
    return;
  }

  const steps = [];
  
  if (userProgress.currentModule) {
    steps.push(`Continue module: ${userProgress.currentModule}`);
  }
  
  if (userProgress.modulesCompleted < 12) {
    steps.push(`Complete ${12 - userProgress.modulesCompleted} more modules`);
  }
  
  if (userProgress.projectsCompleted < 16) {
    steps.push(`Complete ${16 - userProgress.projectsCompleted} more projects`);
  }

  if (steps.length === 0) {
    steps.push('Congratulations! You\'ve completed all modules and projects!');
  }

  container.innerHTML = `
    <ul class="mb-0">
      ${steps.map(step => `<li style="color: #bbbbbb; margin-bottom: 0.5rem;">${step}</li>`).join('')}
    </ul>
  `;
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

// Initialize portal when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePortal);
} else {
  initializePortal();
}

// Export functions for use in other scripts
window.academyPortal = {
  updateProgress,
  loadUserProgress,
  showSection,
  currentUserId: () => currentUserId,
  userProgress: () => userProgress
};

