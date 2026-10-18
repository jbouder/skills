---
id: image-redundant-alt
title: An image's alt text repeats the text right next to it
wcag: []
level: best-practice
impact: minor
---

## The problem

An image's `alt` text is identical to the visible text of the element that contains it, so screen readers announce the same words twice. axe looks for the nearest `button`, `[role="button"]`, `a[href]`, `p`, `li`, `td` or `th` ancestor and flags the image when that ancestor's visible text matches the image's accessible name, ignoring case.

The classic case is a product card link with an icon and a label: "Settings, Settings". It is not a WCAG failure, but it adds noise and makes links and buttons slower to understand.

## Who it affects

- Screen reader users, who hear every label twice.
- Braille display users, who lose limited display space to the duplicate text.

## How to fix

When the adjacent text already says what the image says, the image is decorative in that context. Give it an empty `alt`.

```html
<!-- Before: announced as "Settings, Settings" -->
<a href="/settings">
  <img src="/icons/gear.svg" alt="Settings">
  Settings
</a>

<!-- After: announced as "Settings" -->
<a href="/settings">
  <img src="/icons/gear.svg" alt="">
  Settings
</a>
```

```tsx
// Before
<button>
  <img src={trashIcon} alt="Delete" /> Delete
</button>
// After
<button>
  <img src={trashIcon} alt="" /> Delete
</button>
```

If the image adds information the text does not, write `alt` text that covers only the extra information instead of repeating the label.

## Common false positives

- **Images with `role="none"` or `role="presentation"`** are not flagged.
- The match is exact. If axe fires, the texts really are the same; the only judgment call is whether the image carries extra meaning worth describing.

## How to verify

Inspect the containing link or button in the DevTools Accessibility pane and confirm its computed name contains the label only once. Re-run the audit and confirm the rule no longer fires.

## References

- [MDN: The Image Embed element, accessibility](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#accessibility)
- [axe rule: image-redundant-alt](https://dequeuniversity.com/rules/axe/4.13/image-redundant-alt)
