---
id: list
title: A list contains something other than list items
wcag: [1.3.1]
level: A
impact: serious
---

## The problem

A `<ul>` or `<ol>` has a direct child that is not an `<li>`. Only `<li>`, `<script>` and `<template>` are allowed as direct children. axe reports which children are not allowed, such as `div`, `span`, `a`, `p`, or loose text.

When the structure is broken, screen readers may announce the wrong number of items ("list, 3 items" when 5 are visible), skip content, or stop treating it as a list at all. This usually happens when a component wraps each item in a `<div>`, when a `map()` returns a fragment of links instead of `<li>` elements, or when a heading or divider is dropped between items. It also fires when a child `<li>` has its role overridden, for example `<li role="button">`.

## Who it affects

- Screen reader users, who rely on the item count and list navigation ("list, 5 items", next item, end of list).
- Braille display users, who get list markers from the structure.

## How to fix

Make every direct child an `<li>`. Put wrappers, links and extra content inside the `<li>`, not around it.

```html
<!-- Before: links and a div directly in the list -->
<ul class="nav">
  <a href="/">Home</a>
  <div class="item"><a href="/docs">Docs</a></div>
</ul>

<!-- After -->
<ul class="nav">
  <li><a href="/">Home</a></li>
  <li class="item"><a href="/docs">Docs</a></li>
</ul>
```

```tsx
// Before: the map returns <Link> elements directly
<ul>
  {items.map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}
</ul>

// After
<ul>
  {items.map((item) => (
    <li key={item.id}><Link href={item.href}>{item.label}</Link></li>
  ))}
</ul>
```

If a group needs a heading, put the heading before the list, or split the list into two lists each with its own heading. If the content is not really a list, use a `<div>` instead of a `<ul>`.

## Common false positives

- **Hidden children** such as a `display: none` element are generally ignored, but a visually hidden element that is still in the accessibility tree is not.
- **Lists with an explicit `role`** (for example `<ul role="menu">`) are skipped by this rule; their children are checked by ARIA rules instead.

## How to verify

Inspect the list in DevTools and confirm every direct child is an `<li>`. With a screen reader, move into the list and confirm the announced item count matches what you see.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [axe rule: list](https://dequeuniversity.com/rules/axe/4.13/list)
