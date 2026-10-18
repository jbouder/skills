---
id: landmark-no-duplicate-banner
title: The page has more than one banner landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

The page contains two or more banner landmarks. A banner is the site-wide header, created by a `<header>` that is not inside `<article>`, `<aside>`, `<main>`, `<nav>` or `<section>`, or by any element with `role="banner"`. A page should have at most one. With two, screen reader users hear "banner" twice in the landmarks list and cannot tell which one is the real site header.

Typical causes are a second body-level `<header>` used for a hero area or a sticky mobile bar, or a component that adds `role="banner"` to its own heading area. Only banners exposed to screen readers are counted, so one hidden with `hidden` or `display: none` is ignored.

## Who it affects

- Screen reader users navigating by landmarks.
- Users of landmark navigation extensions.

## How to fix

Keep a single site header. For other header-like areas, use a `<div>`, or put the `<header>` inside the `<section>` or `<article>` it belongs to so it is no longer a banner.

```html
<!-- Before: two body-level headers -->
<header>Logo and nav</header>
<header class="hero"><h1>Welcome</h1></header>
<main>...</main>

<!-- After: the hero belongs to main -->
<header>Logo and nav</header>
<main>
  <div class="hero"><h1>Welcome</h1></div>
</main>
```

```tsx
// Before: desktop and mobile headers, the inactive one hidden only with opacity
<header className="desktop-only">...</header>
<header className="mobile-only">...</header>

// After: one header with responsive content inside it
<header>
  <DesktopNav className="hidden md:flex" />
  <MobileNav className="md:hidden" />
</header>
```

If you must render two variants, hide the inactive one with `display: none` (for example Tailwind `hidden`) so it is removed from the accessibility tree, not with `opacity` or off-screen positioning.

## Common false positives

- **Headers inside articles or sections**, such as a card header, are not banners and are not counted.
- **Content inside iframes** is a separate document and does not count toward the parent page.

## How to verify

Open a landmarks list with a screen reader or browser extension and confirm "banner" appears exactly once. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [axe rule: landmark-no-duplicate-banner](https://dequeuniversity.com/rules/axe/4.13/landmark-no-duplicate-banner)
