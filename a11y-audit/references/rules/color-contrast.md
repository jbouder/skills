---
id: color-contrast
title: Text doesn't have enough contrast against its background
wcag: [1.4.3]
level: AA
impact: serious
---

## The problem

The text color and the background color behind it are too close in luminance. WCAG 2.2 AA requires a contrast ratio of at least **4.5:1** for normal text and **3:1** for large text, which means 24px and up, or 18.66px and up when bold. axe reports the measured ratio, the two colors it compared, the font size and weight, and the ratio this text needed.

The most common causes are gray placeholder-style text such as `#999` on white, brand colors used for small text, text over a translucent overlay, and disabled-looking styles on elements that are not actually disabled.

## Who it affects

- People with low vision or color-vision deficiency, who may not be able to read the text at all.
- Anyone reading on a phone outdoors, a dim laptop screen, or a projector.
- Older users, since contrast sensitivity drops with age.

## How to fix

Change one of the two colors until the ratio passes. Darkening the text is usually the least disruptive change. Fix it at the design-token level so every use is corrected at once.

```css
/* Before: 2.85:1 on white */
.card-meta { color: #999999; }

/* After: 4.54:1 on white */
.card-meta { color: #767676; }
```

With design tokens or Tailwind, fix the token rather than the one element:

```css
:root {
  --text-muted: #6b6b6b; /* was #9a9a9a */
}
```

```tsx
// Before
<span className="text-gray-400">Updated 3 days ago</span>
// After: gray-600 passes on white
<span className="text-gray-600">Updated 3 days ago</span>
```

For text over images, add a solid or sufficiently opaque scrim behind the text instead of relying on the image being dark.

## Common false positives

- **Truly disabled controls** are exempt. If the element has the `disabled` attribute or `aria-disabled="true"`, the result can be ignored.
- **Logos and incidental text**, such as text inside a decorative photo, are exempt.
- **Gradients, background images, and pseudo-elements** can make axe report the result as "needs review" instead of a violation, because it cannot determine the background. Check those manually.

## How to verify

Use the browser DevTools color picker on the element, which shows the contrast ratio and the AA threshold. Or enter both colors into the WebAIM Contrast Checker. Re-run the audit and confirm the rule no longer fires on that element.

## References

- [Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [axe rule: color-contrast](https://dequeuniversity.com/rules/axe/4.13/color-contrast)
