---
id: listitem
title: A list item isn't inside a list
wcag: [1.3.1]
level: A
impact: serious
---

## The problem

An `<li>` element's parent is not a `<ul>`, `<ol>`, `<menu>`, or an element with `role="list"`. A list item outside a list has no list to belong to, so screen readers cannot announce how many items there are or where the list starts and ends.

This happens when a component renders `<li>` elements but the parent component forgets the `<ul>`, when a `<div>` wrapper is inserted between the list and its items, or when the parent `<ul>` has its role changed, such as `<ul role="navigation">`. In that last case axe reports that the parent's role is not `list`.

## Who it affects

- Screen reader users, who lose the item count and list navigation, or hear stray "bullet" announcements.
- Braille display users, who get list markers from the structure.

## How to fix

Make sure every `<li>` is a direct child of a `<ul>` or `<ol>`. Do not wrap items in `<div>` or other elements inside the list.

```html
<!-- Before: no list element -->
<div class="tags">
  <li>react</li>
  <li>a11y</li>
</div>

<!-- After -->
<ul class="tags">
  <li>react</li>
  <li>a11y</li>
</ul>

<!-- Before: role on the ul removes its list semantics -->
<ul role="navigation"><li><a href="/">Home</a></li></ul>

<!-- After: landmark on a wrapper, list keeps its role -->
<nav><ul><li><a href="/">Home</a></li></ul></nav>
```

In React, components that render `<li>` should document that they must be used inside a list, or render the list themselves:

```tsx
// Before: TagItem renders <li>, used inside a <div>
<div className="tags">{tags.map((t) => <TagItem key={t} tag={t} />)}</div>

// After
<ul className="tags">{tags.map((t) => <TagItem key={t} tag={t} />)}</ul>
```

## Common false positives

- **Parents with `role="none"` or `role="presentation"`** pass this rule, but the list semantics are removed, so check that this was intentional.
- **Items rendered into a portal** or shadow root may lose their parent list in the DOM even though they look correct on screen.

## How to verify

Inspect the `<li>` in DevTools and confirm its direct parent is a `<ul>`, `<ol>` or `<menu>` with no overriding `role`. With a screen reader, confirm the items are announced as part of a list with the correct count.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [axe rule: listitem](https://dequeuniversity.com/rules/axe/4.13/listitem)
