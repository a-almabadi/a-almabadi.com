/**
 * github-api.js
 * -----------------------------------------------------------------------------
 * Standalone module that fetches and renders public GitHub data (profile, repositories,
 * recent activity, contribution graph) with sessionStorage caching.
 *
 * External dependencies (read from window by default):
 *   - window.currentLang    : 'en' | 'ar'   (set by the host page)
 *   - window.gsap          : optional       (for motion effects while drawing contributions)
 *   - window.prefersReducedMotion : optional () => boolean helper
 *
 * Required DOM elements (read via getElementById at render time):
 *   - github-avatar              (img)
 *   - github-profile-name
 *   - github-profile-link        (a)
 *   - github-profile-bio
 *   - github-stat-repos
 *   - github-stat-contributions
 *   - github-stat-stars
 *   - github-stat-followers
 *   - github-contributions       (container; hidden when no data is available)
 *   - github-contribution-graph
 *   - github-contribution-total
 *   - github-repositories
 *   - github-events
 *   - github-loading             (hidden once loading completes)
 *   - github-sync
 * -----------------------------------------------------------------------------
 */

// ===== Default settings =====
const DEFAULT_USERNAME = 'a-almabadi';
const DEFAULT_CACHE_KEY = 'ama-github-live-v2';
const DEFAULT_CACHE_TTL = 15 * 60 * 1000; // 15 دقيقة

// ===== Internal state / cache =====
let githubActivityData = null;

/* ------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------ */

/**
 * Escape rendered text to prevent tag injection.
 * @param {string} value
 * @returns {string}
 */
function escapeGithubText(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[character]);
}

/**
 * Return the language color shown in the repository bar.
 * @param {string} language
 * @returns {string} hex color
 */
function githubLanguageColor(language) {
    return ({
        JavaScript: '#f1e05a',
        TypeScript: '#3178c6',
        Python: '#3572A5',
        HTML: '#e34c26',
        CSS: '#563d7c',
        Shell: '#89e051',
        Dockerfile: '#384d54',
        Go: '#00ADD8',
        Java: '#b07219'
    })[language] || '#85858b';
}

/**
 * Format the date according to the current language.
 * @param {string} value
 * @returns {string}
 */
function formatGithubDate(value) {
    if (!value) return '';
    const lang = getCurrentLang();
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(value));
}

/**
 * Textual description of event type (push, star, pull request, ...).
 * Text lives in locales/*.json (github.event.*); inline pairs are fallbacks.
 * @param {object} event
 * @returns {string}
 */
function describeGithubEvent(event) {
    const count = event.payload?.commits?.length || 0;
    if (event.type === 'PushEvent') {
        const template = count === 1
            ? tr('github.event.push.one', 'Pushed {count} update to', 'دفع {count} تحديثًا إلى')
            : tr('github.event.push', 'Pushed {count} updates to', 'دفع {count} تحديثًا إلى');
        return template.replace('{count}', count || 1);
    }
    const descriptions = {
        CreateEvent: ['github.event.create', 'Created a new resource in', 'أنشأ موردًا جديدًا في'],
        IssuesEvent: ['github.event.issues', 'Updated an issue in', 'حدّث مشكلة في'],
        PullRequestEvent: ['github.event.pullRequest', 'Updated a pull request in', 'حدّث طلب دمج في'],
        WatchEvent: ['github.event.watch', 'Starred', 'أضاف نجمة إلى'],
        ForkEvent: ['github.event.fork', 'Forked', 'أنشأ نسخة متفرعة من'],
        ReleaseEvent: ['github.event.release', 'Published a release in', 'نشر إصدارًا في']
    };
    const entry = descriptions[event.type];
    return entry
        ? tr(entry[0], entry[1], entry[2])
        : tr('github.event.default', 'Public activity in', 'نشاط عام في');
}

/**
 * Safely read the current language from the global scope.
 * @returns {'en'|'ar'}
 */
