---
id: landmark-contentinfo-is-top-level
title: The page footer landmark is nested inside another landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

The page's contentinfo landmark, the site-wide footer usually holding copyright, legal links and contact details, sits inside another landmark such as `<main>`, `<aside>` or a labeled `<section>`. Screen readers list contentinfo as a top-level landmark. Nesting it makes the page structure misleading and hides the footer from users who jump between top-level regions.

axe only checks elements that actually are the contentinfo landmark. A `<footer>` inside `<article>`, `<aside>`, `<main>`, `<nav>` or `<section>` is scoped to that content and is not contentinfo, so it is ignored. The rule fires for `role="contentinfo"` placed inside another landmark, or for a body-level `<footer>` inside an element with an explicit landmark role such as `<div role="main">`.

## Who it affects

- Screen reader users who navigate by landmarks.
- Keyboard users relying on landmark navigation extensions.

## How to fix

Render the site footer as a sibling of `<main>`, at the end of the page shell. Use a plain `<footer>` and drop `role="contentinfo"` from footers that belong to a single card, article or section.

```html
<!-- Before: contentinfo inside main -->
<div role="main">
  <h1>Pricing</h1>
  ...
  <footer>&copy; 2026 Acme, Inc.</footer>
</div>

<!-- After -->
<main>
  <h1>Pricing</h1>
  ...
</main>
<footer>&copy; 2026 Acme, Inc.</footer>
```

```tsx
// Before: a card component marks its footer as the page footer
<article>
  <h2>{title}</h2>
  <footer role="contentinfo">{author}</footer>
</article>

// After: a scoped footer needs no role
<article>
  <h2>{title}</h2>
  <footer>{author}</footer>
</article>
```

## Common false positives

- **Scoped footers** inside `<article>` or `<section>` are not landmarks and are not tested. If one is flagged, check for an explicit `role="contentinfo"` on it.
- **Third-party embeds** that ship their own `role="contentinfo"` can trigger this. Remove the role from the embed's markup.

## How to verify

Check the DevTools Accessibility tree or a landmarks extension and confirm contentinfo is at the top level. With a screen reader, open the landmarks list and confirm "content information" appears once, not nested. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [axe rule: landmark-contentinfo-is-top-level](https://dequeuniversity.com/rules/axe/4.13/landmark-contentinfo-is-top-level)
