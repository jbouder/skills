---
id: nested-interactive
title: An interactive control contains another focusable control
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

A control whose children are treated as presentational, such as a button, checkbox, radio, switch, tab, option, slider or menu item, contains something focusable inside it, like a link, another button or an input. Browsers flatten everything inside these roles into a single label, so the inner control has no role of its own for assistive technology. Screen readers may announce it as plain text or not at all, and keyboard users may tab to an element that does nothing predictable.

A common case is a clickable card built as `<button>` (or `role="button"`) that also contains a "Learn more" link or a favorite button. Note that this rule checks the outer control's role: a button inside a link is invalid HTML too, but it is caught by different checks, not this one.

## Who it affects

- Screen reader users, who hear a confusing or incomplete announcement and cannot reach the inner control.
- Keyboard users, who may get an extra, unlabeled tab stop.
- Voice control users, who cannot target the inner control by name.

## How to fix

Make the controls siblings instead of nesting them. For clickable cards, keep one real link or button and stretch its click area with CSS.

```html
<!-- Before: a link inside a button -->
<button class="card" onclick="openProduct()">
  <h3>Trail shoes</h3>
  <a href="/reviews">Read reviews</a>
</button>

<!-- After: separate controls, card made clickable with CSS -->
<div class="card">
  <h3><a href="/products/trail" class="card-link">Trail shoes</a></h3>
  <a href="/reviews" class="card-secondary">Read reviews</a>
</div>
```

```css
.card { position: relative; }
.card-link::after { content: ""; position: absolute; inset: 0; }
.card-secondary { position: relative; z-index: 1; }
```

```tsx
// Before
<div role="tab" tabIndex={0}>Inbox <button onClick={close}>x</button></div>
// After: the close button sits beside the tab, not inside it
<div className="tab-wrapper">
  <button role="tab" aria-selected={selected}>Inbox</button>
  <button type="button" aria-label="Close Inbox tab" onClick={close}>x</button>
</div>
```

Adding `tabindex="-1"` or `aria-hidden="true"` to the inner element does not fix it; axe still reports it, because assistive technology can still reach it.

## Common false positives

- Rare. If the inner element is truly not interactive, remove its `tabindex`, `href` or event handler so it is no longer focusable.

## How to verify

Tab through the component and confirm each stop is a single, clearly named control. With a screen reader, confirm each control is announced with its own role and name. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: nested-interactive](https://dequeuniversity.com/rules/axe/4.13/nested-interactive)
