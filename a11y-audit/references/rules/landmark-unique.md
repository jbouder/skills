---
id: landmark-unique
title: Two landmarks of the same type have the same name or no name
wcag: []
level: best-practice
impact: moderate
---

## The problem

Two or more landmarks share the same role and the same accessible name, so screen reader users cannot tell them apart. The classic case is two `<nav>` elements with no label: the landmarks list shows "navigation" twice with nothing to distinguish them. The same happens with two `<aside>` elements, two labeled `<section>` elements with identical labels, or two `role="search"` areas.

axe compares the role and the accessible name (from `aria-label`, `aria-labelledby` or `title`) of every visible landmark, case-insensitively. The first duplicate it finds is reported, with the others listed as related nodes.

## Who it affects

- Screen reader users who pick a landmark from a list or jump between landmarks of the same type.
- Voice control users who need distinct names to target regions.

## How to fix

Give each landmark of the same type a unique, short label that describes its purpose. Do not include the role in the label, since the screen reader already announces it ("Primary navigation", not "Primary navigation nav").

```html
<!-- Before: two unlabeled navs -->
<nav>...</nav>
<nav>...</nav>

<!-- After -->
<nav aria-label="Primary">...</nav>
<nav aria-label="Breadcrumb">...</nav>
```

Use `aria-labelledby` when the region already has a visible heading:

```tsx
// Before: every sidebar widget is <aside> with no name
<aside><h2>Related posts</h2>...</aside>
<aside><h2>Popular tags</h2>...</aside>

// After
<aside aria-labelledby="related-heading">
  <h2 id="related-heading">Related posts</h2>
</aside>
<aside aria-labelledby="tags-heading">
  <h2 id="tags-heading">Popular tags</h2>
</aside>
```

If the same navigation is repeated, for example pagination at the top and bottom of a list, either label them differently ("Pagination, top" and "Pagination, bottom") or make one of them a plain `<div>`.

## Common false positives

- **Hidden landmarks** such as a collapsed mobile menu that is still exposed to screen readers will be counted. Hide inactive copies with `display: none` or `hidden` rather than relabeling them.
- **Forms and sections without names** are not landmarks, so axe only checks them when they have an accessible name.

## How to verify

Open the landmarks list in a screen reader or browser extension and confirm every entry of the same type has a distinct name. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [axe rule: landmark-unique](https://dequeuniversity.com/rules/axe/4.13/landmark-unique)
