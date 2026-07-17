/**
 * ui-handlers.js
 * -----------------------------------------------------------------------------
 * Responsible for all interactive UI handlers on the site:
 *   - Theme switcher: dark / light / system + system preference listener
 *   - Language (ar / en): delegates string swapping to i18n.js (locales/*.json)
 *                      and sets lang/dir, fonts, and persists the preference
 *   - Mobile menu: open/close + auto-close on link click
 *   - Keyboard shortcuts (Escape to close overlays)
 *   - Header buttons: CV download, copy email, language toggle
 *   - Email obfuscation (PUBLIC_EMAIL_PARTS)
 *   - Brand chip popovers
 *   - Toast notifications
 *   - dynamic copyright year with Arabic/Indic numeral support
 *   - Location cards (local time + Makkah weather via Open-Meteo)
 *   - Hero text swap (rotating headline phrases)
 *   - Expand/collapse experience details and Bootcamp
 *   - Update the <title> tag and meta description (updateDocumentMetadata)
 *   - Blog nav dropdown + mobile blog submenu (with 500ms close delay)
 *   - Update Giscus comments theme when theme/language changes
 *   - Expose every function invoked by HTML onclick="" handlers on window
 *
 * Exported API:
 *   - default init(): one-time UI initialization
 * -----------------------------------------------------------------------------
 */



/* ==================================================================
 * Theme — theme switcher (3 options: light / dark / system)
 * ================================================================== */