function getCurrentLang() {
    if (typeof window !== 'undefined' && typeof window.currentLang === 'string') {
        return window.currentLang === 'ar' ? 'ar' : 'en';
    }
    return document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en';
}

/**
 * Bilingual string lookup: prefer the i18n dictionaries (locales/*.json via
 * window.t), falling back to the inline pair when the runtime is unavailable.
 */
function tr(key, fallbackEn, fallbackAr) {
    if (typeof window.t === 'function') {
        const value = window.t(key);
        if (value && value !== key) return value;
    }
    return getCurrentLang() === 'ar' ? fallbackAr : fallbackEn;
}

/**
 * Does the user prefer reduced motion?
 * @returns {boolean}
 */
function prefersReducedMotion() {
    if (typeof window !== 'undefined' && typeof window.prefersReducedMotion === 'function') {
        return !!window.prefersReducedMotion();
    }
    return window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/* ------------------------------------------------------------------
 * Rendering into the page
 * ------------------------------------------------------------------ */

/**
 * Inject GitHub data into the page (avatar, name, stats, repositories,
 * events, and drawing contributions).
 *
 * @param {object} [data] Pre-loaded data (default: internal cache).
 */
function renderGitHubActivity(data = githubActivityData) {
    if (!data) return;
    githubActivityData = data;
    const lang = getCurrentLang();
    const { profile, repos, events, fetchedAt } = data;

    // --- Header (avatar + name + link + bio) ---
    const avatar = document.getElementById('github-avatar');
    const name = document.getElementById('github-profile-name');
    const link = document.getElementById('github-profile-link');
    const bio = document.getElementById('github-profile-bio');

    if (avatar) avatar.src = profile.avatar_url;
    if (name) name.textContent = profile.name || profile.login;
    if (link) { link.href = profile.html_url; link.textContent = `@${profile.login}`; }
    if (bio) bio.textContent = profile.bio || tr('github.profile.fallbackBio', 'Public GitHub profile', 'حساب GitHub العام');

    // --- Stats ---
    const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const contributionTotal = data.contributions?.total?.lastYear || 0;
    const stats = {
        'github-stat-repos': profile.public_repos,
        'github-stat-contributions': contributionTotal,
        'github-stat-stars': totalStars,
        'github-stat-followers': profile.followers
    };
    const numberFormatter = new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US');
    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = numberFormatter.format(value || 0);
    });

    // --- Draw the contribution graph ---
    const contributionGraph = document.getElementById('github-contribution-graph');
    const contributionWrap = document.getElementById('github-contributions');
    const contributionTotalLabel = document.getElementById('github-contribution-total');
    const contributionDays = data.contributions?.contributions || [];

    if (contributionGraph) {
        const weeks = [];
        for (let index = 0; index < contributionDays.length; index += 7) {
            weeks.push(contributionDays.slice(index, index + 7));
        }
        contributionGraph.innerHTML = weeks.map(week =>
            `<span class="github-contribution-week">${week.map(day => {
                const countTemplate = day.count === 1
                    ? tr('github.contributions.day.one', '{count} contribution on {date}', '{count} مساهمة في {date}')
                    : tr('github.contributions.day', '{count} contributions on {date}', '{count} مساهمة في {date}');
                const countLabel = countTemplate.replace('{count}', day.count).replace('{date}', day.date);
                const level = Math.max(0, Math.min(4, day.level || 0));
                return `<i class="github-contribution-dot" data-level="${level}" title="${countLabel}" aria-label="${countLabel}"></i>`;
            }).join('')}</span>`
        ).join('');
        contributionGraph.setAttribute(
            'aria-label',
            tr('github.contributions.aria', 'GitHub contribution activity during the last year', 'نشاط مساهمات GitHub خلال آخر سنة')
        );
    }
    if (contributionWrap) contributionWrap.hidden = !contributionDays.length;
    if (contributionTotalLabel) {
        contributionTotalLabel.textContent = tr(
            'github.contributions.total', '{count} contributions in the last year', '{count} مساهمة خلال آخر سنة'
        ).replace('{count}', numberFormatter.format(contributionTotal));
    }

    // --- Latest two repositories ---
    const repositories = document.getElementById('github-repositories');
    const recentRepos = [...repos]
        .sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at))
        .slice(0, 2);

    if (repositories) {
        if (recentRepos.length === 0) {
            repositories.innerHTML = `<div class="github-error">${
                tr('github.repos.empty', 'No public repositories are available.', 'لا توجد مستودعات عامة حاليًا.')
            }</div>`;
        } else {
            repositories.innerHTML = recentRepos.map(repo => `
                <a class="github-repo" href="${escapeGithubText(repo.html_url)}" target="_blank" rel="noopener noreferrer">
                    <div class="github-repo__top">
                        <span class="github-repo__name">${escapeGithubText(repo.name)}</span>
                        <i class="fa-solid fa-arrow-up-right-from-square text-[8px] text-white/25" aria-hidden="true"></i>
                    </div>
                    <div class="github-repo__description">${escapeGithubText(
                        repo.description || tr('github.repos.fallbackDescription', 'Public GitHub repository', 'مستودع GitHub عام')
                    )}</div>
                    <div class="github-repo__meta">
                        ${repo.language
                            ? `<span class="github-language" style="--language-color:${githubLanguageColor(repo.language)}">${escapeGithubText(repo.language)}</span>`
                            : ''}
                        <span><i class="fa-regular fa-star" aria-hidden="true"></i> ${repo.stargazers_count || 0}</span>
                        <span>${formatGithubDate(repo.pushed_at || repo.updated_at)}</span>
                    </div>
                </a>`).join('');
        }
    }

    // --- Latest 3 public events ---
    const eventsContainer = document.getElementById('github-events');
    const recentEvents = events.slice(0, 3);

    if (eventsContainer) {
        if (recentEvents.length === 0) {
            eventsContainer.innerHTML = `<div class="github-error">${
                tr('github.activity.empty', 'No recent public activity is available.', 'لا يوجد نشاط عام حديث لعرضه.')
            }</div>`;
        } else {
            eventsContainer.innerHTML = recentEvents.map(event => {
                const repoName = event.repo?.name || getActiveUsername();
                const repoUrl = `https://github.com/${repoName.split('/').map(encodeURIComponent).join('/')}`;
                const shortName = repoName.replace(`${getActiveUsername()}/`, '');
                return `<div class="github-event">
                    <div class="github-event__text">${escapeGithubText(describeGithubEvent(event))}
                        <a class="github-event__repo" href="${repoUrl}" target="_blank" rel="noopener noreferrer">${escapeGithubText(shortName)}</a>
                    </div>
                    <div class="github-event__date">${formatGithubDate(event.created_at)}</div>
                </div>`;
            }).join('');
        }
    }

    // --- Hide loading screen + "last synced" line ---
    const loading = document.getElementById('github-loading');
    const sync = document.getElementById('github-sync');
    if (loading) loading.hidden = true;
    if (sync) {
        sync.textContent = `${
            tr('github.lastSynced', 'Last synced with GitHub:', 'آخر مزامنة مع GitHub:')
        } ${formatGithubDate(fetchedAt)}`;
    }

    // --- GSAP effect while drawing contribution dots ---
    if (window.gsap && !prefersReducedMotion() && contributionGraph) {
        window.gsap.fromTo(
            contributionGraph.querySelectorAll('.github-contribution-dot'),
            { autoAlpha: 0, scale: 0.55 },
            {
                autoAlpha: 1,
                scale: 1,
                duration: 0.24,
                stagger: 0.002,
                ease: 'power2.out',
                clearProps: 'transform'
            }
        );
    }
}

