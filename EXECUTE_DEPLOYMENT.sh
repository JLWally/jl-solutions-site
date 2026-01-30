#!/bin/bash

# JL Solutions Site - Complete Deployment Script
# This will commit and push all changes to GitHub

set -e  # Exit on error

echo "🚀 Starting deployment to JL Solutions GitHub..."
echo ""

cd /Users/jesswally/Desktop/Portfolio/jl-site-restore

echo "📁 Current directory: $(pwd)"
echo ""

echo "📋 Checking git status..."
git status
echo ""

echo "➕ Staging all files..."
git add -A
echo "✅ All files staged"
echo ""

echo "💾 Committing changes..."
git commit -m "Add comprehensive Phase 1 & 2 features: Consultation booking, Case studies, FAQ, Document extraction demo, ROI calculator, Resource library, Academy dashboard & certifications" || echo "No changes to commit or already committed"
echo ""

echo "📤 Pushing to GitHub (origin/main)..."
git push origin main
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📊 Latest commit:"
git log --oneline -1
echo ""
echo "🌐 Check Netlify dashboard for automatic deployment"
echo "🔗 Repository: https://github.com/JLWally/jl-solutions-site"

