---
id: aria-treeitem-name
title: A tree item has no accessible name
wcag: []
level: best-practice
impact: serious
---

## The problem

axe found an element with `role="treeitem"` that has no accessible name. In a tree view, such as a file browser or nested navigation, each item is announced by its name along with its level and expanded state. Without a name, a screen reader says only "tree item, level 2, collapsed", and the user cannot tell which folder or page it is.

Common causes are items whose label is an icon only, or items whose text sits in a sibling element outside the `treeitem`.

## Who it affects

- Screen reader users, who cannot identify items while arrowing through the tree.
- Voice control users, who cannot select an item by name.

## How to fix

Put the item's text inside the `treeitem` element, or reference it with `aria-labelledby`.

```html
<!-- Before: icon only, no text -->
<ul role="tree" aria-label="Files">
  <li role="treeitem" aria-expanded="false" tabindex="0">
    <span class="icon-folder"></span>
  </li>
</ul>

<!-- After -->
<ul role="tree" aria-label="Files">
  <li role="treeitem" aria-expanded="false" tabindex="0">
    <span>src</span>
    <ul role="group">
      <li role="treeitem" tabindex="-1">index.ts</li>
    </ul>
  </li>
</ul>
```

```tsx
<li role="treeitem" aria-expanded={open} aria-selected={selected} tabIndex={focused ? 0 : -1}>
  <FolderIcon aria-hidden="true" />
  <span>{node.name}</span>
  {open && <ul role="group">{children}</ul>}
</li>
```

Note that a `treeitem` takes its name from all of its text content, including nested items. If that makes names too long, wrap the label in an element with an `id` and point `aria-labelledby` at it.

## Common false positives

- **Lazy-loaded trees** may scan before labels are rendered. Re-scan once the tree has loaded.

## How to verify

Select a tree item in the DevTools Accessibility pane and confirm its computed Name. With a screen reader, arrow through the tree and listen for each item's name. Re-run the audit and confirm the rule no longer fires.

## References

- [APG: Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- [axe rule: aria-treeitem-name](https://dequeuniversity.com/rules/axe/4.13/aria-treeitem-name)
