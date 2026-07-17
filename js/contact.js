/**
 * contact.js
 * -----------------------------------------------------------------------------
 * Full contact form logic:
 *   - Smart field validation via validateContactField
 *     (full name >= 2 words, valid email, reason selected, message >= 10 chars)
 *   - Final validation validateContactForm + multilingual error messages
 *   - Custom contact-reason dropdown (toggle/select/sync/focus)
 *   - Real submit to Formspree (fetch/AJAX) protected by Cloudflare Turnstile,
 *     with spinner followed by a success/error toast
 *   - resetContactValidation / refreshContactValidationMessages
 *   - Bind listeners (initContactValidation) — blur/input/change
 *   - Close dropdown on outside click or Escape
 *
 * Exported API:
 *   - init()
 * -----------------------------------------------------------------------------
 */

/* ==================================================================
 * Multilingual validation messages
 * ================================================================== */

const contactValidationMessages = {
    name: {
        en: 'Enter your full name using at least two words.',
        ar: 'يرجى إدخال الاسم الكامل مكوّنًا من كلمتين على الأقل.'
    },
    email: {
        en: 'Enter a valid email address.',
        ar: 'يرجى إدخال عنوان بريد إلكتروني صحيح.'
    },
    reason: {
        en: 'Select a reason for contact.',
        ar: 'يرجى اختيار سبب التواصل.'
    },
    message: {
        en: 'Enter a short message of at least 10 characters.',
        ar: 'يرجى كتابة رسالة مختصرة لا تقل عن 10 أحرف.'
    }
};

/* ==================================================================
 * Field validators
 * ================================================================== */

/**
 * Full-name validation:
 * - at least two words
 * - length >= 4 characters
 * - each word starts with a letter (Arabic/Latin) allowing dots, hyphens, and apostrophes
 */
function isValidFullName(value) {
    const normalized = value.trim().replace(/\s+/g, ' ');
    const words = normalized.split(' ').filter(Boolean);
    return normalized.length >= 4
        && words.length >= 2
        && words.every(word => /^[\p{L}\p{M}][\p{L}\p{M}.\-'’]*$/u.test(word));
}

function isValidContactEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim());
}

function getContactFieldType(field) {
    return field.id.replace('contact-', '');
}

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

/* ==================================================================
 * Contact-reason dropdown (custom, replacing the native select)
 * ================================================================== */

function toggleContactReasonDropdown(forceOpen = null) {
    const dropdown = document.getElementById('contact-reason-choices');
    const trigger = document.getElementById('contact-reason-trigger');
    if (!dropdown || !trigger) return;
    const open = forceOpen === null ? !dropdown.classList.contains('is-open') : Boolean(forceOpen);
    dropdown.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    if (open) {
        const toFocus = dropdown.querySelector('.contact-reason-option.is-selected, .contact-reason-option');
        if (toFocus) toFocus.focus({ preventScroll: true });
    }
}

function selectContactReason(value, selectedButton) {
    const select = document.getElementById('contact-reason');
    const dropdown = document.getElementById('contact-reason-choices');
    const display = document.getElementById('contact-reason-value');
    if (!select || !dropdown || !display) return;
    select.value = value;
    dropdown.querySelectorAll('.contact-reason-option').forEach(option => {
        const selected = option === selectedButton;
        option.classList.toggle('is-selected', selected);
        option.setAttribute('aria-selected', String(selected));
    });
    // Option labels are rendered by i18n.js from locales/*.json, so the
    // button's current textContent is already in the active language.
    display.textContent = selectedButton.textContent;
    dropdown.classList.remove('is-invalid');
    toggleContactReasonDropdown(false);
    select.dispatchEvent(new Event('change', { bubbles: true }));
}

function syncContactReasonChoices() {
    const select = document.getElementById('contact-reason');
    const dropdown = document.getElementById('contact-reason-choices');
    const display = document.getElementById('contact-reason-value');
    if (!select || !dropdown || !display) return;
    let selectedOption = null;
    dropdown.querySelectorAll('.contact-reason-option').forEach(option => {
        const selected = option.dataset.value === select.value;
        option.classList.toggle('is-selected', selected);
        option.setAttribute('aria-selected', String(selected));
        if (selected) selectedOption = option;
    });
    const lang = getCurrentLang();
    display.textContent = selectedOption
        ? selectedOption.textContent
        : (typeof window.t === 'function'
            ? window.t('select.a.reason')
            : (lang === 'ar' ? 'اختر سبب التواصل' : 'Select a reason'));
    dropdown.classList.toggle('is-invalid', select.getAttribute('aria-invalid') === 'true');
    if (!select.value) toggleContactReasonDropdown(false);
}

