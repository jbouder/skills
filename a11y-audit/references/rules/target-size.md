---
id: target-size
title: A clickable target is smaller than 24 by 24 pixels and too close to its neighbors
wcag: [2.5.8]
level: AA
impact: serious
---

## The problem

A button, link, checkbox or other control is smaller than **24 by 24 CSS pixels**, and it does not have enough empty space around it to make up for that. WCAG 2.2 SC 2.5.8 Target Size (Minimum) requires every pointer target to be at least 24 by 24 CSS pixels unless one of these exceptions applies:

- **Spacing:** an undersized target is fine if you can draw a 24px-diameter circle centered on it that does not overlap any other target or the 24px circle of another undersized target. In practice, small icons need roughly 24px from the center of one to the center of the next.
- **Equivalent:** the same action is available through another control on the same page that does meet the size requirement.
- **Inline:** the target is in a sentence or block of text, such as a link in a paragraph, or its size is constrained by the line height of surrounding text.
- **User agent control:** the size is set by the browser and the author has not changed it, such as an unstyled native checkbox.
- **Essential:** a particular size or arrangement is essential or legally required, such as pins on a map.

axe measures each focusable widget. It passes the target if it is at least 24px in both dimensions; otherwise it checks the space to the nearest focusable neighbor and reports the "safe clickable space" diameter it found. It skips links inside text blocks. Typical failures are 16px icon buttons in toolbars, close "x" buttons, pagination numbers packed together, and tiny social icons.

## Who it affects

- People with tremors, limited dexterity or motor impairments, who miss small targets or hit the wrong one.
- Touch screen users, especially on phones, and anyone using a device one-handed or on the move.
- People with low vision who use a magnifier with a large pointer.

## How to fix

Make the hit area at least 24 by 24px. The icon itself can stay small: padding or a minimum size on the control enlarges the target without changing the artwork.

```css
/* Before: 16 x 16 hit area */
.icon-button { padding: 0; width: 16px; height: 16px; }

/* After: icon stays 16px, target is 24px (32px is more comfortable) */
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
  padding: 4px;
}
```

```tsx
// Before
<button className="h-4 w-4" aria-label="Close"><XIcon /></button>
// After: icon stays h-4, the button is 32px
<button className="inline-flex h-8 w-8 items-center justify-center" aria-label="Close">
  <XIcon className="h-4 w-4" aria-hidden="true" />
</button>
```

If you cannot enlarge the targets, space them out so each center is at least 24px from its neighbors' centers, for example with `gap: 8px` between 16px icons. Avoid negative margins that let targets overlap.

## Common false positives

- **Links inside sentences** are exempt under the inline exception. axe already skips most of them, but a link inside a short `<li>` or table cell may be flagged; judge whether it reads as inline text.
- **Unstyled native controls** such as a default checkbox or radio fall under the user agent exception. Once you restyle them, the exception no longer applies.
- **Targets with an equivalent** larger control elsewhere on the page are exempt, but axe cannot know that, so confirm manually.
- **Elements removed from the tab order** (`tabindex="-1"`) or neighbors that are not tabbable are reported as "needs review", because axe cannot tell whether they are really targets.

## How to verify

In DevTools, select the control and read its rendered size in the box model; check both width and height are 24px or more, or that the 24px circle around it does not touch a neighbor. Test on a phone or with device emulation and try to tap each control without hitting its neighbors. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [axe rule: target-size](https://dequeuniversity.com/rules/axe/4.13/target-size)
