// JL Solutions Academy - Local Authentication (Client-Side Only)
// Provides account creation without backend for now

/**
 * Create account locally (for demo - will integrate with backend later)
 */
async function signUpLocal(userData) {
  try {
    // Generate a user ID
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create user object
    const user = {
      id: userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: `${userData.firstName} ${userData.lastName}`,
      createdAt: new Date().toISOString()
    };
    
    // Save user to localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    // Generate a simple token (for demo purposes)
    const token = 'demo_token_' + btoa(userId + ':' + Date.now());
    localStorage.setItem('authToken', token);
    
    // Initialize user progress
    initializeUserProgress(userId);
    
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
 * Sign in locally (check localStorage for user)
 */
async function signInLocal(credentials) {
  try {
    // For demo: check if user exists in localStorage
    const storedUsers = JSON.parse(localStorage.getItem('academy_users') || '[]');
    const user = storedUsers.find(u => u.email === credentials.email);
    
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
 * Initialize user progress when account is created
 */
function initializeUserProgress(userId) {
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
  
  const key = `academy_${userId}_progress`;
  localStorage.setItem(key, JSON.stringify(progress));
}

/**
 * Enhanced signUp function that tries API first, then falls back to local
 */
async function signUp(userData) {
  // Try API first
  if (typeof fetch === 'function') {
    try {
      const response = await fetch('/api/academy/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.token && result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
          localStorage.setItem('authToken', result.token);
          return {
            success: true,
            message: 'Account created successfully!',
            token: result.token,
            user: result.user
          };
        }
      }
    } catch (error) {
      console.log('API signup not available, using local storage');
    }
  }
  
  // Fallback to local storage
  return await signUpLocal(userData);
}

/**
 * Enhanced signIn function that tries API first, then falls back to local
 */
async function signIn(credentials) {
  // Try API first
  if (typeof fetch === 'function') {
    try {
      const response = await fetch('/api/academy/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.token && result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
          localStorage.setItem('authToken', result.token);
          return {
            success: true,
            message: 'Signed in successfully',
            token: result.token,
            user: result.user
          };
        }
      }
    } catch (error) {
      console.log('API signin not available, using local storage');
    }
  }
  
  // Fallback to local storage
  return await signInLocal(credentials);
}

