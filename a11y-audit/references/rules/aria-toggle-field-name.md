---
id: aria-toggle-field-name
title: A custom checkbox, radio, switch, or option has no accessible name
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

axe found an element with `role="checkbox"`, `radio`, `switch`, `option`, `menuitemcheckbox`, or `menuitemradio` that has no accessible name. A screen reader announces "checkbox, not checked" or "switch, off" without saying what it controls. The visible label next to it is not connected, so it is not read.

Native `<input type="checkbox">` and `<input type="radio">` are covered by the `label` rule. This rule is about custom widgets built with ARIA roles.

## Who it affects

- Screen reader users, who cannot tell what they are turning on or off.
- Voice control users, who cannot say the label to activate the control.

## How to fix

Prefer a native input with a `<label>`. For a custom widget, put the text inside the element, or reference the visible label with `aria-labelledby`.

```html
<!-- Before -->
<span>Email notifications</span>
<button role="switch" aria-checked="false" class="toggle"></button>

<!-- After: native checkbox styled as a switch -->
<label class="switch">
  <input type="checkbox" role="switch"> Email notifications
</label>

<!-- After: custom switch, labeled -->
<span id="email-label">Email notifications</span>
<button role="switch" aria-checked="false" aria-labelledby="email-label" class="toggle"></button>
```

```tsx
// Before
<div role="option" aria-selected={selected}><Flag code={code} /></div>

// After: text content names the option
<div role="option" aria-selected={selected}>
  <Flag code={code} aria-hidden="true" />
  {countryName}
</div>
```

## Common false positives

- **Labels set after render** can be missed if axe scanned before they existed. Re-scan once the page settles.
- **Options inside a combobox popup** are checked only when the popup is open during the scan.

## How to verify

Select the control in the DevTools Accessibility pane and confirm the computed Name matches its visible label. With a screen reader, tab or arrow to it and listen. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [APG: Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
- [axe rule: aria-toggle-field-name](https://dequeuniversity.com/rules/axe/4.13/aria-toggle-field-name)