function resolveThemePreference(preference) {
    if (preference === 'system') {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return preference === 'light' ? 'light' : 'dark';
}

function syncThemeSwitcher(preference) {
    document.querySelectorAll('.theme-switcher-option[data-theme-value]').forEach((button) => {
        const isCurrent = button.dataset.themeValue === preference;
        button.classList.toggle('is-current', isCurrent);
        button.setAttribute('aria-pressed', String(isCurrent));
    });
}

function setThemePreference(preference, persist = true) {
    if (!['light', 'dark', 'system'].includes(preference)) return;
    const resolvedTheme = resolveThemePreference(preference);
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme = resolvedTheme;
    if (persist) {
        try { window.localStorage.setItem('ama-theme-preference', preference); } catch (_) { /* noop */ }
    }
    syncThemeSwitcher(preference);
    updateGiscusTheme(resolvedTheme);
}

function initThemeSwitcher() {
    const initialPreference = document.documentElement.dataset.themePreference || 'dark';
    syncThemeSwitcher(initialPreference);
    document.querySelectorAll('.theme-switcher-option[data-theme-value]').forEach((button) => {
        button.addEventListener('click', () => setThemePreference(button.dataset.themeValue));
    });

    // Watch the live system preference (for the "system" theme)
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemThemeChange = () => {
        if (document.documentElement.dataset.themePreference === 'system') {
            setThemePreference('system', false);
        }
    };
    if (systemTheme.addEventListener) systemTheme.addEventListener('change', handleSystemThemeChange);
    else if (systemTheme.addListener) systemTheme.addListener(handleSystemThemeChange);
}

/**
 * Update Giscus comments theme (if an iframe is present).
 */
function updateGiscusTheme() {
    const iframe = document.querySelector('.giscus-frame');
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({
        giscus: {
            setConfig: {
                theme: 'preferred_color_scheme',
                lang: 'en'
            }
        }
    }, 'https://giscus.app');
}

/* ==================================================================
 * Language — internal translation engine
 * ================================================================== */

let currentLang = document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en';

/**
 * Bilingual string lookup: prefer the i18n dictionaries (locales/*.json via
 * window.t), falling back to the inline pair when the runtime is unavailable.
 */
function tr(key, fallbackEn, fallbackAr) {
    if (typeof window.t === 'function') {
        const value = window.t(key);
        if (value && value !== key) return value;
    }
    return currentLang === 'ar' ? fallbackAr : fallbackEn;
}

/**
 * Rotating phrases under the hero name. Text lives in locales/*.json
 * (hero.phrase.1 … hero.phrase.8); the inline pairs are fallbacks used only
 * when the i18n runtime is unavailable.
 */
const HERO_PHRASE_KEYS = [
    'hero.phrase.1', 'hero.phrase.2', 'hero.phrase.3', 'hero.phrase.4',
    'hero.phrase.5', 'hero.phrase.6', 'hero.phrase.7', 'hero.phrase.8'
];
const HERO_PHRASES_EN = ['Open Source', 'Cloud', 'Virtualization', 'Network Automation', 'Data Center Management', 'Self-Hosting', 'Artificial Intelligence', 'Cybersecurity'];
const HERO_PHRASES_AR = ['المصادر المفتوحة', 'الكلاود', 'الأنظمة الافتراضية', 'أتمتة الشبكات', 'إدارة مراكز البيانات', 'الاستضافة الذاتية', 'الذكاء الاصطناعي', 'الأمن السيبراني'];
let heroPhraseIdx = 0;

function getHeroPhrases() {
    return HERO_PHRASE_KEYS.map((key, index) => tr(key, HERO_PHRASES_EN[index], HERO_PHRASES_AR[index]));
}

function applyLanguage(language) {
    currentLang = language === 'ar' ? 'ar' : 'en';
    window.currentLang = currentLang; // instant sync so other modules see it immediately

    // Apply centralized translations from i18n/translations.js

    // Language button label (desktop)
    const langText = document.getElementById('lang-toggle-text');
    if (langText) langText.textContent = tr('lang.switchAr', 'AR', 'EN');

    // Language button label (mobile)
    const mobileLang = document.getElementById('mobile-lang-text');
    if (mobileLang) mobileLang.textContent = tr('lang.switchArMobile', 'العربية', 'English');

    // Set document language/direction
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');

    // Apply the centralized JSON translations (data-i18n-key / data-i18n-html-key /
    // data-i18n-aria-key / data-i18n-ph-key). The dictionaries in locales/*.json are the
    // single source of truth for all UI strings — no inline data-en/data-ar duplication.
    if (window.i18n && typeof window.i18n.apply === 'function') {
        try { window.i18n.apply(); } catch (_) {}
    }

    // Re-init brand popovers (to refresh tooltips)
    initBrandPopovers();

    // Re-render the public email
    renderPublicEmail();

    // Update the dynamic copyright year
    updateDynamicCopyright();

    // Reset the hero phrase to the current language
    heroPhraseIdx = 0;
    const dynamicText = document.getElementById('dynamic-text');
    if (dynamicText) {
        dynamicText.textContent = getHeroPhrases()[heroPhraseIdx];
    }

    // Update time display using current locale/calendar
    updateLocationTime();

    // Persist the preference to localStorage
    try { window.localStorage.setItem('ama-language', currentLang); } catch (_) { /* noop */ }

    // Optional calls to other modules (bound on window once ready):
    if (typeof window.updateDocumentMetadata === 'function') {
        window.updateDocumentMetadata(currentLang === 'ar' ? (window.currentPageId || 'home') : (window.currentPageId || 'home'));
    }
    // Router updates currentPageId globally:
    const currentPageId = window.currentPageId ||
        document.querySelector('.page-view.active')?.id?.replace('page-', '') || 'home';
    if (typeof window.updateDocumentMetadata === 'function') {
        window.updateDocumentMetadata(currentPageId);
    }
    if (typeof window.renderBlogPosts === 'function') window.renderBlogPosts();
    if (typeof window.renderBlogDropdown === 'function') window.renderBlogDropdown();
    if (typeof window.renderGitHubActivity === 'function' && window.githubActivityData) {
        window.renderGitHubActivity(window.githubActivityData);
    }
    if (typeof window.syncContactReasonChoices === 'function') window.syncContactReasonChoices();
    if (typeof window.refreshContactValidationMessages === 'function') window.refreshContactValidationMessages();
    if (typeof window.updateArticleProgress === 'function') window.updateArticleProgress();
    if (window.activeBlogPost && document.getElementById('blog-modal') &&
        !document.getElementById('blog-modal').classList.contains('hidden') &&
        typeof window.populateBlogModal === 'function') {
        window.populateBlogModal(window.activeBlogPost);
    }
    updateGiscusTheme();
}

function toggleLanguage() {
    const nextLang = currentLang === 'en' ? 'ar' : 'en';
    // Prefer centralized i18n.setLang if available; it handles persistence/dir/classes.
    if (window.i18n && typeof window.i18n.setLang === 'function') {
        window.i18n.setLang(nextLang).then(() => applyLanguage(nextLang));
        return;
    }
    applyLanguage(nextLang);
}

/* ==================================================================
 * Update page metadata (title + meta description)
 * ================================================================== */

function updateDocumentMetadata(pageId = 'home') {
    // Try reading currentPageId from window if set (router does this)
    const pid = window.currentPageId || pageId || 'home';
    const description = document.querySelector('meta[name="description"]');
    let title;
    let summary;

    // When invoked from blog.js, window.blogFilters is reset
    const blogFilters = window.blogFilters || { mode: 'all' };

    if (pid === 'blog' && blogFilters.mode === 'latest') {
        title = tr('blog.latestArticles', 'Latest Articles', 'أحدث المقالات');
        summary = tr('blog.latestDescription',
            "Read the latest articles, updates, and practical insights. Discover what's new and stay up to date with recently published content.",
            'اقرأ أحدث المقالات والتحديثات والرؤى العملية. اكتشف كل جديد وابقَ على اطلاع بأحدث المحتوى المنشور.');
    } else if (pid === 'blog') {
        title = tr('blog.articlesArchive', 'Articles Archive', 'أرشيف المقالات');
        summary = tr('blog.archiveDescription',
            "Browse the complete archive of all published articles and technical notes. Explore everything we've shared in one place.",
            'تصفح الأرشيف الكامل لجميع المقالات والملاحظات التقنية المنشورة. استكشف كل ما شاركناه في مكان واحد.');
    } else {
        // [English fallback, Arabic fallback] pairs keyed by meta.<page>.*
        const pageTitles = {
            home: ['Home', 'الرئيسية'],
            about: ['About', 'نبذة'],
            experience: ['Experience', 'الخبرة'],
            privacy: ['Privacy', 'الخصوصية'],
            legal: ['Legal', 'الشروط القانونية'],
            '404': ['Not Found', 'غير موجود']
        };
        const pageDescriptions = {
            home: ['Home and professional portfolio of Abdullah M. Almabadi.', 'الصفحة الرئيسية والملف المهني لعبدالله المعبدي.'],
            about: ['About Abdullah M. Almabadi, his technical interests, and educational background.', 'نبذة عن عبدالله المعبدي واهتماماته التقنية وخلفيته التعليمية.'],
            experience: ['Professional experience and technical projects by Abdullah M. Almabadi.', 'الخبرات المهنية والمشاريع التقنية لعبدالله المعبدي.'],
            privacy: ['Privacy policy for this website.', 'سياسة الخصوصية الخاصة بالموقع.'],
            legal: ['Legal terms and notices for this website.', 'الشروط والإشعارات القانونية الخاصة بالموقع.'],
            '404': ['The requested page could not be found.', 'الصفحة المطلوبة غير موجودة.']
        };
        const titlePair = pageTitles[pid] || pageTitles.home;
        const summaryPair = pageDescriptions[pid] || pageDescriptions.home;
        title = tr(`meta.${pid in pageTitles ? pid : 'home'}.title`, titlePair[0], titlePair[1]);
        summary = tr(`meta.${pid in pageDescriptions ? pid : 'home'}.description`, summaryPair[0], summaryPair[1]);
    }

    document.title = title;
    if (description) description.setAttribute('content', summary);
}

/* ==================================================================
 * Mobile menu
 * ================================================================== */

function closeMobileNavigation() {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenu) {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
    }
    if (menuBtn) menuBtn.innerHTML = '<i class="fa-solid fa-bars text-sm"></i>';
    // Close the blog submenu if open
    if (typeof closeMobileBlogMenu === 'function') closeMobileBlogMenu();
    else if (typeof window.closeMobileBlogMenu === 'function') window.closeMobileBlogMenu();
}

