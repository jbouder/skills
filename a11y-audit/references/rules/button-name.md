---
id: button-name
title: A button has no text that tells users what it does
wcag: [4.1.2]
level: A
impact: critical
---

## The problem

axe found a `<button>` element with no accessible name. It has no text content that is exposed to assistive technology, no `aria-label`, no `aria-labelledby` pointing at text, no `title`, and no associated `<label>`. A screen reader announces just "button", and the user has to guess what it does.

The usual culprit is an icon-only button: a close "X", a hamburger menu, a trash can, or a chevron, where the icon is an SVG with no title, an `<img>` with empty `alt`, an icon font glyph, or a CSS background image.

## Who it affects

- Screen reader users, who hear "button" with no indication of its purpose.
- Voice control users, who cannot say "click Close" because the button has no name.

## How to fix

Give the button text. Visible text is best because it helps everyone. For icon-only buttons, add an `aria-label` or visually hidden text, and hide the icon itself from assistive technology.

```html
<!-- Before -->
<button class="close">
  <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
</button>

<!-- After: aria-label -->
<button class="close" aria-label="Close dialog">
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>
</button>

<!-- After: visually hidden text -->
<button class="close">
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>
  <span class="sr-only">Close dialog</span>
</button>
```

```tsx
// Before
<button onClick={onDelete}><TrashIcon /></button>

// After
<button onClick={onDelete} aria-label={`Delete ${file.name}`}>
  <TrashIcon aria-hidden="true" />
</button>
```

If the icon is an `<img>`, its `alt` text can name the button: `<button><img src="search.svg" alt="Search"></button>`.

Name the action, not the icon: "Close dialog", not "X"; "Open menu", not "Hamburger".

## Common false positives

- **Text added by CSS `::before` or `::after`**, such as icon fonts, may produce a name that is a meaningless glyph, or none at all. Treat these as real failures.
- **`<input type="button">`, `submit`, and `reset`** are checked by the separate `input-button-name` rule, not this one.

## How to verify

Select the button in the DevTools Accessibility pane and confirm the computed Name describes the action. With a screen reader, tab to it and listen. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: button-name](https://dequeuniversity.com/rules/axe/4.13/button-name)
