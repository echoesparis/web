// Entry point: renderer, camera, input and the frame loop.

import * as THREE from 'three';
import { loadMedia, groupIntoArcs, getMediaType } from './data.js';
import { makeTexture, makeFallbackTexture } from './textures.js';
import { Ring } from './ring.js';
import { damp3 } from './easing.js';

// --- Tunables --------------------------------------------------------------

/** Camera offset at the upstream radius of 5.25; scaled with the real radius. */
const CAMERA = { height: 4.5, distance: 9, parallax: 2 };
const SCENE_LIFT = 1.5;          // upstream's <Scene position={[0, 1.5, 0]} />
const WHEEL_SENSITIVITY = 0.0004; // turns per pixel of wheel delta
const DRAG_SENSITIVITY = 0.0015;  // turns per pixel dragged
const INERTIA_DECAY = 4;          // higher = drag momentum dies sooner
const MAX_FLING = 0.8;            // turns per second a release can impart
const MAX_PIXEL_RATIO = 1.5;      // upstream dpr={[1, 1.5]}

// ---------------------------------------------------------------------------

const canvas = document.getElementById('cards-canvas');
const loader = document.querySelector('.loader');
const loaderText = document.querySelector('.loader-text');
const progressBar = document.querySelector('.loading-progress');
const labelsEl = document.getElementById('arc-labels');
const previewEl = document.getElementById('preview');
const hintEl = document.querySelector('.hint');

const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setClearAlpha(0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);      // normalised device coords
const parallax = new THREE.Vector2(0, 0);     // -1..1, drives camera drift

const sceneGroup = new THREE.Group();
sceneGroup.position.y = SCENE_LIFT;
scene.add(sceneGroup);

let ring = null;
let cameraScale = 1;
let offset = 0;          // ring rotation, in turns
let velocity = 0;        // turns per second, from drag release / wheel
let dragging = false;
let dragMoved = false;
let lastPointerX = 0;
let lastPointerTime = 0;
let hoveredCard = null;
let running = true;
let previewVideo = null;

// THREE.Clock is deprecated as of r186; a timestamp delta is all this needs.
let lastFrameTime = 0;

function nextDelta() {
    const now = performance.now();
    const delta = lastFrameTime ? (now - lastFrameTime) / 1000 : 0.016;
    lastFrameTime = now;
    return Math.min(delta, 0.1);
}

init().catch(showError);

async function init() {
    const items = await loadMedia();
    const arcs = groupIntoArcs(items);

    // Load every texture up front, bumping the shared progress bar as they
    // land. 38 downscaled stills is a one-off cost; the ring is useless
    // half-populated, so there is nothing to gain from lazy loading here.
    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    const textures = new Map();
    let done = 0;

    await Promise.all(items.map(async item => {
        try {
            textures.set(item, await makeTexture(item, anisotropy));
        } catch (error) {
            console.warn(error.message);
            textures.set(item, makeFallbackTexture());
        }
        done += 1;
        updateProgress(done / items.length);
    }));

    ring = new Ring(arcs, item => textures.get(item));
    sceneGroup.add(ring.object);
    cameraScale = ring.radius / 5.25;

    buildLabels(ring.arcs);
    applyDeepLink();

    resize();
    bindEvents();

    loader.classList.add('hidden');
    canvas.classList.add('ready');
    setTimeout(() => hintEl.classList.add('hidden'), 6000);

    // Handle for debugging and for the documented Playwright checks — nothing
    // in this module is otherwise reachable from the page.
    window.__cards = { scene, camera, renderer, ring, getHovered: () => hoveredCard };

    lastFrameTime = 0;
    renderer.setAnimationLoop(frame);
}

// --- Frame -----------------------------------------------------------------

