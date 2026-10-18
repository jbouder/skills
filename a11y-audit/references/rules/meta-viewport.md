---
id: meta-viewport
title: The viewport meta tag blocks users from zooming in
wcag: [1.4.4]
level: AA
impact: moderate
---

## The problem

The `<meta name="viewport">` tag disables or restricts pinch-zoom on mobile browsers. WCAG requires that text can be resized up to 200% without loss of content or function, and on a phone pinch-zoom is the main way people do that. axe fails the tag when it contains `user-scalable=no` (or `user-scalable=0`), or a `maximum-scale` below `2`. axe names the offending property in its message.

This usually comes from an old boilerplate copied to stop iOS from zooming on input focus or to make a web app "feel native."

## Who it affects

- People with low vision, who rely on pinch-zoom to read text and see small controls.
- Older users and anyone reading small text on a phone.

## How to fix

Remove `user-scalable` and `maximum-scale`. The standard viewport tag is all most sites need.

```html
<!-- Before -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

<!-- After -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

In Next.js and similar frameworks, fix it in the viewport config rather than the HTML:

```tsx
// Before
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
// After
export const viewport = { width: "device-width", initialScale: 1 };
```

If you added the restriction to stop iOS Safari from zooming when a form field gets focus, fix the cause instead: give inputs a font size of at least 16px.

```css
input, select, textarea { font-size: 1rem; } /* 16px stops iOS focus zoom */
```

## Common false positives

- **Desktop-only checks**: desktop browsers ignore the viewport tag, so zoom may work on your laptop while still being blocked on phones. The failure is real.
- **Recent iOS versions** ignore `user-scalable=no`, but Android browsers and in-app web views may not, so still fix it.

## How to verify

Inspect the `<head>` and confirm the viewport tag has no `user-scalable=no` and no `maximum-scale` below 2. On a real phone or device emulator, pinch to zoom and confirm the page scales. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
- [axe rule: meta-viewport](https://dequeuniversity.com/rules/axe/4.13/meta-viewport)
