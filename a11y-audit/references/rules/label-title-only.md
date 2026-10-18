---
id: label-title-only
title: A form field is labeled only by a tooltip or description
wcag: []
level: best-practice
impact: serious
---

## The problem

An `<input>`, `<select>` or `<textarea>` has no real label. Its only name comes from a `title` attribute, or the only associated text is linked through `aria-describedby`. A `title` shows up only as a hover tooltip, which touch and keyboard users never see, and a description is not meant to be the field's name.

The field may technically have an accessible name, so it can pass the `label` rule, but sighted users get no persistent visible label and some assistive technologies treat `title` and descriptions inconsistently.

## Who it affects

- Sighted keyboard and touchscreen users, who never see the tooltip and must guess what the field is for.
- People with cognitive or memory disabilities, who rely on a label that stays visible while they type.
- Screen magnifier users, who may not see a tooltip that appears outside the zoomed area.

## How to fix

Add a visible `<label>` associated with the field. Keep `aria-describedby` for hints and errors, not for the name.

```html
<!-- Before -->
<input type="email" title="Email address">

<!-- After -->
<label for="email">Email address</label>
<input type="email" id="email" autocomplete="email">
```

```tsx
// Before
<input type="text" aria-describedby="zip-hint" />
<p id="zip-hint">5-digit ZIP code</p>

// After
const id = useId();
<>
  <label htmlFor={id}>ZIP code</label>
  <input id={id} type="text" aria-describedby={`${id}-hint`} />
  <p id={`${id}-hint`}>5-digit ZIP code</p>
</>
```

If the design truly has no room for a visible label, such as a single search box next to a "Search" button, `aria-label` or `aria-labelledby` pointing at visible text is an acceptable fallback.

## Common false positives

- **Search fields next to a visible "Search" button** may be clear enough in context. Link the field to the button text with `aria-labelledby` to resolve the result properly.
- **Hidden inputs** (`type="hidden"`) are not checked.

## How to verify

Look at the form without hovering: every field should have visible text that says what it is. In the DevTools Accessibility pane, confirm the computed name comes from a label, not from `title`.

## References

- [MDN: The label element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label)
- [axe rule: label-title-only](https://dequeuniversity.com/rules/axe/4.13/label-title-only)
