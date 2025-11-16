# Deployment Guide for typewriter_notion

## Important: GitHub Pages Limitation

**GitHub Pages can only host static files** (HTML, CSS, JavaScript). It **cannot run Node.js servers**.

Your project has two parts:
1. **Frontend** (index.html, script.js, styles.css) - ✅ Can be hosted on GitHub Pages
2. **Proxy Server** (proxy-server.js) - ❌ Cannot run on GitHub Pages

## Solution Options

### Option 1: GitHub Pages + Separate Proxy Hosting (Recommended)

Host the frontend on GitHub Pages and the proxy on a free hosting service.

#### Step 1: Deploy Frontend to GitHub Pages

1. Push your code to GitHub
2. Go to your repository → Settings → Pages
3. Select source branch (usually `main`)
4. Select folder: `/typewriter_notion` or `/` (root)
5. Save - GitHub will give you a URL like `https://username.github.io/repo/typewriter_notion/`

#### Step 2: Deploy Proxy to a Free Hosting Service

**Option A: Vercel (Easiest)**

1. Go to [vercel.com](https://vercel.com) and sign up
2. Create a new project
3. Upload `proxy-server.js`
4. Vercel will automatically detect it as a serverless function
5. Update `script.js` to use the Vercel URL instead of `localhost:3001`

**Option B: Netlify Functions**

1. Go to [netlify.com](https://netlify.com) and sign up
2. Create a new site
3. Add `proxy-server.js` as a Netlify function
4. Update `script.js` with the Netlify function URL

**Option C: Railway / Render**

1. Sign up at [railway.app](https://railway.app) or [render.com](https://render.com)
2. Create a new Node.js service
3. Deploy `proxy-server.js`
4. Update `script.js` with the service URL

#### Step 3: Update script.js

Change the `PROXY_URL` in `script.js`:

```javascript
// Change from:
const PROXY_URL = 'http://localhost:3001';

// To your deployed proxy URL:
const PROXY_URL = 'https://your-proxy.vercel.app'; // or your hosting URL
```

---

### Option 2: Convert to Serverless Function (Best for Production)

Convert the proxy to a serverless function that can be deployed alongside your frontend.

#### For Vercel:

1. Create `api/notion.js` in your project:
```javascript
// api/notion.js
const NOTION_TOKEN = process.env.NOTION_TOKEN;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { blockId } = req.query;
  
  if (!blockId) {
    return res.status(400).json({ error: 'Block ID required' });
  }
  
  // Format block ID
  function formatBlockId(id) {
    const cleanId = id.replace(/-/g, '');
    if (cleanId.length === 32) {
      return `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20, 32)}`;
    }
    return id;
  }
  
  const formattedBlockId = formatBlockId(blockId);
  const notionUrl = `https://api.notion.com/v1/blocks/${formattedBlockId}/children`;
  
  try {
    const response = await fetch(notionUrl, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

2. Deploy entire project to Vercel (frontend + API in one place)
3. Update `script.js`:
```javascript
const PROXY_URL = 'https://your-project.vercel.app';
```

---

### Option 3: Use GitHub Actions + Self-Hosted Runner

If you have a server, you can use GitHub Actions to deploy the proxy server automatically.

---

## Quick Start: Local Development

For local development, you still need to run the proxy server:

```bash
cd typewriter_notion
node proxy-server.js
```

Then open `index.html` in your browser.

---

## Recommended Setup for GitHub

**Best approach**: Use **Vercel** to host everything (frontend + API):

1. Deploy to Vercel (it handles both static files and serverless functions)
2. Everything works in one place
3. Free tier is generous
4. Automatic deployments from GitHub

Would you like me to help you set up the Vercel deployment?

