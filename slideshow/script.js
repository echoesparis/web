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
        
        // Create media element based on type with better video support
        let mediaElement;
        if (isVideo === 'video') {
            // Check if browser supports video
            if (videoSupport.mp4 || videoSupport.webm || videoSupport.ogg) {
                const sources = [];
                if (videoSupport.mp4) sources.push(`<source src="${media.src}" type="video/mp4">`);
                if (videoSupport.webm) sources.push(`<source src="${media.src.replace('.mp4', '.webm')}" type="video/webm">`);
                if (videoSupport.ogg) sources.push(`<source src="${media.src.replace('.mp4', '.ogg')}" type="video/ogg">`);
                
                mediaElement = `<video controls playsinline muted autoplay preload="auto">
                     ${sources.join('')}
                     Your browser does not support the video tag.
                   </video>`;
            } else {
                // Fallback for browsers without video support
                mediaElement = `<div class="video-fallback">
                     <div class="video-placeholder">
                         <span class="video-icon">🎥</span>
                         <p>Video not supported</p>
                         <a href="${media.src}" target="_blank" class="video-download">Download Video</a>
                     </div>
                 </div>`;
            }
        } else {
            mediaElement = `<img src="${media.src}" alt="${media.caption || ''}" loading="lazy">`;
        }

        // Wrap in link if URL is provided
        const content = media.url
            ? `<a href="${media.url}" target="_blank">${mediaElement}</a>`
            : mediaElement;

        // Generate tags HTML if present - Modified to target parent window
        const tagsHtml = media.tags ? media.tags.map(tag => {
            const displayText = tag.match(/\((.*?)\)/) 
                ? tag.match(/\((.*?)\)/)[1]
                : tag;
            const tagUrl = tag.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[()'']/g, '');
            return `<span class="tag-link"><a href="https://echoes.paris/tags/${tagUrl}" target="_parent">#${displayText}</a></span>`;
        }).join(' ') : '';

        const yearHtml = media.date ? `<div class="caption-year">${media.date.slice(0, 4)}</div>` : '';

        return `
            <div class="slide-content" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
                ${content}
                <div class="slide-caption">
                    ${media.caption ? `<div class="caption-text">${media.caption}</div>` : ''}
                    ${tagsHtml ? `<div class="caption-tags">${tagsHtml}</div>` : ''}
                    ${yearHtml}
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

// Update loading progress
function updateLoadingProgress() {
    loadingProgress = (loadedSlides / totalSlides) * 100;
    const progressBar = document.querySelector('.loading-progress');
    if (progressBar) {
        progressBar.style.width = `${loadingProgress}%`;
    }
    const progressText = document.querySelector('.loading-text');
    if (progressText) {
        progressText.textContent = `Loading gallery... ${Math.round(loadingProgress)}%`;
    }
}

// Consolidated loadSlide function
async function loadSlide(index, swiperWrapper) {
    const slide = swiperWrapper.querySelector(`[data-index="${index}"]`);
    if (slide && !slide.dataset.loaded) {
        try {
            const media = mediaFiles[index];
            const isVideo = getMediaType(media.src);

            // Show loading placeholder with progress
            slide.innerHTML = `<div class="slide-placeholder">
                <div class="loading-spinner"></div>
                <div>Loading slide ${index + 1}/${totalSlides}...</div>
            </div>`;

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
            
            // Update progress
            loadedSlides++;
            updateLoadingProgress();

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

// Global variables
let swiper = null;
let mediaFiles = [];
let loadingProgress = 0;
let totalSlides = 0;
let loadedSlides = 0;

// Video format detection
function supportsVideoFormat(format) {
    const video = document.createElement('video');
    return video.canPlayType(`video/${format}`) !== '';
}

// Check video support
const videoSupport = {
    mp4: supportsVideoFormat('mp4'),
    webm: supportsVideoFormat('webm'),
    ogg: supportsVideoFormat('ogg')
};

// Initialize Swiper
async function initSwiper() {
    const loader = document.querySelector('.loader');
    
    try {
        mediaFiles = await getMediaFiles();
        totalSlides = mediaFiles.length;
        const swiperWrapper = document.querySelector('.swiper-wrapper');

        // Create placeholder slides for all items
        mediaFiles.forEach((_, index) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.setAttribute('data-index', index);
            slide.innerHTML = '<div class="slide-placeholder" style="display: flex; justify-content: center; align-items: center; height: 100%;"></div>';
            swiperWrapper.appendChild(slide);
        });

        // Load first slide immediately
        await loadSlide(0, swiperWrapper);
        loader.classList.add('hidden');

        // Initialize Swiper
        swiper = new Swiper('.swiper', {
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

                    // Load current slide (needed for bullet clicks to distant slides) + adjacent
                    await Promise.all([
                        loadSlide(currentIndex, swiperWrapper),
                        loadSlide(nextIndex, swiperWrapper),
                        loadSlide(prevIndex, swiperWrapper)
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

        // Thumbnail preview on pagination bullet hover
        const paginationEl = document.querySelector('.swiper-pagination');
        if (paginationEl) {
            let activeTooltip = null;
            let tooltipSuppressed = false;
            const thumbCache = {};

            function removeTooltip() {
                if (activeTooltip) {
                    activeTooltip.remove();
                    activeTooltip = null;
                }
            }

            function suppressTooltip() {
                removeTooltip();
                tooltipSuppressed = true;
                setTimeout(() => { tooltipSuppressed = false; }, 300);
            }

            // Resolve bullet index at hover time using Swiper's pagination bullets array
            function getBulletIndex(bullet) {
                const bullets = swiper.pagination.bullets;
                if (!bullets) return -1;
                for (let i = 0; i < bullets.length; i++) {
                    if (bullets[i] === bullet) return i;
                }
                return -1;
            }

            paginationEl.addEventListener('mouseover', function (e) {
                if (tooltipSuppressed) return;

                const bullet = e.target.closest('.swiper-pagination-bullet');
                if (!bullet) { removeTooltip(); return; }

                const idx = getBulletIndex(bullet);
                if (idx < 0 || !mediaFiles[idx]) return;

                removeTooltip();

                const media = mediaFiles[idx];
                const isVideo = getMediaType(media.src) === 'video';

                const tooltip = document.createElement('div');
                tooltip.className = 'bullet-thumbnail';

                // Cache thumbnail elements — use img for images, icon placeholder for videos
                if (!thumbCache[idx]) {
                    thumbCache[idx] = isVideo
                        ? `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#888;font-size:32px;">&#9654;</div>`
                        : `<img src="${media.src}" alt="">`;
                }
                tooltip.innerHTML = thumbCache[idx];

                // Position tooltip with viewport clamping
                const bulletRect = bullet.getBoundingClientRect();
                const halfTooltip = 80; // 160px / 2
                const rawLeft = bulletRect.left + bulletRect.width / 2;
                const clampedLeft = Math.max(halfTooltip, Math.min(rawLeft, window.innerWidth - halfTooltip));
                tooltip.style.left = clampedLeft + 'px';
                tooltip.style.top = bulletRect.top + 'px';
                document.body.appendChild(tooltip);
                activeTooltip = tooltip;

                requestAnimationFrame(() => {
                    if (activeTooltip === tooltip) tooltip.classList.add('visible');
                });
            });

            paginationEl.addEventListener('mouseleave', removeTooltip);
            paginationEl.addEventListener('click', suppressTooltip);

            // Suppress tooltip on slide change to prevent re-creation from bullet repositioning
            swiper.on('slideChange', suppressTooltip);
        }

        // Navigate to a specific slide via ?slide= query parameter
        const params = new URLSearchParams(window.location.search);
        const slideParam = params.get('slide');
        if (slideParam) {
            const targetIdx = mediaFiles.findIndex(m =>
                m.src.replace('src/', '') === slideParam ||
                (m.caption && m.caption.toLowerCase() === slideParam.toLowerCase())
            );
            if (targetIdx >= 0) {
                await loadSlide(targetIdx, swiperWrapper);
                swiper.slideTo(targetIdx, 0);
            }
        }

    } catch (error) {
        console.error('Failed to initialize gallery:', error);
        loader.innerHTML = '<div class="loader-text">Failed to load gallery. Please try again.</div>';
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    if (!swiper) return;
    
    switch(event.code) {
        case 'Space':
            event.preventDefault();
            if (swiper.autoplay.running) {
                swiper.autoplay.stop();
            } else {
                swiper.autoplay.start();
            }
            break;
        case 'Home':
            event.preventDefault();
            swiper.slideTo(0);
            break;
        case 'End':
            event.preventDefault();
            swiper.slideTo(mediaFiles.length - 1);
            break;
        case 'ArrowLeft':
            event.preventDefault();
            swiper.slidePrev();
            break;
        case 'ArrowRight':
            event.preventDefault();
            swiper.slideNext();
            break;
    }
}

// Performance monitoring
function logPerformanceMetrics() {
    if (performance.memory) {
        console.log('Memory usage:', {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initSwiper);

// Add event listeners
document.addEventListener('keydown', handleKeyboardShortcuts);
window.addEventListener('resize', () => {
    if (swiper) {
        swiper.update();
    }
});

// Log performance metrics every 30 seconds
setInterval(logPerformanceMetrics, 30000);