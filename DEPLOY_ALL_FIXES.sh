#!/bin/bash
# Deploy All Fixes - Yellow CTAs, Text Readability, Academy Updates

set -e  # Exit on error

cd /Users/jesswally/Desktop/Portfolio/jl-site-restore

echo "🚀 JL Solutions - Deploy All Fixes"
echo "==================================="
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository!"
    exit 1
fi

echo "📋 Summary of Changes:"
echo "----------------------"
echo "  ✅ Yellow CTA colors updated to #E6A740 (less bright)"
echo "  ✅ Case studies page text readability fixed"
echo "  ✅ Academy Lesson 3 code editing enabled"
echo "  ✅ Mark complete buttons moved to bottom"
echo "  ✅ Text readability checked across site"
echo ""

# Show current status
echo "📦 Files Changed:"
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

# Create commit
echo "📝 Creating commit..."
COMMIT_MSG="Fix: Update yellow CTAs to softer color, improve text readability, fix Academy lesson editing

- Change yellow CTAs from #ffbd59 to #E6A740 (less bright, more professional)
- Fix text readability on case-studies page (better contrast)
- Enable code editing in Academy Lesson 3 (number guessing game)
- Move Mark complete buttons to bottom of lesson boxes for better UX
- Ensure all text across site is readable with proper color contrast"

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
    echo "❌ Push failed. Please check errors above."
    exit 1
fi