function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!menuBtn || !mobileMenu) return;
    menuBtn.addEventListener('click', () => {
        if (mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.remove('hidden');
            mobileMenu.classList.add('flex');
            menuBtn.innerHTML = '<i class="fa-solid fa-times text-lg"></i>';
        } else {
            closeMobileNavigation();
        }
    });
    // Close the menu when any link inside it is clicked
    mobileMenu.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
            if (menuBtn) menuBtn.innerHTML = '<i class="fa-solid fa-bars text-sm"></i>';
        });
    });
}

/* ==================================================================
 * Keyboard shortcuts
 * ================================================================== */

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() !== 'escape') return;
        // Priority order: blog modal → project modal → blog nav dropdown → mobile blog menu → mobile nav
        const blogModal = document.getElementById('blog-modal');
        const projectModal = document.getElementById('project-modal');
        const blogNav = document.getElementById('blog-nav-group');
        const mobileBlogNav = document.getElementById('mobile-blog-nav');

        if (blogModal && !blogModal.classList.contains('hidden')) {
            if (typeof window.closeBlogModal === 'function') window.closeBlogModal();
        } else if (projectModal && !projectModal.classList.contains('hidden')) {
            if (typeof window.closeProjectModal === 'function') window.closeProjectModal();
        } else if (blogNav && blogNav.classList.contains('is-open')) {
            closeBlogNavDropdown();
        } else if (mobileBlogNav && mobileBlogNav.classList.contains('is-open')) {
            closeMobileBlogMenu();
        } else {
            const mobile = document.getElementById('mobile-menu');
            if (mobile && !mobile.classList.contains('hidden')) closeMobileNavigation();
        }
    });
}

