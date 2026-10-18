---
id: aria-roles
title: An element has a role value that is not a valid ARIA role
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

axe found a `role` attribute whose value is not a real, usable ARIA role. This covers three cases:

- **Invalid or misspelled roles**, such as `role="btn"`, `role="dropdown"`, `role="modal"`, or `role="datepicker"`.
- **Abstract roles**, such as `widget`, `input`, `landmark`, `command`, `section`, or `structure`. These exist only to organize the ARIA specification and must never be used on elements.
- **Unsupported roles** that assistive technologies do not recognize.

Browsers ignore a role they do not understand, so the element falls back to its native role (often a generic `<div>`), and anything you built on top of that role is lost.

## Who it affects

- Screen reader users, who get no role announced for what may be an important control.
- Voice control and switch users, who cannot find the element by its type.

## How to fix

Replace the value with the correct ARIA role, or better, with the native HTML element that has that role built in.

```html
<!-- Before -->
<div role="btn" tabindex="0">Save</div>
<div role="modal">...</div>

<!-- After -->
<button type="button">Save</button>
<div role="dialog" aria-modal="true" aria-labelledby="dlg-title">...</div>
```

```tsx
// Before: abstract role
<div role="input" contentEditable />

// After
<textarea aria-label="Notes" />
```

A space-separated list of roles is allowed as a fallback list, and the browser uses the first one it supports. Make sure at least the first is valid.

## Common false positives

- **Roles from newer specs**: if you are using a role from a recent ARIA draft, axe may not recognize it yet. Prefer an established role until support is broad.

## How to verify

Select the element in the DevTools Accessibility pane and confirm the computed role is the one you intended, not `generic`. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [MDN: WAI-ARIA roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles)
- [axe rule: aria-roles](https://dequeuniversity.com/rules/axe/4.13/aria-roles)
