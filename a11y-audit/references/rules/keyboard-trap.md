---
id: keyboard-trap
title: Keyboard focus appears to be trapped
wcag: [2.1.2]
level: A
impact: critical
---

## The problem

The scanner pressed Tab four times in a row and focus stayed on the same element. A keyboard user who reaches this element may be unable to move past it. Common causes are a custom widget that calls `preventDefault()` on Tab, a focus-trap script left active after a dialog closes, an embedded editor or video player that captures keys, or an `onBlur` handler that calls `focus()` again.

## Who it affects

- Keyboard-only users, who can be stuck with no way out short of reloading the page.
- Screen reader users, who navigate with Tab and arrow keys.
- Switch device users, whose input maps to Tab and Enter.

## How to fix

Only trap focus inside a modal dialog that is open, and release it when the dialog closes. Prefer the native `<dialog>` element with `showModal()`, which handles this correctly.

```js before
input.addEventListener('blur', () => {
  if (!isValid(input.value)) input.focus(); // forces focus back
});
```

```js after
input.addEventListener('blur', () => {
  input.setAttribute('aria-invalid', String(!isValid(input.value)));
  // Show the error, but let the user leave the field.
});
```

For a widget that legitimately uses Tab, such as a code editor, document a way out (for example, Escape then Tab) and say so near the widget.

## Common false positives

- **A page with a single focusable element** cycles back to the same element, which can look like a trap. Check whether there is anything else to reach.
- **Browser chrome**: focus can leave the page into the address bar, which the scanner cannot see. This is reported as a trap only when focus stays on the same element.

## How to verify

Tab to the element, then keep pressing Tab and Shift+Tab. Focus should move forward and backward. If it does not, try Escape. If nothing works, it is a real trap.

## References

- [Understanding SC 2.1.2 No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html)
- [MDN: dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
