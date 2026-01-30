#!/bin/bash
# Quick deployment script for TrailCrafter

echo "🚀 Deploying TrailCrafter..."

# Check if GitHub remote exists
if ! git remote | grep -q origin; then
    echo "📦 Setting up GitHub repository..."
    echo "Please create a GitHub repository first:"
    echo "1. Go to https://github.com/new"
    echo "2. Create repository named 'trailcrafter'"
    echo "3. Then run this script again"
    exit 1
fi

echo "📤 Pushing to GitHub..."
git add -A
git commit -m "Prepare for deployment" || true
git push -u origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "🌐 Now deploy on Netlify:"
echo "1. Go to https://app.netlify.com"
echo "2. Click 'Add new site' → 'Import an existing project'"
echo "3. Connect GitHub and select 'trailcrafter' repository"
echo "4. Netlify will auto-detect Next.js"
echo "5. Add environment variables (see .env.example)"
echo "6. Click 'Deploy site'"
echo ""
echo "Once deployed, update jl-solutions-site/netlify.toml with the Netlify URL"
