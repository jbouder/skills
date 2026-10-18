---
id: label
title: A form field has no label
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

An `<input>` or `<textarea>` has no accessible name, so assistive technology cannot say what the field is for. axe passes a field that has a wrapping `<label>`, a `<label for>` pointing at its `id`, `aria-label`, `aria-labelledby`, a non-empty `title`, a non-empty `placeholder`, or a presentational role. Hidden inputs, and buttons, which have their own rule, are not checked. `<select>` is covered by `select-name`.

It also fails when the field's explicit `<label>` exists but is hidden with `display: none` or `visibility: hidden`, because that removes the label from the accessibility tree.

The usual causes are a `<label>` whose `for` does not match the input's `id` (often after a component was copied or ids were generated), a visual label built from a `<div>` or `<span>`, or a field labeled only by an icon.

## Who it affects

- Screen reader users, who hear "edit text, blank" and have to guess what to type.
- Voice control users, who cannot say "click Email" to focus the field.
- Everyone with a pointer: a proper `<label>` makes the label text a click target for the field.

## How to fix

Use a real `<label>` tied to the field. Either wrap the field, or match `for` to the field's `id`.

```html
<!-- Before: looks labeled, but nothing connects them -->
<span class="label">Email</span>
<input type="email" id="email">

<!-- After: explicit association -->
<label for="email">Email</label>
<input type="email" id="email" autocomplete="email">

<!-- After: implicit association -->
<label>Email <input type="email" autocomplete="email"></label>
```

In React, use `htmlFor` and generate a unique id so reused components never collide:

```tsx
function TextField({ label, ...props }: { label: string } & InputProps) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
    </>
  );
}
```

To hide a label visually, use a visually hidden (`sr-only`) class, not `display: none`. Do not rely on `placeholder` as the label: it passes this rule but disappears as soon as the user types, and often has poor contrast.

## Common false positives

- **Fields named by `title` or `placeholder`** pass this rule but are weak labels. See `label-title-only`.
- **Inputs inside custom components** may get a label from `aria-labelledby` that points into a shadow root or another frame, which the browser cannot resolve. Move the label into the same tree.

## How to verify

Click the label text and confirm focus moves to the field. Inspect the field in the DevTools Accessibility pane and confirm the computed name matches the visible label. With a screen reader, tab to the field and confirm the label is announced.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: label](https://dequeuniversity.com/rules/axe/4.13/label)
