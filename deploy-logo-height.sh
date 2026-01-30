#!/bin/bash

# Deploy navbar logo height update to JL Solutions GitHub
echo "🚀 Deploying navbar logo height update..."
echo ""

cd /Users/jesswally/Desktop/Portfolio/jl-site-restore

echo "📁 Current directory: $(pwd)"
echo ""

echo "📋 Checking git status..."
git status --short
echo ""

echo "➕ Staging all changes..."
git add -A
echo "✅ Files staged"
echo ""

echo "💾 Committing changes..."
git commit -m "Update navbar logo height from 40px to 100px

- Increased logo size in navbar for better visibility
- Updated across all pages consistently
- Logo now displays at 100px height in navigation menu"
echo "✅ Changes committed"
echo ""

echo "📤 Pushing to GitHub (origin/main)..."
git push origin main
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📊 Latest commit:"
git log --oneline -1
echo ""
echo "🌐 Netlify will automatically deploy within 1-2 minutes"
echo "🔗 Repository: https://github.com/JLWally/jl-solutions-site"
echo "🌐 Live site: https://www.jlsolutions.io"
echo ""
echo "✨ Logo will appear larger (100px) in navbar after deployment!"

