# Push JL Solutions site to its own GitHub repo

TrailCrafter is **restored** on this repo (main branch).

The JL Solutions–only version is saved on branch **`jl-solutions-site`** in this repo.

## To publish JL Solutions to its own GitHub repo

1. **Create a new repo on GitHub** (e.g. `jlsolutions`, `jlsolutions.io`, or `jl-solutions`).
   - Go to https://github.com/new
   - Name it whatever you want for the JL Solutions site (e.g. `jlsolutions.io`).
   - Do **not** add a README, .gitignore, or license (we’re pushing existing code).

2. **Add that repo as a remote and push the JL Solutions branch as `main`:**
   ```bash
   cd /Users/jesswally/TrailCrafter
   git remote add jlsolutions https://github.com/JLWally/YOUR_REPO_NAME.git
   git push jlsolutions jl-solutions-site:main
   ```
   Replace `YOUR_REPO_NAME` with the repo you created (e.g. `jlsolutions.io`).

3. **Optional:** Set the default branch on GitHub to `main` if it isn’t already.

After this, the TrailCrafter repo stays as TrailCrafter, and the new repo is the JL Solutions site.
