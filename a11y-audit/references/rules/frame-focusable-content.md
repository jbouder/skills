---
id: frame-focusable-content
title: An iframe with interactive content is removed from the keyboard tab order
wcag: [2.1.1]
level: A
impact: serious
---

## The problem

axe found an `<iframe>` or `<frame>` with `tabindex="-1"` whose content includes focusable elements such as links, buttons, or form fields. Setting `tabindex="-1"` on a frame removes the frame, and everything inside it, from the Tab sequence in most browsers. A keyboard user can see the embedded form or player but cannot reach any of its controls.

This often happens when `tabindex="-1"` is added to an embed to "clean up" the tab order, or when a library applies it to frames by default.

## Who it affects

- Keyboard users, who cannot reach or operate anything inside the frame.
- Screen reader and switch users who navigate with the keyboard.

## How to fix

Remove `tabindex="-1"` from the frame so its content is reachable.

```html
<!-- Before -->
<iframe src="https://forms.example.com/signup" title="Newsletter signup" tabindex="-1"></iframe>

<!-- After -->
<iframe src="https://forms.example.com/signup" title="Newsletter signup"></iframe>
```

```tsx
// Before
<iframe src={embedUrl} title="Video player" tabIndex={-1} />

// After
<iframe src={embedUrl} title="Video player" />
```

If the frame really is decorative and none of its content should be interactive, hide it completely instead: add `aria-hidden="true"` and make sure nothing inside it can receive focus, or render a static image in its place.

## Common false positives

- **Tiny or invisible frames** (1 pixel or less, such as tracking pixels) are not checked by this rule.
- **Frames whose focusable content is disabled or hidden** at the time of the scan pass. Re-scan in the state where the frame's controls are visible.

## How to verify

Press Tab through the page and confirm focus moves into the frame and through its controls, then back out to the page. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- [axe rule: frame-focusable-content](https://dequeuniversity.com/rules/axe/4.13/frame-focusable-content)
