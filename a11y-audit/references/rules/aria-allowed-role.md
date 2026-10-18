---
id: aria-allowed-role
title: An element has a role that is not allowed on that HTML element
wcag: []
level: best-practice
impact: minor
---

## The problem

HTML elements come with built-in semantics, and the ARIA in HTML specification limits which `role` values each element may be given. axe found a role that is not permitted on that element, such as `<ul role="navigation">`, `<h2 role="button">`, or `<input type="text" role="button">`. The role overrides the element's native meaning, which usually creates a mismatch: a heading that disappears from the heading list, or a text field announced as a button that still behaves like a text field.

Redundant roles that match the element's implicit role, such as `<button role="button">`, are not flagged by this rule.

## Who it affects

- Screen reader users, who hear one thing announced while the element behaves like another.
- People navigating by headings, lists, or landmarks, when an override removes the element from those lists.

## How to fix

Use the element that matches the role you want, or wrap rather than override.

```html
<!-- Before: the list loses its list semantics -->
<ul role="navigation">
  <li><a href="/">Home</a></li>
</ul>

<!-- After: landmark wraps the list -->
<nav aria-label="Main">
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>
```

```html
<!-- Before: heading that acts as a button -->
<h2 role="button" onclick="toggle()">Shipping</h2>

<!-- After: keep the heading, put a real button inside it -->
<h2>
  <button type="button" aria-expanded="false">Shipping</button>
</h2>
```

```tsx
// Before
<input type="text" role="button" readOnly value="Choose a date" onClick={open} />

// After
<button type="button" onClick={open}>Choose a date</button>
```

## Common false positives

- **Hidden elements**: axe checks them too and reports them as needs review, because the role becomes a problem as soon as the element is shown. Fix them anyway if they are ever displayed.
- **Component libraries** sometimes set roles you cannot change directly. Check the library's documentation for a prop that changes the rendered element.

## How to verify

Inspect the element in the DevTools Accessibility pane and confirm its computed role matches how it behaves. Re-run the audit and confirm the rule no longer fires.

## References

- [ARIA in HTML: allowed roles per element](https://www.w3.org/TR/html-aria/)
- [APG: Read Me First (no ARIA is better than bad ARIA)](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
- [axe rule: aria-allowed-role](https://dequeuniversity.com/rules/axe/4.13/aria-allowed-role)
