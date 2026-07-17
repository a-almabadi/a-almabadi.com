/**
 * router.js
 * -----------------------------------------------------------------------------
 * Internal SPA navigation between page sections, with GSAP / Web Animations transitions
 * for the page-transition-panel and URL state tracking (hash + history.pushState)
 * and transitions during real multi-page navigation (runDocumentExit).
 *
 * External dependencies (read from window / DOM elements):
 *   - window.gsap (optional): for GSAP animations on first motion
 *   - window.currentLang : 'en' | 'ar'  (set by ui-handlers)
 *   - window.closeMobileNavigation / closeMobileBlogMenu / closeBlogNavDropdown
 *   - window.updateDocumentMetadata(pageId)
 *   - Functions imported from animations.js:
 *       prefersReducedMotion()
 *       animatePageEntrance(pageEl)
 *   - Required DOM elements:
 *       #page-transition           (overlay)
 *       #page-transition-panel     (animated panel)
 *       #page-transition-label     (transition label text)
 *       .page-view                 (every page)
 *       #page-<id>                 (specific page)
 *       .nav-link[data-page="<id>"]
 * -----------------------------------------------------------------------------
 */

import { prefersReducedMotion, animatePageEntrance } from './animations.js';

// ===== Router state =====
const pages = ['home', 'about', 'experience', 'blog', 'privacy', 'legal', '404'];
const pageOrder = { home: 0, about: 1, experience: 2, blog: 3, privacy: 4, legal: 5, '404': 6 };

let currentPageId = document.querySelector('.page-view.active')?.id.replace('page-', '') || 'home';
let pageTransitioning = false;
let initialNavigationComplete = false;

/* ------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------ */

/**
 * Bilingual string lookup: prefer the i18n dictionaries (locales/*.json via
 * window.t), falling back to the inline pair when the runtime is unavailable.
 */
function tr(key, fallbackEn, fallbackAr) {
    if (typeof window.t === 'function') {
        const value = window.t(key);
        if (value && value !== key) return value;
    }
    return getLang() === 'ar' ? fallbackAr : fallbackEn;
}

/**
 * Return the label shown on the transition panel according to the current page and language.
 * Labels share the meta.<page>.title keys used for the document <title>.
 * @param {string} pageId
 * @returns {string}
 */
function getTransitionPageLabel(pageId) {
    if (pageId === 'blog') {
        return tr('blog.articlesArchive', 'Articles Archive', 'أرشيف المقالات');
    }
    const labels = {
        home: ['Home', 'الرئيسية'],
        about: ['About', 'نبذة'],
        experience: ['Experience', 'الخبرة'],
        privacy: ['Privacy', 'الخصوصية'],
        legal: ['Legal', 'الشروط القانونية'],
        '404': ['Not Found', 'غير موجود']
    };
    const label = labels[pageId] || labels.home;
    return tr(`meta.${labels[pageId] ? pageId : 'home'}.title`, label[0], label[1]);
}

/**
 * Safely read the current language.
 */
function getLang() {
    if (typeof window !== 'undefined' && typeof window.currentLang === 'string') {
        return window.currentLang === 'ar' ? 'ar' : 'en';
    }
    return document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en';
}

/**
 * Update header navigation link state (mark the active page).
 */
function updatePageNavigationState(pageId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page') === pageId);
    });
}

/**
 * Commit page state (update variables, metadata, close menus, pushState).
 */
function commitPageState(pageId, pushState) {
    currentPageId = pageId;
    updatePageNavigationState(pageId);

    if (typeof window.updateDocumentMetadata === 'function') {
        window.updateDocumentMetadata(pageId);
    }
    if (pushState) {
        try { history.pushState({ page: pageId }, '', `#${pageId}`); } catch (_) {}
    }

    // Close any open menus
    if (typeof window.closeMobileNavigation === 'function') window.closeMobileNavigation();
    if (typeof window.closeMobileBlogMenu === 'function') window.closeMobileBlogMenu();
}

/**
 * Show a page immediately without transition (used for first paint or prefers-reduced-motion).
 */
