---
id: input-image-alt
title: An image button has no text alternative
wcag: [1.1.1, 4.1.2]
level: A
impact: critical
---

## The problem

An `<input type="image">` has no accessible name. Image inputs are buttons, usually submit buttons, drawn as a picture. Without a text alternative, screen readers announce something like "button" or the image file name, and the user cannot tell what clicking it does.

axe passes the input if it has a non-empty `alt`, `aria-label`, `aria-labelledby`, a non-empty `title`, or an associated `<label>`. Unlike `<img>`, an empty `alt=""` is a failure here, because a button can never be decorative.

## Who it affects

- Screen reader users, who cannot tell what the button does.
- Voice control users, who have no name to speak to activate it.
- Anyone browsing with images off or on a connection where the image fails to load.

## How to fix

Add an `alt` that describes the action, not the image. "Search" is right; "magnifying glass" is not.

```html
<!-- Before -->
<input type="image" src="/icons/search.png">

<!-- After -->
<input type="image" src="/icons/search.png" alt="Search">
```

Usually a `<button>` with an inner image or SVG is easier to style and maintain:

```html
<button type="submit">
  <img src="/icons/search.png" alt="Search">
</button>
```

```tsx
// Before
<input type="image" src={searchIcon} />
// After
<button type="submit" aria-label="Search">
  <SearchIcon aria-hidden="true" />
</button>
```

## Common false positives

- **Image inputs hidden from everyone** with `display: none` or `hidden` are not checked.
- An `alt` that only describes the picture, such as `alt="arrow"`, passes this rule but still fails the user. Review the wording manually.

## How to verify

Inspect the input in the DevTools Accessibility pane and confirm the computed name describes the action. With a screen reader, tab to it and confirm it is announced as a button with that name.

## References

- [Understanding SC 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)
- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: input-image-alt](https://dequeuniversity.com/rules/axe/4.13/input-image-alt)
