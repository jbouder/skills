---
id: focus-visible
title: Keyboard focus is invisible on this element
wcag: [2.4.7]
level: AA
impact: serious
---

## The problem

When a keyboard user presses Tab to reach this element, nothing on screen changes. The scanner pressed Tab, took a screenshot of the focused element, removed focus, and took a second screenshot. The two images were pixel-identical, so there is no visible focus indicator.

The usual cause is a reset such as `outline: none` or `outline: 0` on `:focus` with no replacement style. Component libraries and CSS resets often do this to hide the ring after mouse clicks.

## Who it affects

- Keyboard-only users, including many people with motor disabilities, who cannot tell which element will respond to Enter or Space.
- Screen magnifier users, who rely on the focus ring to find where they are in a zoomed view.
- Power users who navigate forms with Tab.

## How to fix

Never remove the outline without replacing it. Use `:focus-visible` so the ring shows for keyboard users but not after a mouse click.

```css before
a.nav:focus { outline: none; }
```

```css after
a.nav:focus-visible {
  outline: 2px solid var(--focus-ring, #4335c9);
  outline-offset: 2px;
  border-radius: 2px;
}
```

Fix it once, globally, so every interactive element gets the same treatment:

```css
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

In Tailwind, replace `focus:outline-none` with a visible style:

```tsx
<a className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" href="/about">About</a>
```

Make sure the ring has at least 3:1 contrast against the colors next to it. That is what WCAG 1.4.11 Non-text Contrast requires.

## Common false positives

- **Focus styles drawn on a parent.** If a wrapper uses `:focus-within` to draw the ring outside the screenshot area, the scanner can miss it. The screenshot includes 8px around the element, so most of these are caught.
- **Animated focus styles** that take longer than about 100ms to appear can be reported as missing. Check by tabbing to the element yourself.
- **Elements that only change the text cursor**, such as text inputs where the caret is the only change, are reported. A caret alone is a weak indicator, so add a border or outline anyway.

## How to verify

Click in the browser address bar, then press Tab repeatedly through the page. At every stop you should be able to see, without searching, which element has focus. Re-run the audit and confirm the element no longer appears.

## References

- [Understanding SC 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- [Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
