---
id: duplicate-id-aria
title: An id used by a label or ARIA reference appears more than once on the page
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

Labels and ARIA attributes such as `<label for>`, `aria-labelledby`, `aria-describedby`, and `aria-controls` connect elements by `id`. axe found an `id` that is referenced this way but is used by more than one element. When `id`s collide, the browser uses the first match in the document, so a field can end up labeled or described by text from a completely different part of the page.

This is very common in component-based apps: a component with a hard-coded `id` is rendered several times, for example in a list of cards or a repeated form row. axe reports this rule as needs review.

## Who it affects

- Screen reader users, who hear the wrong label or description, or none.
- Voice control users, when a control's name comes from the wrong element.

## How to fix

Make every referenced `id` unique. In React, generate them with `useId()` instead of hard-coding them.

```html
<!-- Before: two fields share id="email" -->
<label for="email">Work email</label>
<input id="email" type="email">
<label for="email">Personal email</label>
<input id="email" type="email">

<!-- After -->
<label for="work-email">Work email</label>
<input id="work-email" type="email">
<label for="personal-email">Personal email</label>
<input id="personal-email" type="email">
```

```tsx
// Before: every instance renders id="hint"
function Field({ label, hint }: { label: string; hint: string }) {
  return (
    <label>
      {label}
      <input aria-describedby="hint" />
      <span id="hint">{hint}</span>
    </label>
  );
}

// After
function Field({ label, hint }: { label: string; hint: string }) {
  const hintId = useId();
  return (
    <label>
      {label}
      <input aria-describedby={hintId} />
      <span id={hintId}>{hint}</span>
    </label>
  );
}
```

## Common false positives

- **Duplicates inside separate shadow roots** are isolated from each other and do not collide. axe evaluates within each root.
- **One copy hidden with CSS** (for example, desktop and mobile versions of the same form) still collides, because the browser still resolves to the first match. Render only one copy.

## How to verify

In the DevTools console, run `document.querySelectorAll('#the-id').length` for the flagged `id` and confirm it returns 1. In the Accessibility pane, confirm the field's Name and Description come from the right text. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: duplicate-id-aria](https://dequeuniversity.com/rules/axe/4.13/duplicate-id-aria)
