---
id: region
title: Some page content is not inside a landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

Visible content sits outside every landmark region. Landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, a labeled `<section>` and their ARIA roles) divide the page into areas that screen reader users can list and jump between. Content outside all of them is easy to miss: someone navigating by landmark skips right over it.

axe walks the page and reports the outermost element of each piece of orphaned content. Some things are allowed outside landmarks: dialogs, `svg` elements, live regions (`aria-live="polite"` or `"assertive"`, `role="alert"`, `role="status"` and similar), iframes, buttons, and skip links whose target exists. Typical offenders are cookie banners, toast containers, announcement bars and content rendered by portals directly into `<body>`.

## Who it affects

- Screen reader users who navigate by landmarks and may never encounter the orphaned content.
- Users of landmark navigation extensions.

## How to fix

Put all content inside the right landmark. Most stray content belongs in `<main>`, `<header>` or `<footer>`. Standalone areas like a cookie notice can become their own labeled region.

```html
<!-- Before: announcement bar and content outside landmarks -->
<body>
  <div class="announcement">Free shipping this week</div>
  <header>...</header>
  <div class="content"><h1>Shop</h1></div>
</body>

<!-- After -->
<body>
  <header>
    <div class="announcement">Free shipping this week</div>
    ...
  </header>
  <main class="content"><h1>Shop</h1></main>
</body>
```

Portaled UI in React often lands directly in `<body>`. Give the portal container a landmark or live-region role:

```tsx
// Before
createPortal(<Toasts />, document.body);

// After: a live region is allowed outside landmarks and also announces toasts
createPortal(
  <div role="status" aria-live="polite"><Toasts /></div>,
  document.body
);
```

```tsx
// A standalone cookie banner as a labeled region
<section aria-label="Cookie consent">...</section>
```

## Common false positives

- **Pages that are intentionally minimal**, such as a single embedded widget or a test fixture, may legitimately have no landmarks.
- **Content inside an iframe** is judged by whether the iframe itself sits inside a landmark.
- **Hidden content** that is not exposed to screen readers is ignored, so an issue usually means the element really is visible.

## How to verify

Use a landmarks extension that outlines regions on the page, and confirm everything visible is inside a highlighted region. With a screen reader, step through landmarks and check nothing important is skipped. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [axe rule: region](https://dequeuniversity.com/rules/axe/4.13/region)
