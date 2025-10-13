const TYPEWRITER_CONFIG = {
    loop: true,
    delay: 30,
    deleteSpeed: 5,
    cursor: '▋',
    pauseFor: 2000
};

// Load content from content.txt
async function loadContent() {
    try {
        const response = await fetch('./content.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        // Split by newlines and filter out empty lines
        return text.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        console.error('Error loading content:', error);
        // Return default content in case of error
        return [
            'we help <span class="customer">design professionals</span> solve complex challenges through <span class="technology">computational tools</span>'
        ];
    }
}

class TypewriterManager {
    constructor() {
        this.typewriter = null;
        // Don't initialize in constructor
    }

    async init() {
        try {
            const content = await loadContent();
            console.log('Content loaded:', content); // Debug log
            this.setupTypewriter(content);
            this.setupErrorHandling();
            this.setupResponsiveBehavior();
        } catch (error) {
            console.error('Error initializing TypewriterManager:', error);
        }
    }

    setupTypewriter(content) {
        if (!content || content.length === 0) {
            console.error('No content available for typewriter');
            return;
        }

        this.typewriter = new Typewriter('#main', TYPEWRITER_CONFIG);
        
        content.forEach((text) => {
            this.typewriter
                .typeString(text.trim())
                .pauseFor(2000)
                .deleteAll(5)
                .pauseFor(500);
        });

        this.typewriter.start();
    }

    setupErrorHandling() {
        window.onerror = (msg, url, lineNo, columnNo, error) => {
            console.error('Typewriter Error: ', msg, error);
            return false;
        };
    }

    setupResponsiveBehavior() {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                if (this.typewriter) {
                    const isMobile = width < 768;
                    this.typewriter.changeDelay(isMobile ? 40 : 30);
                    this.typewriter.changeDeleteSpeed(isMobile ? 30 : 20);
                }
            }
        });

        resizeObserver.observe(document.body);
    }
}

// Initialize the typewriter after DOM content is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const manager = new TypewriterManager();
    await manager.init();
});