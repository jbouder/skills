---
id: svg-img-alt
title: An SVG marked as an image has no text alternative
wcag: [1.1.1]
level: A
impact: serious
---

## The problem

An `<svg>` (or an element inside one) has `role="img"`, `role="graphics-document"` or `role="graphics-symbol"`, but no accessible name. The role tells screen readers it is a meaningful image, yet there is nothing to announce, so users hear "image" or "graphic" and nothing more. axe accepts any one of a non-empty `<title>` as a direct child of the element, `aria-label`, `aria-labelledby`, or a `title` attribute.

This often happens with icon components that add `role="img"` by default, and with charts exported from design tools.

## Who it affects

- Screen reader users, who cannot tell what the graphic shows or what an icon button does.
- Voice control users, who have no name to say.

## How to fix

For meaningful SVGs, add a `<title>` as the first child, or an `aria-label`.

```html
<!-- Before -->
<svg role="img" viewBox="0 0 24 24"><path d="..." /></svg>

<!-- After: title child -->
<svg role="img" viewBox="0 0 24 24" aria-labelledby="warn-title">
  <title id="warn-title">Warning</title>
  <path d="..." />
</svg>
```

For decorative SVGs, or icons next to visible text, remove the role and hide the SVG:

```tsx
// Before
<button><svg role="img" viewBox="0 0 24 24"><path d="..." /></svg> Delete</button>
// After: the button text names it, the icon is hidden
<button>
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="..." /></svg>
  Delete
</button>
```

For an icon-only button, put the name on the button and hide the icon:

```tsx
<button aria-label="Delete">
  <TrashIcon aria-hidden="true" />
</button>
```

## Common false positives

- **Empty `<title>` elements** added by build tools such as SVGO or icon libraries count as missing. Fill them or remove the role.
- **Nested graphics** with `role="graphics-symbol"` inside a chart each need their own name. If they are not meaningful individually, remove their role.

## How to verify

In the DevTools Accessibility pane, select the SVG and confirm it has a meaningful name, or is ignored when decorative. With a screen reader, confirm the graphic is announced meaningfully. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)
- [axe rule: svg-img-alt](https://dequeuniversity.com/rules/axe/4.13/svg-img-alt)
