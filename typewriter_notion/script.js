const TYPEWRITER_CONFIG = {
    loop: true,
    delay: 30,
    deleteSpeed: 20,
    cursor: '▋',
    pauseFor: 2000
};

const NOTION_TOKEN = 'your_notion_token_here';
const NOTION_BLOCK_ID = '2297e0b5c63440f883ea65aedc7611d1';

// Use proxy server to avoid CORS issues
// Set to true to use local proxy, false to try direct API (will fail due to CORS)
const USE_PROXY = true;

// Automatically detect environment: use localhost for local dev, or current origin for production
const PROXY_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'  // Local development
    : window.location.origin;   // Production (e.g., Vercel deployment)

// Helper function to format block ID (add dashes if needed)
function formatBlockId(blockId) {
    // Remove any existing dashes
    const cleanId = blockId.replace(/-/g, '');
    // Add dashes in UUID format: 8-4-4-4-12
    if (cleanId.length === 32) {
        return `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20, 32)}`;
    }
    return blockId;
}

async function loadContent() {
    try {
        const formattedBlockId = formatBlockId(NOTION_BLOCK_ID);
        
        // Determine the API URL
        let apiUrl;
        let fetchOptions;
        
        if (USE_PROXY) {
            // Use proxy server (avoids CORS)
            apiUrl = `${PROXY_URL}/api/notion/blocks/${NOTION_BLOCK_ID}/children`;
            fetchOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        } else {
            // Direct API call (will fail due to CORS)
            apiUrl = `https://api.notion.com/v1/blocks/${formattedBlockId}/children`;
            fetchOptions = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${NOTION_TOKEN}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                }
            };
        }
        
        const response = await fetch(apiUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        
        // Helper function to extract rich text from any block type
        function extractRichText(block) {
            const blockType = block.type;
            let richText = [];
            
            // Different block types have rich_text in different locations
            if (block[blockType]?.rich_text) {
                richText = block[blockType].rich_text;
            } else if (block[blockType]?.text) {
                // Some blocks have text instead of rich_text
                richText = Array.isArray(block[blockType].text) ? block[blockType].text : [block[blockType].text];
            }
            
            return richText;
        }
        
        // Extract text content from blocks
        const statements = data.results
            .map(block => {
                const richText = extractRichText(block);
                
                if (!richText || richText.length === 0) {
                    return null;
                }
                
                // Process rich text to maintain spans with Notion formatting
                const processedText = richText.map(textObj => {
                    // Handle both rich_text format and plain text
                    const plainText = textObj.plain_text || textObj.text || '';
                    const annotations = textObj.annotations || {};
                    const color = annotations.color || 'default';
                    
                    // Build CSS classes based on Notion formatting
                    const classes = [];
                    
                    // Check for background colors (e.g., "gray_background", "yellow_background")
                    if (color.endsWith('_background')) {
                        const bgColor = color.replace('_background', '');
                        classes.push('notion-bg', `notion-bg-${bgColor}`);
                    } 
                    // Check for text colors (e.g., "gray", "blue", "red")
                    else if (color !== 'default') {
                        classes.push('notion-text', `notion-text-${color}`);
                    }
                    
                    // Handle other annotations
                    if (annotations.bold) classes.push('notion-bold');
                    if (annotations.italic) classes.push('notion-italic');
                    if (annotations.strikethrough) classes.push('notion-strikethrough');
                    if (annotations.underline) classes.push('notion-underline');
                    if (annotations.code) classes.push('notion-code');
                    
                    // Handle links
                    if (textObj.href) {
                        return `<a href="${textObj.href}" class="notion-link ${classes.join(' ')}">${plainText}</a>`;
                    }
                    
                    // Return formatted text with classes
                    if (classes.length > 0) {
                        return `<span class="${classes.join(' ')}">${plainText}</span>`;
                    }
                    
                    return plainText;
                }).join('');
                
                return processedText;
            })
            .filter(text => text && text.trim() !== '');

        return statements;
    } catch (error) {
        // Detect CORS errors
        if (error.message === 'Failed to fetch' || error.message.includes('CORS')) {
            const errorMsg = USE_PROXY 
                ? 'Failed to fetch. Make sure the proxy server is running on ' + PROXY_URL
                : 'CORS error: Notion API blocks direct browser requests. Enable USE_PROXY or use a proxy server.';
            return [`Error: ${errorMsg}. Run "node proxy-server.js" in the terminal.`];
        }
        
        return ['Error loading content from Notion: ' + error.message];
    }
}

class TypewriterManager {
    constructor() {
        this.typewriter = null;
    }

    async init() {
        try {
            // Check if Typewriter library is loaded
            if (typeof Typewriter === 'undefined') {
                throw new Error('Typewriter library not loaded. Make sure typewriter-effect is included.');
            }
            
            // Check if target element exists
            const targetElement = document.querySelector('#main');
            if (!targetElement) {
                throw new Error('Target element #main not found in DOM');
            }
            
            const content = await loadContent();
            
            if (!content || content.length === 0) {
                targetElement.textContent = 'No content available';
                return;
            }
            
            this.setupTypewriter(content);
            this.setupErrorHandling();
            this.setupResponsiveBehavior();
        } catch (error) {
            const targetElement = document.querySelector('#main');
            if (targetElement) {
                targetElement.textContent = `Error: ${error.message}`;
            }
        }
    }

    setupTypewriter(content) {
        if (!content || content.length === 0) {
            return;
        }

        this.typewriter = new Typewriter('#main', TYPEWRITER_CONFIG);
        
        content.forEach((text) => {
            this.typewriter
                .typeString(text.trim())
                .pauseFor(2000)
                .deleteAll(1);
        });

        this.typewriter.start();
    }

    setupErrorHandling() {
        window.onerror = () => {
            return false;
        };
    }

    setupResponsiveBehavior() {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                if (this.typewriter) {
                    this.typewriter.changeDelay(width < 768 ? 40 : 30);
                }
            }
        });

        resizeObserver.observe(document.body);
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const manager = new TypewriterManager();
    manager.init();
});