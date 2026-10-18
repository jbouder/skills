---
id: valid-lang
title: A lang attribute uses a language code that doesn't exist
wcag: [3.1.2]
level: AA
impact: serious
---

## The problem

An element inside the page (not the `<html>` element, which `html-lang-valid` checks) has a `lang` or `xml:lang` attribute whose primary language subtag is not a real language code. Examples include `lang="english"`, `lang="en_US"` with an underscore, `lang="jp"` (Japanese is `ja`), `lang="sp"` (Spanish is `es`), or a template placeholder such as `lang="{{locale}}"`.

Screen readers use `lang` to switch pronunciation rules and voices. An invalid code is ignored, so a French quotation is read aloud with English pronunciation and becomes hard to understand. axe only reports elements that actually contain text.

## Who it affects

- Screen reader users, who hear foreign-language passages mispronounced.
- Braille display users, since braille tables depend on language.
- Users relying on browser translation, hyphenation, or spell checking, which also read `lang`.

## How to fix

Use a valid BCP 47 language tag. The first part must be an ISO 639 language code, optionally followed by a hyphen and a region, such as `en`, `en-US`, `fr`, `fr-CA`, `ja`, `zh-Hans`.

```html
<!-- Before -->
<p>The motto is <span lang="french">liberté, égalité, fraternité</span>.</p>
<blockquote lang="en_GB">...</blockquote>

<!-- After -->
<p>The motto is <span lang="fr">liberté, égalité, fraternité</span>.</p>
<blockquote lang="en-GB">...</blockquote>
```

When the value comes from app state, normalize it before rendering:

```tsx
// Before: locale is "en_US" from the backend
<article lang={locale}>{body}</article>
// After
<article lang={locale.replace("_", "-")}>{body}</article>
```

Remove `lang` from elements that are in the same language as the page; it only needs to mark changes of language.

## Common false positives

- **Empty `lang=""`** is valid and means "unknown language", so axe does not flag it.
- **Private-use tags** that start with `x-`, such as `x-pirate`, are not in axe's list and will fail. If the content genuinely needs a private-use tag, this can be accepted as an exception, but screen readers will not change pronunciation for it either.

## How to verify

Inspect each flagged element and compare the code against the IANA Language Subtag Registry. With a screen reader, read the passage and confirm the voice switches to the right language. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 3.1.2 Language of Parts](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html)
- [axe rule: valid-lang](https://dequeuniversity.com/rules/axe/4.13/valid-lang)
