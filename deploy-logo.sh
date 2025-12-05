#!/bin/bash

# JL Solutions Site - Logo Update Deployment
echo "🚀 Deploying logo changes to JL Solutions GitHub..."
echo ""

cd /Users/jesswally/Desktop/Portfolio/jl-site-restore

echo "📁 Current directory: $(pwd)"
echo ""

echo "📋 Checking git status..."
git status --short
echo ""

echo "➕ Staging all files..."
git add -A
echo "✅ Files staged"
echo ""

echo "💾 Committing logo changes..."
git commit -m "Update logo to new PNG version in navbar and favicon

- Updated navbar logo from SVG to PNG (jlsolutions-logo.png)
- Updated favicon/browser tab icon to use new logo PNG
- Updated all HTML pages consistently
- Logo now appears in navbar and browser tab across all pages"
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

