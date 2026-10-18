---
id: html-lang-valid
title: The page's lang attribute is not a valid language code
wcag: [3.1.1]
level: A
impact: serious
---

## The problem

The `<html>` element has a `lang` attribute, but its value is not a recognized language code. Screen readers cannot pick the right voice and pronunciation, so they fall back to the user's default language, exactly as if `lang` were missing.

Common mistakes:

- A language name instead of a code: `lang="english"`, `lang="Spanish"`.
- An underscore instead of a hyphen: `lang="en_US"` (correct: `en-US`).
- A three-letter code where a two-letter one exists: `lang="eng"` (correct: `en`).
- Template placeholders that were never replaced: `lang="{{locale}}"` or `lang="undefined"`.

axe checks the primary language subtag, the part before the first hyphen, against the list of registered language codes.

## Who it affects

- Screen reader users, who hear the page read with the wrong pronunciation rules.
- People using browser translation, which relies on the declared language.

## How to fix

Use a valid BCP 47 language tag: a two-letter ISO 639-1 code, optionally followed by a hyphen and a region.

```html
<!-- Before -->
<html lang="english">
<html lang="en_US">

<!-- After -->
<html lang="en">
<html lang="en-US">
```

If the value comes from your app's locale setting, normalize it before rendering:

```tsx
// Before: locale from a backend in "en_US" format
<html lang={user.locale}>

// After
<html lang={user.locale.replace("_", "-")}>
```

Confirm the fallback when no locale is known is a real code such as `en`, not an empty string or `undefined`.

## Common false positives

- **Private-use or very new tags** may not be in axe's list. Prefer a standard primary code with a region or script subtag, such as `zh-Hant`.

## How to verify

In the DevTools console, run `document.documentElement.lang` and confirm it returns a valid tag such as `en` or `pt-BR`. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 3.1.1 Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)
- [W3C: Language tags in HTML](https://www.w3.org/International/articles/language-tags/)
- [axe rule: html-lang-valid](https://dequeuniversity.com/rules/axe/4.13/html-lang-valid)
