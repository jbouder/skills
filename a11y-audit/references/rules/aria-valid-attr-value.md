---
id: aria-valid-attr-value
title: An ARIA attribute has a value that is not allowed
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

Each ARIA attribute accepts a specific type of value: `true`/`false`, a number, a token from a fixed list, or the `id` of another element. axe found an attribute with a value it cannot accept. Common examples:

- `aria-expanded="yes"` or `aria-hidden="hidden"` instead of `"true"` or `"false"`.
- `aria-live="loud"` or `aria-haspopup="dropdown"`, which are not valid tokens.
- `aria-labelledby`, `aria-describedby`, or `aria-controls` pointing at an `id` that does not exist on the page (reported as needs review).
- `aria-current="active"`, which browsers treat as `aria-current="true"` (reported as needs review).
- `aria-errormessage` pointing at a hidden element or at a message that is never announced.

When the value is invalid, the browser ignores the attribute or falls back to a default, so the state or relationship you meant to express is lost. The failure message shows the exact attribute and value.

## Who it affects

- Screen reader users, who hear the wrong state, or miss labels and descriptions that never get connected.

## How to fix

Use a value from the attribute's allowed list, and make sure referenced `id`s exist in the DOM when the attribute is set.

```html
<!-- Before -->
<button aria-expanded="yes" aria-controls="menu-1">Menu</button>
<a href="/" aria-current="active">Home</a>

<!-- After -->
<button aria-expanded="true" aria-controls="menu-1">Menu</button>
<ul id="menu-1">...</ul>
<a href="/" aria-current="page">Home</a>
```

In React, pass booleans or the exact token strings, and only reference elements that are actually rendered:

```tsx
// Before: the popup is not in the DOM when closed, so aria-controls points nowhere
<button aria-expanded={open ? "open" : "closed"} aria-controls="filters">Filters</button>
{open && <div id="filters">...</div>}

// After
<button aria-expanded={open} aria-controls={open ? "filters" : undefined}>Filters</button>
{open && <div id="filters">...</div>}
```

Use `useId()` for generated `id`s so the reference and the target always match.

## Common false positives

- **References to content in another shadow root or iframe** cannot be resolved and appear as needs review. ARIA `id` references do not cross those boundaries, so move the label into the same tree.
- **References to elements rendered later**, such as a popup that mounts on open, appear as needs review if the scan ran while it was closed. Only set `aria-controls` when the target exists, as in the example above.

## How to verify

In the DevTools Accessibility pane, confirm the state appears as expected, and that labels and descriptions resolve to the right text. Search the DOM for each referenced `id`. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [MDN: ARIA states and properties](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes)
- [axe rule: aria-valid-attr-value](https://dequeuniversity.com/rules/axe/4.13/aria-valid-attr-value)