/* ==================================================================
 * Validate a single field
 * ================================================================== */

function validateContactField(field, showMessage = true) {
    const type = getContactFieldType(field);
    const value = field.value || '';
    let valid = true;
    if (type === 'name') valid = isValidFullName(value);
    else if (type === 'email') valid = isValidContactEmail(value);
    else if (type === 'reason') valid = Boolean(value);
    else if (type === 'message') valid = value.trim().length >= 10;

    const error = document.getElementById(`${field.id}-error`);
    field.classList.toggle('is-invalid', !valid);
    field.setAttribute('aria-invalid', String(!valid));
    if (type === 'reason') {
        document.getElementById('contact-reason-choices')?.classList.toggle('is-invalid', !valid);
    }
    if (error && showMessage) {
        const messages = contactValidationMessages[type];
        error.textContent = valid || !messages
            ? ''
            : tr(`contact.error.${type}`, messages.en, messages.ar);
    }
    return valid;
}

/* ==================================================================
 * Final validation of the whole form
 * ================================================================== */

function validateContactForm(form) {
    const fields = [...form.querySelectorAll('#contact-name, #contact-email, #contact-reason, #contact-message')];
    const results = fields.map(field => validateContactField(field, true));
    const firstInvalid = fields.find((field, index) => !results[index]);
    if (firstInvalid) firstInvalid.focus({ preventScroll: false });
    return results.every(Boolean);
}

function resetContactValidation(form) {
    form.querySelectorAll('.contact-input, .contact-select').forEach(field => {
        field.classList.remove('is-invalid');
        field.setAttribute('aria-invalid', 'false');
    });
    form.querySelectorAll('.contact-field-error').forEach(error => { error.textContent = ''; });
    syncContactReasonChoices();
}

function refreshContactValidationMessages() {
    const form = document.getElementById('contact-form-home');
    if (!form) return;
    form.querySelectorAll('[aria-invalid="true"]').forEach(field => validateContactField(field, true));
}

/* ==================================================================
 * Form submission handler — Formspree (AJAX) + Cloudflare Turnstile
 * Invisible mode: the challenge never shows UI. A token is requested
 * silently at submit time via turnstile.execute(), then the form is
 * sent to Formspree with the cf-turnstile-response token attached.
 * ================================================================== */

// Fallback endpoint; the authoritative value is the form's action attribute.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mykrengy';

let turnstileWidgetId = null;
let turnstileRenderFailed = false;
let pendingSubmit = null;      // submission waiting for a token / in flight
let tokenWatchdog = null;      // fails the submit if Turnstile never responds

// Human-readable hints for Cloudflare Turnstile client error codes — logged to
// the console only (invisible to visitors) to simplify any future troubleshooting.
// (https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/)
const TURNSTILE_ERROR_HINTS = {
    '110100': 'invalid sitekey — make sure you used the SITE key, not the SECRET key',
    '110110': 'sitekey not found — check the sitekey spelling',
    '110200': 'domain not authorized — add this hostname (localhost / 127.0.0.1 / your domain) in Cloudflare Turnstile → widget → Hostname Management',
    '110600': 'challenge timed out',
    '110620': 'interaction timed out',
    '200100': 'visitor clock or cache problem',
    '200500': 'Turnstile iframe blocked — challenges.cloudflare.com unreachable (adblock/VPN?)',
    '400020': 'invalid sitekey',
    '400070': 'sitekey disabled in the Cloudflare dashboard'
};

function isTurnstileAvailable() {
    return typeof window.turnstile !== 'undefined'
        && typeof window.turnstile.render === 'function';
}

function ensureTurnstileRendered() {
    if (turnstileWidgetId !== null) return true;
    if (turnstileRenderFailed || !isTurnstileAvailable()) return false;
    const container = document.getElementById('contact-turnstile');
    if (!container) return false;
    try {
        turnstileWidgetId = window.turnstile.render(container, {
            sitekey: container.getAttribute('data-sitekey'),
            theme: 'dark',
            callback: onTurnstileToken,
            'error-callback': onTurnstileFailure,
            'timeout-callback': onTurnstileFailure,
            'expired-callback': onTurnstileExpired
        });
        return true;
    } catch (error) {
        console.error('Turnstile render failed:', error);
        turnstileRenderFailed = true;
        return false;
    }
}

// Prefer the API's response; fall back to the hidden input the widget injects.
function getTurnstileToken(form) {
    if (turnstileWidgetId !== null && typeof window.turnstile.getResponse === 'function') {
        try {
            const token = window.turnstile.getResponse(turnstileWidgetId);
            if (token) return token;
        } catch (_) {}
    }
    const field = form.querySelector('[name="cf-turnstile-response"]');
    return field && field.value ? field.value : '';
}