function showPageImmediately(pageId, pushState = true, animateCards = false) {
    const target = document.getElementById(`page-${pageId}`);
    if (!target) return false;

    document.querySelectorAll('.page-view').forEach(page => page.classList.remove('active'));
    target.classList.add('active');
    target.scrollTop = 0;
    commitPageState(pageId, pushState);

    if (animateCards && typeof animatePageEntrance === 'function') {
        animatePageEntrance(target);
    }
    return true;
}

/**
 * Wait for a Web Animation to finish safely (Web Animations API helper).
 */
function animationFinished(animation) {
    return animation?.finished?.catch(() => undefined) || Promise.resolve();
}

/* ------------------------------------------------------------------
 * Navigate between pages (SPA) with GSAP/WAAPI panel
 * ------------------------------------------------------------------ */

/**
 * Full transition flow:
 *   1) slide in page-transition-panel from top/bottom per direction
 *   2) fade out the current page
 *   3) switch pages, then animate in the new page + slide out the panel
 */
async function runPageTransition(pageId, pushState) {
    const current = document.getElementById(`page-${currentPageId}`) || document.querySelector('.page-view.active');
    const target = document.getElementById(`page-${pageId}`);
    const overlay = document.getElementById('page-transition');
    const panel = document.getElementById('page-transition-panel');
    const label = document.getElementById('page-transition-label');

    if (!current || !target || !overlay || !panel || !current.animate || !panel.animate) {
        showPageImmediately(pageId, pushState, true);
        return true;
    }

    pageTransitioning = true;

    const direction = (pageOrder[pageId] ?? 0) >= (pageOrder[currentPageId] ?? 0) ? 1 : -1;
    const entryY = direction > 0 ? '105%' : '-105%';
    const exitY = direction > 0 ? '-105%' : '105%';

    document.body.classList.add('transition-running');
    document.body.setAttribute('aria-busy', 'true');
    overlay.classList.add('is-active');
    if (label) label.textContent = getTransitionPageLabel(pageId);

    // Panel enter animation
    const panelIn = panel.animate([
        { transform: `translateY(${entryY})`, borderRadius: direction > 0 ? '42px 42px 0 0' : '0 0 42px 42px' },
        { offset: 0.82, transform: 'translateY(0)', borderRadius: '18px' },
        { transform: 'translateY(0)', borderRadius: '0' }
    ], {
        duration: 540,
        easing: 'cubic-bezier(.76,0,.24,1)',
        fill: 'both'
    });

    // Current page exit animation
    const pageOut = current.animate([
        { opacity: 1, transform: 'translateY(0) scale(1) rotateX(0deg)', filter: 'blur(0)' },
        {
            opacity: 0.08,
            transform: `translateY(${direction > 0 ? '-6vh' : '6vh'}) scale(.965) rotateX(${direction > 0 ? '3deg' : '-3deg'})`,
            filter: 'blur(6px)'
        }
    ], {
        duration: 500,
        easing: 'cubic-bezier(.76,0,.24,1)',
        fill: 'both'
    });

    try {
        await Promise.all([animationFinished(panelIn), animationFinished(pageOut)]);

        current.classList.remove('active');
        target.classList.add('active');
        target.scrollTop = 0;
        commitPageState(pageId, pushState);

        // force reflow
        target.getBoundingClientRect();

        // New page entrance animation
        const pageIn = target.animate([
            {
                opacity: 0,
                transform: `translateY(${direction > 0 ? '7vh' : '-7vh'}) scale(.982) rotateX(${direction > 0 ? '-2.5deg' : '2.5deg'})`,
                filter: 'blur(5px)'
            },
            { opacity: 1, transform: 'translateY(0) scale(1) rotateX(0deg)', filter: 'blur(0)' }
        ], {
            duration: 700,
            easing: 'cubic-bezier(.16,1,.3,1)',
            fill: 'both'
        });

        // Panel exit animation
        const panelOut = panel.animate([
            { transform: 'translateY(0)', borderRadius: '0' },
            { offset: 0.18, transform: 'translateY(0)', borderRadius: '18px' },
            { transform: `translateY(${exitY})`, borderRadius: direction > 0 ? '0 0 42px 42px' : '42px 42px 0 0' }
        ], {
            duration: 680,
            easing: 'cubic-bezier(.76,0,.24,1)',
            fill: 'both'
        });

        await Promise.all([animationFinished(pageIn), animationFinished(panelOut)]);

        // Clean up Web Animations (return control to CSS)
        pageIn.cancel();
        panelOut.cancel();
        pageOut.cancel();
        panelIn.cancel();
    } catch (error) {
        console.warn('[router] page transition failed, fallback to immediate:', error);
        showPageImmediately(pageId, pushState, false);
    } finally {
        panel.style.transform = '';
        panel.style.borderRadius = '';
        overlay.classList.remove('is-active');
        document.body.classList.remove('transition-running');
        document.body.removeAttribute('aria-busy');
        pageTransitioning = false;
    }

    return true;
}

