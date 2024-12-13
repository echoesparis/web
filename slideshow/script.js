// Function to get all media files from both JSON files
async function getMediaFiles() {
    try {
        // Load both JSON files
        const [mediaResponse, notionResponse] = await Promise.all([
            fetch('media.json').catch(() => ({ ok: false, status: 404 })),
            fetch('notion.json')
        ]);

        if (!notionResponse.ok) {
            throw new Error('Failed to load notion files');
        }

        const notionFiles = await notionResponse.json();
        let mediaFiles = [];

        // Only try to load media.json if it exists
        if (mediaResponse.ok) {
            mediaFiles = await mediaResponse.json();
        } else {
            console.log('media.json is missing');
        }

        // Combine both arrays
        const combinedFiles = [
            ...notionFiles.map(file => ({
                ...file,
                source: 'notion',
                notionUrl: file.url
            })),
            ...mediaFiles.map(file => ({
                ...file,
                source: 'local'
            }))
        ];

        return combinedFiles;
    } catch (error) {
        console.error('Error loading media files:', error);
        return [];
    }
}

// Function to get filename from path without extension
function getFileName(path) {
    // Check if it's a Notion URL
    if (path.includes('notion.so')) {
        // Extract the downloadName parameter
        const downloadName = new URLSearchParams(path.split('?')[1]).get('downloadName');
        if (downloadName) {
            // Remove extension and replace dashes/underscores with spaces, then trim
            return downloadName
                .replace(/\.[^/.]+$/, '') // remove extension
                .replace(/[-_]/g, ' ') // replace dashes and underscores with spaces
                .replace(/\b\w/g, c => c.toUpperCase()) // capitalize first letter of each word
                .trim(); // remove leading and trailing spaces
        }
    }
    // For local files
    return path.split('/').pop().replace(/\.[^/.]+$/, '').trim();
}

// Function to determine media type from source URL
function getMediaType(src) {
    const videoExtensions = ['.mp4', '.webm', '.ogg'];
    const extension = src.toLowerCase().match(/\.[^/.]+$/)?.[0];
    return videoExtensions.includes(extension) ? 'video' : 'image';
}

// Function to create slide HTML based on media type
function createSlideElement(media) {
    const caption = media.source === 'notion' ? media.caption : getFileName(media.src);
    const type = getMediaType(media.src);
    
    const mediaElement = type === 'image' 
        ? `<img src="${media.src}" alt="Slide Image">`
        : `
            <video 
                controls
                preload="metadata"
                playsinline
                loop
            >
                <source src="${media.src}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    
    // Wrap media in link if it's a notion file
    const content = media.source === 'notion' && media.notionUrl
        ? `<a href="${media.notionUrl}" >${mediaElement}</a>`
        : mediaElement;

    return `
        ${content}
        <div class="slide-caption">${caption}</div>
    `;
}

// Preload images function
async function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

// Preload video metadata
async function preloadVideo(src) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => resolve(video);
        video.onerror = () => reject(new Error(`Failed to load video: ${src}`));
        video.src = src;
    });
}

// Initialize Swiper
async function initSwiper() {
    const loader = document.querySelector('.loader');
    
    try {
        // Load media files data
        const mediaFiles = await getMediaFiles();
        
        // Preload first few items (e.g., first 5)
        const preloadCount = 5;
        const preloadPromises = mediaFiles
            .slice(0, preloadCount)
            .map(media => 
                getMediaType(media.src) === 'image'
                    ? preloadImage(media.src)
                    : preloadVideo(media.src)
            );

        // Wait for initial items to load
        await Promise.all(preloadPromises);
        
        const swiperWrapper = document.querySelector('.swiper-wrapper');

        // Create slides
        mediaFiles.forEach(media => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.innerHTML = createSlideElement(media);
            swiperWrapper.appendChild(slide);
        });

        // Initialize Swiper
        const swiper = new Swiper('.mySwiper', {
            // Carousel effect settings
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 'auto',
            spaceBetween: 80,
            coverflowEffect: {
                rotate: 15,
                stretch: 0,
                depth: 250,
                modifier: 1,
                slideShadows: true,
            },
            
            // Auto play with custom delay
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            
            // Smooth transition
            speed: 1000,
            
            // Loop
            loop: true,
            
            // Pagination
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            
            // Navigation arrows
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            
            // Responsive breakpoints
            breakpoints: {
                320: {
                    slidesPerView: 1,
                },
                640: {
                    slidesPerView: 1.3,
                },
                968: {
                    slidesPerView: 2.2,
                }
            },
            
            // Improve performance
            preloadImages: false,
            lazy: {
                loadPrevNext: true,
                loadPrevNextAmount: 2
            },
            watchSlidesProgress: true,
            
            // Add keyboard control
            keyboard: {
                enabled: true,
                onlyInViewport: false,
            },
            
            on: {
                slideChange: function () {
                    // Pause all videos when sliding
                    const videos = document.querySelectorAll('video');
                    videos.forEach(video => {
                        video.pause();
                        video.currentTime = 0;
                    });

                    // Set delay based on next slide type
                    const nextSlide = this.slides[this.activeIndex];
                    const video = nextSlide.querySelector('video');
                    if (video) {
                        this.params.autoplay.delay = 8000; // Longer delay for videos (8 seconds)
                    } else {
                        this.params.autoplay.delay = 3000; // Normal delay for images (3 seconds)
                    }
                },
                slideChangeTransitionEnd: function () {
                    // Auto-play the current slide's video if it exists
                    const activeSlide = this.slides[this.activeIndex];
                    const video = activeSlide.querySelector('video');
                    if (video) {
                        video.play().catch(function(error) {
                            console.log("Video play failed:", error);
                        });
                    }
                },
                init: function() {
                    // Hide loader when Swiper is ready
                    loader.classList.add('hidden');
                }
            }
        });

        // Add custom keyboard event listener for more control
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                swiper.slidePrev();
            } else if (e.key === 'ArrowRight') {
                swiper.slideNext();
            }
        });

        // Preload remaining items in background
        mediaFiles
            .slice(preloadCount)
            .forEach(media => 
                getMediaType(media.src) === 'image'
                    ? preloadImage(media.src).catch(console.error)
                    : preloadVideo(media.src).catch(console.error)
            );

    } catch (error) {
        console.error('Failed to initialize gallery:', error);
        loader.innerHTML = `
            <div class="loader-text">Failed to load gallery. Please try again.</div>
        `;
    }
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', initSwiper); 