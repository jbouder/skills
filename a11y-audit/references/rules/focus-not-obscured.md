---
id: focus-not-obscured
title: Focused element is completely hidden behind other content
wcag: [2.4.11]
level: AA
impact: serious
---

## The problem

When this element receives keyboard focus, something drawn on top of it covers it completely. The scanner tabbed to the element and sampled five points inside it, and every visible point belonged to another element. The covering element is usually a sticky header, a sticky footer, a cookie or consent banner, a chat widget, or a non-modal dialog.

WCAG 2.2 added this criterion. At level AA the focused element must not be entirely hidden. At AAA (2.4.12) no part of it may be hidden.

## Who it affects

- Keyboard users, who lose track of focus and may activate something they cannot see.
- Screen magnifier users, whose small viewport makes sticky content cover a larger share of the screen.
- Sighted switch and voice-control users, who follow the visible focus.

## How to fix

Reserve space for sticky content so the browser scrolls focused elements clear of it. `scroll-padding` handles both Tab and in-page links:

```css before
header { position: sticky; top: 0; height: 64px; }
.cookie-banner { position: fixed; bottom: 0; height: 120px; }
```

```css after
html {
  scroll-padding-top: 72px;     /* sticky header height + a little room */
  scroll-padding-bottom: 128px; /* fixed banner height + a little room */
}
```

For banners and chat widgets, also let users dismiss them, and do not leave them covering content once dismissed. A consent banner that must stay should take part in the layout (push content up) rather than float over it.

```tsx
// Keep scroll padding in sync with a banner whose height varies
useEffect(() => {
  const h = bannerRef.current?.offsetHeight ?? 0;
  document.documentElement.style.scrollPaddingBottom = `${h + 8}px`;
}, [bannerOpen]);
```

## Common false positives

- **Modal dialogs** that intentionally cover the page are fine, as long as focus is moved into the dialog and kept there. If the scanner reached an element behind an open modal, the real issue is that focus escaped the modal.
- **Transparent overlays** with `pointer-events: none` can register as covering even when the element is visible through them. Check the screenshot.

## How to verify

Press Tab through the whole page, including the bottom. Each focused element should be at least partly visible, ideally fully. Repeat at a narrow window width, where sticky elements take up more room.

## References

- [Understanding SC 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- [MDN: scroll-padding](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-padding)