/**
 * Navigate to a specific page (main API).
 * @param {string} pageId
 * @param {boolean} pushState
 * @returns {Promise<boolean>}
 */
function navigateTo(pageId, pushState = true) {
    const requestedPageId = pageId;
    if (!pages.includes(pageId)) pageId = '404';

    if (pageId === '404') {
        const path = document.getElementById('not-found-path');
        if (path) path.textContent = requestedPageId === '404' ? (window.location.hash || '/404') : `#${requestedPageId}`;
    }

    // Close blog/mobile menus before navigating
    if (typeof window.closeBlogNavDropdown === 'function') window.closeBlogNavDropdown();
    if (typeof window.closeMobileBlogMenu === 'function') window.closeMobileBlogMenu();

    // First navigation: no transition (avoids animating the very first page paint)
    if (!initialNavigationComplete) {
        initialNavigationComplete = true;
        showPageImmediately(pageId, pushState, true);
        return Promise.resolve(true);
    }

    // Clicking the same page: scroll to top
    if (pageId === currentPageId) {
        const current = document.getElementById(`page-${pageId}`);
        current?.scrollTo({ top: 0, behavior: 'smooth' });
        if (typeof window.closeMobileNavigation === 'function') window.closeMobileNavigation();
        return Promise.resolve(true);
    }

    if (pageTransitioning) return Promise.resolve(false);

    if (prefersReducedMotion()) {
        showPageImmediately(pageId, pushState, false);
        return Promise.resolve(true);
    }

    return runPageTransition(pageId, pushState);
}

/**
 * Navigate to a section within a page (transition if needed, then smooth scroll).
 */
async function navigateToSection(pageId, sectionId, pushState = true) {
    await navigateTo(pageId, pushState);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const page = document.getElementById(`page-${pageId}`);
    const section = document.getElementById(sectionId);
    if (!page || !section) return;
    const top = Math.max(0, section.offsetTop - 108);
    page.scrollTo({ top, behavior: 'smooth' });
}

/* ------------------------------------------------------------------
 * Exit/enter transition between real pages (multi-page navigation)
 * ------------------------------------------------------------------ */
function getDocumentTransitionLabel(url) {
    const name = decodeURIComponent(
        url.pathname.split('/').filter(Boolean).pop() || 'Home'
    )
        .replace(/\.html?$/i, '')
        .replace(/[-_]+/g, ' ');
    return name || 'Home';
}

async function runDocumentExit(url) {
    if (pageTransitioning || prefersReducedMotion()) {
        window.location.href = url.href;
        return;
    }
    const overlay = document.getElementById('page-transition');
    const panel = document.getElementById('page-transition-panel');
    const label = document.getElementById('page-transition-label');
    const current = document.querySelector('.page-view.active');

    if (!overlay || !panel || !panel.animate) {
        window.location.href = url.href;
        return;
    }

    pageTransitioning = true;
    if (typeof window.closeBlogNavDropdown === 'function') window.closeBlogNavDropdown();
    if (typeof window.closeMobileNavigation === 'function') window.closeMobileNavigation();

    if (label) label.textContent = getDocumentTransitionLabel(url);
    overlay.classList.add('is-active');
    document.body.classList.add('transition-running');
    document.body.setAttribute('aria-busy', 'true');

    try { sessionStorage.setItem('ama-document-transition', 'enter'); } catch (_) {}

    const panelIn = panel.animate([
        { transform: 'translateY(105%)', borderRadius: '44px 44px 0 0' },
        { transform: 'translateY(0)', borderRadius: '0' }
    ], { duration: 560, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });

    const pageOut = current?.animate([
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        { opacity: 0.05, transform: 'translateY(-5vh) scale(.97)', filter: 'blur(6px)' }
    ], { duration: 520, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });

    await Promise.all([animationFinished(panelIn), animationFinished(pageOut)]);
    window.location.href = url.href;
}

