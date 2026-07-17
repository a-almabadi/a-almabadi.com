/**
 * app.js — Application entry point
 */

import i18n, { init as initI18n } from './i18n.js';
import initContent from './content-loader.js';
import initRouter, { navigateTo, navigateToSection } from './router.js';
import initAnimations, { resizeNexus, prefersReducedMotion, initMotionEnhancements } from './animations.js';
import initUI, { applyLanguage } from './ui-handlers.js';
import initBlog from './blog.js';
import initContact from './contact.js';
import initProjects from './projects.js';
import loadGitHubActivity from './github-api.js';

export { loadGitHubActivity, i18n };

async function bootstrap() {
    // 1. Load i18n dictionaries and apply initial translations
    try { await initI18n(); } catch (e) { console.warn('[app] i18n init error:', e); }

    // 1b. Load external content fragments (About bio, etc.) BEFORE UI init
    //     so brand popovers and links bind exactly as with inline content.
    try { await initContent(); } catch (e) { console.warn('[app] content load error:', e); }

    // 2. UI (theme, menus, shortcuts, weather, language toggle)
    initUI();

    // 3. Animations
    initAnimations();

    // 4. Router
    initRouter();

    // 5. Blog
    initBlog();

    // 6. Contact
    initContact();

    // 7. Projects
    initProjects();

    // 8. Apply initial language (syncs button labels, clock, metadata etc.)
    const initialLang = (window.i18n && window.i18n.getLang())
        ? window.i18n.getLang()
        : (document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en');
    applyLanguage(initialLang);

    // 9. GitHub
    try { loadGitHubActivity(); }
    catch (err) { console.warn('[app] GitHub load skipped:', err); }

    // 10. Initial hash
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && ['home','experience','blog','contact'].includes(initialHash)) {
        navigateTo(initialHash, false);
    } else {
        navigateTo('home', false);
    }

    // 11. Resize
    window.addEventListener('resize', () => resizeNexus());

    console.info('%c[app] Abdullah M. Almabadi — Portfolio ready', 'color:#4ade80;font-weight:bold;');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
    bootstrap();
}

window.app = { navigateTo, navigateToSection, loadGitHubActivity, i18n };
window.navigateTo = navigateTo;
window.navigateToSection = navigateToSection;
