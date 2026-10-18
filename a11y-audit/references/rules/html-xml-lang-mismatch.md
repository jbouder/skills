---
id: html-xml-lang-mismatch
title: The page's lang and xml:lang attributes name different languages
wcag: [3.1.1]
level: A
impact: moderate
---

## The problem

The `<html>` element has both a `lang` and an `xml:lang` attribute, both are valid language codes, but they disagree on the base language. For example, `lang="en"` with `xml:lang="fr"`. axe compares only the primary subtag, so `en-US` and `en-GB` count as a match, but `en` and `fr` do not.

Screen readers use the page language to pick a voice and pronunciation rules. When the two attributes conflict, different browsers and assistive technologies may pick different languages, and the page can be read aloud with the wrong accent or rules. This usually comes from an old XHTML template, or from one attribute being localized while the other was hard-coded.

## Who it affects

- Screen reader users, who may hear the whole page pronounced in the wrong language.
- Braille display users, whose translation tables depend on the language.
- Users of translation tools and text-to-speech browser extensions.

## How to fix

Make both attributes name the same language, or remove `xml:lang` entirely. In a page served as `text/html`, `xml:lang` does nothing useful on its own, so dropping it is the simplest fix.

```html
<!-- Before: conflicting languages -->
<html lang="en" xml:lang="fr">

<!-- After: xml:lang removed -->
<html lang="en">

<!-- Or, if you must keep XHTML compatibility: the same value in both -->
<html lang="en" xml:lang="en" xmlns="http://www.w3.org/1999/xhtml">
```

If a framework sets the language from the user's locale, set both from the same variable so they cannot drift apart:

```tsx
// Next.js app/layout.tsx
export default function RootLayout({ children, params }: Props) {
  return (
    <html lang={params.locale}>
      <body>{children}</body>
    </html>
  );
}
```

## Common false positives

- **Regional variants** such as `en-US` and `en-GB` share a base language and do not trigger this rule. If it fires, the base languages really differ.
- **Invalid codes** are handled by other rules (`html-lang-valid`). This rule only runs when both values are valid.

## How to verify

Inspect the `<html>` element in DevTools and confirm `lang` and `xml:lang` (if present) share the same base language, and that it matches the language the page is actually written in. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 3.1.1 Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)
- [axe rule: html-xml-lang-mismatch](https://dequeuniversity.com/rules/axe/4.13/html-xml-lang-mismatch)