function revealDocumentEntrance() {
    let shouldReveal = false;
    try {
        shouldReveal = sessionStorage.getItem('ama-document-transition') === 'enter';
        if (shouldReveal) sessionStorage.removeItem('ama-document-transition');
    } catch (_) {}

    if (!shouldReveal || prefersReducedMotion()) return;

    const overlay = document.getElementById('page-transition');
    const panel = document.getElementById('page-transition-panel');
    const current = document.querySelector('.page-view.active');

    if (!overlay || !panel || !panel.animate) return;

    overlay.classList.add('is-active');
    document.body.classList.add('transition-running');
    panel.style.transform = 'translateY(0)';

    const panelOut = panel.animate([
        { transform: 'translateY(0)', borderRadius: '0' },
        { transform: 'translateY(-105%)', borderRadius: '0 0 44px 44px' }
    ], { duration: 720, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });

    const pageIn = current?.animate([
        { opacity: 0, transform: 'translateY(6vh) scale(.985)', filter: 'blur(5px)' },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' }
    ], { duration: 760, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });

    Promise.all([animationFinished(panelOut), animationFinished(pageIn)]).finally(() => {
        panelOut.cancel();
        pageIn?.cancel();
        panel.style.transform = '';
        overlay.classList.remove('is-active');
        document.body.classList.remove('transition-running');
    });
}

/**
 * Attach click listeners to outbound links to trigger runDocumentExit,
 * and detect re-entrance animation (revealDocumentEntrance).
 */
function initDocumentTransitions() {
    revealDocumentEntrance();

    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.target === '_blank' || link.hasAttribute('download')) return;

        const href = link.getAttribute('href');
        if (!href) return;
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return; // التنقل الداخلي يُعالج عبر navigateTo

        event.preventDefault();
        runDocumentExit(url);
    });
}

/* ------------------------------------------------------------------
 * popstate listener (back/forward button navigation)
 * ------------------------------------------------------------------ */
function initPopstateListener() {
    window.addEventListener('popstate', e => {
        const state = e.state;
        if (state && state.page) {
            navigateTo(state.page, false);
        } else {
            const hash = window.location.hash.replace('#', '');
            if (hash === 'projects') {
                navigateToSection('experience', 'experience-projects', false);
            } else if (hash === 'contact') {
                navigateToSection('home', 'home-contact', false);
            } else if (hash) {
                navigateTo(hash, false);
            } else {
                navigateTo('home', false);
            }
        }
    });
}

/* ------------------------------------------------------------------
 * Initialize the router (called from app.js)
 * ------------------------------------------------------------------ */
function init() {
    initDocumentTransitions();
    initPopstateListener();

    // Wire .nav-link elements to the new system (data-page="<id>").
    // Skip elements that are inside a blog-nav-group dropdown button
    // (the blog trigger only opens the menu — actual navigation happens when
    //  the user clicks one of "Latest Articles" / "Full Archive" choices).
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        if (link.tagName === 'BUTTON' && link.id === 'blog-nav-trigger') return;
        if (link.closest('#blog-nav-dropdown')) return;
        link.addEventListener('click', e => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            if (pageId) navigateTo(pageId, true);
        });
    });
}

// ===== Public exports =====
export {
    init,
    navigateTo,
    navigateToSection,
    animatePageEntrance,
    prefersReducedMotion,
    getTransitionPageLabel,
    showPageImmediately,
    runDocumentExit
};

export default init;
