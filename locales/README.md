# locales/ — Internationalization files

All user-facing text on the website lives in **JSON dictionaries** here.

| File    | Purpose                    |
|---------|----------------------------|
| `en.json` | English strings           |
| `ar.json` | Arabic (RTL) strings      |

Both files share **the exact same set of keys** (414 keys each). Adding a key
to one but not the other will fall back to showing the English value.

> **Single source of truth:** `index.html` contains NO inline translations
> (no `data-en` / `data-ar` attributes, no duplicated text). Markup carries
> keys only, and these dictionaries provide every string at runtime.

## How it works

`/js/i18n.js` is loaded at application boot. It:

1. Fetches both `en.json` and `ar.json` (cached)
2. Detects the language from `localStorage` → `<html lang>` → default `en`
3. Fills every DOM element carrying one of:
   - `data-i18n-key="key"`       → textContent
   - `data-i18n-html-key="key"`  → innerHTML (for `<br>` / `<span>`)
   - `data-i18n-aria-key="key"`  → aria-label
   - `data-i18n-ph-key="key"`    → input placeholder
4. Listens for language switches (triggered by `window.i18n.setLang('ar' | 'en')`)
   and re-applies all translations instantly.
5. Sets `<html lang>` and `dir="rtl|ltr"` automatically.

## Adding a new string

1. Open `en.json` and add:
   ```json
   "mySection.myLabel": "English text"
   ```
2. Open `ar.json` and add:
   ```json
   "mySection.myLabel": "النص العربي"
   ```
3. In HTML:
   ```html
   <span data-i18n-key="mySection.myLabel"></span>
   ```
4. In JavaScript:
   ```js
   const label = window.i18n.t('mySection.myLabel');
   ```

## Switching language

```js
window.i18n.setLang('ar');   // switch to Arabic
window.i18n.setLang('en');   // switch to English
console.log(window.i18n.getLang()); // 'en' | 'ar'
```

The language is persisted in `localStorage` under the key `ama-language`
and applied on next visit (the `<head>` bootstrap script reads it early to
avoid FOUC/relayout).
