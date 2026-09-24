// Entry point for gallery/index.html: one page, two views over the same media.
// ?view=slideshow (default) | cards; a bare ?card= deep link implies cards.
// ?theme=light|dark pins the colour scheme; unset keeps the original colours.

const VIEWS = {
    slideshow: { title: 'Media Slideshow', loading: 'Loading gallery...', deps: loadSwiper },
    cards: { title: 'Media Cards', loading: 'Loading cards...' },
};

const params = new URLSearchParams(location.search);

// ?theme=light|dark pins the colour scheme (e.g. from the host's theme toggle);
// without it the original colours apply (no prefers-color-scheme switching).
const theme = params.get('theme');
if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
const name = params.get('view') in VIEWS ? params.get('view')
    : params.has('card') ? 'cards' : 'slideshow';
const view = VIEWS[name];

document.body.classList.add(`view-${name}`);
document.title = view.title;
document.querySelector('.loader-text').textContent = view.loading;
const container = document.querySelector('.container');
container.prepend(document.getElementById(`view-${name}`).content.cloneNode(true));

if (view.deps) await view.deps();
await import(`./${name}.js`);

/** Swiper 11 is a classic global script, so it is only fetched for its view. */
function loadSwiper() {
    const base = 'https://cdn.jsdelivr.net/npm/swiper@11/';
    const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: base + 'swiper-bundle.min.css' });
    document.head.prepend(css);  // before style.css, so our overrides win
    return new Promise((resolve, reject) => {
        const js = Object.assign(document.createElement('script'), { src: base + 'swiper-bundle.min.js', onload: resolve, onerror: reject });
        document.head.append(js);
    });
}
