---
id: aria-roledescription
title: aria-roledescription is used on an element without a suitable role
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

`aria-roledescription` replaces the role name a screen reader announces, for example saying "slide" instead of "group". It only works on elements that have a meaningful role. axe found it on an element with no role, or on a generic element such as a plain `<div>`, where screen readers ignore it or announce it inconsistently.

This rule is deprecated in axe and disabled by default, so it only appears if your scan enables it explicitly. The underlying advice still holds.

## Who it affects

- Screen reader users, who may hear a made-up role name with no real semantics behind it, or hear nothing at all.

## How to fix

Give the element a real role first, then add `aria-roledescription` only if the custom name genuinely helps. Never use it to replace the name of a standard widget like "button" or "checkbox"; users rely on those words to know how to interact.

```html
<!-- Before: no role -->
<div aria-roledescription="slide">
  <h3>Quarterly results</h3>
</div>

<!-- After: a named group with a role description -->
<div role="group" aria-roledescription="slide" aria-label="2 of 5">
  <h3>Quarterly results</h3>
</div>
```

```tsx
// Before
<span aria-roledescription="tag">{label}</span>

// After: no custom role description needed
<span className="tag">{label}</span>
```

In most cases the right fix is to delete the attribute. It is intended for a small number of patterns such as carousel slides, and it overrides information users expect to hear.

## Common false positives

- **Supported roles flagged as needs review**: on roles such as `button`, `img`, `checkbox`, `radio`, and `combobox`, axe asks you to confirm the description is actually announced by the screen readers you support.

## How to verify

With a screen reader, navigate to the element and listen for the role description and a sensible name. In the DevTools Accessibility pane, confirm the element has a non-generic role. Re-run the audit with the rule enabled.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [MDN: aria-roledescription](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-roledescription)
- [axe rule: aria-roledescription](https://dequeuniversity.com/rules/axe/4.13/aria-roledescription)
