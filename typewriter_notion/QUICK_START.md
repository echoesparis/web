# Quick Start Guide

## Answer: Can GitHub Launch the Server?

**No, GitHub Pages cannot run Node.js servers.** Here's what you need to know:

## The Problem

Your project needs:
1. ✅ **Frontend** (HTML/CSS/JS) - GitHub Pages CAN host this
2. ❌ **Proxy Server** (Node.js) - GitHub Pages CANNOT run this

## Solution: Use Vercel (Easiest)

Vercel can host both your frontend AND the proxy server as a serverless function.

### Step 1: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the setup
5. Deploy!

### Step 2: Update script.js for Production

After deployment, Vercel will give you a URL like `https://your-project.vercel.app`

Update `script.js`:

```javascript
// Change this line:
const PROXY_URL = 'http://localhost:3001';

// To your Vercel URL:
const PROXY_URL = 'https://your-project.vercel.app';
```

### Step 3: That's It!

Your typewriter will now work on Vercel. The serverless function at `/api/notion/blocks/:blockId/children` will handle the proxy.

---

## Alternative: GitHub Pages + Separate Proxy

If you want to use GitHub Pages:

1. **Deploy frontend to GitHub Pages** (Settings → Pages)
2. **Deploy proxy separately** to:
   - Vercel (create a separate project just for the API)
   - Netlify Functions
   - Railway / Render
3. **Update `PROXY_URL`** in `script.js` to point to your proxy

---

## Local Development

For local testing, you still need to run the proxy:

```bash
node proxy-server.js
```

Then open `index.html` in your browser.

---

## Recommended: Full Vercel Deployment

**Best option**: Deploy everything to Vercel. It's free, easy, and handles both frontend and backend automatically.

The files `api/notion.js` and `vercel.json` are already set up for this!

