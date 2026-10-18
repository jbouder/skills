---
id: landmark-complementary-is-top-level
title: An aside landmark is nested inside another landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

An `<aside>` or `role="complementary"` element is nested inside another landmark other than `<main>`, for example inside a `<nav>`, `<header>`, `<footer>` or a labeled `<section>`. Complementary landmarks are meant to be supporting content that screen reader users can find from the landmarks list, and nesting them in unrelated landmarks clutters that structure.

An aside inside `<main>` is allowed and does not fail. This rule is **deprecated** in axe 4.13 and does not run by default, so you will only see it if the scanner enables it explicitly. Treat it as low priority.

## Who it affects

- Screen reader users who browse the page by landmarks.

## How to fix

Move the aside so it is either a top-level sibling of `<main>`, or inside `<main>`. If the content is not really supplementary, use a plain `<div>` instead of `<aside>`.

```html
<!-- Before: aside nested in the footer landmark -->
<footer>
  <aside>Related links</aside>
</footer>

<!-- After: aside is top level; or make it a plain div -->
<main>...</main>
<aside aria-label="Related links">...</aside>
<footer>...</footer>
```

```tsx
// Before
<nav aria-label="Primary">
  <aside><PromoBanner /></aside>
</nav>

// After
<nav aria-label="Primary">...</nav>
<aside aria-label="Promotions"><PromoBanner /></aside>
```

## Common false positives

- **Asides inside main** are explicitly allowed and never fail.
- Because the rule is deprecated, its results may disagree with newer guidance. If the structure reads well in a screen reader landmarks list, it is acceptable to leave it.

## How to verify

Open a landmarks list with a screen reader or browser extension and confirm the complementary landmark is listed at the top level or inside main. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [axe rule: landmark-complementary-is-top-level](https://dequeuniversity.com/rules/axe/4.13/landmark-complementary-is-top-level)
