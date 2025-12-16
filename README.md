# JL Solutions Website - Phase 1: Trainee Guide

Welcome to the JL Solutions website repository! This is a real, live website that you'll be working on as you learn to code. This README is specifically for **Phase 1: Trainee (Weeks 1-4)** and will guide you through making your first contributions.

## 🎯 What Is This Project?

This is the official JL Solutions website, which includes:
- Main business website (Home, About, Services, Contact)
- **JL Solutions Academy** - A complete learning platform for coding students
- Interactive features (chatbot, progress tracking, study tools)

**Live Site:** https://www.jlsolutions.io

## 🎓 Phase 1: Trainee Overview

**Weeks 1-4 • Foundation Building**

Welcome to the team! As a trainee, you're learning the absolute basics and getting comfortable with code. No pressure — everyone starts here.

### What You're Learning:
- HTML structure and elements
- Basic CSS styling
- How to use VS Code and Chrome DevTools
- Git basics (clone, commit, push)
- Reading and understanding existing code

### What You'll Do for JL Solutions:
- Fix simple typos on website pages
- Update text content when we ask
- Make small CSS changes (colors, spacing, fonts)
- Follow along with small tutorials
- Ask questions and learn from feedback

### Success Looks Like:
- ✓ You can create a simple HTML page from scratch
- ✓ You can style elements with CSS
- ✓ You understand how to navigate files and folders
- ✓ You've made your first commit to GitHub
- ✓ You're comfortable asking for help when stuck

### Projects to Complete:
- Personal Bio Page
- Simple Portfolio Homepage
- Styled Card Layout

## 🚀 Getting Started

### Prerequisites

Before you start, make sure you have:
- [ ] A GitHub account
- [ ] Git installed on your computer
- [ ] A code editor (VS Code recommended)
- [ ] Chrome browser (for DevTools)

### Step 1: Clone the Repository

1. Open your terminal (or Command Prompt on Windows)
2. Navigate to where you want to save the project:
   ```bash
   cd Desktop
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/JLWally/jl-solutions-site.git
   ```
4. Enter the project folder:
   ```bash
   cd jl-solutions-site
   ```

### Step 2: Open in VS Code

1. Open VS Code
2. Go to File → Open Folder
3. Select the `jl-solutions-site` folder

### Step 3: View the Site Locally

Since this is a static site, you can view it in your browser:

1. Right-click on `index.html` in VS Code
2. Select "Open with Live Server" (if you have the Live Server extension)
3. OR simply double-click `index.html` to open it in your browser

## 📁 Project Structure

```
jl-solutions-site/
├── index.html              # Main homepage
├── about.html              # About page
├── contact.html           # Contact page
├── resources.html         # Resources page
├── academy/               # Academy section
│   ├── index.html         # Academy homepage
│   ├── beginner-course.html
│   ├── modules.html       # Training modules
│   ├── projects.html      # Project tutorials
│   ├── progress.html      # Progress tracker
│   ├── resources.html     # Learning resources
│   ├── mentorship.html    # Career path
│   ├── schedule.html      # Weekly schedule
│   ├── timer.html         # Study timer
│   ├── snippets.html      # Code snippets
│   └── faq.html           # FAQ page
├── services/              # Services pages
├── css/                   # Stylesheets
│   ├── style.css          # Main styles
│   └── academy.css        # Academy-specific styles
├── js/                    # JavaScript files
│   ├── main.js
│   ├── chatbot.js
│   └── academy-progress.js
├── assets/                # Images and icons
└── netlify/               # Netlify functions
```

## ✏️ Making Changes (Phase 1 Tasks)

### Task 1: Fix a Typo or Update Text

**This is your most common task as a trainee!**

1. Find the file you need to edit (e.g., `academy/index.html`)
2. Open it in VS Code
3. Find the text you want to change (use Ctrl+F or Cmd+F to search)
4. Make your edit
5. Save the file (Ctrl+S or Cmd+S)
6. Test it locally (refresh your browser)
7. Commit and push (see "Committing Changes" below)

**Example:** Fix "Welcom" to "Welcome" on the homepage

### Task 2: Make Small CSS Changes

**Learn to change colors, spacing, and fonts**

1. Open the relevant CSS file (`css/style.css` or `css/academy.css`)
2. Find the element you want to style (ask us for help finding it!)
3. Change the color, padding, margin, or font-size
4. Save and refresh to see changes
5. Test it looks good
6. Commit and push

**Example:** Change a button color from blue to green

### Task 3: Update Content When Asked

**We'll give you specific instructions**

1. We'll tell you which file to edit
2. We'll tell you what text to change
3. You make the change
4. Test it locally
5. Commit and push

**Example:** Update the contact email address

## 🔄 Git Workflow (Phase 1 Basics)

### Before Making Changes

Always pull the latest changes first:
```bash
git pull origin main
```

