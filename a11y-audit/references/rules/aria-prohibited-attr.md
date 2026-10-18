---
id: aria-prohibited-attr
title: aria-label or aria-labelledby is used on an element that cannot be named
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

Some roles do not support an accessible name. That includes plain `<div>` and `<span>` elements with no role, elements with `role="presentation"` or `role="none"`, and text-level roles such as `paragraph`, `strong`, `emphasis`, `code`, `mark`, `caption`, `subscript`, and `superscript`. On these, `aria-label` and `aria-labelledby` are prohibited, and screen readers either ignore the label or handle it inconsistently.

axe reports two outcomes:

- **Violation** when the element has no text content of its own, so the label is the only information and it is likely to be lost entirely. A typical case is `<span aria-label="Warning"></span>` wrapping an icon.
- **Needs review** when the element has visible text, so the label may simply be redundant.

## Who it affects

- Screen reader users, who miss the information in the label, such as what an icon means.
- Voice control users, when the label was meant to give a control its name.

## How to fix

Decide what the element really is and give it a role that supports a name, or replace the label with real text.

An icon that conveys meaning should be an image:

```html
<!-- Before -->
<span class="icon-warning" aria-label="Warning"></span>

<!-- After -->
<span class="icon-warning" role="img" aria-label="Warning"></span>
```

If the element is a region or group, use the matching landmark or role:

```html
<!-- Before -->
<div aria-label="Order summary">...</div>

<!-- After -->
<section aria-label="Order summary">...</section>
```

If the label is meant as extra text, make it visually hidden text instead:

```tsx
// Before
<span aria-label="3 unread messages">3</span>

// After
<span>
  3<span className="sr-only"> unread messages</span>
</span>
```

The `sr-only` class is the standard visually hidden pattern (Tailwind includes it).

## Common false positives

- **Labels that only repeat the visible text** appear as needs review. Remove the redundant `aria-label`; nothing is lost.
- **Elements that are meant to be interactive** but have no role, such as a clickable `<div>`, should become a `<button>` or link rather than getting a role added.

## How to verify

Select the element in the DevTools Accessibility pane and confirm it has a role that supports a name, and that the computed Name is what you expect. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [APG: Providing accessible names and descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)
- [axe rule: aria-prohibited-attr](https://dequeuniversity.com/rules/axe/4.13/aria-prohibited-attr)
