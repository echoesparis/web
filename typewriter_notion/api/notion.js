// Vercel serverless function for Notion API proxy
const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) {
    console.error('ERROR: NOTION_TOKEN environment variable is not set');
}

// Format block ID (add dashes if needed)
function formatBlockId(blockId) {
    const cleanId = blockId.replace(/-/g, '');
    if (cleanId.length === 32) {
        return `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20, 32)}`;
    }
    return blockId;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Extract block ID from query parameter
    const { blockId } = req.query;
    
    if (!blockId) {
        return res.status(400).json({ error: 'Block ID required' });
    }
    
    const formattedBlockId = formatBlockId(blockId);
    const notionUrl = `https://api.notion.com/v1/blocks/${formattedBlockId}/children`;
    
    try {
        const response = await fetch(notionUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }
        
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