// Turnstile tokens are single-use — always reset the widget after an attempt.
function resetTurnstile() {
    if (turnstileWidgetId !== null && typeof window.turnstile.reset === 'function') {
        try { window.turnstile.reset(turnstileWidgetId); } catch (_) {}
    }
}

function clearTokenWatchdog() {
    if (tokenWatchdog !== null) {
        window.clearTimeout(tokenWatchdog);
        tokenWatchdog = null;
    }
}

// Fires when the silent challenge completes — send the pending form.
function onTurnstileToken(token) {
    if (!pendingSubmit || !token) return;
    clearTokenWatchdog();
    sendWithToken(token);
}

function onTurnstileFailure(code) {
    if (!pendingSubmit) return;
    clearTokenWatchdog();
    const pending = pendingSubmit;
    pendingSubmit = null;
    const hint = code ? (TURNSTILE_ERROR_HINTS[String(code)] || '') : '';
    const error = new Error(`Turnstile challenge failed${code ? ` (code ${code})` : ''}${hint ? ` — ${hint}` : ''}`);
    failSubmission(pending, error);
}

// A previously issued token expired before use — restart the challenge once.
function onTurnstileExpired() {
    if (!pendingSubmit || pendingSubmit.retrying) return;
    pendingSubmit.retrying = true;
    resetTurnstile();
    try {
        window.turnstile.execute(turnstileWidgetId);
    } catch (_) {
        onTurnstileFailure();
    }
}

function requestFreshToken(pending) {
    if (!ensureTurnstileRendered()) {
        pendingSubmit = null;
        failSubmission(pending, new Error('Turnstile is unavailable (script blocked or failed to load)'));
        return;
    }
    // Safety net: never leave the submit button spinning forever.
    clearTokenWatchdog();
    tokenWatchdog = window.setTimeout(onTurnstileFailure, 20000);
    try {
        window.turnstile.execute(turnstileWidgetId);
    } catch (error) {
        clearTokenWatchdog();
        pendingSubmit = null;
        failSubmission(pending, error);
    }
}

function sendWithToken(token) {
    const pending = pendingSubmit;
    if (!pending) return;
    const { form } = pending;

    const formData = new FormData(form);
    formData.set('cf-turnstile-response', token);
    // Human-readable reason + a clear subject line in the notification email.
    const reasonLabel = (document.getElementById('contact-reason-value')?.textContent || '').trim();
    if (reasonLabel) formData.set('reason', reasonLabel);
    formData.set('_subject', `Portfolio Contact — ${reasonLabel || 'New message'}`);

    const endpoint = form.getAttribute('action') || FORMSPREE_ENDPOINT;

    fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
    })
        .then(async (response) => {
            if (!response.ok) {
                let detail = '';
                try {
                    const data = await response.json();
                    if (data && Array.isArray(data.errors) && data.errors.length) {
                        detail = data.errors.map(err => err.message).join(' ');
                    } else if (data && data.error) {
                        detail = data.error;
                    }
                } catch (_) {}
                const error = new Error(detail || `Submission failed (${response.status})`);
                error.turnstileRelated = /turnstile|captcha/i.test(detail);
                throw error;
            }
        })
        .then(() => {
            pendingSubmit = null;
            showSubmissionSuccess(pending);
        })
        .catch((error) => {
            // The token may have gone stale in transit — retry once silently.
            if (error.turnstileRelated && !pending.retriedToken) {
                pending.retriedToken = true;
                resetTurnstile();
                requestFreshToken(pending);
                return;
            }
            pendingSubmit = null;
            failSubmission(pending, error);
        });
}

function minDelaySince(startedAt) {
    return Math.max(0, 900 - (Date.now() - startedAt));
}

function showSubmissionSuccess(pending) {
    const { form, submitButton, originalBtnText, lang, startedAt } = pending;
    window.setTimeout(() => {
        form.reset();
        resetContactValidation(form);
        resetTurnstile();
        submitButton.innerHTML = `<i class="fa-solid fa-check mr-2" aria-hidden="true"></i> <span>${tr('contact.transmitted', 'TRANSMITTED', 'تم الإرسال')}</span>`;
        submitButton.classList.add('!bg-white', '!text-black');
        if (typeof window.showToast === 'function') {
            window.showToast(tr('contact.toast.success',
                'Message transmitted successfully! I will respond soon.', 'تم إرسال الرسالة بنجاح! سأرد قريباً.'));
        }
        window.setTimeout(() => {
            submitButton.innerHTML = originalBtnText;
            submitButton.classList.remove('!bg-white', '!text-black');
            submitButton.disabled = false;
        }, 2600);
    }, minDelaySince(startedAt));
}

