# Sierra's Git Cheat Sheet 🚀

## Every Time You Start Working

```bash
cd ~/Desktop/jl-solutions-site
git checkout main
git pull origin main
git checkout -b sierra/your-feature-name
```

## While You're Working

```bash
# See what you've changed
git status

# Add files to commit
git add .

# Or add specific files
git add academy/my-project.html

# Commit your changes
git commit -m "Description of what you did"
```

## When You're Done

```bash
# Push your branch to GitHub
git push origin sierra/your-feature-name

# Create a pull request for Titi to review
gh pr create --title "Your project name" --body "What you built"
```

## Helpful Commands

```bash
# See commit history
git log --oneline

# Undo changes to a file (before commit)
git checkout -- filename.html

# Go back to main branch
git checkout main

# Delete a branch (after it's merged)
git branch -d sierra/old-branch-name

# See all branches
git branch -a
```

## Common Workflows

### Starting a New Project
```bash
git checkout main
git pull origin main
git checkout -b sierra/calculator-app
# ... do your work ...
git add .
git commit -m "Build calculator app"
git push origin sierra/calculator-app
gh pr create
```

### Fixing Something Small
```bash
git checkout main
git pull origin main
git checkout -b sierra/fix-typo
# ... fix the typo ...
git add .
git commit -m "Fix typo on homepage"
git push origin sierra/fix-typo
gh pr create
```

## 🆘 When You're Stuck

1. Check what branch you're on: `git branch`
2. Check what's changed: `git status`
3. Text Titi!
4. Google the error message
5. Check: https://ohshitgit.com/ (yes, that's a real site!)

## 🎯 Branch Naming Convention

Always start your branches with `sierra/`:
- ✅ `sierra/todo-list-project`
- ✅ `sierra/fix-css-bug`
- ✅ `sierra/add-weather-app`
- ❌ `my-stuff` (not descriptive)
- ❌ `test` (not helpful)

## Remember

- **Commit often**: Small commits are better than huge ones
- **Write clear messages**: "Add calculator" not "stuff"
- **Pull before you push**: Always get latest changes first
- **Ask questions**: There are no dumb questions!
- **Have fun**: Git is a tool to help you, not stress you out

---

**You've got this, Sierra!** 💪

Love,
Titi

