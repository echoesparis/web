# Notion Typewriter

A typewriter effect that displays content from a Notion page, with full support for Notion's text colors, highlights, and formatting.

## Features

- ✨ Typewriter animation effect
- 🎨 Full Notion color support (text colors and backgrounds)
- 📝 Supports bold, italic, strikethrough, underline, code formatting
- 🔗 Link support
- 📱 Responsive design

## Local Development

### Prerequisites

- Node.js installed
- A Notion API token (get from [Notion Integrations](https://www.notion.so/my-integrations))

### Setup

1. **Install dependencies**:

```bash
cd typewriter_notion
npm install
```

2. **Create a `.env` file**:

Copy `.env.example` to `.env` and add your Notion token:

```bash
cp .env.example .env
```

Then edit `.env` and add your token:
```
NOTION_TOKEN=your_notion_token_here
NOTION_BLOCK_ID=your_block_id_here
```

3. **Start the proxy server** (required to avoid CORS issues):

```bash
npm start
# or
node proxy-server.js
```

The server will run on `http://localhost:3001`

4. **Open the HTML file** in your browser:

Open `index.html` in your browser. The typewriter will automatically fetch content from Notion.

> **Note:** The token in `script.js` is not used when `USE_PROXY=true` (default). The proxy server handles authentication using the token from `.env`.

### Configuration

Edit `script.js` to change:
- `NOTION_BLOCK_ID`: The Notion block/page ID to fetch content from
- `PROXY_URL`: The proxy server URL (default: `http://localhost:3001`)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick summary:**
- GitHub Pages can host the frontend, but **cannot run the Node.js proxy server**
- You need to deploy the proxy separately (Vercel, Netlify, Railway, etc.)
- Or use Vercel to host everything (frontend + serverless function)

## Project Structure

```
typewriter_notion/
├── index.html          # Main HTML file
├── script.js           # Client-side JavaScript
├── styles.css          # Styling
├── proxy-server.js     # Node.js proxy server (for local dev)
├── api/
│   └── notion.js      # Vercel serverless function (for deployment)
├── vercel.json        # Vercel configuration
├── DEPLOYMENT.md      # Deployment guide
└── README.md          # This file
```

## How It Works

1. The browser loads `index.html` and `script.js`
2. `script.js` makes a request to the proxy server (or serverless function)
3. The proxy/serverless function makes the actual request to Notion API (avoiding CORS)
4. Content is returned and displayed with typewriter effect
5. Notion formatting (colors, highlights, etc.) is preserved

## License

See repository license.

