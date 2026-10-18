---
id: css-orientation-lock
title: CSS forces the page into portrait or landscape orientation
wcag: [1.3.4]
level: AA
impact: serious
---

## The problem

axe found a CSS rule inside an `@media (orientation: portrait)` or `@media (orientation: landscape)` query that rotates content by about 90 degrees with `transform: rotate()` or the `rotate` property. This is a common trick to force a layout to stay in one orientation: when the user turns their device, the content is rotated back. The effect is that the page only reads correctly in one orientation.

This rule is experimental in axe and may not run in every scan configuration.

## Who it affects

- People who have their device mounted in a fixed orientation, for example on a wheelchair.
- People with limited dexterity who cannot easily rotate their device.
- People with low vision who prefer landscape for larger text.

## How to fix

Remove the rotation and build a layout that works in both orientations with responsive CSS.

```css
/* Before: rotates the app when the device is in portrait */
@media (orientation: portrait) {
  .app {
    transform: rotate(90deg);
    width: 100vh;
    height: 100vw;
  }
}

/* After: adapt the layout instead of rotating it */
@media (orientation: portrait) {
  .app {
    flex-direction: column;
  }
}
```

Also remove any JavaScript that locks orientation, such as `screen.orientation.lock()`, unless the orientation is essential, and avoid "please rotate your device" overlays that block content.

## Common false positives

- **Essential orientation**, such as a piano app, a bank check deposit camera view, or a VR experience, is exempt. Document why the orientation is essential.
- **Rotation of a small decorative element** inside an orientation query can trigger the rule. If the page itself stays usable in both orientations, the result can be dismissed.

## How to verify

Open the page on a phone or tablet, or in DevTools device mode, and switch between portrait and landscape. Confirm all content is readable and usable in both. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.4 Orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html)
- [axe rule: css-orientation-lock](https://dequeuniversity.com/rules/axe/4.13/css-orientation-lock)
