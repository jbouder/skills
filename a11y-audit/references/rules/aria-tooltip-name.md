---
id: aria-tooltip-name
title: A tooltip has no accessible name
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

axe found an element with `role="tooltip"` that has no accessible name, which in practice means it is empty. A tooltip's text is what gets read when it is referenced from the control it describes. An empty tooltip gives the screen reader nothing to read.

This often happens when a tooltip container is rendered in advance and its text is only filled in on hover, or when the tooltip content is an icon or image with no text alternative.

## Who it affects

- Screen reader users, who miss the hint or description the tooltip provides.
- Keyboard users, if the tooltip only gets content on mouse hover.

## How to fix

Make sure the tooltip contains text whenever it exists in the DOM, and connect it to its trigger with `aria-describedby`.

```html
<!-- Before -->
<button aria-describedby="tip-1">Export</button>
<div role="tooltip" id="tip-1"></div>

<!-- After -->
<button aria-describedby="tip-1">Export</button>
<div role="tooltip" id="tip-1" hidden>Downloads a CSV of the current view</div>
```

```tsx
// Before: content set only on mouse enter
<div role="tooltip" id={tipId}>{hovered ? text : null}</div>

// After: text always present, visibility toggled
<div role="tooltip" id={tipId} hidden={!open}>{text}</div>
```

Show the tooltip on keyboard focus as well as hover, and let Escape dismiss it. If the tooltip is the only name for an icon-only button, use `aria-labelledby` instead of `aria-describedby` so it becomes the button's name.

## Common false positives

- **Tooltip containers that are always empty** because the library renders a new element per tooltip. If the empty one is never referenced and never shown, remove it from the DOM rather than leaving an empty `role="tooltip"`.

## How to verify

Focus the trigger with the keyboard and confirm the tooltip appears with text. With a screen reader, confirm the description is read after the control's name. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [APG: Tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
- [axe rule: aria-tooltip-name](https://dequeuniversity.com/rules/axe/4.13/aria-tooltip-name)