### Making Your First Commit

1. **Check what you've changed:**
   ```bash
   git status
   ```

2. **Add your changes:**
   ```bash
   git add .
   ```
   Or add specific files:
   ```bash
   git add academy/index.html
   ```

3. **Commit with a clear message:**
   ```bash
   git commit -m "Fix typo in academy welcome letter"
   ```
   
   Good commit messages for Phase 1:
   - ✅ "Fix typo in academy welcome letter"
   - ✅ "Update contact email address"
   - ✅ "Change button color to green"
   - ❌ "changes"
   - ❌ "fix stuff"

4. **Push to GitHub:**
   ```bash
   git push origin main
   ```

**Congratulations!** You just made your first contribution to a live website! 🎉

## 🧪 Testing Your Changes

### Before Pushing

1. **Test locally:**
   - Open the page in your browser
   - Check the change looks correct
   - Make sure nothing broke
   - Check for typos

2. **Check for common issues:**
   - ✅ Text is correct
   - ✅ Colors look good
   - ✅ Page still loads
   - ✅ No obvious errors

### After Pushing

1. Wait 1-2 minutes for Netlify to deploy
2. Visit https://www.jlsolutions.io
3. Check your changes are live
4. Celebrate! 🎉

## 🚀 Deployment

This site is automatically deployed via **Netlify**. When you push to the `main` branch:

1. Netlify detects the change
2. Builds the site
3. Deploys it live
4. Usually takes 1-3 minutes

**No manual deployment needed!** Just push to GitHub and it goes live automatically.

## 📝 Phase 1 Common Tasks

### Fixing a Typo

1. Find the file with the typo
2. Use VS Code's search (Ctrl+F or Cmd+F) to find it
3. Fix the typo
4. Save and test
5. Commit: `git commit -m "Fix typo: [what you fixed]"`

### Updating Text Content

1. We'll tell you which file and what to change
2. Make the change
3. Save and test
4. Commit: `git commit -m "Update [page name] content"`

### Changing Colors

1. Open the CSS file
2. Find the color you want to change (ask us for help!)
3. Change the color value
4. Save and refresh
5. Commit: `git commit -m "Change [element] color to [color]"`

## 🐛 Debugging Tips (Phase 1)

### Page Not Loading?

1. Check the file path is correct
2. Make sure the file is saved
3. Try refreshing the browser
4. Ask us for help!

### Change Not Showing?

1. Make sure you saved the file
2. Refresh your browser (Ctrl+R or Cmd+R)
3. Check you edited the right file
4. Ask us for help!

### Git Not Working?

1. Make sure you're in the right folder
2. Check you've saved your changes
3. Ask us for help!

## 📚 Resources for Phase 1

- **HTML Basics:** https://developer.mozilla.org/en-US/docs/Learn/HTML
- **CSS Basics:** https://developer.mozilla.org/en-US/docs/Learn/CSS
- **VS Code Guide:** https://code.visualstudio.com/docs
- **Git Basics:** https://git-scm.com/doc
- **Chrome DevTools:** https://developer.chrome.com/docs/devtools/

## 🆘 Getting Help

### When You're Stuck

1. **Check the error message** - Often tells you exactly what's wrong
2. **Google the error** - Someone else has had this problem
3. **Check the FAQ:** `/academy/faq.html`
4. **Ask us!** - Email: info@jlsolutions.io

### Before Asking for Help

Include:
- What you're trying to do
- What error message you're seeing (if any)
- What file you're working on
- What you've already tried

**Remember:** Asking questions is part of learning! We're here to help.

## ✅ Best Practices for Phase 1

1. **Always pull before starting work:**
   ```bash
   git pull origin main
   ```

2. **Test locally before pushing**

3. **Write clear commit messages**

4. **Don't commit broken code** - Test first!

5. **Ask questions** - Better to ask than break something

6. **Start small** - Fix one thing at a time

7. **Celebrate small wins** - Every fix counts!

## 🎓 Phase 1 Learning Goals

By the end of Week 4, you should be able to:

- [ ] Navigate the project folder structure
- [ ] Open and edit HTML files
- [ ] Make simple CSS changes
- [ ] Use VS Code effectively
- [ ] Use Chrome DevTools to inspect elements
- [ ] Make a git commit
- [ ] Push changes to GitHub
- [ ] See your changes go live

## 📞 Contact

**Email:** info@jlsolutions.io

For questions, help, or to report issues, email us at info@jlsolutions.io. We're here to support your learning journey!

---

**Remember:** This is a learning project! It's okay to make mistakes. Every bug you fix and every change you make helps you learn and helps JL Solutions. You've got this! 💪

**Phase 1 Focus:** Keep it simple. Fix typos. Update text. Change colors. Learn the basics. Build confidence. You're doing great!

---

*Last Updated: January 2025*  
*Phase 1: Trainee (Weeks 1-4)*
