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

        return processedFiles;
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
        
        // Create media element based on type
        const mediaElement = isVideo === 'video'
            ? `<video controls playsinline loop preload="metadata">
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
            ${content}
            <div class="slide-caption">
                <span class="caption-text">${media.caption || ''}</span>
                ${tagsHtml}
            </div>
        `;
    } catch (error) {
        console.error('Error creating slide:', error);
        return `
            <div class="error-message">
                Failed to load media<br>
                <small>${media.caption || 'Untitled'}</small>
            </div>
        `;
    }
}

// Initialize Swiper
async function initSwiper() {
    const loader = document.querySelector('.loader');
    
    try {
        const mediaFiles = await getMediaFiles();
        const swiperWrapper = document.querySelector('.swiper-wrapper');

        // Create and append first slide
        if (mediaFiles.length > 0) {
            const firstSlide = document.createElement('div');
            firstSlide.className = 'swiper-slide';
            firstSlide.innerHTML = await createSlideElement(mediaFiles[0]);
            swiperWrapper.appendChild(firstSlide);
            
            // Hide loader as soon as first slide is created
            loader.classList.add('hidden');
        }

        // Initialize Swiper immediately with first slide
        const swiper = new Swiper('.swiper', {
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
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            speed: 1000,
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
                renderBullet: function (index, className) {
                    return '<span class="' + className + '"></span>';
                }
            },
            keyboard: { enabled: true },
            on: {
                slideChange: function() {
                    // Only process videos if there are slides
                    if (this.slides && this.slides.length > 0) {
                        // Pause all videos
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            video.pause();
                            video.currentTime = 0;
                        });

                        // Get the next slide if it exists
                        const nextSlide = this.slides[this.activeIndex];
                        if (nextSlide) {
                            // Set autoplay delay based on content type
                            this.params.autoplay.delay = nextSlide.querySelector('video') ? 7000 : 3000;
                        }
                    }
                },
                slideChangeTransitionEnd: function() {
                    // Only try to play video if there are slides
                    if (this.slides && this.slides.length > 0) {
                        const activeSlide = this.slides[this.activeIndex];
                        if (activeSlide) {
                            const video = activeSlide.querySelector('video');
                            if (video) {
                                video.play().catch(err => {
                                    console.warn('Video playback failed:', err);
                                });
                            }
                        }
                    }
                },
                resize: function () {
                    this.update(); // Update Swiper on window resize
                },
                beforeResize: function () {
                    // Recalculate sizes before resize
                    this.updateSize();
                    this.updateSlides();
                }
            },
            centeredSlides: true,
            breakpoints: {
                320: {
                    slidesPerView: 1,
                    coverflowEffect: {
                        rotate: 30,
                        depth: 50
                    }
                },
                480: {
                    slidesPerView: 'auto',
                    coverflowEffect: {
                        rotate: 40,
                        depth: 75
                    }
                },
                768: {
                    slidesPerView: 'auto',
                    coverflowEffect: {
                        rotate: 50,
                        depth: 100
                    }
                }
            }
        });

        // Load remaining slides in the background
        for (let i = 1; i < mediaFiles.length; i++) {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.innerHTML = await createSlideElement(mediaFiles[i]);
            swiperWrapper.appendChild(slide);
            swiper.update(); // Update swiper after each slide is added
        }

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