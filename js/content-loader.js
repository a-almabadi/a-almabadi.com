/**
 * content-loader.js — Runtime loader for external HTML content fragments.
 * -----------------------------------------------------------------------------
 * Keeps rich, long-form content OUT of index.html. Any element carrying a
 * `data-content-src="path/to/fragment.html"` attribute gets its innerHTML
 * filled from that file at boot.
 *
 * Used for the About bio (content/about/bio-en.html + bio-ar.html) — the same
 * pattern the blog already uses for markdown articles in content/articles/.
 *
 * Runs before initUI() in the bootstrap sequence, so downstream behavior
 * (brand-chip popovers, connect links, CSS lang/dir toggle) binds exactly
 * as if the content had always been inline.
 *
 * Public API:
 *   default init():  loads every [data-content-src] element once
 *   event 'contentloaded' fires on document when all fragments are injected
 * -----------------------------------------------------------------------------
 */

async function loadFragment(element) {
    const src = element.getAttribute('data-content-src');
    if (!src) return;
    try {
        const res = await fetch(src, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${res.status}`);
        element.innerHTML = await res.text();
        element.dataset.contentLoaded = 'true';
    } catch (err) {
        console.warn(`[content-loader] failed to load ${src}:`, err);
    }
}

async function init(root = document) {
    const targets = [...root.querySelectorAll('[data-content-src]')];
    if (!targets.length) return;
    await Promise.all(targets.map(loadFragment));
    document.dispatchEvent(new CustomEvent('contentloaded', {
        detail: { count: targets.length }
    }));
}

export { init };
export default init;
