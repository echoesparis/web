// Simple proxy server for Notion API to handle CORS
require('dotenv').config();
const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) {
    console.error('ERROR: NOTION_TOKEN is not set in .env file');
    console.error('Please create a .env file with NOTION_TOKEN=your_token');
    process.exit(1);
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse the request URL
    const parsedUrl = url.parse(req.url, true);
    
    // Proxy endpoint: /api/notion/blocks/:blockId/children
    const blockIdMatch = req.url.match(/^\/api\/notion\/blocks\/([^\/]+)\/children$/);
    
    if (!blockIdMatch) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid endpoint. Use /api/notion/blocks/:blockId/children' }));
        return;
    }

    const blockId = blockIdMatch[1];
    console.log(`Proxying request for block ID: ${blockId}`);

    // Format block ID with dashes if needed
    function formatBlockId(id) {
        const cleanId = id.replace(/-/g, '');
        if (cleanId.length === 32) {
            return `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20, 32)}`;
        }
        return id;
    }

    const formattedBlockId = formatBlockId(blockId);
    const notionUrl = `https://api.notion.com/v1/blocks/${formattedBlockId}/children`;

    // Make request to Notion API
    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }
    };

    const notionReq = https.request(notionUrl, options, (notionRes) => {
        res.writeHead(notionRes.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });

        notionRes.on('data', (chunk) => {
            res.write(chunk);
        });

        notionRes.on('end', () => {
            res.end();
        });
    });

    notionReq.on('error', (error) => {
        console.error('Error proxying to Notion:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    });

    req.on('error', (error) => {
        console.error('Request error:', error);
        notionReq.destroy();
    });

    notionReq.end();
});

server.listen(PORT, () => {
    console.log(`Notion proxy server running on http://localhost:${PORT}`);
    console.log(`Example: http://localhost:${PORT}/api/notion/blocks/2297e0b5c63440f883ea65aedc7611d1/children`);
});

