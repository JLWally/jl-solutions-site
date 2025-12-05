# Academy API Documentation
## Backend API Structure for User Portal and Progress Tracking

### Overview
This document outlines the API endpoints needed to support the Academy user portal, progress tracking, and subscription management system.

---

## Authentication Endpoints

### POST `/api/academy/auth/signup`
Create a new user account

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "academySubscription": {
      "active": false,
      "expiresAt": null
    }
  }
}
```

### POST `/api/academy/auth/signin`
Sign in existing user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "academySubscription": {
      "active": true,
      "expiresAt": "2025-12-31T23:59:59Z"
    }
  }
}
```

---

## Subscription Endpoints

### GET `/api/academy/subscription?userId={userId}`
Get user's Academy subscription status

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "active": true,
    "plan": "lifetime",
    "expiresAt": null,
    "startedAt": "2024-01-01T00:00:00Z",
    "features": [
      "full_course_access",
      "progress_tracking",
      "certifications",
      "resources"
    ]
  }
}
```

### POST `/api/academy/subscription/activate`
Activate Academy subscription

**Request Body:**
```json
{
  "userId": "user_123",
  "plan": "lifetime"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription activated successfully",
  "subscription": {
    "active": true,
    "expiresAt": null
  }
}
```

---

## Progress Tracking Endpoints

### GET `/api/academy/progress?userId={userId}`
Get user's complete progress data

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "progress": {
    "userId": "user_123",
    "overallProgress": 25,
    "modulesCompleted": 3,
    "projectsCompleted": 2,
    "totalStudyTime": 1200,
    "currentModule": "html-fundamentals",
    "currentProject": null,
    "completedModules": [
      "introduction-to-coding",
      "html-basics",
      "css-basics"
    ],
    "completedProjects": [
      "portfolio-website",
      "calculator"
    ],
    "skillsProgress": {
      "html": { "completed": 5, "total": 5 },
      "css": { "completed": 4, "total": 6 },
      "javascript": { "completed": 0, "total": 8 },
      "apis": { "completed": 0, "total": 6 },
      "react": { "completed": 0, "total": 8 }
    },
    "projectsProgress": {
      "beginner": { "completed": 2, "total": 6 },
      "intermediate": { "completed": 0, "total": 6 },
      "advanced": { "completed": 0, "total": 4 }
    },
    "milestones": [
      {
        "id": "first-week",
        "name": "First Week",
        "description": "Complete your first HTML page",
        "unlocked": true,
        "completedAt": "2024-01-05T10:00:00Z"
      }
    ],
    "lastUpdated": "2024-01-15T14:30:00Z"
  }
}
```

### POST `/api/academy/progress`
Save/update user progress

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "user_123",
  "progress": {
    "modulesCompleted": 3,
    "projectsCompleted": 2,
    "totalStudyTime": 1200,
    "currentModule": "javascript-basics",
    "completedModules": ["introduction-to-coding", "html-basics", "css-basics"],
    "skillsProgress": {
      "html": { "completed": 5, "total": 5 }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress saved successfully",
  "progress": {
    "overallProgress": 25,
    "lastUpdated": "2024-01-15T14:30:00Z"
  }
}
```

### POST `/api/academy/progress/module/complete`
Mark a module as completed

**Request Body:**
```json
{
  "userId": "user_123",
  "moduleId": "html-fundamentals",
  "completedAt": "2024-01-15T14:30:00Z"
}
```

### POST `/api/academy/progress/project/complete`
Mark a project as completed

**Request Body:**
```json
{
  "userId": "user_123",
  "projectId": "portfolio-website",
  "completedAt": "2024-01-15T14:30:00Z",
  "projectUrl": "https://example.com/portfolio"
}
```

### POST `/api/academy/progress/skill/complete`
Mark a skill item as completed

**Request Body:**
```json
{
  "userId": "user_123",
  "category": "html",
  "skillId": "semantic-html",
  "completedAt": "2024-01-15T14:30:00Z"
}
```

### GET `/api/academy/progress/stats?userId={userId}`
Get user statistics summary

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalHours": 20,
    "modulesCompleted": 3,
    "projectsCompleted": 2,
    "studyStreak": 5,
    "lastStudyDate": "2024-01-15"
  }
}
```

---

## Activity Endpoints

### GET `/api/academy/activity/recent?userId={userId}&limit={limit}`
Get recent user activity

**Response:**
```json
{
  "success": true,
  "activities": [
    {
      "type": "module_complete",
      "title": "Completed HTML Fundamentals Module",
      "timestamp": "2024-01-15T14:30:00Z",
      "details": {
        "moduleId": "html-fundamentals"
      }
    },
    {
      "type": "project_complete",
      "title": "Completed Portfolio Website Project",
      "timestamp": "2024-01-14T10:00:00Z",
      "details": {
        "projectId": "portfolio-website"
      }
    }
  ]
}
```

### POST `/api/academy/activity`
Log new activity

**Request Body:**
```json
{
  "userId": "user_123",
  "type": "module_complete",
  "title": "Completed JavaScript Basics",
  "details": {
    "moduleId": "javascript-basics"
  }
}
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE academy_users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Subscriptions Table
```sql
CREATE TABLE academy_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  plan VARCHAR(50) DEFAULT 'lifetime',
  started_at TIMESTAMP,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE
);
```

### Progress Table
```sql
CREATE TABLE academy_progress (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  overall_progress INT DEFAULT 0,
  modules_completed INT DEFAULT 0,
  projects_completed INT DEFAULT 0,
  total_study_time INT DEFAULT 0,
  current_module VARCHAR(255),
  current_project VARCHAR(255),
  progress_data JSON,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_progress (user_id)
);
```

### Completed Modules Table
```sql
CREATE TABLE academy_completed_modules (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  module_id VARCHAR(255) NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_module (user_id, module_id)
);
```

### Completed Projects Table
```sql
CREATE TABLE academy_completed_projects (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  project_url VARCHAR(500),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_project (user_id, project_id)
);
```

### Activity Table
```sql
CREATE TABLE academy_activity (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE,
  INDEX idx_user_activity (user_id, created_at)
);
```

---

## Frontend Integration

### Progress Tracking Functions

The frontend JavaScript (`/js/academy-portal.js`) includes functions to:
- Load user progress from API (with localStorage fallback)
- Save progress updates
- Calculate overall progress percentages
- Track module/project completions
- Update UI with progress data

### localStorage Fallback

If API is unavailable, the system falls back to localStorage:
- Key: `academyProgress_{userId}`
- Format: JSON object matching API response structure

### Session Management

- Authentication tokens stored in localStorage/sessionStorage
- User data cached in localStorage
- Automatic token refresh on API calls
- Redirect to sign-in on 401 responses

---

## Implementation Notes

1. **Progress Persistence**: Progress is saved both to API and localStorage for redundancy
2. **User Isolation**: All progress is user-specific using userId
3. **Real-time Updates**: Progress updates immediately in UI, then syncs to API
4. **Offline Support**: System works with localStorage when API is unavailable
5. **Subscription Checks**: Portal validates subscription before allowing access

---

## Error Handling

All endpoints should return standard error format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401): Invalid or missing authentication
- `FORBIDDEN` (403): User doesn't have access (e.g., no subscription)
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `SERVER_ERROR` (500): Internal server error

---

**Last Updated**: December 2024

