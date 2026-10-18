---
id: aria-required-attr
title: An element with an ARIA role is missing an attribute that role requires
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

Some ARIA roles cannot work without a specific state or property. axe found an element with such a role that is missing it. Common cases:

- `role="checkbox"`, `role="switch"`, `role="radio"`, or `role="menuitemcheckbox"` without `aria-checked`.
- `role="slider"`, `role="scrollbar"`, `role="meter"`, or a focusable `role="separator"` without `aria-valuenow`.
- `role="combobox"` without `aria-expanded` (and `aria-controls` when it has a popup).
- `role="heading"` without `aria-level`.

Without the required attribute, assistive technology cannot report the widget's state: a checkbox that is never "checked" or "not checked", or a slider with no value. The failure message lists exactly which attributes are missing.

## Who it affects

- Screen reader users, who cannot tell the widget's current state or value.
- Voice control and switch users, whose tools rely on the same state information.

## How to fix

The best fix is to use the native element, which exposes its state automatically. If you keep the custom widget, add the required attribute and update it whenever the state changes.

```html
<!-- Before -->
<div role="checkbox" tabindex="0">Email me updates</div>

<!-- After: native -->
<label><input type="checkbox" name="updates"> Email me updates</label>

<!-- After: custom, with required state -->
<div role="checkbox" tabindex="0" aria-checked="false">Email me updates</div>
```

```tsx
// Before
<button role="switch" onClick={toggle}>Dark mode</button>

// After: aria-checked tracks the real state
<button role="switch" aria-checked={enabled} onClick={toggle}>Dark mode</button>
```

```html
<!-- Before -->
<div role="heading">Billing</div>

<!-- After: use a real heading -->
<h2>Billing</h2>
```

Remember to also handle keyboard interaction for custom widgets. Space should toggle a checkbox or switch, and arrow keys should move a slider. The WAI-ARIA Authoring Practices patterns list the expected keys for each role.

## Common false positives

- **Values bound after render**: if the attribute is set in an effect after the first render, axe may scan before it exists. Set it during render instead.

## How to verify

Select the element in the DevTools Accessibility pane and confirm the state (Checked, Value, Expanded, Level) appears and changes when you interact with it. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [APG: Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [axe rule: aria-required-attr](https://dequeuniversity.com/rules/axe/4.13/aria-required-attr)