/**
 * Render an error message inside the GitHub section on fetch failure.
 */
function showGitHubActivityError() {
    const loading = document.getElementById('github-loading');
    const sync = document.getElementById('github-sync');
    if (loading) {
        loading.innerHTML = `<div class="github-error">${
            tr('github.error',
                'Live data could not be loaded right now. You can still visit the profile directly on GitHub.',
                'تعذر تحميل البيانات المباشرة الآن. يمكنك زيارة الحساب مباشرة على GitHub.')
        }</div>`;
    }
    if (sync) {
        sync.textContent = tr('github.source', 'Source: GitHub Public API', 'المصدر: GitHub Public API');
    }
}

/* ------------------------------------------------------------------
 * API fetching
 * ------------------------------------------------------------------ */

/**
 * Return the current username (default or custom-set).
 * @returns {string}
 */
function getActiveUsername() {
    return (typeof window !== 'undefined' && window.GITHUB_USERNAME) || DEFAULT_USERNAME;
}

/**
 * Fetch data from the public GitHub API + contribution surface,
 * cached in sessionStorage for GITHUB_CACHE_TTL.
 *
 * @param {object} [opts]
 * @param {string} [opts.username]     GitHub username (default: a-almabadi)
 * @param {string} [opts.cacheKey]     cache key
 * @param {number} [opts.cacheTTL]     cache TTL in milliseconds
 * @param {boolean}[opts.useCache]     whether to use the cache (default true)
 * @returns {Promise<object|null>} GitHub data or null on failure
 */
