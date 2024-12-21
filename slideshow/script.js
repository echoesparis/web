document.addEventListener('click', function() {
    document.documentElement.setAttribute('data-user-interacted', 'true');
}, { once: true });

// Add this shuffle function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function getMediaFiles() {
    try {
        console.log('Starting getMediaFiles...');
        const response = await fetch('media.json');
        const mediaFiles = await response.json();
        console.log(`Loaded ${mediaFiles.length} files from media.json`);

        // Process files to add source path
        const processedFiles = mediaFiles.map(file => ({
            ...file,
            src: `src/${file.src}` // Prepend the src/ folder path
        }));

        // Shuffle the array
        return shuffleArray(processedFiles);
    } catch (error) {
        console.error('Error loading media files:', error);
        return [];
    }
}

// Helper functions from previous version
function getFileName(path) {
    if (path.includes('notion.so')) {
        const downloadName = new URLSearchParams(path.split('?')[1]).get('downloadName');
        if (downloadName) {
            return downloadName
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase())
                .trim();
        }
    }
    return path.split('/').pop().replace(/\.[^/.]+$/, '').trim();
}

function getMediaType(src) {
    const ext = src.split('.').pop().toLowerCase();
    return ext === 'mp4' ? 'video' : 'image';
}

async function createSlideElement(media) {
    try {
        const isVideo = getMediaType(media.src);
        
        // Create media element based on type - remove lazy loading for videos
        const mediaElement = isVideo === 'video'
            ? `<video controls playsinline muted autoplay preload="auto">
                 <source src="${media.src}" type="video/mp4">
                 Your browser does not support the video tag.
               </video>`
            : `<img src="${media.src}" alt="${media.caption || ''}" loading="lazy">`;

        // Wrap in link if URL is provided
        const content = media.url
            ? `<a href="${media.url}" target="_blank">${mediaElement}</a>`
            : mediaElement;

        // Generate tags HTML if present
        const tagsHtml = media.tags ? media.tags.map(tag => {
            const displayText = tag.match(/\((.*?)\)/) 
                ? tag.match(/\((.*?)\)/)[1]
                : tag;
            const tagUrl = tag.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[()]/g, '');
            return `<span class="tag-link"><a href="https://echoes.paris/tags/${tagUrl}">#${displayText}</a></span>`;
        }).join(' ') : '';

        return `
            <div class="slide-content" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
                ${content}
                <div class="slide-caption">
                    <span class="caption-text">${media.caption || ' '} ${tagsHtml}</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error creating slide:', error);
        return `<div class="error-message">Failed to load media</div>`;
    }
}

// Add this function to handle media preloading
async function preloadMedia(media) {
    return new Promise((resolve, reject) => {
        const isVideo = getMediaType(media.src);
        
        if (isVideo === 'video') {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.autoplay = true;
            video.preload = 'auto';
            
            const loadHandler = () => {
                video.removeEventListener('loadeddata', loadHandler);
                resolve(video);
            };
            
            const errorHandler = (error) => {
                video.removeEventListener('error', errorHandler);
                reject(error);
            };
            
            video.addEventListener('loadeddata', loadHandler, { once: true });
            video.addEventListener('error', errorHandler, { once: true });
            
            video.src = media.src;
            video.load();
        } else {
            const img = new Image();
            
            img.onload = () => resolve(img);
            img.onerror = (error) => reject(error);
            
            // Add loading priority for images
            img.loading = 'eager';
            img.fetchPriority = 'high';
            
            img.src = media.src;
        }
    });
}

// Modify the loadSlide function to ensure content is loaded before displaying
async function loadSlide(index) {
    const slide = swiperWrapper.querySelector(`[data-index="${index}"]`);
    if (slide && !slide.dataset.loaded) {
        try {
            const media = mediaFiles[index];
            const isVideo = getMediaType(media.src);

            // Show loading placeholder
            slide.innerHTML = '<div class="slide-placeholder">Loading...</div>';

            // Start preloading
            const preloadPromise = preloadMedia(media);

            // Add timeout for loading indicator
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Loading timeout')), 10000);
            });

            // Race between loading and timeout
            await Promise.race([preloadPromise, timeoutPromise]);

            // Create and insert slide content
            slide.innerHTML = await createSlideElement(media);
            slide.dataset.loaded = 'true';

            // If it's a video, prepare it
            if (isVideo === 'video') {
                const video = slide.querySelector('video');
                if (video) {
                    video.preload = 'auto';
                    video.load();
                }
            }
        } catch (error) {
            console.error(`Error loading slide ${index}:`, error);
            slide.innerHTML = `<div class="error-message">Failed to load media</div>`;
        }
    }
    return slide;
}

// Initialize Swiper
async function initSwiper() {
    const loader = document.querySelector('.loader');
    
    try {
        const mediaFiles = await getMediaFiles();
        const swiperWrapper = document.querySelector('.swiper-wrapper');

        // Create placeholder slides for all items
        mediaFiles.forEach((_, index) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.setAttribute('data-index', index);
            slide.innerHTML = '<div class="slide-placeholder" style="display: flex; justify-content: center; align-items: center; height: 100%;"></div>';
            swiperWrapper.appendChild(slide);
        });

        // Function to load a specific slide
        async function loadSlide(index) {
            const slide = swiperWrapper.querySelector(`[data-index="${index}"]`);
            if (slide && !slide.dataset.loaded) {
                try {
                    const media = mediaFiles[index];
                    const isVideo = getMediaType(media.src);

                    if (isVideo === 'video') {
                        // Videos load immediately without placeholder
                        slide.innerHTML = await createSlideElement(media);
                        slide.dataset.loaded = 'true';
                    } else {
                        // Images use lazy loading
                        slide.innerHTML = '<div class="slide-placeholder">Loading...</div>';
                        await preloadMedia(media);
                        slide.innerHTML = await createSlideElement(media);
                        slide.dataset.loaded = 'true';
                    }
                } catch (error) {
                    console.error(`Error loading slide ${index}:`, error);
                    slide.innerHTML = `<div class="error-message">Failed to load media</div>`;
                }
            }
            return slide;
        }

        // Load first slide immediately
        await loadSlide(0);
        loader.classList.add('hidden');

        // Initialize Swiper
        const swiper = new Swiper('.swiper', {
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 'auto',
            spaceBetween: 0,
            coverflowEffect: {
                rotate: 30,
                stretch: 0,
                depth: 100,
                modifier: 2,
                slideShadows: false,
            },
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
                waitForTransition: true,
            },
            speed: 800,
            loop: true,
            loopAdditionalSlides: 3,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
                renderBullet: function (index, className) {
                    return `<span class="${className}"></span>`;
                }
            },
            keyboard: {
                enabled: true,
                onlyInViewport: false,
            },
            mousewheel: {
                invert: false,
            },
            on: {
                slideChange: async function() {
                    const currentIndex = this.realIndex;
                    const nextIndex = (currentIndex + 1) % mediaFiles.length;
                    const prevIndex = (currentIndex - 1 + mediaFiles.length) % mediaFiles.length;

                    // Preload next and previous slides
                    await Promise.all([
                        loadSlide(nextIndex),
                        loadSlide(prevIndex)
                    ]);
                },
                slideChangeTransitionEnd: function() {
                    const activeSlide = this.slides[this.activeIndex];
                    if (!activeSlide) return;

                    const video = activeSlide.querySelector('video');
                    if (video) {
                        // For video slides, set delay to video duration
                        this.params.autoplay.delay = video.duration * 1000 || 2500;
                    } else {
                        // For non-video slides, use default delay
                        this.params.autoplay.delay = 2500;
                    }
                },
                beforeSlideChangeStart: async function() {
                    const nextIndex = (this.realIndex + 1) % this.slides.length;
                    const nextSlide = this.slides[nextIndex];
                    
                    if (nextSlide) {
                        // Wait for next slide to be loaded before transition
                        await new Promise((resolve) => {
                            if (nextSlide.dataset.loaded === 'true') {
                                resolve();
                            } else {
                                // If not loaded, wait for it
                                const checkInterval = setInterval(() => {
                                    if (nextSlide.dataset.loaded === 'true') {
                                        clearInterval(checkInterval);
                                        resolve();
                                    }
                                }, 100);
                                
                                // Set a timeout to prevent infinite waiting
                                setTimeout(() => {
                                    clearInterval(checkInterval);
                                    resolve();
                                }, 5000);
                            }
                        });
                    }
                },
                resize: function () {
                    this.update();
                },
                beforeResize: function () {
                    this.updateSize();
                    this.updateSlides();
                }
            },
            centeredSlides: true,
            breakpoints: {
                320: {
                    slidesPerView: 1,
                    spaceBetween: 0,
                    coverflowEffect: {
                        rotate: 15,
                        depth: 30,
                        modifier: 1
                    }
                },
                480: {
                    slidesPerView: 'auto',
                    spaceBetween: 0,
                    coverflowEffect: {
                        rotate: 20,
                        depth: 50,
                        modifier: 1.2
                    }
                },
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 0,
                    coverflowEffect: {
                        rotate: 25,
                        depth: 75,
                        modifier: 1.3
                    }
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 0,
                    coverflowEffect: {
                        rotate: 30,
                        depth: 100,
                        modifier: 1.5
                    }
                }
            },
            touchRatio: 1.5,
            touchAngle: 45,
            grabCursor: true,
            watchSlidesProgress: true,
            preventClicks: true,
            preventClicksPropagation: true,
            resistance: true,
            resistanceRatio: 0.85,
            updateOnWindowResize: true,
            observer: true,
            observeParents: true,
            centerInsufficientSlides: true,
            watchOverflow: true,
        });

    } catch (error) {
        console.error('Failed to initialize gallery:', error);
        loader.innerHTML = '<div class="loader-text">Failed to load gallery. Please try again.</div>';
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initSwiper);

// Add window resize listener
window.addEventListener('resize', () => {
    swiper.update();
});