/**
 * i18n.js — Centralized internationalization runtime (single source of truth).
 * -----------------------------------------------------------------------------
 * Loads /locales/en.json and /locales/ar.json and swaps text for elements
 * carrying data-i18n-key / data-i18n-html-key / data-i18n-aria-key /
 * data-i18n-ph-key attributes.
 *
 * NOTE: index.html intentionally contains NO inline translations — markup
 * carries keys only, and all strings live in the JSON dictionaries. The site
 * is already served over HTTP(S) (ES modules require it), so the dictionary
 * fetch runs in the same conditions as the module graph itself.
 *
 * Public API:
 *   window.i18n.setLang('en'|'ar')  switch language (persisted to localStorage)
 *   window.i18n.getLang()            return 'en'|'ar'
 *   window.i18n.t(key, lang?)        translate a single key
 *   window.i18n.apply(root?)         re-apply translations on a subtree
 *   window.i18n.ready                boolean (true once dictionaries loaded)
 *   event 'i18nready'                fires on document when ready
 *   event 'i18nchanged'              fires on document after a language switch
 * -----------------------------------------------------------------------------
 */

const STORAGE_KEY  = 'ama-language';
const LOCALES_BASE = 'locales/';
const SUPPORTED    = ['en', 'ar'];
const DEFAULT_LANG = 'en';

let activeLang = DEFAULT_LANG;
let dictionaries = { en: {}, ar: {} };
let ready = false;

/* ---------------- helpers ---------------- */

function detectInitialLang() {
    try {
        const s = window.localStorage.getItem(STORAGE_KEY);
        if (s && SUPPORTED.includes(s)) return s;
    } catch (_) {}
    const attr = document.documentElement.getAttribute('lang');
    if (attr && SUPPORTED.includes(attr.slice(0, 2).toLowerCase())) {
        return attr.slice(0, 2).toLowerCase();
    }
    return DEFAULT_LANG;
}

async function loadDictionary(lang) {
    if (dictionaries[lang] && Object.keys(dictionaries[lang]).length) return dictionaries[lang];
    const res = await fetch(`${LOCALES_BASE}${lang}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`i18n: failed to load ${lang}.json (${res.status})`);
    dictionaries[lang] = await res.json();
    return dictionaries[lang];
}

function lookup(key, lang) {
    const useLang = (lang && SUPPORTED.includes(lang)) ? lang : activeLang;
    const dict = dictionaries[useLang] || {};
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    if (useLang !== DEFAULT_LANG) {
        const def = dictionaries[DEFAULT_LANG] || {};
        if (Object.prototype.hasOwnProperty.call(def, key)) return def[key];
    }
    return null;
}

/* ---------------- DOM application ---------------- */

function apply(root = document) {
    // textContent
    root.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-key');
        if (!key) return;
        const val = lookup(key);
        if (val != null) el.textContent = val;
    });
    // innerHTML (allows <br>, <span>, etc.)
    root.querySelectorAll('[data-i18n-html-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-html-key');
        if (!key) return;
        const val = lookup(key);
        if (val != null) el.innerHTML = val;
    });
    // aria-label
    root.querySelectorAll('[data-i18n-aria-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-key');
        if (!key) return;
        const val = lookup(key);
        if (val != null) el.setAttribute('aria-label', val);
    });
    // placeholder
    root.querySelectorAll('[data-i18n-ph-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph-key');
        if (!key) return;
        const val = lookup(key);
        if (val != null) el.setAttribute('placeholder', val);
    });
}

/* ---------------- language switch ---------------- */

async function setLang(lang) {
    const target = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
    try { await loadDictionary(target); }
    catch (err) { console.warn('[i18n] load error:', err); return; }
    activeLang = target;
    document.documentElement.setAttribute('lang', target);
    document.documentElement.setAttribute('dir', target === 'ar' ? 'rtl' : 'ltr');
    try { window.localStorage.setItem(STORAGE_KEY, target); } catch (_) {}
    apply();
    document.dispatchEvent(new CustomEvent('i18nchanged', { detail: { lang: target } }));
}

function t(key, lang) {
    const v = lookup(key, lang);
    return v != null ? v : key;
}
function getLang() { return activeLang; }

/* ---------------- init ---------------- */

async function init() {
    activeLang = detectInitialLang();
    document.documentElement.setAttribute('lang', activeLang);
    document.documentElement.setAttribute('dir', activeLang === 'ar' ? 'rtl' : 'ltr');
    try {
        await Promise.all([loadDictionary('en'), loadDictionary('ar')]);
    } catch (err) {
        console.warn('[i18n] dictionary load failed (falling back to inline text):', err);
    }
    apply();
    ready = true;
    document.dispatchEvent(new CustomEvent('i18nready', { detail: { lang: activeLang } }));
}

const api = { init, setLang, getLang, t, apply, ready: () => ready };
window.i18n = api;
window.t = t;

export default api;
export { init, setLang, getLang, t, apply };