async function loadGitHubActivity(opts = {}) {
    const username = opts.username || getActiveUsername();
    const cacheKey = opts.cacheKey || DEFAULT_CACHE_KEY;
    const cacheTTL = typeof opts.cacheTTL === 'number' ? opts.cacheTTL : DEFAULT_CACHE_TTL;
    const useCache = opts.useCache !== false;

    // 1) Try reading from cache
    if (useCache) {
        try {
            const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
            if (cached && Date.now() - cached.fetchedAt < cacheTTL) {
                renderGitHubActivity(cached);
                githubActivityData = cached;
                return cached;
            }
        } catch (_) {
            /* ignore cache errors */
        }
    }

    try {
        const headers = {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        };

        const [profileResponse, reposResponse, eventsResponse, contributionsRes] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`, { headers }),
            fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, { headers }),
            fetch(`https://api.github.com/users/${username}/events/public?per_page=10`, { headers }),
            fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`)
                .then(response => response.ok ? response.json() : null)
                .catch(() => null)
        ]);

        if (!profileResponse.ok || !reposResponse.ok || !eventsResponse.ok) {
            throw new Error('GitHub API request failed');
        }

        const data = {
            profile: await profileResponse.json(),
            repos: await reposResponse.json(),
            events: await eventsResponse.json(),
            contributions: contributionsRes,
            fetchedAt: Date.now()
        };

        githubActivityData = data;

        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (_) {
            /* ignore quota / blocked storage */
        }

        renderGitHubActivity(data);
        return data;
    } catch (error) {
        showGitHubActivityError();
        return null;
    }
}

/* ------------------------------------------------------------------
 * Re-render (called on language/theme change without re-fetching)
 * ------------------------------------------------------------------ */
function rerenderGitHubActivity() {
    if (githubActivityData) renderGitHubActivity(githubActivityData);
}

/**
 * Return the last loaded data (for external use after fetch).
 * @returns {object|null}
 */
function getCachedData() {
    return githubActivityData;
}

/* ------------------------------------------------------------------
 * Public API (ES module exports)
 * Usage:
 *   import loadGitHubActivity, { rerenderGitHubActivity, getCachedData } from './github-api.js';
 *   loadGitHubActivity();
 * ------------------------------------------------------------------ */
export {
    loadGitHubActivity,
    renderGitHubActivity,
    rerenderGitHubActivity,
    showGitHubActivityError,
    describeGithubEvent,
    getActiveUsername,
    getCachedData
};

// Default export: main function
export default loadGitHubActivity;
