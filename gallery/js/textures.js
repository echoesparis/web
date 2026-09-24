// Texture creation — always a still frame.
//
// Cards on the ring never animate: the moving version of a video or GIF is
// played by the DOM preview in the middle instead, so only one media element
// ever decodes at a time. Everything is drawn through a downscaling canvas
// because gallery/src/ is ~37 MB of full-size media and 38 raw textures
// would be far more VRAM than this needs.

import * as THREE from 'three';
import { getMediaType, LOAD_TIMEOUT } from './media.js';

const MAX_EDGE = 1024;
/** Where in a video to grab the still. 0 often lands on a black lead-in frame. */
const VIDEO_SEEK = 0.1;

/**
 * @returns {Promise<{texture: THREE.CanvasTexture, width: number, height: number}>}
 */
export async function makeTexture(item, anisotropy = 1) {
    const draw = getMediaType(item.src) === 'video'
        ? drawVideoFrame(item.src)
        : drawImage(item.src);

    const canvas = await withTimeout(draw, LOAD_TIMEOUT, item.src);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    return { texture, width: canvas.width, height: canvas.height };
}

function drawImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(toCanvas(img, img.naturalWidth, img.naturalHeight));
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

function drawVideoFrame(src) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';

        const fail = () => reject(new Error(`Failed to load video: ${src}`));

        video.addEventListener('loadeddata', () => {
            // Seeking past the very first frame avoids black lead-ins.
            video.currentTime = Math.min(VIDEO_SEEK, (video.duration || 1) / 2);
        }, { once: true });

        video.addEventListener('seeked', () => {
            try {
                resolve(toCanvas(video, video.videoWidth, video.videoHeight));
            } catch (error) {
                reject(error);
            }
        }, { once: true });

        video.addEventListener('error', fail, { once: true });
        video.src = src;
        video.load();
    });
}

function toCanvas(source, width, height) {
    const scale = Math.min(1, MAX_EDGE / Math.max(width || 1, height || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((width || MAX_EDGE) * scale));
    canvas.height = Math.max(1, Math.round((height || MAX_EDGE) * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
}

/** A 1x1 grey texture, so one unreadable file leaves a gap in the ring
 *  rather than an exception. */
export function makeFallbackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 2, 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, width: 2, height: 2 };
}

// Same 10s race as the slideshow's preloadMedia(): one bad file must not
// stall the whole ring.
function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out loading ${label}`)), ms)),
    ]);
}
