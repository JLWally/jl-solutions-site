# Netlify Deployment Fix

## If the site is down, check these:

### 1. Verify Netlify Plugin Installation
- Go to Netlify Dashboard → Site Settings → Build & Deploy → Plugins
- Ensure `@netlify/plugin-nextjs` is installed
- If not, Netlify should auto-install it from `netlify.toml`

### 2. Check Build Settings
In Netlify Dashboard → Site Settings → Build & Deploy → Build settings:
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** 18 (or higher)

### 3. Environment Variables
Make sure these are set in Netlify Dashboard → Site Settings → Environment Variables:
- `NODE_VERSION` = `18` (optional, but recommended)
- Any API keys your app needs (OPENAI_API_KEY, STRIPE_SECRET_KEY, etc.)

### 4. Trigger a New Deploy
1. Go to Netlify Dashboard → Deploys
2. Click "Trigger deploy" → "Deploy site"
3. This will rebuild with the latest configuration

### 5. Check Build Logs
- Go to Netlify Dashboard → Deploys
- Click on the latest deploy
- Check the build logs for any errors

## Current Configuration
- ✅ `netlify.toml` is configured correctly
- ✅ Next.js plugin is specified
- ✅ Build command and publish directory are set
- ✅ Node version is specified

## If Still Not Working
1. Check Netlify status page: https://www.netlifystatus.com/
2. Verify your GitHub repository is connected
3. Check if there are any build errors in the deploy logs
4. Try clearing the build cache in Netlify Dashboard
