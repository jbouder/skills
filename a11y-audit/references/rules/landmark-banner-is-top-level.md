---
id: landmark-banner-is-top-level
title: The page header landmark is nested inside another landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

The page's banner landmark, the site-wide header usually holding the logo, site search and primary navigation, sits inside another landmark such as `<main>`, `<nav>`, `<aside>` or a labeled `<section>`. Screen readers present the banner as a top-level stop in their landmarks list. When it is buried inside another landmark, the page structure becomes confusing and users cannot jump straight to the header.

axe only checks elements that actually are the banner. A `<header>` inside `<article>`, `<aside>`, `<main>`, `<nav>` or `<section>` is scoped to that content and is not a banner, so it is ignored. The rule fires for `role="banner"` placed anywhere inside another landmark, or for a body-level `<header>` that sits inside an element with an explicit landmark role such as `<div role="main">`.

## Who it affects

- Screen reader users who navigate by landmarks, for example with the VoiceOver rotor or the NVDA `D` key.
- Users of browser extensions that list landmarks for keyboard navigation.

## How to fix

Make the site header a direct part of the page shell, as a sibling of `<main>` and `<footer>`, not a child of another landmark. Remove `role="banner"` from headers that only belong to one piece of content.

```html
<!-- Before: banner inside the main landmark -->
<div role="main">
  <header>
    <a href="/">Acme</a>
    <nav aria-label="Primary">...</nav>
  </header>
  <h1>Dashboard</h1>
</div>

<!-- After: banner and main are siblings -->
<header>
  <a href="/">Acme</a>
  <nav aria-label="Primary">...</nav>
</header>
<main>
  <h1>Dashboard</h1>
</main>
```

In React this usually happens when a layout component is rendered inside a page component that already wraps everything in `<main>`:

```tsx
// Before: <SiteHeader /> renders <header role="banner"> inside <main>
<main>
  <SiteHeader />
  <Outlet />
</main>

// After: the app shell owns the landmarks
<>
  <SiteHeader />
  <main>
    <Outlet />
  </main>
</>
```

## Common false positives

- **Embedded widgets or third-party snippets** that add their own `role="banner"` may trigger this. Remove the role from the embedded markup rather than restructuring your page.
- **Section headers** are not affected. A plain `<header>` inside `<article>` or `<section>` is not a banner and axe does not test it.

## How to verify

Open the browser DevTools Accessibility tree, or a landmarks extension, and confirm the banner appears at the top level, not nested under main or another region. With a screen reader, open the landmarks list and check that "banner" is listed on its own. Re-run the audit and confirm the rule no longer fires.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [axe rule: landmark-banner-is-top-level](https://dequeuniversity.com/rules/axe/4.13/landmark-banner-is-top-level)
