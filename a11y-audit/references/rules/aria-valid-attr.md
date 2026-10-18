---
id: aria-valid-attr
title: An attribute starting with aria- is not a real ARIA attribute
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

axe found an attribute that starts with `aria-` but is not defined in the ARIA specification. Browsers silently ignore it, so whatever it was meant to do never happens. Almost always this is a typo or an invented name:

- `aria-labeledby` (one "l") instead of `aria-labelledby`. This is the most common one.
- `aria-role` instead of `role`.
- `aria-hide` or `aria-hiden` instead of `aria-hidden`.
- `aria-description-by` instead of `aria-describedby`.
- `aria-type`, `aria-text`, or other made-up names.

The failure message lists the invalid attribute name.

## Who it affects

- Screen reader users, who miss the label, description, or state the attribute was meant to provide.

## How to fix

Correct the spelling, or replace the made-up attribute with the real mechanism.

```html
<!-- Before -->
<input id="q" aria-labeledby="search-label">
<div aria-role="navigation">...</div>

<!-- After -->
<input id="q" aria-labelledby="search-label">
<nav>...</nav>
```

```tsx
// Before
<button aria-hide="true">...</button>

// After
<button aria-hidden="true" tabIndex={-1}>...</button>
```

TypeScript does not catch these, because JSX allows any hyphenated attribute name. Add the `jsx-a11y/aria-props` ESLint rule (or the equivalent Biome rule, `useValidAriaProps`) to catch typos at lint time.

If you need to store custom data on an element, use a `data-*` attribute, not an invented `aria-*` one.

## Common false positives

- **Very new ARIA attributes** may not be recognized by axe yet. Check the attribute against the current ARIA specification before ignoring the result.

## How to verify

Search the codebase for the misspelled name (for example `aria-labeledby`) and fix every occurrence. In the DevTools Accessibility pane, confirm the label or state now appears. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [MDN: ARIA states and properties](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes)
- [axe rule: aria-valid-attr](https://dequeuniversity.com/rules/axe/4.13/aria-valid-attr)
