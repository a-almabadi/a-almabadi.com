/**
 * animations.js
 * -----------------------------------------------------------------------------
 * Responsible for all self-contained visual animations on the site:
 *   - Opening intro (liquid-glass name reveal + sessionStorage flag)
 *   - Nexus background (canvas network of moving nodes and edges)
 *   - Custom cursor (SVG cursor + tilt effect on cards)
 *   - Reveal elements on scroll (IntersectionObserver)
 *   - Experience / Education timeline with --timeline-progress
 *   - GSAP motion enhancements
 *   - animatePageEntrance (stagger for [data-motion-reveal] elements)
 *
 * Exported API:
 *   - init()                : one-time initialization of all animations
 *   - resizeNexus()         : called on resize events
 *   - prefersReducedMotion()
 *   - animatePageEntrance() : called from the router on page entrance
 *   - initMotionEnhancements()
 *   - setCursorHoverState() : public helper to force cursor state
 * -----------------------------------------------------------------------------
 */

/* ==================================================================
 * Intro — liquid-glass name reveal
 * ================================================================== */
function initIntro() {
    const intro = document.getElementById('site-intro');
    if (!intro) return;

    // #site-intro only renders when the intro-enabled class is set on <html>
    // (added by the inline <head> bootstrap when ama-name-intro-v13 is not in sessionStorage)
    if (!document.documentElement.classList.contains('intro-enabled')) {
        intro.remove();
        return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let finished = false;

    function cleanup() {
        document.removeEventListener('keydown', handleIntroKey);
        document.documentElement.classList.remove('intro-enabled');
        intro.remove();
    }

    function finishIntro() {
        if (finished) return;
        finished = true;
        try { window.sessionStorage.setItem('ama-name-intro-v13', '1'); } catch (error) { /* noop */ }
        intro.setAttribute('aria-hidden', 'true');
        intro.classList.add('is-exiting');
        window.setTimeout(cleanup, reduceMotion ? 130 : 720);
    }

    function handleIntroKey(event) {
        if (event.key === 'Escape' || event.key === 'Enter') finishIntro();
    }

    document.addEventListener('keydown', handleIntroKey);
    window.setTimeout(finishIntro, reduceMotion ? 240 : 1550);
}

/* ==================================================================
 * Nexus Canvas — animated node network background
 * ================================================================== */
let canvas = null;
let ctx = null;
let particles = [];
let nexusAnimFrameId = null;

function initNexus() {
    canvas = document.getElementById('nexus-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeNexus();
    particles = [];
    const count = window.innerWidth < 768 ? 32 : 48;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.52,
            vy: (Math.random() - 0.5) * 0.52,
            size: Math.random() * 1.8 + 1
        });
    }
    if (nexusAnimFrameId) cancelAnimationFrame(nexusAnimFrameId);
    drawNexus();
}

function resizeNexus() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawNexus() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const lightTheme = document.documentElement.dataset.theme === 'light';
    const nodeColor = lightTheme ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.14)';
    const lineBase = lightTheme ? '0, 0, 0' : '255, 255, 255';
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 185) {
                ctx.strokeStyle = `rgba(${lineBase}, ${0.06 * (1 - dist / 185)})`;
                ctx.lineWidth = 0.9;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    });
    nexusAnimFrameId = requestAnimationFrame(drawNexus);
}

/* ==================================================================
 * Custom cursor
 *   - SVG arrow ↔ hand on hover
 *   - 3D tilt on .card (excluding .contact-card) using gsap.quickTo
 * ================================================================== */
let mouse = { x: 0, y: 0 };
let cursorPos = { x: 0, y: 0 };
let cursorReady = false;
let _cursorDot = null;

function initCursor() {
    const dot = document.getElementById('cursor-dot');
    _cursorDot = dot;
    // Hide the custom cursor on touch devices
    if (!dot || window.matchMedia('(pointer: coarse), (hover: none)').matches) return;

    let activeTiltCard = null;
    const tiltControls = new WeakMap();

    const resetTilt = (card) => {
        if (!card || !window.gsap) return;
        window.gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 0.42,
            ease: 'power2.out',
            overwrite: 'auto'
        });
    };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        if (!cursorReady) {
            cursorPos.x = mouse.x;
            cursorPos.y = mouse.y;
            cursorReady = true;
            dot.classList.add('is-visible');
        }

        // card under cursor (used for glow-point + 3D tilt)
        const card = e.target.closest?.('.card:not(.contact-card)') || null;
        if (card !== activeTiltCard) {
            resetTilt(activeTiltCard);
            activeTiltCard = card;
        }
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--y', `${y}px`);

        // Experience cards skip tilt to avoid conflicting with the timeline animation
        if (card.closest('#page-experience') || !window.gsap) return;

        let controls = tiltControls.get(card);
        if (!controls) {
            controls = {
                x: window.gsap.quickTo(card, 'rotateX', { duration: 0.42, ease: 'power2.out' }),
                y: window.gsap.quickTo(card, 'rotateY', { duration: 0.42, ease: 'power2.out' }),
                scale: window.gsap.quickTo(card, 'scale', { duration: 0.42, ease: 'power2.out' })
            };
            tiltControls.set(card, controls);
        }
        controls.x((y - rect.height / 2) / 27);
        controls.y((rect.width / 2 - x) / 27);
        controls.scale(1.012);
    }, { passive: true });

    // Smoothly update cursor position (lerp tracking)
    function updateCursor() {
        if (cursorReady) {
            cursorPos.x += (mouse.x - cursorPos.x) * 0.34;
            cursorPos.y += (mouse.y - cursorPos.y) * 0.34;
            dot.style.left = `${cursorPos.x}px`;
            dot.style.top = `${cursorPos.y}px`;
        }
        requestAnimationFrame(updateCursor);
    }
    updateCursor();

    // Wire initial hover states (extended later for dynamic elements when needed)
    document.querySelectorAll('a, button, .card:not(.contact-card), .project-card').forEach((el) => {
        el.addEventListener('mouseenter', () => setCursorHoverState(true));
        el.addEventListener('mouseleave', () => setCursorHoverState(false));
    });
}

