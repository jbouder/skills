---
id: meta-viewport-large
title: The viewport meta tag limits how far users can zoom in
wcag: []
level: best-practice
impact: minor
---

## The problem

The `<meta name="viewport">` tag sets a `maximum-scale` below `5`, which caps how far users can pinch-zoom on mobile. A cap of 2 or more satisfies the WCAG minimum, but many low-vision users need to zoom further than that, so axe recommends allowing at least 500%. Values below 2 are reported by the stricter `meta-viewport` rule instead.

## Who it affects

- People with low vision who need high magnification to read text or identify icons.
- Users reading dense content, such as tables or small print, on a small screen.

## How to fix

Remove `maximum-scale` entirely, or set it to 5 or higher.

```html
<!-- Before: zoom capped at 300% -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3">

<!-- After -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

```tsx
// Next.js viewport config
// Before
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 3 };
// After
export const viewport = { width: "device-width", initialScale: 1 };
```

## Common false positives

- **Canvas or map apps** that implement their own zoom sometimes cap browser zoom on purpose. The page text and controls outside the canvas should still be zoomable, so treat it as a real issue unless the app offers an equivalent.

## How to verify

Inspect the viewport tag and confirm there is no `maximum-scale`, or that it is 5 or higher. On a phone or device emulator, pinch-zoom as far as possible and confirm the page keeps scaling. Re-run the audit and confirm the rule no longer fires.

## References

- [MDN: the viewport meta tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)
- [axe rule: meta-viewport-large](https://dequeuniversity.com/rules/axe/4.13/meta-viewport-large)
