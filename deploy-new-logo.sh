#!/bin/bash

# Deploy new logo file to JL Solutions GitHub
echo "🚀 Deploying new logo to JL Solutions..."
echo ""

cd /Users/jesswally/Desktop/Portfolio/jl-site-restore

echo "📁 Current directory: $(pwd)"
echo ""

# Verify logo file exists
if [ -f "assets/images/jlsolutions-logo.png" ]; then
    echo "✅ Logo file found: assets/images/jlsolutions-logo.png"
    ls -lh assets/images/jlsolutions-logo.png
else
    echo "❌ Logo file not found!"
    exit 1
fi
echo ""

echo "📋 Current git status:"
git status --short
echo ""

echo "➕ Staging all changes (including new logo)..."
git add -A
echo "✅ Files staged"
echo ""

echo "💾 Committing changes..."
git commit -m "Update logo to new PNG version in navbar and favicon

- Updated logo file (jlsolutions-logo.png) with new version
- Logo appears in navbar across all pages  
- Logo appears in browser tab/favicon
- All HTML pages updated consistently"
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
echo "✨ New logo will appear in navbar and browser tab after deployment!"

