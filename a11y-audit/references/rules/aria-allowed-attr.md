---
id: aria-allowed-attr
title: An ARIA attribute is used on an element whose role does not support it
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

Every ARIA attribute is only meaningful for certain roles. axe found an attribute on an element whose role (explicit or implicit) does not support it, such as `aria-checked` on a `<button>`, `aria-expanded` on a plain `<div>`, or `aria-selected` on a link. Browsers ignore unsupported attributes, so the state you are trying to communicate never reaches assistive technology, and the UI looks broken to anyone not looking at the screen.

The failure message lists the offending attribute. This rule also flags attributes that HTML forbids on a specific element, and the deprecated `aria-grabbed` and `aria-dropeffect` (reported as needs review).

## Who it affects

- Screen reader users, who do not hear the state (checked, expanded, selected) the visual design shows.
- Voice control and switch users, whose tools depend on the same role and state information.

## How to fix

Either change the attribute to one the role supports, or change the element to a role that supports the attribute. Prefer a native element that already has the right role.

A toggle button uses `aria-pressed`, not `aria-checked`:

```html
<!-- Before -->
<button aria-checked="true">Bold</button>

<!-- After -->
<button aria-pressed="true">Bold</button>
```

A disclosure trigger needs to be a button, not a generic `<div>`:

```html
<!-- Before -->
<div aria-expanded="false" onclick="toggle()">Details</div>

<!-- After -->
<button type="button" aria-expanded="false" aria-controls="details">Details</button>
<div id="details" hidden>...</div>
```

```tsx
// Before
<a href="#" aria-selected={active}>{label}</a>

// After: aria-current is the right attribute for the current item in a nav
<a href={href} aria-current={active ? "page" : undefined}>{label}</a>
```

If you really are building a tab, option, or other composite widget, give the element the matching role (for example `role="tab"` inside a `role="tablist"`) and follow the WAI-ARIA Authoring Practices pattern for it.

## Common false positives

- **Tree grid rows**: `aria-posinset`, `aria-setsize`, `aria-expanded`, and `aria-level` are allowed on rows inside a `role="treegrid"`. If axe flags them on a `table` or `grid` row, that is the separate `aria-conditional-attr` rule.
- **Deprecated attributes** such as `aria-grabbed` appear as needs review. Remove them; no current screen reader supports them.

## How to verify

Select the element in the DevTools Accessibility pane and confirm the state you set appears under its computed properties. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [ARIA in HTML: allowed ARIA attributes per element](https://www.w3.org/TR/html-aria/)
- [axe rule: aria-allowed-attr](https://dequeuniversity.com/rules/axe/4.13/aria-allowed-attr)
