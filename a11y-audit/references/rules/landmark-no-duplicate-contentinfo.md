---
id: landmark-no-duplicate-contentinfo
title: The page has more than one footer landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

The page contains two or more contentinfo landmarks. Contentinfo is the site-wide footer, created by a `<footer>` that is not inside `<article>`, `<aside>`, `<main>`, `<nav>` or `<section>`, or by any element with `role="contentinfo"`. A page should have at most one. Duplicates make the landmarks list ambiguous for screen reader users.

Typical causes are a cookie banner or newsletter strip built as a body-level `<footer>`, or two footers rendered for desktop and mobile with only one visually shown. Only footers exposed to screen readers are counted.

## Who it affects

- Screen reader users navigating by landmarks.
- Users of landmark navigation extensions.

## How to fix

Keep one site footer. Turn other body-level footers into a `<div>`, a labeled `<section>` or `<aside>` if they deserve a landmark, or move them inside the content they belong to.

```html
<!-- Before -->
<main>...</main>
<footer class="newsletter">Sign up for updates</footer>
<footer>&copy; 2026 Acme</footer>

<!-- After -->
<main>...</main>
<section aria-label="Newsletter" class="newsletter">Sign up for updates</section>
<footer>&copy; 2026 Acme</footer>
```

```tsx
// Before: a cookie notice component renders a <footer>
export function CookieNotice() {
  return <footer className="cookie-notice">...</footer>;
}

// After
export function CookieNotice() {
  return <div className="cookie-notice" role="region" aria-label="Cookie notice">...</div>;
}
```

When two responsive variants are both rendered, hide the inactive one with `display: none` so it leaves the accessibility tree.

## Common false positives

- **Footers inside articles, cards or sections** are not landmarks and are not counted.
- **Iframe content** is a separate document and does not count.

## How to verify

Open a landmarks list with a screen reader or extension and confirm "content information" appears once. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [axe rule: landmark-no-duplicate-contentinfo](https://dequeuniversity.com/rules/axe/4.13/landmark-no-duplicate-contentinfo)
