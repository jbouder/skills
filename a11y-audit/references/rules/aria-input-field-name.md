---
id: aria-input-field-name
title: A custom input field has no accessible name
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

axe found an element with `role="combobox"`, `listbox`, `searchbox`, `slider`, `spinbutton`, or `textbox` that has no accessible name. Screen readers announce the role ("edit text", "slider") but not what the field is for, so the user cannot tell what to enter.

Unlike buttons, these roles do not take their name from their own content, and a nearby visual label is not connected automatically. The name must come from `aria-labelledby`, `aria-label`, or `title`. Native `<input>`, `<select>`, and `<textarea>` elements are covered by the `label` and `select-name` rules instead.

## Who it affects

- Screen reader users, who reach an unlabeled field and have to guess what it expects.
- Voice control users, who cannot say the field's name to move to it.

## How to fix

Prefer a native form control with a `<label>`. If you need the custom widget, connect its visible label with `aria-labelledby`.

```html
<!-- Before -->
<span>Volume</span>
<div role="slider" tabindex="0" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"></div>

<!-- After: native control -->
<label for="volume">Volume</label>
<input type="range" id="volume" min="0" max="100" value="40">

<!-- After: custom control, labeled -->
<span id="volume-label">Volume</span>
<div role="slider" tabindex="0" aria-labelledby="volume-label"
     aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"></div>
```

```tsx
// Before
<div role="listbox" tabIndex={0}>{options}</div>

// After
const labelId = useId();
<>
  <span id={labelId}>Country</span>
  <div role="listbox" tabIndex={0} aria-labelledby={labelId}>{options}</div>
</>
```

Use `aria-label` only when there is no visible label, and keep it consistent with any visible text.

## Common false positives

- **A combobox that contains a labeled `<input>`** is not checked by this rule, because the input carries the name.
- **A listbox popup of a combobox** is skipped as well. Make sure the combobox itself is named.

## How to verify

Select the field in the DevTools Accessibility pane and confirm the computed Name matches its visible label. With a screen reader, tab to it and listen. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [APG: Providing accessible names](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)
- [axe rule: aria-input-field-name](https://dequeuniversity.com/rules/axe/4.13/aria-input-field-name)
