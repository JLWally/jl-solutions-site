// JL Solutions Academy - Authentication Module
// Handles user authentication (sign up, sign in, logout)

const API_BASE_URL = '/api/academy/auth'; // Update with your actual API endpoint

/**
 * Sign up a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Result object with success status and message
 */
async function signUp(userData) {
  // Try API first
  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      const result = await response.json();

      // Save token if provided
      if (result.token) {
        sessionStorage.setItem('authToken', result.token);
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return {
        success: true,
        message: result.message || 'Account created successfully',
        token: result.token,
        user: result.user
      };
    }
  } catch (error) {
    console.log('API signup not available, using local storage fallback');
  }
  
  // Fallback to local storage account creation
  try {
    // Generate a user ID
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create user object
    const user = {
      id: userId,
      email: userData.email.toLowerCase().trim(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: `${userData.firstName} ${userData.lastName}`,
      createdAt: new Date().toISOString()
    };
    
    // Save to list of users (for sign-in later)
    const users = JSON.parse(localStorage.getItem('academy_users') || '[]');
    // Check if email already exists
    if (users.find(u => u.email === user.email)) {
      return {
        success: false,
        message: 'An account with this email already exists. Please sign in instead.'
      };
    }
    users.push(user);
    localStorage.setItem('academy_users', JSON.stringify(users));
    
    // Save current user
    localStorage.setItem('user', JSON.stringify(user));
    
    // Generate a simple token
    const token = 'demo_token_' + btoa(userId + ':' + Date.now());
    localStorage.setItem('authToken', token);
    sessionStorage.setItem('authToken', token);
    
    // Initialize user progress
    const progressKey = `academy_${userId}_progress`;
    const progress = {
      userId: userId,
      modulesCompleted: 0,
      projectsCompleted: 0,
      totalStudyTime: 0,
      currentStep: 1,
      completedModules: [],
      completedProjects: [],
      goals: [],
      studyHistory: [],
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(progressKey, JSON.stringify(progress));
    
    return {
      success: true,
      message: 'Account created successfully!',
      token: token,
      user: user
    };
  } catch (error) {
    console.error('Local signup error:', error);
    return {
      success: false,
      message: 'Failed to create account. Please try again.'
    };
  }
}

/**
 * Sign in an existing user
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} - Result object with success status and token
 */
async function signIn(credentials) {
  // Try API first
  try {
    const response = await fetch(`${API_BASE_URL}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    if (response.ok) {
      const result = await response.json();
      
      if (result.token && result.user) {
        localStorage.setItem('authToken', result.token);
        sessionStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      
      return {
        success: true,
        message: 'Signed in successfully',
        token: result.token,
        user: result.user
      };
    }
  } catch (error) {
    console.log('API signin not available, using local storage fallback');
  }
  
  // Fallback to local storage (for demo - in production, this would require password verification)
  try {
    const users = JSON.parse(localStorage.getItem('academy_users') || '[]');
    const user = users.find(u => u.email === credentials.email.toLowerCase().trim());
    
    if (!user) {
      return {
        success: false,
        message: 'No account found with this email. Please sign up first.'
      };
    }
    
    // Load user data
    localStorage.setItem('user', JSON.stringify(user));
    const token = 'demo_token_' + btoa(user.id + ':' + Date.now());
    localStorage.setItem('authToken', token);
    sessionStorage.setItem('authToken', token);
    
    return {
      success: true,
      message: 'Signed in successfully',
      token: token,
      user: user
    };
  } catch (error) {
    console.error('Local signin error:', error);
    return {
      success: false,
      message: 'Failed to sign in. Please try again.'
    };
  }
}

/**
 * Sign out the current user
 */
function signOut() {
  // Clear all auth data
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  localStorage.removeItem('user');
  
  // Redirect to sign in page
  window.location.href = '/academy/signin.html';
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user is authenticated
 */
function isAuthenticated() {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  return !!token;
}

/**
 * Get current user data
 * @returns {Object|null} - User object or null if not authenticated
 */
function getCurrentUser() {
  if (!isAuthenticated()) {
    return null;
  }

  const userJson = localStorage.getItem('user');
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Get authentication token
 * @returns {string|null} - Auth token or null
 */
function getAuthToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/**
 * Require authentication - redirect if not logged in
 * @param {string} redirectUrl - URL to redirect to after login
 */
function requireAuth(redirectUrl = null) {
  if (!isAuthenticated()) {
    const currentUrl = redirectUrl || window.location.pathname;
    window.location.href = `/academy/signin.html?return=${encodeURIComponent(currentUrl)}`;
    return false;
  }
  return true;
}

/**
 * Make authenticated API request
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // If unauthorized, redirect to sign in
  if (response.status === 401) {
    signOut();
    return response;
  }

  return response;
}

/**
 * Verify email address
 * @param {string} token - Verification token
 * @returns {Promise<Object>} - Result object
 */
async function verifyEmail(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/verify-email?token=${token}`, {
      method: 'GET'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || result.error || 'Email verification failed'
      };
    }

    return {
      success: true,
      message: result.message || 'Email verified successfully'
    };
  } catch (error) {
    console.error('Email verification error:', error);
    return {
      success: false,
      message: 'Network error. Please try again later.'
    };
  }
}

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} - Result object
 */
async function requestPasswordReset(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || result.error || 'Failed to send reset email'
      };
    }

    return {
      success: true,
      message: result.message || 'Password reset email sent. Please check your inbox.'
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      message: 'Network error. Please try again later.'
    };
  }
}

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Result object
 */
async function resetPassword(token, newPassword) {
  try {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        password: newPassword
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || result.error || 'Password reset failed'
      };
    }

    return {
      success: true,
      message: result.message || 'Password reset successfully. Please sign in with your new password.'
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'Network error. Please try again later.'
    };
  }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    signUp,
    signIn,
    signOut,
    isAuthenticated,
    getCurrentUser,
    getAuthToken,
    requireAuth,
    authenticatedFetch,
    verifyEmail,
    requestPasswordReset,
    resetPassword
  };
}

