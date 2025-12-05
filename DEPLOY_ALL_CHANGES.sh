#!/bin/bash
# Deployment script for JL Solutions site

echo "🚀 Deploying JL Solutions changes to GitHub..."
echo ""

cd /Users/jesswally/Desktop/Portfolio/jl-site-restore

# Check git status
echo "📋 Current git status:"
git status --short
echo ""

# Add all changes
echo "➕ Adding all changes..."
git add -A

# Commit with descriptive message
echo "💾 Committing changes..."
git commit -m "Add user portal, dashboard, Academy portal, accessibility features, remove personal references, update document extraction for business focus

- Added user dashboard with Academy subscription management
- Created Academy portal page with user-specific progress tracking
- Added accessibility CSS (508c compliance)
- Added responsive CSS for mobile optimization
- Removed all personal references (Sierra, Titi)
- Updated document extraction demo for business documents
- Updated About page with JL Solutions branding
- Added progress tracking system (user-specific, persistent)
- Created API documentation for backend integration"

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub (main branch)..."
git push origin main

echo ""
echo "✅ Deployment initiated! Netlify will automatically deploy within 1-2 minutes."
echo ""
echo "🌐 Site URL: https://www.jlsolutions.io"
echo ""

