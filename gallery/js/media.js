// Media helpers shared by both gallery views (slideshow.js and cards.js).
// The media list lives once, in gallery/src.json + gallery/src/.

// Paths are relative to gallery/index.html.
export const SRC_JSON = 'src.json';
export const SRC_DIR = 'src/';

/** Timeout for a single media preload, in ms. */
export const LOAD_TIMEOUT = 10000;

/** Loads src.json and prefixes each entry's `src` with the media folder.
 *  Order is the file's order; callers shuffle or sort as they need. */
export async function loadMedia() {
    const response = await fetch(SRC_JSON);
    if (!response.ok) throw new Error(`${SRC_JSON}: ${response.status}`);
    const items = await response.json();
    return items.map(item => ({ ...item, src: SRC_DIR + item.src }));
}

/** '.mp4' is video, everything else (including .gif) is an image. */
export function getMediaType(src) {
    const ext = src.split('.').pop().toLowerCase();
    return ext === 'mp4' ? 'video' : 'image';
}
