---
id: html-has-lang
title: The page doesn't declare its language
wcag: [3.1.1]
level: A
impact: serious
---

## The problem

The `<html>` element has no `lang` attribute (or an empty one). Screen readers use `lang` to choose the voice and pronunciation rules for the page. Without it, they fall back to the user's default language, so an English page read by a screen reader set to Spanish is pronounced as if it were Spanish, which can be close to unintelligible.

The `lang` attribute also drives browser translation prompts, hyphenation, spell checking, and font selection for some scripts.

## Who it affects

- Screen reader users, especially those who use more than one language.
- People using browser translation or text-to-speech features.

## How to fix

Add `lang` to the `<html>` element with the page's primary language code.

```html
<!-- Before -->
<html>

<!-- After -->
<html lang="en">
```

In frameworks, set it in the root layout or document template:

```tsx
// Next.js App Router: app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

For a Vite or Create React App project, edit `index.html`. For a multilingual site, set the value from the current locale, for example `<html lang={locale}>`, or update `document.documentElement.lang` when the user switches languages.

For passages in a different language within the page, add `lang` to that element: `<blockquote lang="fr">...</blockquote>`.

## Common false positives

- **`xml:lang` alone** does not count on HTML pages. axe reports this case explicitly. Use `lang`.

## How to verify

In the DevTools console, run `document.documentElement.lang` and confirm it returns the right code. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 3.1.1 Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)
- [axe rule: html-has-lang](https://dequeuniversity.com/rules/axe/4.13/html-has-lang)
