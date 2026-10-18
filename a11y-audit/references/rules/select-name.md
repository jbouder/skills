---
id: select-name
title: A dropdown has no accessible name
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

A `<select>` element has no label, so screen readers announce something like "combo box, Canada" with no indication of what the choice is for. The first option is often used as a fake label ("Choose a country"), but that text disappears from the name as soon as the user selects something. axe accepts a wrapping `<label>`, a `<label for>` matching the select's `id`, `aria-label`, `aria-labelledby` or a `title`. It fails if the only `<label for>` is hidden with `display: none` or `visibility: hidden`.

## Who it affects

- Screen reader users, who cannot tell what the dropdown controls.
- Voice control users, who cannot say "click Country" to open it.
- People with cognitive disabilities, who lose context once the placeholder option is replaced.

## How to fix

Add a visible `<label>` connected by `for` and `id`. This also makes the label clickable.

```html
<!-- Before -->
<select id="country">
  <option value="">Choose a country</option>
  <option>Canada</option>
</select>

<!-- After -->
<label for="country">Country</label>
<select id="country" name="country">
  <option value="">Choose a country</option>
  <option>Canada</option>
</select>
```

```tsx
// Before
<select value={sort} onChange={(e) => setSort(e.target.value)}>...</select>
// After: useId keeps the id unique if the component renders twice
function SortSelect({ sort, setSort }: Props) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Sort by</label>
      <select id={id} value={sort} onChange={(e) => setSort(e.target.value)}>...</select>
    </>
  );
}
```

If the design truly has no room for visible text, use `aria-label="Sort by"`, but a visible label is better for everyone.

## Common false positives

- **Labels hidden on purpose** with `display: none` are not exposed, so they do fail. Use a visually hidden class (`sr-only`) that keeps the text in the accessibility tree instead.
- **Custom dropdowns** built from `<div>`s are not checked by this rule. They need their own audit.

## How to verify

Click the label text and confirm focus moves to the dropdown. In the DevTools Accessibility pane, confirm the select's name is the label text. With a screen reader, tab to it and confirm the label is announced. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: select-name](https://dequeuniversity.com/rules/axe/4.13/select-name)