function frame() {
    if (!running) return;
    const delta = nextDelta();

    // Drag momentum.
    if (!dragging && velocity !== 0) {
        offset += velocity * delta;
        velocity *= Math.exp(-INERTIA_DECAY * delta);
        if (Math.abs(velocity) < 0.0005) velocity = 0;
    }

    ring.object.rotation.y = -offset * Math.PI * 2;

    // Camera drifts with the pointer and always looks at the ring's centre.
    damp3(camera.position, [
        -parallax.x * CAMERA.parallax,
        parallax.y * CAMERA.parallax + CAMERA.height * cameraScale,
        CAMERA.distance * cameraScale,
    ], 0.3, delta);
    // Looking at the world origin rather than the lifted ring centre is what
    // gives the demo its slightly-from-above view of the ring.
    camera.lookAt(0, 0, 0);

    scene.updateMatrixWorld();

    // The ring turns under a stationary cursor, so hover has to be re-tested
    // every frame rather than on pointermove — upstream's state.events.update().
    updateHover();
    ring.update(delta);
    positionLabels();

    renderer.render(scene, camera);
}

function updateHover() {
    if (dragging) {
        setHovered(null);
        return;
    }
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(ring.meshes, false)[0];
    setHovered(hit ? hit.object.userData.card : null);
}

function setHovered(card) {
    if (card === hoveredCard) return;
    hoveredCard = card;
    ring.setHovered(card);
    canvas.classList.toggle('pointing', Boolean(card && card.item.url));
    updatePreview(card);
}

// --- Preview ---------------------------------------------------------------

function updatePreview(card) {
    if (!card) {
        previewEl.classList.remove('visible');
        // Stop the decoder as soon as the card is released.
        if (previewVideo) {
            previewVideo.pause();
            previewVideo.removeAttribute('src');
            previewVideo.load();
            previewVideo = null;
        }
        return;
    }

    previewEl.innerHTML = buildPreviewMarkup(card.item);
    previewVideo = previewEl.querySelector('video');
    if (previewVideo) previewVideo.play().catch(() => {});
    previewEl.classList.add('visible');
}

/** Mirrors createSlideElement() in ./slideshow.js so both pages render
 *  captions, tags and years the same way — including the `_parent` tag links
 *  that break out of the iframe. */