function failSubmission(pending, error) {
    console.error('Contact form submission failed:', error);
    const { submitButton, originalBtnText, lang, startedAt } = pending;
    window.setTimeout(() => {
        resetTurnstile();
        submitButton.innerHTML = originalBtnText;
        submitButton.disabled = false;
        if (typeof window.showToast === 'function') {
            window.showToast(tr('contact.toast.error',
                'Could not send the message. Please try again or email me directly.',
                'تعذّر إرسال الرسالة. حاول مرة أخرى أو راسلني مباشرة عبر البريد.'));
        }
    }, minDelaySince(startedAt));
}

function handleContactSubmit(e, formId) {
    e.preventDefault();
    const form = e.currentTarget || document.getElementById(formId);
    if (!form) return;
    const lang = getCurrentLang();
    if (!validateContactForm(form)) {
        if (typeof window.showToast === 'function') {
            window.showToast(tr('contact.toast.review',
                'Please review the required fields.', 'يرجى مراجعة الحقول المطلوبة.'));
        }
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;
    const originalBtnText = submitButton.innerHTML;
    submitButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i> <span>${tr('contact.sending', 'SENDING...', 'جارٍ الإرسال...')}</span>`;
    submitButton.disabled = true;

    pendingSubmit = {
        form,
        submitButton,
        originalBtnText,
        lang,
        startedAt: Date.now(),
        retriedToken: false,
        retrying: false
    };

    // Fast path: a valid token is already available (challenge ran earlier).
    const existingToken = getTurnstileToken(form);
    if (existingToken) {
        sendWithToken(existingToken);
        return;
    }
    // Otherwise run the invisible challenge now — the token arrives via callback.
    requestFreshToken(pendingSubmit);
}

/* ==================================================================
 * Initialization and listener binding
 * ================================================================== */

function initContactValidation() {
    const form = document.getElementById('contact-form-home');
    if (!form) return;
    const fields = form.querySelectorAll('#contact-name, #contact-email, #contact-reason, #contact-message');

    // Close the dropdown on outside click
    document.addEventListener('click', event => {
        if (!event.target.closest('#contact-reason-choices')) toggleContactReasonDropdown(false);
    });
    // Close it on Escape
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') toggleContactReasonDropdown(false);
    });

    fields.forEach(field => {
        field.addEventListener('blur', () => validateContactField(field, true));
        const eventName = field.tagName === 'SELECT' ? 'change' : 'input';
        field.addEventListener(eventName, () => {
            if (field.getAttribute('aria-invalid') === 'true') validateContactField(field, true);
        });
    });

    // Warn if the Turnstile site key has not been configured yet
    const turnstileWidget = form.querySelector('#contact-turnstile');
    if (turnstileWidget && turnstileWidget.getAttribute('data-sitekey') === 'PASTE_YOUR_TURNSTILE_SITE_KEY') {
        console.warn('[contact] Turnstile site key is not configured. '
            + 'Replace PASTE_YOUR_TURNSTILE_SITE_KEY in index.html with the Site Key from '
            + 'the Formspree dashboard (Settings → Plugins → Cloudflare Turnstile).');
    }

    // Render the invisible Turnstile widget as soon as the API is ready.
    // (api.js loads async with ?render=explicit&onload=onTurnstileApiReady)
    document.addEventListener('turnstile:ready', ensureTurnstileRendered);
    ensureTurnstileRendered();

    // Initial dropdown sync (to display the default label)
    syncContactReasonChoices();
}

function init() {
    initContactValidation();
}

/* ==================================================================
 * Expose functions on window for onclick handlers
 * ================================================================== */

function exposeGlobals() {
    window.toggleContactReasonDropdown = toggleContactReasonDropdown;
    window.selectContactReason = selectContactReason;
    window.syncContactReasonChoices = syncContactReasonChoices;
    window.validateContactField = validateContactField;
    window.handleContactSubmit = handleContactSubmit;
    window.refreshContactValidationMessages = refreshContactValidationMessages;
    window.resetContactValidation = resetContactValidation;
}

exposeGlobals();

/* ==================================================================
 * Exports
 * ================================================================== */

export {
    init,
    validateContactField,
    validateContactForm,
    handleContactSubmit,
    toggleContactReasonDropdown,
    selectContactReason,
    syncContactReasonChoices,
    refreshContactValidationMessages,
    resetContactValidation
};

export default init;
