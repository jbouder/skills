---
id: input-button-name
title: An input button has no text for screen readers to announce
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

An `<input type="button">`, `<input type="submit">` or `<input type="reset">` has no accessible name. These inputs get their visible label from the `value` attribute. A `type="button"` with no `value` is an empty, unlabeled box. A submit or reset button normally falls back to the browser's default "Submit" or "Reset", but setting `value=""` removes that default and leaves it nameless.

axe passes the button if it has a non-empty `value`, `aria-label`, `aria-labelledby`, a non-empty `title`, a wrapping or associated `<label>`, or a presentational role.

## Who it affects

- Screen reader users, who hear only "button" with no idea what it does.
- Voice control users, who cannot activate a control that has no name to speak.

## How to fix

Put the label in `value`. Better still, use a `<button>` element, which can hold text, icons and markup.

```html
<!-- Before -->
<input type="button" onclick="addToCart()">
<input type="submit" value="">

<!-- After: label in value -->
<input type="button" value="Add to cart" onclick="addToCart()">
<input type="submit" value="Place order">

<!-- After: native button element -->
<button type="button" onclick="addToCart()">Add to cart</button>
```

```tsx
// Before
<input type="submit" value={label} /> {/* label is sometimes "" */}
// After
<button type="submit">{label || "Submit"}</button>
```

If a design really needs an icon-only button, use a `<button>` with an `aria-label` that names the action.

## Common false positives

- **Buttons hidden from everyone** with `display: none` or `hidden` are not checked. If one is flagged, it is reachable by assistive technology.
- A name set only through `title` passes this rule, but `title` is not shown on touch devices or to keyboard users. Prefer visible text.

## How to verify

Inspect the input in the DevTools Accessibility pane and confirm the computed name describes the action. With a screen reader, tab to the button and confirm it is announced with its label.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: input-button-name](https://dequeuniversity.com/rules/axe/4.13/input-button-name)
