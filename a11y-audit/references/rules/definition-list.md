---
id: definition-list
title: A description list contains elements that don't belong in it
wcag: [1.3.1]
level: A
impact: serious
---

## The problem

A `<dl>` (description list) is for name-value groups, such as terms and definitions or labels and values in a details panel. It may only directly contain `<dt>` and `<dd>` elements, `<div>` elements that wrap a `<dt>`/`<dd>` group, and `<script>` or `<template>`. axe found one of two problems:

- The `<dl>` has a direct child that is not allowed, such as a `<p>`, `<span>`, `<li>`, or a heading.
- The `<dl>` is not empty but does not have at least one `<dt>` followed by at least one `<dd>`, for example a `<dd>` with no `<dt>` before it.

When the structure is invalid, screen readers may not announce it as a list, may report the wrong number of items, or may not associate each value with its term.

## Who it affects

- Screen reader users, who lose the pairing between each term and its description.

## How to fix

Keep only `<dt>`, `<dd>`, and grouping `<div>`s as direct children, and make sure each group starts with a `<dt>`.

```html
<!-- Before -->
<dl>
  <h3>Shipping</h3>
  <dd>Standard, 3 to 5 days</dd>
  <p>Ships from Ohio</p>
</dl>

<!-- After -->
<h3>Shipping</h3>
<dl>
  <dt>Method</dt>
  <dd>Standard, 3 to 5 days</dd>
  <dt>Ships from</dt>
  <dd>Ohio</dd>
</dl>
```

Wrapping each pair in a `<div>` is valid and handy for styling:

```tsx
<dl className="grid grid-cols-2 gap-2">
  {fields.map((f) => (
    <div key={f.key} className="contents">
      <dt>{f.label}</dt>
      <dd>{f.value}</dd>
    </div>
  ))}
</dl>
```

Fragments are fine, since they render nothing. Wrappers such as `<span>` or `<li>` are not, and headings belong before the list, not inside it.

## Common false positives

- **A `<dl>` with a `role` attribute** is not checked by this rule, since it is no longer treated as a description list.

## How to verify

Inspect the `<dl>` in the DevTools Elements panel and confirm every direct child is a `<dt>`, `<dd>`, or a `<div>` containing them. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [MDN: the dl element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dl)
- [axe rule: definition-list](https://dequeuniversity.com/rules/axe/4.13/definition-list)
