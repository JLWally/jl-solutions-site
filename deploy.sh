#!/bin/bash

# JL Solutions Site - Deployment Script
# This script commits and pushes all changes to GitHub

echo "🚀 Starting deployment process..."
echo ""

cd "$(dirname "$0")"

echo "📁 Current directory: $(pwd)"
echo ""

echo "📋 Checking git status..."
git status --short
echo ""

echo "➕ Staging all files..."
git add -A
echo "✅ Files staged"
echo ""

echo "💾 Committing changes..."
git commit -m "Add comprehensive Phase 1 & 2 features: Consultation booking, Case studies, FAQ, Document extraction demo, ROI calculator, Resource library, Academy dashboard & certifications"
echo "✅ Changes committed"
echo ""

echo "📤 Pushing to GitHub..."
git push origin main
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📊 Latest commit:"
git log --oneline -1
echo ""
echo "🌐 Check your Netlify dashboard for automatic deployment"

