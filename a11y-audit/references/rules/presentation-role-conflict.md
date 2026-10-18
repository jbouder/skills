---
id: presentation-role-conflict
title: An element marked as decorative is still exposed to assistive technology
wcag: []
level: best-practice
impact: minor
---

## The problem

An element has `role="none"`, `role="presentation"`, or is an `<img alt="">`, which tells assistive technology to ignore its semantics. But it also has something that forces browsers to expose it anyway: it is focusable (a `tabindex`, or it is natively focusable like a button) or it carries a global ARIA attribute such as `aria-label`, `aria-describedby` or `aria-live`. When that happens, browsers ignore the presentational role and screen readers announce the element's original role, so the result is inconsistent across browsers and screen readers.

## Who it affects

- Screen reader users, who may hear an unexpected "image" or "table" announcement, or land on a focus stop with no meaning.
- Keyboard users, who get a tab stop on something that was meant to be decorative.

## How to fix

Decide whether the element is decorative or meaningful, and make the markup agree.

If it is decorative, remove the focusability and the ARIA attributes:

```html
<!-- Before -->
<img src="/divider.png" alt="" tabindex="0" aria-label="divider">

<!-- After -->
<img src="/divider.png" alt="">
```

If it is meaningful, remove the presentational role and give it a proper name:

```html
<!-- Before -->
<img src="/chart.png" role="presentation" aria-describedby="chart-desc">

<!-- After -->
<img src="/chart.png" alt="Revenue by quarter, 2025" aria-describedby="chart-desc">
```

```tsx
// Before: a layout table that is also focusable
<table role="presentation" tabIndex={0}>...</table>
// After
<table role="presentation">...</table>
```

## Common false positives

- **Component libraries** sometimes add `tabindex` or `aria-hidden` to icon wrappers that also have `role="presentation"`. The fix still belongs in your usage or a wrapper, but check whether the library has a prop to turn it off.

## How to verify

In the DevTools Accessibility pane, confirm the element shows as ignored or with no role when decorative, or with its proper role and name when meaningful. Tab through the page and confirm decorative elements never receive focus. Re-run the audit and confirm the rule no longer fires.

## References

- [WAI-ARIA APG: Hiding semantics with the presentation role](https://www.w3.org/WAI/ARIA/apg/practices/hiding-semantics/)
- [axe rule: presentation-role-conflict](https://dequeuniversity.com/rules/axe/4.13/presentation-role-conflict)
