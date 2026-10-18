---
id: aria-required-parent
title: An ARIA child role is not inside the container role it requires
wcag: [1.3.1]
level: A
impact: critical
---

## The problem

Some roles only make sense inside a specific container. A `listitem` must be in a `list`, a `tab` must be in a `tablist`, an `option` must be in a `listbox` (or a `group` inside one), a `menuitem` must be in a `menu`, `menubar`, or `group`, a `treeitem` must be in a `tree` or `group`, and a `row` must be in a `table`, `grid`, `treegrid`, or `rowgroup`. axe found one of these child roles without its required parent.

Without the parent, screen readers cannot say "tab 1 of 3" or "item 2 of 5", and the element may be announced inconsistently or not at all as part of a widget. This often happens when a component renders items without the container, or when an element with its own role sits in between, such as an `<li>` (role `listitem`) between a `menu` and its `menuitem`s. Plain `<div>` and `<span>` wrappers are ignored.

## Who it affects

- Screen reader users, who lose the context of which group an item belongs to and how many items there are.

## How to fix

Wrap the items in the correct container role, or switch to native elements that already have this structure.

```html
<!-- Before -->
<div>
  <div role="tab" aria-selected="true">Overview</div>
  <div role="tab" aria-selected="false">Settings</div>
</div>

<!-- After -->
<div role="tablist" aria-label="Project">
  <div role="tab" aria-selected="true" tabindex="0">Overview</div>
  <div role="tab" aria-selected="false" tabindex="-1">Settings</div>
</div>
```

```html
<!-- Before -->
<div role="listitem">Apples</div>
<div role="listitem">Pears</div>

<!-- After -->
<ul>
  <li>Apples</li>
  <li>Pears</li>
</ul>
```

A list used as a menu is the classic case, because each `<li>` keeps its `listitem` role:

```tsx
// Before: the parent of each menuitem is a listitem, not the menu
<ul role="menu">
  {actions.map((a) => (
    <li key={a.id}><button role="menuitem" onClick={a.run}>{a.label}</button></li>
  ))}
</ul>

// After: remove the li's semantics so the menu is the parent
<ul role="menu">
  {actions.map((a) => (
    <li key={a.id} role="none"><button role="menuitem" onClick={a.run}>{a.label}</button></li>
  ))}
</ul>
```

## Common false positives

- **Items inside shadow DOM or portals** may be rendered outside their parent in the DOM even though they look nested. Fix the component so the item and container are in the same tree, or reference items with `aria-owns`.

## How to verify

Open the DevTools Accessibility tree and confirm the item's parent node has the required role. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [APG: Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [axe rule: aria-required-parent](https://dequeuniversity.com/rules/axe/4.13/aria-required-parent)
