# Deployment Instructions

## To Deploy All Changes:

```bash
cd /Users/jesswally/Desktop/Portfolio/jl-site-restore

# Check what's changed
git status

# Add all changes
git add -A

# Commit with descriptive message
git commit -m "Complete user portal, dashboard, Academy portal, accessibility features, and business document extraction updates"

# Push to GitHub (will trigger Netlify deployment)
git push origin main
```

## Changes Being Deployed:

✅ User Dashboard (`/dashboard.html`)
✅ Academy Portal (`/academy/portal.html`)
✅ Accessibility CSS (`/css/accessibility.css`)
✅ Responsive CSS (`/css/responsive.css`)
✅ Updated Academy pages (removed personal references)
✅ Updated About page
✅ Updated document extraction demo (business focus)
✅ Progress tracking system
✅ JavaScript files for dashboard and portal

## After Deployment:

1. Netlify will automatically deploy
2. Changes should be live within 1-2 minutes
3. Verify at: https://www.jlsolutions.io

---

**Note**: If git push requires authentication, you'll need to enter your GitHub credentials or use a personal access token.

