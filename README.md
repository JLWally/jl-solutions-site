# JL Solutions Website - Academy Project

Welcome to the JL Solutions website repository! This is a real, live website that you'll be working on as you learn to code. This README will guide you through making changes, fixing bugs, and contributing to the project.

## 🎯 What Is This Project?

This is the official JL Solutions website, which includes:
- Main business website (Home, About, Services, Contact)
- **JL Solutions Academy** - A complete learning platform for coding students
- Interactive features (chatbot, progress tracking, study tools)

**Live Site:** https://www.jlsolutions.io

## 🚀 Getting Started

### Prerequisites

Before you start, make sure you have:
- [ ] A GitHub account
- [ ] Git installed on your computer
- [ ] A code editor (VS Code recommended)
- [ ] Basic knowledge of HTML, CSS, and JavaScript

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

## ✏️ Making Changes

### Common Tasks

#### 1. Fix a Typo or Update Text

1. Find the file you need to edit (e.g., `academy/index.html`)
2. Open it in VS Code
3. Find the text you want to change
4. Make your edit
5. Save the file (Ctrl+S or Cmd+S)
6. Test it locally (refresh your browser)
7. Commit and push (see "Committing Changes" below)

#### 2. Add a New Academy Page

1. Create a new HTML file in the `academy/` folder
2. Copy the structure from an existing page (like `academy/index.html`)
3. Update the content
4. Add a link to it from the main academy index page
5. Test it locally
6. Commit and push

#### 3. Fix a Bug

1. Identify the bug (what's not working?)
2. Find the relevant file (HTML, CSS, or JavaScript)
3. Debug:
   - Open browser DevTools (F12)
   - Check the Console for errors
   - Use `console.log()` to debug JavaScript
4. Fix the issue
5. Test thoroughly
6. Commit and push

#### 4. Update Styling

1. Open the relevant CSS file (`css/style.css` or `css/academy.css`)
2. Find the element you want to style (use browser DevTools to inspect)
3. Add or modify CSS rules
4. Save and refresh to see changes
5. Test on different screen sizes
6. Commit and push

## 🔄 Git Workflow

### Before Making Changes

Always pull the latest changes first:
```bash
git pull origin main
```

### Making a Commit

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
   
   Good commit messages:
   - ✅ "Fix typo in academy welcome letter"
   - ✅ "Add new FAQ section to academy"
   - ✅ "Update calculator project tutorial"
   - ❌ "changes"
   - ❌ "fix stuff"

4. **Push to GitHub:**
   ```bash
   git push origin main
   ```

### Creating a Branch (For Bigger Changes)

For larger features or experiments, create a branch:

1. **Create and switch to a new branch:**
   ```bash
   git checkout -b feature/new-page
   ```

2. **Make your changes**

3. **Commit as usual:**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature/new-page
   ```

4. **Create a Pull Request on GitHub** (ask Titi for help with this!)

## 🧪 Testing Your Changes

### Before Pushing

1. **Test locally:**
   - Open the page in your browser
   - Check all links work
   - Test on mobile (resize browser window)
   - Check for console errors (F12 → Console)

2. **Check for common issues:**
   - ✅ All images load
   - ✅ Links work correctly
   - ✅ No JavaScript errors
   - ✅ Page looks good on mobile
   - ✅ Text is readable

### After Pushing

1. Wait 1-2 minutes for Netlify to deploy
2. Visit https://www.jlsolutions.io
3. Check your changes are live
4. Test on the live site

## 🚀 Deployment

This site is automatically deployed via **Netlify**. When you push to the `main` branch:

1. Netlify detects the change
2. Builds the site
3. Deploys it live
4. Usually takes 1-3 minutes

**No manual deployment needed!** Just push to GitHub and it goes live automatically.

## 📝 Common Tasks Guide

### Adding a New Project Tutorial

1. Open `academy/projects.html`
2. Find the appropriate section (Beginner/Intermediate/Advanced)
3. Add a new project card following the existing pattern
4. Add the tutorial content in the expandable section
5. Test it works
6. Commit: `git commit -m "Add new project tutorial: [Project Name]"`

### Updating Progress Tracker

1. Open `academy/progress.html`
2. Find the checklist item you want to update
3. Modify the HTML structure if needed
4. Update `js/academy-progress.js` if adding new functionality
5. Test the checkboxes work
6. Commit: `git commit -m "Update progress tracker with new skills"`

### Fixing a Broken Link

1. Find the file with the broken link
2. Use VS Code's search (Ctrl+F or Cmd+F) to find the link
3. Fix the path (make sure it starts with `/` for absolute paths)
4. Test the link works
5. Commit: `git commit -m "Fix broken link to [page name]"`

## 🐛 Debugging Tips

### JavaScript Not Working?

1. Open browser DevTools (F12)
2. Go to the Console tab
3. Look for red error messages
4. Check the line number mentioned
5. Common issues:
   - Missing closing bracket `}`
   - Typo in function name
   - Variable not defined

### CSS Not Applying?

1. Right-click the element → Inspect
2. Check if your CSS rule is there
3. Check if it's being overridden (crossed out)
4. Make sure your selector is correct
5. Check for typos in class/ID names

### Page Not Loading?

1. Check the file path is correct
2. Make sure the file is saved
3. Check browser console for 404 errors
4. Verify the HTML structure is valid

## 📚 Resources

- **Git Basics:** https://git-scm.com/doc
- **HTML Reference:** https://developer.mozilla.org/en-US/docs/Web/HTML
- **CSS Reference:** https://developer.mozilla.org/en-US/docs/Web/CSS
- **JavaScript Reference:** https://developer.mozilla.org/en-US/docs/Web/JavaScript
- **VS Code Guide:** https://code.visualstudio.com/docs

## 🆘 Getting Help

### When You're Stuck

1. **Check the error message** - Often tells you exactly what's wrong
2. **Google the error** - Someone else has had this problem
3. **Check the FAQ:** `/academy/faq.html`
4. **Ask Titi!** - Text or email: theveteranfreelancer@gmail.com

### Before Asking for Help

Include:
- What you're trying to do
- What error message you're seeing (if any)
- What file you're working on
- What you've already tried

## ✅ Best Practices

1. **Always pull before starting work:**
   ```bash
   git pull origin main
   ```

2. **Test locally before pushing**

3. **Write clear commit messages**

4. **Don't commit broken code** - Test first!

5. **Ask questions** - Better to ask than break something

6. **Back up your work** - Commit often!

## 🎓 Learning Path

As you work on this project, you'll learn:

- **Week 1-2:** HTML structure, making simple edits
- **Week 3-4:** CSS styling, fixing layout issues
- **Week 5-6:** JavaScript basics, adding interactivity
- **Week 7-8:** Git workflow, version control
- **Week 9-10:** Debugging, problem-solving
- **Week 11-12:** Building new features, React basics

## 📞 Contact

**Mentor:** Jess Walcott (Titi)  
**Email:** theveteranfreelancer@gmail.com

---

**Remember:** This is a learning project! It's okay to make mistakes. Every bug you fix and every feature you add makes you a better developer. You've got this! 💪

---

*Last Updated: January 2025*