/* ==================================================================
 * Header and buttons (CV + public email obfuscation)
 * ================================================================== */

/**
 * Split the email into two parts to defeat simple scrapers.
 */
const PUBLIC_EMAIL_PARTS = ['a', 'a-almabadi.com'];

function getPublicEmail() {
    return PUBLIC_EMAIL_PARTS.join('@');
}

function renderPublicEmail() {
    const address = getPublicEmail();
    document.querySelectorAll('[data-public-email]').forEach((element) => {
        element.textContent = address;
    });
    document.querySelectorAll('[data-public-email-link]').forEach((link) => {
        link.href = `mailto:${address}`;
    });
}

function openPublicEmail() {
    window.location.href = `mailto:${getPublicEmail()}`;
}

/**
 * CV button: opens the visitor's email client with a pre-filled CV request
 * addressed to the public email, so they can ask for the CV directly.
 */
function downloadCV() {
    const subject = tr('cv.request.subject', 'CV Request', 'طلب السيرة الذاتية');
    const body = tr('cv.request.body',
        'Hello Abdullah,\n\nI would like to request a copy of your CV.\n\nBest regards,',
        'مرحبًا عبدالله،\n\nأرغب بالحصول على نسخة من سيرتك الذاتية.\n\nمع خالص التحية،');
    window.location.href = `mailto:${getPublicEmail()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function copyEmail() {
    const address = getPublicEmail();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(() => {
            showToast(tr('toast.emailCopied', 'Email copied to clipboard', 'تم نسخ البريد الإلكتروني'));
        }).catch(() => {
            // fallback
            fallbackCopyText(address);
        });
    } else {
        fallbackCopyText(address);
    }
}

function fallbackCopyText(text) {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast(tr('toast.emailCopied', 'Email copied to clipboard', 'تم نسخ البريد الإلكتروني'));
    } catch (_) {
        showToast(tr('toast.copyFailed', 'Copy failed', 'تعذر النسخ'));
    }
}

/* ==================================================================
 * Brand chip popovers (tools/technologies in the experience section)
 * ================================================================== */

function closeBrandPopovers(except = null) {
    document.querySelectorAll('.brand-chip.is-popover-open').forEach((chip) => {
        if (chip === except) return;
        chip.classList.remove('is-popover-open');
        chip.setAttribute('aria-expanded', 'false');
    });
}

function initBrandPopovers() {
    document.querySelectorAll('.brand-chip').forEach((chip) => {
        const name = chip.querySelector('.brand-chip__name')?.textContent?.trim() || chip.textContent.trim();
        const icon = chip.querySelector('.brand-chip__icon');
        if (icon) {
            icon.dataset.label = name;
            icon.setAttribute('role', 'tooltip');
        }
        chip.setAttribute('aria-haspopup', 'true');
        chip.setAttribute('aria-expanded', chip.classList.contains('is-popover-open') ? 'true' : 'false');

        if (chip.dataset.brandPopoverReady === 'true') return;
        chip.dataset.brandPopoverReady = 'true';

        chip.addEventListener('mouseenter', () => {
            chip.setAttribute('aria-expanded', 'true');
        });
        chip.addEventListener('mouseleave', () => {
            chip.classList.remove('is-popover-open');
            chip.setAttribute('aria-expanded', 'false');
        });
        chip.addEventListener('focus', () => {
            closeBrandPopovers(chip);
            chip.setAttribute('aria-expanded', 'true');
        });
        chip.addEventListener('blur', () => {
            chip.classList.remove('is-popover-open');
            chip.setAttribute('aria-expanded', 'false');
        });
        chip.addEventListener('click', (event) => {
            const prefersTap = window.matchMedia('(hover: none), (pointer: coarse)').matches;
            if (!prefersTap) return;
            if (!chip.classList.contains('is-popover-open')) {
                event.preventDefault();
                event.stopPropagation();
                closeBrandPopovers(chip);
                chip.classList.add('is-popover-open');
                chip.setAttribute('aria-expanded', 'true');
                chip.focus({ preventScroll: true });
            }
        });
    });

    // Global click-outside listener + Escape key for popovers
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.brand-chip')) closeBrandPopovers();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeBrandPopovers();
    });
}

/* ==================================================================
 * Dynamic copyright
 * ================================================================== */

function updateDynamicCopyright() {
    const year = new Date().getFullYear();
    const localizedYear = currentLang === 'ar'
        ? new Intl.NumberFormat('ar-SA', { useGrouping: false }).format(year)
        : String(year);
    document.querySelectorAll('[data-dynamic-copyright]').forEach((element) => {
        element.textContent = `© ${localizedYear} ${tr('footer.rights', 'Abdullah M. Almabadi. All rights reserved.', 'عبدالله المعبدي. جميع الحقوق محفوظة.')}`;
    });
}

/* ==================================================================
 * Toast notifications (floating messages at the bottom)
 * ================================================================== */

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 glass px-6 py-3 text-xs font-semibold rounded-3xl border border-white/10 z-[100] flex items-center gap-2 shadow-2xl';
    toast.innerHTML = `<i class="fa-solid fa-check-circle text-white"></i> <span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'all .3s ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

/* ==================================================================
 * Location widgets (local time + Makkah weather)
 * ================================================================== */

function updateLocationTime() {
    const now = new Date();
    const locale = currentLang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB';
    const time = now.toLocaleTimeString(locale, {
        timeZone: 'Asia/Riyadh',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const date = currentLang === 'ar'
        ? now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
            timeZone: 'Asia/Riyadh',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : now.toLocaleDateString('en-US', {
            timeZone: 'Asia/Riyadh',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    document.querySelectorAll('.location-time').forEach((element) => { element.textContent = time; });
    document.querySelectorAll('.location-date').forEach((element) => { element.textContent = date; });
}

async function updateMakkahWeather() {
    try {
        const response = await fetch(
            'https://api.open-meteo.com/v1/forecast?latitude=21.3891&longitude=39.8579&current=temperature_2m&timezone=Asia%2FRiyadh',
            { cache: 'no-store' }
        );
        if (!response.ok) return;
        const data = await response.json();
        const temperature = data?.current?.temperature_2m;
        if (!Number.isFinite(temperature)) return;
        const value = `${Math.round(temperature)}°C`;
        document.querySelectorAll('.location-temperature').forEach((element) => { element.textContent = value; });
    } catch (_) {
        // Keep a static fallback temperature when fetching fails
    }
}

function closeLocationCards(except = null) {
    document.querySelectorAll('.location-widget.is-open').forEach((widget) => {
        if (widget === except) return;
        widget.classList.remove('is-open');
        widget.querySelector('.location-widget__trigger')?.setAttribute('aria-expanded', 'false');
    });
}

function toggleLocationCard(button, event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const widget = button.closest?.('.location-widget');
    if (!widget) return;
    const open = !widget.classList.contains('is-open');
    closeLocationCards(widget);
    widget.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
}

function initLocationWidgets() {
    updateLocationTime();
    updateMakkahWeather();
    window.setInterval(updateLocationTime, 1000);
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.location-widget')) closeLocationCards();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeLocationCards();
    });
}

/* ==================================================================
 * Hero text swap (rotating headline phrases)
 * ================================================================== */

function swapHeroText() {
    const el = document.getElementById('dynamic-text');
    if (!el) return;
    const activePhrases = getHeroPhrases();
    heroPhraseIdx = (heroPhraseIdx + 1) % activePhrases.length;
    if (window.gsap) {
        window.gsap.to(el, {
            opacity: 0,
            y: 6,
            duration: 0.38,
            ease: 'power2.in',
            onComplete: () => {
                el.innerText = activePhrases[heroPhraseIdx];
                window.gsap.to(el, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
            }
        });
    } else {
        // fallback without GSAP
        el.style.opacity = '0';
        setTimeout(() => {
            el.innerText = activePhrases[heroPhraseIdx];
            el.style.opacity = '1';
        }, 200);
    }
}

/* ==================================================================
 * Experience / Bootcamp details (expand/collapse)
 * ================================================================== */

function toggleExperienceDetails(key) {
    const details = document.getElementById(`${key}-experience-extra`);
    const button = document.querySelector(`[data-experience-toggle="${key}"]`);
    if (!details || !button) return;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    details.classList.toggle('is-expanded', !expanded);
    details.setAttribute('aria-hidden', String(expanded));
}

function toggleBootcampDetails() {
    const details = document.getElementById('bootcamp-extra');
    const button = document.getElementById('bootcamp-toggle');
    if (!details || !button) return;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    details.classList.toggle('is-expanded', !expanded);
    details.setAttribute('aria-hidden', String(expanded));
}

/* ==================================================================
 * Blog nav dropdown + Mobile blog submenu
 * (Full blog logic lives in blog.js; only safe-close handlers here)
 * ================================================================== */

function closeBlogNavDropdown() {
    const group = document.getElementById('blog-nav-group');
    const trigger = document.getElementById('blog-nav-trigger');
    if (group) group.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

let blogDropdownCloseTimer = null;

function scheduleBlogDropdownClose(delay = 3000) {
    clearBlogDropdownCloseTimer();
    blogDropdownCloseTimer = window.setTimeout(() => {
        closeBlogNavDropdown();
    }, delay);
}

function clearBlogDropdownCloseTimer() {
    if (blogDropdownCloseTimer) {
        window.clearTimeout(blogDropdownCloseTimer);
        blogDropdownCloseTimer = null;
    }
}

function openBlogNavDropdown() {
    clearBlogDropdownCloseTimer();
    const group = document.getElementById('blog-nav-group');
    const trigger = document.getElementById('blog-nav-trigger');
    if (!group || !trigger) return;
    group.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
}

function toggleBlogNavDropdown(event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const group = document.getElementById('blog-nav-group');
    const trigger = document.getElementById('blog-nav-trigger');
    if (!group || !trigger) return;
    const open = !group.classList.contains('is-open');
    if (open) {
        openBlogNavDropdown();
    } else {
        clearBlogDropdownCloseTimer();
        closeBlogNavDropdown();
    }
}

function closeMobileBlogMenu() {
    const group = document.getElementById('mobile-blog-nav');
    const trigger = group?.querySelector('.mobile-blog-trigger');
    if (group) group.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function toggleMobileBlogMenu() {
    const group = document.getElementById('mobile-blog-nav');
    const trigger = group?.querySelector('.mobile-blog-trigger');
    if (!group || !trigger) return;
    const open = !group.classList.contains('is-open');
    group.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
}

/* ==================================================================
 * General initialization
 * ================================================================== */

let heroSwapInterval = null;

function init() {
    // 1. Theme
    initThemeSwitcher();

    // 2. mobile menu
    initMobileMenu();

    // 3. Keyboard shortcuts
    initKeyboardShortcuts();

    // 4. Brand popovers
    initBrandPopovers();

    // 5. Location widgets (time + weather)
    initLocationWidgets();

    // 6. public email
    renderPublicEmail();

    // 7. dynamic copyright year
    updateDynamicCopyright();

    // 8. Language button note: already wired via onclick="toggleLanguage()" in HTML,
    //    so we do NOT add a second addEventListener here (it used to cause double-firing per click).
    // const langBtn = document.getElementById('lang-toggle');
    // if (langBtn) langBtn.addEventListener('click', toggleLanguage);

    // 9. Wire other buttons
    document.querySelectorAll('[data-action="download-cv"]').forEach((btn) => {
        btn.addEventListener('click', downloadCV);
    });
    document.querySelectorAll('[data-action="copy-email"]').forEach((btn) => {
        btn.addEventListener('click', copyEmail);
    });
    document.querySelectorAll('[data-action="open-email"]').forEach((btn) => {
        btn.addEventListener('click', openPublicEmail);
    });

    // 10. Rotate hero text every 4.5 seconds
    if (heroSwapInterval) clearInterval(heroSwapInterval);
    heroSwapInterval = window.setInterval(swapHeroText, 4500);

    // 11. Click-outside listeners for blog dropdowns
    document.addEventListener('click', (event) => {
        const blogGroup = document.getElementById('blog-nav-group');
        if (blogGroup && blogGroup.classList.contains('is-open') && !event.target.closest('#blog-nav-group')) {
            clearBlogDropdownCloseTimer();
            closeBlogNavDropdown();
        }
    });

    // 11b. Hover behavior for desktop blog dropdown:
    //  - Hovering the trigger/dropdown opens it immediately
    //  - Moving the mouse away starts a 3-second timer before closing
    //  - Moving back to the trigger/dropdown cancels the timer
    //  - Hovering any other navigation link closes immediately
    const blogGroupEl = document.getElementById('blog-nav-group');
    const blogTriggerEl = document.getElementById('blog-nav-trigger');
    if (blogGroupEl && blogTriggerEl) {
        blogGroupEl.addEventListener('mouseenter', () => {
            if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                openBlogNavDropdown();
            }
        });
        blogGroupEl.addEventListener('mouseleave', () => {
            if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                scheduleBlogDropdownClose(500);
            }
        });
        blogTriggerEl.addEventListener('click', (e) => {
            e.preventDefault();
            toggleBlogNavDropdown(e);
        });
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            if (link.id === 'blog-nav-trigger' || link.closest('#blog-nav-group')) return;
            link.addEventListener('mouseenter', () => {
                if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                    clearBlogDropdownCloseTimer();
                    closeBlogNavDropdown();
                }
            });
        });
    }

    // 12. Make currentLang globally available on window for other modules
    window.currentLang = currentLang;
}

/* ==================================================================
 * Expose onclick="" helpers to window
 * (because ES modules have their own scope and do not auto-expose functions)
 * ================================================================== */

function exposeGlobals() {
    window.toggleLanguage = toggleLanguage;
    window.downloadCV = downloadCV;
    window.copyEmail = copyEmail;
    window.openPublicEmail = openPublicEmail;
    window.getPublicEmail = getPublicEmail;
    window.closeMobileNavigation = closeMobileNavigation;
    window.toggleMobileBlogMenu = toggleMobileBlogMenu;
    window.closeMobileBlogMenu = closeMobileBlogMenu;
    window.toggleBlogNavDropdown = toggleBlogNavDropdown;
    window.closeBlogNavDropdown = closeBlogNavDropdown;
    window.openBlogNavDropdown = openBlogNavDropdown;
    window.scheduleBlogDropdownClose = scheduleBlogDropdownClose;
    window.clearBlogDropdownCloseTimer = clearBlogDropdownCloseTimer;
    window.toggleExperienceDetails = toggleExperienceDetails;
    window.toggleBootcampDetails = toggleBootcampDetails;
    window.toggleLocationCard = toggleLocationCard;
    window.showToast = showToast;
    window.applyLanguage = applyLanguage;
    window.setThemePreference = setThemePreference;
    window.updateDocumentMetadata = updateDocumentMetadata;
    window.currentLang = currentLang;
}

// Expose functions globally as soon as the module is imported
exposeGlobals();

/* ==================================================================
 * Exports
 * ================================================================== */
export {
    init,
    applyLanguage,
    toggleLanguage,
    setThemePreference,
    resolveThemePreference,
    syncThemeSwitcher,
    currentLang,
    showToast,
    updateDocumentMetadata,
    closeMobileNavigation,
    closeMobileBlogMenu,
    closeBlogNavDropdown,
    toggleExperienceDetails,
    toggleBootcampDetails,
    toggleLocationCard,
    closeLocationCards,
    updateLocationTime,
    updateMakkahWeather,
    swapHeroText,
    downloadCV,
    copyEmail,
    getPublicEmail,
    renderPublicEmail,
    openPublicEmail,
    updateDynamicCopyright,
    updateGiscusTheme,
    initBrandPopovers,
    closeBrandPopovers,
    initMobileMenu,
    initKeyboardShortcuts,
    initLocationWidgets
};

export default init;