function buildPreviewMarkup(media) {
    const media_el = getMediaType(media.src) === 'video'
        ? `<video autoplay loop muted playsinline preload="auto" src="${media.src}"></video>`
        : `<img src="${media.src}" alt="${escapeHtml(media.caption || '')}">`;

    const tagsHtml = media.tags ? media.tags.map(tag => {
        const displayText = tag.match(/\((.*?)\)/) ? tag.match(/\((.*?)\)/)[1] : tag;
        const tagUrl = tag.toLowerCase().replace(/\s+/g, '-').replace(/[()'']/g, '');
        return `<span class="tag-link"><a href="https://echoes.paris/tags/${tagUrl}" target="_parent">#${displayText}</a></span>`;
    }).join(' ') : '';

    const yearHtml = media.date ? `<div class="caption-year">${media.date.slice(0, 4)}</div>` : '';

    // The caption is a sibling of the media, not a child: the media sits in
    // the middle of the ring, the caption in the empty band below it, where
    // it is legible whatever card happens to be behind.
    return `
        <div class="slide-content${media.url ? ' has-link' : ''}">${media_el}</div>
        <div class="slide-caption">
            ${media.caption ? `<div class="caption-text">${escapeHtml(media.caption)}</div>` : ''}
            ${tagsHtml ? `<div class="caption-tags">${tagsHtml}</div>` : ''}
            ${yearHtml}
        </div>
    `;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
    return value.replace(/[&<>"]/g, ch =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

// --- Arc labels ------------------------------------------------------------

const labelWorld = new THREE.Vector3();
let labelEls = [];

function buildLabels(arcs) {
    labelsEl.innerHTML = '';
    labelEls = arcs.map(arc => {
        const el = document.createElement('div');
        el.className = 'arc-label';
        el.textContent = arc.label;
        labelsEl.appendChild(el);
        return el;
    });
}

function positionLabels() {
    const { width, height } = renderer.domElement.getBoundingClientRect();
    ring.arcs.forEach((arc, i) => {
        labelWorld.copy(arc.labelPosition);
        ring.object.localToWorld(labelWorld);
        const behind = labelWorld.clone().sub(camera.position).dot(
            camera.getWorldDirection(new THREE.Vector3())) < 0;
        labelWorld.project(camera);
        const el = labelEls[i];
        // Clamp inside the viewport, as the slideshow does for its tooltips —
        // on a narrow screen the label radius reaches past the edge.
        const margin = 44;
        el.style.left = `${clamp((labelWorld.x * 0.5 + 0.5) * width, margin, width - margin)}px`;
        el.style.top = `${(-labelWorld.y * 0.5 + 0.5) * height}px`;
        // Labels on the far side of the ring read as clutter; fade them out.
        el.style.opacity = behind ? '0' : '0.85';
    });
}

// --- Input -----------------------------------------------------------------

function bindEvents() {
    window.addEventListener('resize', resize);
    // Catches the case where the page is laid out only after becoming visible
    // (hidden tab, collapsed iframe), which a window resize event never fires for.
    new ResizeObserver(resize).observe(canvas);

    canvas.addEventListener('pointermove', event => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        pointer.set(x * 2 - 1, -(y * 2 - 1));
        parallax.set(x * 2 - 1, -(y * 2 - 1));

        if (dragging) {
            const now = performance.now();
            const dx = event.clientX - lastPointerX;
            const dt = Math.max(now - lastPointerTime, 8) / 1000;
            if (Math.abs(dx) > 2) dragMoved = true;
            lastPointerX = event.clientX;
            lastPointerTime = now;
            offset -= dx * DRAG_SENSITIVITY;
            // Velocity from real elapsed time, not an assumed frame rate, and
            // clamped so a fast flick cannot send the ring spinning for turns.
            velocity = clamp(-dx * DRAG_SENSITIVITY / dt, -MAX_FLING, MAX_FLING);
            hintEl.classList.add('hidden');
        }
    });

    canvas.addEventListener('pointerdown', event => {
        dragging = true;
        dragMoved = false;
        lastPointerX = event.clientX;
        lastPointerTime = performance.now();
        velocity = 0;
        canvas.classList.add('dragging');
        // Throws if the pointer is no longer active (and for synthetic events).
        try { canvas.setPointerCapture(event.pointerId); } catch { /* not fatal */ }
    });

    const endDrag = event => {
        if (!dragging) return;
        dragging = false;
        canvas.classList.remove('dragging');
        try {
            if (canvas.hasPointerCapture?.(event.pointerId)) {
                canvas.releasePointerCapture(event.pointerId);
            }
        } catch { /* not fatal */ }
        // A press that never moved is a click on whatever is under the cursor.
        if (!dragMoved) handleClick();
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    canvas.addEventListener('pointerleave', () => {
        pointer.set(2, 2);   // off-screen: nothing can be hovered
        parallax.set(0, 0);
    });

    canvas.addEventListener('wheel', event => {
        event.preventDefault();
        offset += event.deltaY * WHEEL_SENSITIVITY;
        velocity = 0;
        hintEl.classList.add('hidden');
    }, { passive: false });

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) {
            lastFrameTime = 0;   // discard the time spent hidden
            renderer.setAnimationLoop(frame);
        } else {
            renderer.setAnimationLoop(null);
        }
    });
}

function handleClick() {
    if (hoveredCard?.item.url) {
        window.open(hoveredCard.item.url, '_blank', 'noopener');
    }
}

function resize() {
    // A hidden tab or a display:none iframe reports zero here; falling back to
    // a sane ratio keeps camera.aspect out of NaN, which would blank the canvas
    // permanently once the page becomes visible again.
    const width = canvas.clientWidth || window.innerWidth || 1280;
    const height = canvas.clientHeight || window.innerHeight || 720;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull back on narrow viewports so the ring still fits.
    camera.fov = width / height < 1 ? 90 : 75;
    camera.updateProjectionMatrix();
}

// --- Misc ------------------------------------------------------------------

function applyDeepLink() {
    const target = new URLSearchParams(window.location.search).get('card');
    const card = target ? ring.findByFilename(target) : null;
    if (target && !card) console.warn(`No card matches ?card=${target}`);
    offset = card ? ring.offsetForCard(card) : ring.defaultOffset();
}

function updateProgress(fraction) {
    const percent = Math.round(fraction * 100);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (loaderText) loaderText.textContent = `Loading cards... ${percent}%`;
}

function showError(error) {
    console.error(error);
    loader.innerHTML = `<div class="error-message">Failed to load cards<br>${escapeHtml(error.message)}</div>`;
}