function setCursorHoverState(active) {
    if (!_cursorDot) {
        _cursorDot = document.getElementById('cursor-dot');
    }
    if (_cursorDot) _cursorDot.classList.toggle('is-interactive', Boolean(active));
}

/* ==================================================================
 * Reduced-motion detection
 * ================================================================== */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ==================================================================
 * Reveal on scroll + timeline animations
 * ================================================================== */

/**
 * Page entrance — stagger for [data-motion-reveal] elements
 * and within the viewport at the moment of entry.
 */
function animatePageEntrance(page) {
    if (!window.gsap || prefersReducedMotion()) return;
    const visibleSections = [...page.querySelectorAll('[data-motion-reveal]')]
        .filter((element) =>
            element.getBoundingClientRect().top < window.innerHeight * 0.92 &&
            element.dataset.motionRevealed !== 'true'
        );
    visibleSections.forEach((element, index) => {
        element.dataset.motionRevealed = 'true';
        window.gsap.to(element, {
            autoAlpha: 1,
            y: 0,
            duration: 0.58,
            delay: index * 0.045,
            ease: 'power2.out',
            clearProps: 'transform'
        });
    });
}

/**
 * IntersectionObserver to reveal sub-sections (page-view > .max-w-7xl)
 * when they enter the viewport during scrolling.
 */
function initSectionReveals() {
    if (!window.gsap || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    document.querySelectorAll('.page-view').forEach((page) => {
        const content = page.querySelector(':scope > .max-w-7xl');
        if (!content) return;
        const targets = [...content.querySelectorAll(':scope > div, :scope > section')]
            .filter((element) => !element.classList.contains('experience-timeline'));
        targets.forEach((element) => {
            element.dataset.motionReveal = 'true';
            window.gsap.set(element, { autoAlpha: 0, y: 22 });
        });
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting || entry.target.dataset.motionRevealed === 'true') return;
                entry.target.dataset.motionRevealed = 'true';
                window.gsap.to(entry.target, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.62,
                    ease: 'power2.out',
                    clearProps: 'transform'
                });
                observer.unobserve(entry.target);
            });
        }, { root: page, threshold: 0.09, rootMargin: '0px 0px -7% 0px' });
        targets.forEach((element) => observer.observe(element));
    });
}

/**
 * Experience timeline cards — stagger on first reveal.
 */
function initExperienceTimelineAnimation() {
    if (!window.gsap || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    const page = document.getElementById('page-experience');
    const timeline = page?.querySelector('.space-y-4.mb-16');
    if (!page || !timeline) return;
    timeline.classList.add('experience-timeline');
    const cards = [...timeline.querySelectorAll(':scope > .card')];
    window.gsap.set(cards, { autoAlpha: 0, y: 24 });
    const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        window.gsap.to(cards, {
            autoAlpha: 1,
            y: 0,
            duration: 0.58,
            stagger: 0.085,
            ease: 'power2.out',
            clearProps: 'transform'
        });
        observer.disconnect();
    }, { root: page, threshold: 0.06, rootMargin: '0px 0px -5% 0px' });
    observer.observe(timeline);
}

/**
 * Education timeline —
 *   animated line (--timeline-progress) + entries + dots.
 */
function initEducationTimelineAnimation() {
    if (!window.gsap || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    const page = document.getElementById('page-about');
    if (!page) return;
    page.querySelectorAll('.education-list:not(.education-list--plain)').forEach((list) => {
        const entries = [...list.querySelectorAll(':scope > .education-entry')];
        const markers = entries.map((entry) => entry.querySelector('.education-marker')).filter(Boolean);
        window.gsap.set(list, { '--timeline-progress': 0 });
        window.gsap.set(entries, { autoAlpha: 0, y: 18 });
        window.gsap.set(markers, { autoAlpha: 0, scale: 0.35 });
        const observer = new IntersectionObserver((items) => {
            if (!items.some((item) => item.isIntersecting)) return;
            const tl = window.gsap.timeline({ defaults: { ease: 'power2.out' } });
            tl.to(list, { '--timeline-progress': 1, duration: 0.9, ease: 'power1.inOut' }, 0)
                .to(entries, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.5,
                    stagger: 0.11,
                    clearProps: 'transform'
                }, 0.08)
                .to(markers, {
                    autoAlpha: 1,
                    scale: 1,
                    duration: 0.32,
                    stagger: 0.11,
                    clearProps: 'transform'
                }, 0.12);
            observer.disconnect();
        }, { root: page, threshold: 0.08, rootMargin: '0px 0px -7% 0px' });
        observer.observe(list);
    });
}

function initMotionEnhancements() {
    initExperienceTimelineAnimation();
    initSectionReveals();
    initEducationTimelineAnimation();
}

/* ==================================================================
 * General initialization — called once on app load
 * ================================================================== */
function init() {
    initIntro();
    initNexus();
    initCursor();
    initMotionEnhancements();
}

/* ==================================================================
 * Exports
 * ================================================================== */
export {
    init,
    resizeNexus,
    prefersReducedMotion,
    animatePageEntrance,
    initMotionEnhancements,
    setCursorHoverState,
    initCursor,
    initNexus,
    initIntro
};

export default init;
