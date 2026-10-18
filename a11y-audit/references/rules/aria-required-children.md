---
id: aria-required-children
title: A composite ARIA widget is missing the child roles it needs
wcag: [1.3.1]
level: A
impact: critical
---

## The problem

Container roles define a parent-child structure. A `list` must contain `listitem` elements, a `tablist` must contain `tab` elements, a `listbox` must contain `option` elements (or `group`s of them), a `menu` must contain `menuitem`, `menuitemcheckbox`, or `menuitemradio` elements, and a `table` or `grid` must contain `row` elements. axe found a container that either has none of the required children, or has children that are not allowed.

When the structure is broken, screen readers cannot report "tab 2 of 4" or "list, 5 items", and arrow-key navigation built into some screen readers stops working. Common causes are a role on the container but plain buttons or links inside, and an `<li>` between the container and its items. Plain `<div>` and `<span>` wrappers are ignored, but an `<li>` keeps its own `listitem` role, which is not allowed inside a `menu`, `listbox`, or `tablist`.

## Who it affects

- Screen reader users, who lose item counts, positions, and the ability to move between items.

## How to fix

Make every direct child (in the accessibility tree) have an allowed role. Wrapper elements that have their own semantics, such as `<li>`, need `role="none"` or should be removed.

```html
<!-- Before: tabs are plain buttons -->
<div role="tablist">
  <button>Overview</button>
  <button>Settings</button>
</div>

<!-- After -->
<div role="tablist" aria-label="Project">
  <button role="tab" aria-selected="true" aria-controls="p-overview" id="t-overview">Overview</button>
  <button role="tab" aria-selected="false" aria-controls="p-settings" id="t-settings" tabindex="-1">Settings</button>
</div>
```

```html
<!-- Before: each <li> is a listitem sitting between menu and menuitem -->
<ul role="menu">
  <li><a href="/copy" role="menuitem">Copy</a></li>
</ul>

<!-- After: strip the li's semantics -->
<ul role="menu">
  <li role="none"><a href="/copy" role="menuitem">Copy</a></li>
</ul>
```

```tsx
// Before: role="list" on a container of plain divs
<div role="list">{items.map((i) => <div key={i.id}>{i.name}</div>)}</div>

// After: just use a list
<ul>{items.map((i) => <li key={i.id}>{i.name}</li>)}</ul>
```

## Common false positives

- **Empty containers** (an empty list or listbox that will be filled later) are reported as needs review rather than a violation. That is fine if items are added before the user can interact with it.
- **Loading states**: a container with `aria-busy="true"` may omit required children while loading, but still must not contain disallowed roles.

## How to verify

Open the DevTools Accessibility tree and expand the container. Each direct child should show one of the required roles. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [APG: Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [axe rule: aria-required-children](https://dequeuniversity.com/rules/axe/4.13/aria-required-children)
