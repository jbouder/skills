---
id: aria-command-name
title: A custom button, link, or menu item has no accessible name
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

axe found an element with `role="button"`, `role="link"`, or `role="menuitem"` that has no accessible name. It has no text content, no `aria-label`, no `aria-labelledby` pointing at text, and no `title`. A screen reader announces it as just "button" or "link", with no hint of what it does.

This usually happens with icon-only controls built from a `<div>` or `<span>`, where the icon is a CSS background, an icon font glyph, or an SVG with no text. Native `<button>` and `<a>` elements are covered by the `button-name` and `link-name` rules instead.

## Who it affects

- Screen reader users, who cannot tell what the control does.
- Voice control users, who have no name to say, such as "click Delete".

## How to fix

First, replace the custom element with a native one. You get keyboard support and focus for free. Then give it a name: visible text is best, and `aria-label` is fine for icon-only controls.

```html
<!-- Before -->
<div role="button" tabindex="0" class="icon-trash"></div>

<!-- After: native button with an accessible name -->
<button type="button" aria-label="Delete draft">
  <svg aria-hidden="true" focusable="false"><!-- trash icon --></svg>
</button>
```

If you must keep the ARIA role, the name rules are the same:

```html
<div role="menuitem" tabindex="-1">
  <span class="icon-copy" aria-hidden="true"></span>
  Copy link
</div>
```

```tsx
// Before
<span role="link" tabIndex={0} onClick={goHome} className="logo" />

// After
<a href="/" className="logo">
  <img src="/logo.svg" alt="Acme home" />
</a>
```

Make the name describe the action or destination ("Delete draft", "Acme home"), not the icon ("Trash can").

## Common false positives

- **Names set after render**: if the label is applied asynchronously (for example after translations load), axe may have scanned before it existed. Re-scan once the page has settled; if it still fires, the name is missing.
- **Name provided only by a tooltip** that appears on hover does not count unless the tooltip is referenced with `aria-labelledby`.

## How to verify

Select the element in the DevTools Accessibility pane and confirm the computed Name is meaningful. With a screen reader, tab to it and listen. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: aria-command-name](https://dequeuniversity.com/rules/axe/4.13/aria-command-name)
