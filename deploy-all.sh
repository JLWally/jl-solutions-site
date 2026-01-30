#!/bin/bash
# Manual Deployment Script for JL Solutions Site
# This script helps deploy all updates manually

set -e  # Exit on error

cd /Users/jesswally/Desktop/Portfolio/jl-site-restore

echo "🚀 JL Solutions - Manual Deployment Script"
echo "=========================================="
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository!"
    echo "   Please run this script from the jl-site-restore directory"
    exit 1
fi

# Show current status
echo "📋 Current Git Status:"
echo "----------------------"
git status --short
echo ""

# Ask for confirmation
read -p "Do you want to continue with deployment? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Stage all changes
echo "➕ Staging all changes..."
git add -A
echo "✅ All changes staged"
echo ""

# Show what will be committed
echo "📦 Files to be committed:"
echo "-------------------------"
git status --short
echo ""

# Create commit
echo "📝 Creating commit..."
COMMIT_MSG="Complete site updates: About page team-focused, CSS fixes, all Phase 1 & 2 features

- About page: Team-oriented messaging, removed founder-specific content
- Color contrast fixes throughout site for better readability  
- Added 'From Complexity to Clarity' to values section
- Fixed global CSS conflicts and styling issues
- Phase 1 & 2 features: Community forum, Code review, Live chat, Blog, Job board, Interview prep, Portfolio, Study groups
- Improved accessibility and mobile responsiveness
- Updated Academy dashboard and portal features"

git commit -m "$COMMIT_MSG"
echo "✅ Commit created"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 Current branch: $CURRENT_BRANCH"
echo ""

# Push to GitHub
echo "🚀 Pushing to GitHub..."
if git push origin "$CURRENT_BRANCH"; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "📊 Next Steps:"
    echo "   1. Check GitHub: https://github.com/JLWally/jl-solutions-site"
    echo "   2. Wait for Netlify deployment (1-2 minutes)"
    echo "   3. Check Netlify dashboard for deployment status"
    echo "   4. Visit live site: https://www.jlsolutions.io"
    echo ""
    echo "🎉 Deployment initiated successfully!"
else
    echo ""
    echo "❌ Push failed. Possible issues:"
    echo "   - Authentication required (use GitHub token or SSH key)"
    echo "   - Branch conflicts (pull first: git pull origin $CURRENT_BRANCH)"
    echo "   - Network issues"
    echo ""
    echo "💡 Try running manually:"
    echo "   git push origin $CURRENT_BRANCH"
    exit 1
fi

